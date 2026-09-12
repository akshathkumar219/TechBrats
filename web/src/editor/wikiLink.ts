import type { CompletionContext, CompletionResult, Completion } from '@codemirror/autocomplete'
import { EditorView } from '@codemirror/view'
import type { VaultFile } from '../fs/vault'

/**
 * CM6 completion source for [[wiki-links]].
 *
 * Replaces the old textarea-based useWikiAutocomplete hook. CM6 handles all
 * the hard parts itself — caret tracking, positioning, keyboard nav, filtering
 * as you type, dismiss on Escape.
 */
export function wikiLinkCompletion(getFiles: () => VaultFile[]) {
  return (context: CompletionContext): CompletionResult | null => {
    // Match "[[" followed by anything that isn't a closing bracket or newline
    const before = context.matchBefore(/\[\[[^\]\n]*$/)
    if (!before) return null
    if (before.from === before.to && !context.explicit) return null

    const files = getFiles()

    // A bare name is ambiguous if two files share it — use the full path then
    const nameCounts = new Map<string, number>()
    for (const f of files) {
      const base = f.name.replace(/\.md$/, '')
      nameCounts.set(base, (nameCounts.get(base) ?? 0) + 1)
    }

    const options: Completion[] = files.map((f) => {
      const name = f.name.replace(/\.md$/, '')
      const path = f.path.replace(/\.md$/, '')
      const ambiguous = (nameCounts.get(name) ?? 0) > 1
      const insert = ambiguous ? path : name
      const folder = f.path.includes('/') ? f.path.slice(0, f.path.lastIndexOf('/')) : ''

      return {
        label: name,
        detail: folder || undefined,
        type: 'text',
        apply: (view: EditorView, _c: Completion, from: number, to: number) => {
          // closeBrackets may already have inserted "]]" after the cursor
          const after = view.state.doc.sliceString(to, to + 2)
          const hasClosing = after === ']]'
          const text = hasClosing ? insert : `${insert}]]`
          const cursor = from + insert.length + 2

          view.dispatch({
            changes: { from, to, insert: text },
            selection: { anchor: cursor },
            userEvent: 'input.complete',
          })
        },
      }
    })

    return {
      from: before.from + 2, // start replacing after the "[["
      options,
      validFor: /^[^\]\n]*$/,
    }
  }
}
