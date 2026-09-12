import { EditorView, keymap, drawSelection, dropCursor, rectangularSelection,
         crosshairCursor, highlightActiveLine, highlightActiveLineGutter,
         highlightSpecialChars, placeholder as cmPlaceholder } from '@codemirror/view'
import { EditorState, type Extension } from '@codemirror/state'
import { history, historyKeymap, defaultKeymap, indentWithTab } from '@codemirror/commands'
import { markdown, markdownLanguage, markdownKeymap } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { indentOnInput, bracketMatching, foldGutter, foldKeymap, indentUnit } from '@codemirror/language'
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import { editorTheme, syntaxTheme } from './theme'
import { wikiLinkCompletion } from './wikiLink'
import { formattingKeymap } from './formatting'
import { livePreview, livePreviewClickHandler } from './livePreview'
import type { VaultFile } from '../fs/vault'

interface Options {
  getFiles: () => VaultFile[]
  placeholder?: string
}

/**
 * The full editor extension set.
 *
 * Almost everything here is stock CodeMirror configuration — that's the point.
 * List continuation, Tab indent/outdent, checkbox continuation, undo grouped by
 * typing burst, multi-cursor, find & replace, bracket matching, folding and
 * auto-pairing all come from these imports, not from code we wrote.
 *
 * Live-preview decorations (hiding markdown marks when the cursor is
 * elsewhere) start with `livePreview` — currently headings only. See
 * docs/obsidian-editor-features.md section C for what's still incremental.
 */
export function buildExtensions({ getFiles, placeholder }: Options): Extension[] {
  return [
    // ── Markdown language + Lezer incremental parser ──────────────────────
    markdown({
      base: markdownLanguage,
      codeLanguages: languages,   // syntax highlighting inside ``` fences
      addKeymap: false,           // we add markdownKeymap ourselves, ordered below
    }),
    indentUnit.of('    '),        // 4 spaces, matching Obsidian's default

    // ── Editing behaviour ─────────────────────────────────────────────────
    history(),
    drawSelection(),
    dropCursor(),
    indentOnInput(),
    bracketMatching(),
    closeBrackets(),
    highlightSpecialChars(),
    highlightActiveLine(),
    highlightActiveLineGutter(),
    highlightSelectionMatches(),
    rectangularSelection(),
    crosshairCursor(),
    EditorState.allowMultipleSelections.of(true),
    EditorView.lineWrapping,

    // ── Folding (headings and lists) ──────────────────────────────────────
    foldGutter({
      openText: '⌄',
      closedText: '›',
    }),

    // ── Wiki-link autocomplete ────────────────────────────────────────────
    autocompletion({
      override: [wikiLinkCompletion(getFiles)],
      activateOnTyping: true,
      closeOnBlur: true,
      maxRenderedOptions: 20,
      icons: false,
    }),

    // ── Keymaps. ORDER MATTERS — first match wins. ────────────────────────
    keymap.of([
      ...closeBracketsKeymap,
      ...completionKeymap,   // must precede defaultKeymap so Enter picks a completion
      ...formattingKeymap,   // Cmd+B / I / K
      ...markdownKeymap,     // Enter continues lists; Backspace unwinds markup
      ...searchKeymap,       // Cmd+F
      ...foldKeymap,
      ...historyKeymap,
      indentWithTab,         // Tab / Shift+Tab indent and outdent list items
      ...defaultKeymap,
    ]),

    // ── Appearance ────────────────────────────────────────────────────────
    editorTheme,
    syntaxTheme,
    livePreview,
    livePreviewClickHandler,
    ...(placeholder ? [cmPlaceholder(placeholder)] : []),
  ]
}
