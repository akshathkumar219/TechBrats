import { EditorView, Decoration, type DecorationSet, WidgetType } from '@codemirror/view'
import { StateField, type EditorState, type Transaction, type Range } from '@codemirror/state'
import { syntaxTree } from '@codemirror/language'
import { parseFrontmatter, type PropertyValue } from '../lib/frontmatter'

/**
 * Live-preview decoration engine (Obsidian-style).
 *
 * Raw markdown syntax marks (`#`, `**`, `*`, `~~`, `` ` ``, `[[...]]`, `---`, `>`)
 * stay hidden while the cursor is on another line, and reappear on the line
 * the cursor is currently on.
 *
 * Implemented decoration sequence:
 * 1. Headings (HeaderMark hide `# `)
 * 2. Bold (**...**), Italic (*...*), Strikethrough (~~...~~)
 * 3. Inline code (`...`)
 * 4. Links ([text](url)) and Wikilinks ([[target|alias]] / [[target]])
 * 5. Task checkboxes ([ ] and [x])
 * 6. Blockquotes (> ...)
 * 7. Horizontal rule (---)
 * 8. Frontmatter (properties table widget)
 */

const HEADING_NODE_RE = /^ATXHeading[1-6]$/

class HRWidget extends WidgetType {
  toDOM(): HTMLElement {
    const hr = document.createElement('hr')
    hr.className = 'cm-hr'
    return hr
  }
}

class BulletWidget extends WidgetType {
  toDOM(): HTMLElement {
    const span = document.createElement('span')
    span.className = 'cm-list-bullet'
    span.textContent = '•'
    return span
  }
}

class CitationWidget extends WidgetType {
  raw: string
  constructor(raw: string) {
    super()
    this.raw = raw
  }

  eq(other: CitationWidget): boolean {
    return this.raw === other.raw
  }

  toDOM(): HTMLElement {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'copilot-citation-chip is-inline cm-citation-chip'
    btn.title = `Evidence Citation: ${this.raw} — Click to inspect`

    const trimmed = this.raw.trim()
    const parts = trimmed.split(/\s+/)
    const source = parts[0] || trimmed
    const locator = parts.slice(1).join(' ')

    const icon = document.createElement('span')
    icon.className = 'copilot-citation-icon'
    icon.textContent = '§'
    btn.appendChild(icon)

    const sourceEl = document.createElement('span')
    sourceEl.className = 'copilot-citation-source'
    sourceEl.textContent = source
    btn.appendChild(sourceEl)

    if (locator) {
      const sep = document.createElement('span')
      sep.className = 'copilot-citation-sep'
      sep.textContent = '·'
      btn.appendChild(sep)

      const locEl = document.createElement('span')
      locEl.className = 'copilot-citation-locator'
      locEl.textContent = locator
      btn.appendChild(locEl)
    }

    btn.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      window.dispatchEvent(
        new CustomEvent('syndicate-brain:open-file', {
          detail: { path: source },
        })
      )
    })

    return btn
  }
}

class CheckboxWidget extends WidgetType {
  checked: boolean
  pos: number

  constructor(checked: boolean, pos: number) {
    super()
    this.checked = checked
    this.pos = pos
  }

  eq(other: CheckboxWidget): boolean {
    return this.checked === other.checked && this.pos === other.pos
  }

  toDOM(view: EditorView): HTMLElement {
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.checked = this.checked
    input.className = 'cm-task-checkbox'
    input.addEventListener('click', (e) => {
      e.stopPropagation()
      const newMark = this.checked ? '[ ]' : '[x]'
      view.dispatch({
        changes: { from: this.pos, to: this.pos + 3, insert: newMark },
      })
    })
    return input
  }
}

class FrontmatterWidget extends WidgetType {
  properties: Record<string, PropertyValue>

  constructor(properties: Record<string, PropertyValue>) {
    super()
    this.properties = properties
  }

