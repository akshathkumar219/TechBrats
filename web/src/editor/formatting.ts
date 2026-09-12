import type { EditorView, KeyBinding } from '@codemirror/view'
import type { ChangeSpec } from '@codemirror/state'

/**
 * Toggle a wrapping mark around the selection (or the word under the cursor).
 * Cmd+B on already-bold text removes the bold, matching Obsidian.
 */
function toggleWrap(view: EditorView, mark: string): boolean {
  const { state } = view
  const changes: ChangeSpec[] = []
  let newSelection: { anchor: number; head: number } | null = null

  for (const range of state.selection.ranges) {
    let { from, to } = range

    // No selection → operate on the word under the cursor
    if (from === to) {
      const line = state.doc.lineAt(from)
      const text = line.text
      const offset = from - line.from
      let start = offset
      let end = offset
      while (start > 0 && /\w/.test(text[start - 1])) start--
      while (end < text.length && /\w/.test(text[end])) end++
      if (start === end) return false
      from = line.from + start
      to = line.from + end
    }

    const len = mark.length
    const outer = state.doc.sliceString(from - len, to + len)
    const inner = state.doc.sliceString(from, to)

    if (outer.startsWith(mark) && outer.endsWith(mark)) {
      // Already wrapped just outside the selection — unwrap
      changes.push({ from: from - len, to, insert: inner })
      newSelection = { anchor: from - len, head: to - len }
    } else if (inner.startsWith(mark) && inner.endsWith(mark) && inner.length > len * 2) {
      // Marks are inside the selection — unwrap
      const stripped = inner.slice(len, -len)
      changes.push({ from, to, insert: stripped })
      newSelection = { anchor: from, head: from + stripped.length }
    } else {
      changes.push({ from, to, insert: mark + inner + mark })
      newSelection = { anchor: from + len, head: to + len }
    }
  }

  if (!changes.length) return false
  view.dispatch({
    changes,
    selection: newSelection ?? undefined,
    userEvent: 'input.format',
  })
  return true
}

/** Cmd+K → [selection](url) with the cursor placed in the url slot. */
function insertLink(view: EditorView): boolean {
  const { state } = view
  const range = state.selection.main
  const text = state.doc.sliceString(range.from, range.to)
  const insert = `[${text}]()`
  view.dispatch({
    changes: { from: range.from, to: range.to, insert },
    selection: { anchor: range.from + text.length + 3 },
    userEvent: 'input.format',
  })
  return true
}

export const formattingKeymap: KeyBinding[] = [
  { key: 'Mod-b', run: (v) => toggleWrap(v, '**'), preventDefault: true },
  { key: 'Mod-i', run: (v) => toggleWrap(v, '*'), preventDefault: true },
  { key: 'Mod-Shift-x', run: (v) => toggleWrap(v, '~~'), preventDefault: true },
  { key: 'Mod-Shift-c', run: (v) => toggleWrap(v, '`'), preventDefault: true },
  { key: 'Mod-k', run: insertLink, preventDefault: true },
]
