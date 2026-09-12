# CodeMirror 6 — what just landed

## 1. Install (registry was blocked from my shell, so run this yourself)

```bash
cd web
npm install codemirror @codemirror/state @codemirror/view @codemirror/commands \
  @codemirror/language @codemirror/language-data @codemirror/lang-markdown \
  @codemirror/autocomplete @codemirror/search @lezer/highlight
npm run dev
```

## 2. New files

```
src/editor/
├── theme.ts              CM6 theme + markdown syntax highlighting, built from the
│                         design tokens. No hardcoded colours.
├── extensions.ts         THE CONFIG. The "60% free" layer.
├── wikiLink.ts           [[ ]] completion source, native CM6
├── formatting.ts         Cmd+B / I / K / Shift+X / Shift+C
└── CodeMirrorEditor.tsx  React wrapper around EditorView
```

Changed: `src/components/Editor.tsx` (textarea → CodeMirrorEditor), `src/index.css`
(textarea rules → `.cm-host` rules).

## 3. What you get immediately, without writing code

From the stock extensions in `extensions.ts`:

| Behaviour | Source |
| :--- | :--- |
| Enter continues a list (`- `, `1. `, `- [ ] `) | `markdownKeymap` |
| Enter on an empty bullet exits the list | `markdownKeymap` |
| Ordered lists increment on Enter | `markdownKeymap` |
| Backspace unwinds list markup | `markdownKeymap` |
| Tab indents, Shift+Tab outdents | `indentWithTab` |
| Undo/redo grouped by typing burst | `history()` |
| Multi-cursor (Cmd+click, Alt+drag) | `allowMultipleSelections` + `rectangularSelection` |
| Find & replace (Cmd+F) | `searchKeymap` |
| Fold headings and lists | `foldGutter` + `foldKeymap` |
| Auto-pair brackets — `[` gives `[]` | `closeBrackets()` |
| Bracket-match highlight | `bracketMatching()` |
| Line wrapping with indent continuation | `EditorView.lineWrapping` |
| Code-fence syntax highlighting | `codeLanguages: languages` |
| Selection-match highlight | `highlightSelectionMatches()` |

Written by hand, small: Cmd+B/I/K formatting, and the `[[` completion source.

## 4. What is NOT here yet

**Live preview** — hiding `**` and `#` when the cursor is on another line.
That's section C of `docs/obsidian-editor-features.md`: one `StateField<DecorationSet>`,
then a dozen easy decorations on top of it. It is the next piece of work and the
only genuinely hard part left.

Until then, the syntax marks stay visible but are faded to `--text-faint`
(see `processingInstruction` in `theme.ts`). Headings already render at size,
bold renders bold, links render amber. It reads much closer to Obsidian than the
textarea did, with the raw marks still showing.

## 5. Now unused — delete once you've confirmed the build works

```
src/components/WikiAutocomplete.tsx
src/state/useWikiAutocomplete.ts
src/lib/caret.ts
```
CM6's `autocompletion()` replaces all three. Keep them until `npm run dev` is
clean, then remove.

## 6. Check these by hand

1. Type `- alpha`, press Enter → next line starts `- `
2. Press Enter on the empty bullet → bullet disappears
3. `1. one` Enter → `2. `
4. Tab on a list item indents it; Shift+Tab outdents
5. `- [ ] task` Enter → `- [ ] `
6. Select a word, Cmd+B → wrapped in `**`. Cmd+B again → unwrapped
7. Type `[[` → completion opens; arrows navigate; Enter inserts and closes `]]`
8. Cmd+F opens search
9. Hover the left gutter on a heading line → fold arrow appears
10. Switch notes → content swaps, no flicker, no lost edits
11. Edit → status goes `unsaved` → 1s → `saved`, and the file on disk changed

## 7. If something errors

CM6's API differs from CM5 and models routinely emit CM5 code. If an import
fails, check the CodeMirror 6 reference rather than trying variations of the
name. The most likely snag is a version mismatch between `@codemirror/*`
packages — if you see duplicate-state errors, run `npm dedupe`.