  eq(other: FrontmatterWidget): boolean {
    return JSON.stringify(this.properties) === JSON.stringify(other.properties)
  }

  toDOM(_view: EditorView): HTMLElement {
    const container = document.createElement('div')
    container.className = 'properties-panel cm-frontmatter-widget'

    const header = document.createElement('div')
    header.className = 'properties-header'

    const title = document.createElement('div')
    title.className = 'properties-title'
    title.innerHTML = '<span class="properties-chevron">▾</span><span>Properties</span>'

    const count = document.createElement('span')
    count.className = 'properties-count'
    const entries = Object.entries(this.properties)
    count.textContent = String(entries.length)

    header.appendChild(title)
    header.appendChild(count)
    container.appendChild(header)

    const table = document.createElement('div')
    table.className = 'properties-table'

    for (const [key, value] of entries) {
      const row = document.createElement('div')
      row.className = 'property-row'

      const keyEl = document.createElement('div')
      keyEl.className = 'property-key'
      keyEl.textContent = key

      const valEl = document.createElement('div')
      valEl.className = 'property-value'

      if (Array.isArray(value)) {
        const tags = document.createElement('div')
        tags.className = 'property-tags'
        for (const item of value) {
          const tag = document.createElement('span')
          tag.className = 'property-tag'
          tag.textContent = item
          tags.appendChild(tag)
        }
        valEl.appendChild(tags)
      } else {
        const scalar = document.createElement('span')
        scalar.className = 'property-scalar'
        scalar.textContent = String(value)
        valEl.appendChild(scalar)
      }

      row.appendChild(keyEl)
      row.appendChild(valEl)
      table.appendChild(row)
    }

    container.appendChild(table)

    // Collapsible toggle on header click
    let isExpanded = true
    header.addEventListener('click', (e) => {
      e.stopPropagation()
      isExpanded = !isExpanded
      table.style.display = isExpanded ? 'flex' : 'none'
      const chevron = title.querySelector('.properties-chevron')
      if (chevron) chevron.textContent = isExpanded ? '▾' : '▸'
    })

    return container
  }
}

function cursorLines(state: EditorState): Set<number> {
  const lines = new Set<number>()
  for (const range of state.selection.ranges) {
    lines.add(state.doc.lineAt(range.head).number)
  }
  return lines
}

