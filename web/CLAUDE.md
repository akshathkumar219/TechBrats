# SyndicateBrain — Vault Editor

Obsidian-style markdown vault editor. Runs in the browser, reads and writes real
`.md` files on disk via the File System Access API. No backend, no server, no database.

This is the editor half of SIH26189 — an offline criminal-network investigation
workbench for police. Right now we are building **only** the note-taking core.

---

## Hard Rules

1. **Browser only.** Never import `fs`, `path`, `child_process`, or any Node API.
2. **Only `src/fs/` touches File System Access APIs.** Everything else works with
   plain strings and a `VaultFile[]`.
3. **No hardcoded colours, sizes or fonts.** Every value is a `var(--token)` from
   `src/index.css`. CM6 styling reads the same tokens via `src/editor/theme.ts`.
4. **Chrome/Edge only** — `showDirectoryPicker` doesn't exist elsewhere. Feature-detect
   and show a message; never fail silently.
5. **Never lose an edit.** Autosave is debounced 1000ms; flush immediately on note
   switch and on `visibilitychange`.
6. **Desktop only.** One breakpoint. Below 1280px show "window too small" — never reflow.

---

## Layout

```
src/
├── App.tsx                 six-region shell + top-level state
├── index.css               design tokens + grid + component CSS
├── fs/
│   ├── vault.ts            pickVault, walkVault, readFile, writeFile, createNote
│   └── persist.ts          idb-keyval handle storage, restore + re-permission
├── state/
│   ├── useVault.ts         THE store — files, activeFile, content, navigation
│   ├── useAutosave.ts      debounced write + save status
│   └── useNoteIndex.ts     backlink / link index
├── editor/                 ← CodeMirror 6 lives here
│   ├── extensions.ts       the config array. Start here.
│   ├── theme.ts            CM6 theme + markdown HighlightStyle, from tokens
│   ├── wikiLink.ts         [[ ]] completion source
│   ├── formatting.ts       Cmd+B / I / K keybindings
│   └── CodeMirrorEditor.tsx  React wrapper — view created ONCE, never remounted
├── components/             UI panes
└── lib/                    markdown, links, frontmatter, tree helpers
```

---

## CodeMirror 6 — read before touching the editor

- The document in memory is **always pure plaintext markdown.** Never HTML.
  Never use `contenteditable`. That is the file-corruption path.
- Live preview is achieved with a `StateField<DecorationSet>`: when the cursor is
  outside a markdown token, `Decoration.replace` / `Decoration.widget` swap the raw
  syntax for styled DOM; when the cursor enters the token the decoration collapses
  and the raw syntax reappears. This is how Obsidian does it and how we do it.
- **Keymap order in `extensions.ts` matters — first match wins.** `completionKeymap`
  must come before `defaultKeymap` or Enter inserts a newline instead of accepting
  a completion.
- **CM6 ≠ CM5.** The APIs differ substantially and LLMs frequently emit CM5 code or
  invent method names. If an import or method fails, check the CodeMirror 6
  reference — do not try variations of the name.
- The `EditorView` is created once on mount. Switching notes dispatches a
  document-replacing transaction. Never remount the view on file change.

---

## Specs

| Doc | Contents |
| :--- | :--- |
| `../docs/obsidian-editor-features.md` | The feature checklist. Ticked items are the backlog. |
| `../docs/antigravity-build-spec.md` | Full app spec — layout, tokens, File System Access API |
| `../docs/design-system.md` | Tokens, typography, component specs |
| `./CM6-SETUP.md` | What the CM6 layer contains and the manual test list |

Read the relevant section before building. Do not invent an approach that
contradicts them.

---

## How To Work In This Repo

- **One behaviour per session.** Editor behaviours interact; a batch that
  half-works is untraceable. Never build three features at once.
- **State the acceptance criterion before you start**, and show how you verified it
  before you claim done.
- **Commit after each behaviour.** Message = what changed, one line.
- After edits, run `npm run build` (tsc + vite) and fix type errors before reporting done.
- If a task is taking more than one session, **stop and report what's blocking**
  rather than half-finishing it.
- No new dependencies without justification. This ships offline to police laptops;
  every dependency is bundle size and audit surface.
- Strict TypeScript. No `any` without a comment saying why.
- Keep components under ~150 lines.

---

## Current State

**Done:** vault open/reopen, file tree, read/write with debounced autosave, new
note + folder, `[[link]]` rendering + navigation + create-on-click, backlinks,
quick switcher, global search, command palette, frontmatter panel. CM6 swapped in
for the textarea with full stock config.

**Next:** live-preview decorations — section C of the feature checklist. One
`StateField<DecorationSet>` first, then individual decorations on top of it.

**Dead files, delete once the build is verified clean:**
`src/components/WikiAutocomplete.tsx`, `src/state/useWikiAutocomplete.ts`,
`src/lib/caret.ts` — CM6's `autocompletion()` replaces all three.
