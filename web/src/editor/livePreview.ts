import { EditorView, Decoration, type DecorationSet } from '@codemirror/view'
import { StateField, type EditorState, type Transaction } from '@codemirror/state'
import { syntaxTree } from '@codemirror/language'

/**
 * Live-preview decoration engine.
 *
 * Obsidian-style editing: raw markdown syntax marks (`#`, `**`, `[[`, ...) stay
 * hidden while the cursor is elsewhere, and reappear on the line the cursor is
 * currently on. This field owns the hide/reveal decision; individual markdown
 * constructs (headings first, more to follow) each contribute their own
 * decorations by walking the syntax tree.
 *
 * Recomputes on doc changes and on any selection change that moved the cursor
 * onto or off of a different line — a plain caret move within the same line
 * changes nothing, so we skip the tree walk for that case.
 */

const HEADING_NODE_RE = /^ATXHeading[1-6]$/

function cursorLines(state: EditorState): Set<number> {
  const lines = new Set<number>()
  for (const range of state.selection.ranges) {
    lines.add(state.doc.lineAt(range.head).number)
  }
  return lines
}

function buildDecorations(state: EditorState): DecorationSet {
  const activeLines = cursorLines(state)
  const decorations: { from: number; to: number; deco: ReturnType<typeof Decoration.replace> }[] = []

  syntaxTree(state).iterate({
    enter(node) {
      if (!HEADING_NODE_RE.test(node.name)) return

      const headingLine = state.doc.lineAt(node.from).number
      if (activeLines.has(headingLine)) return // raw marks stay visible on the active line

      const mark = node.node.firstChild
      if (!mark || mark.name !== 'HeaderMark') return

      // Hide the `#` run and the single space after it, if present.
      let hideTo = mark.to
      if (state.doc.sliceString(hideTo, hideTo + 1) === ' ') hideTo += 1

      decorations.push({ from: mark.from, to: hideTo, deco: Decoration.replace({}) })
    },
  })

  return Decoration.set(
    decorations.map(({ from, to, deco }) => deco.range(from, to)),
    true
  )
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