function buildDecorations(state: EditorState): DecorationSet {
  const activeLines = cursorLines(state)
  const decorations: Range<Decoration>[] = []
  const docText = state.doc.toString()
  const headingLinesDecorated = new Set<number>()

  // 1. Frontmatter check at start of document — always formatted as Properties panel in Live Preview
  let fmEnd = 0
  const fmMatch = docText.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)
  if (fmMatch) {
    fmEnd = fmMatch[0].length
    const { properties } = parseFrontmatter(docText)
    if (Object.keys(properties).length > 0) {
      decorations.push(
        Decoration.replace({
          widget: new FrontmatterWidget(properties),
        }).range(0, fmEnd)
      )
    }
  }

  // 2. Walk syntax tree for inline & block markdown constructs
  syntaxTree(state).iterate({
    enter(node) {
      // Don't decorate inside frontmatter when it is already replaced
      if (fmEnd > 0 && node.to <= fmEnd) return

      const line = state.doc.lineAt(node.from)
      const lineNum = line.number
      const isLineActive = activeLines.has(lineNum)

      // ATX Headings: apply line typography and hide `#` mark
      if (HEADING_NODE_RE.test(node.name)) {
        const level = node.name.slice(-1)
        if (!headingLinesDecorated.has(lineNum)) {
          headingLinesDecorated.add(lineNum)
          decorations.push(
            Decoration.line({ class: `cm-heading cm-heading-${level}` }).range(line.from)
          )
        }
        if (isLineActive) return
        const mark = node.node.firstChild
        if (mark && mark.name === 'HeaderMark') {
          let hideTo = mark.to
          if (state.doc.sliceString(hideTo, hideTo + 1) === ' ') hideTo += 1
          decorations.push(Decoration.replace({}).range(mark.from, hideTo))
        }
      }

      // Strong emphasis (**bold**)
      else if (node.name === 'StrongEmphasis') {
        if (isLineActive) return
        const first = node.node.firstChild
        const last = node.node.lastChild
        if (first && last && first !== last) {
          decorations.push(Decoration.replace({}).range(first.from, first.to))
          decorations.push(Decoration.mark({ class: 'cm-strong' }).range(first.to, last.from))
          decorations.push(Decoration.replace({}).range(last.from, last.to))
        }
      }

      // Emphasis (*italic*)
      else if (node.name === 'Emphasis') {
        if (isLineActive) return
        const first = node.node.firstChild
        const last = node.node.lastChild
        if (first && last && first !== last) {
          decorations.push(Decoration.replace({}).range(first.from, first.to))
          decorations.push(Decoration.mark({ class: 'cm-em' }).range(first.to, last.from))
          decorations.push(Decoration.replace({}).range(last.from, last.to))
        }
      }

      // Strikethrough (~~struck~~)
      else if (node.name === 'Strikethrough') {
        if (isLineActive) return
        const first = node.node.firstChild
        const last = node.node.lastChild
        if (first && last && first !== last) {
          decorations.push(Decoration.replace({}).range(first.from, first.to))
          decorations.push(Decoration.mark({ class: 'cm-strikethrough' }).range(first.to, last.from))
          decorations.push(Decoration.replace({}).range(last.from, last.to))
        }
      }

      // Inline code (`code`)
      else if (node.name === 'InlineCode') {
        if (isLineActive) return
        const first = node.node.firstChild
        const last = node.node.lastChild
        if (first && last && first !== last) {
          decorations.push(Decoration.replace({}).range(first.from, first.to))
          decorations.push(Decoration.mark({ class: 'cm-inline-code' }).range(first.to, last.from))
          decorations.push(Decoration.replace({}).range(last.from, last.to))
        }
      }

      // Links, Wiki-links & Citations
      else if (node.name === 'Link') {
        if (isLineActive) return

        // Check if this is an evidentiary citation: ^[DOC_... locator]
        const isCitation = node.from > 0 && state.doc.sliceString(node.from - 1, node.from) === '^'
        if (isCitation) {
          const innerText = state.doc.sliceString(node.from + 1, node.to - 1)
          decorations.push(
            Decoration.replace({
              widget: new CitationWidget(innerText),
            }).range(node.from - 1, node.to)
          )
          return
        }

        const isWiki =
          state.doc.sliceString(node.from - 1, node.from) === '[' &&
          state.doc.sliceString(node.to, node.to + 1) === ']'

        if (isWiki) {
          const fullStart = node.from - 1
          const fullEnd = node.to + 1
          const innerText = state.doc.sliceString(node.from + 1, node.to - 1)
          const pipeIdx = innerText.indexOf('|')
          if (pipeIdx !== -1) {
            const pipePos = node.from + 1 + pipeIdx
            decorations.push(Decoration.replace({}).range(fullStart, pipePos + 1))
            decorations.push(Decoration.mark({ class: 'cm-wikilink' }).range(pipePos + 1, fullEnd - 2))
            decorations.push(Decoration.replace({}).range(fullEnd - 2, fullEnd))
          } else {
            decorations.push(Decoration.replace({}).range(fullStart, fullStart + 2))
            decorations.push(Decoration.mark({ class: 'cm-wikilink' }).range(fullStart + 2, fullEnd - 2))
            decorations.push(Decoration.replace({}).range(fullEnd - 2, fullEnd))
          }
        } else {
          let openBracket: { from: number; to: number } | null = null
          let closeBracket: { from: number; to: number } | null = null
          let closeParen: { from: number; to: number } | null = null

          for (let c = node.node.firstChild; c; c = c.nextSibling) {
            if (c.name === 'LinkMark') {
              const txt = state.doc.sliceString(c.from, c.to)
              if (txt === '[') openBracket = c
              else if (txt === ']') closeBracket = c
              else if (txt === ')') closeParen = c
            }
          }
          if (openBracket && closeBracket && closeParen) {
            decorations.push(Decoration.replace({}).range(openBracket.from, openBracket.to))
            decorations.push(Decoration.mark({ class: 'cm-link-text' }).range(openBracket.to, closeBracket.from))
            decorations.push(Decoration.replace({}).range(closeBracket.from, closeParen.to))
          }
        }
      }

      // List marks (- / * / +)
      else if (node.name === 'ListMark') {
        if (isLineActive) return
        const parent = node.node.parent
        if (parent?.name === 'ListItem' && parent.getChild('Task')) {
          // Task list item: hide the leading "- " so only the checkbox renders
          let hideTo = node.to
          if (state.doc.sliceString(hideTo, hideTo + 1) === ' ') hideTo += 1
          decorations.push(Decoration.replace({}).range(node.from, hideTo))
        } else {
          const markText = state.doc.sliceString(node.from, node.to)
          if (markText === '-' || markText === '*' || markText === '+') {
            decorations.push(
              Decoration.replace({
                widget: new BulletWidget(),
              }).range(node.from, node.to)
            )
          }
        }
      }

      // Task checkboxes (- [ ] / - [x])
      else if (node.name === 'TaskMarker') {
        if (isLineActive) return
        const text = state.doc.sliceString(node.from, node.to)
        const isChecked = /x/i.test(text)
        decorations.push(
          Decoration.replace({
            widget: new CheckboxWidget(isChecked, node.from),
          }).range(node.from, node.to)
        )
      }

      // Blockquote (> text)
      else if (node.name === 'Blockquote') {
        if (isLineActive) return
        const quoteMark = node.node.firstChild
        if (quoteMark && quoteMark.name === 'QuoteMark') {
          let hideTo = quoteMark.to
          if (state.doc.sliceString(hideTo, hideTo + 1) === ' ') hideTo += 1
          decorations.push(Decoration.replace({}).range(quoteMark.from, hideTo))
          const bqLine = state.doc.lineAt(node.from)
          decorations.push(Decoration.line({ class: 'cm-formatting-blockquote' }).range(bqLine.from))
        }
      }

      // Horizontal rule (---)
      else if (node.name === 'HorizontalRule') {
        if (isLineActive) return
        decorations.push(
          Decoration.replace({
            widget: new HRWidget(),
          }).range(node.from, node.to)
        )
      }
    },
  })

  decorations.sort((a, b) => a.from - b.from)
  return Decoration.set(decorations, true)
}

function sameActiveLines(a: Transaction['startState'], b: EditorState): boolean {
  const linesA = cursorLines(a)
  const linesB = cursorLines(b)
  if (linesA.size !== linesB.size) return false
  for (const line of linesA) if (!linesB.has(line)) return false
  return true
}

export const livePreview = StateField.define<DecorationSet>({
  create(state) {
    return buildDecorations(state)
  },
  update(decorations, tr) {
    if (!tr.docChanged && sameActiveLines(tr.startState, tr.state)) {
      return decorations.map(tr.changes)
    }
    return buildDecorations(tr.state)
  },
  provide: (field) => EditorView.decorations.from(field),
})

export const livePreviewClickHandler = EditorView.domEventHandlers({
  click(event) {
    const target = event.target as HTMLElement
    if (target.classList.contains('cm-wikilink')) {
      const text = target.textContent?.trim()
      if (text) {
        window.dispatchEvent(
          new CustomEvent('syndicate-brain:open-file', {
            detail: { path: text },
          })
        )
      }
    }
  },
})
