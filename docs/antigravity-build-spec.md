# BUILD SPEC — Obsidian-style Markdown Vault Editor (Browser)

> Paste this whole file into Antigravity as the project brief. Then work through **Section 10** one step at a time — one step per session, one commit each. Do not ask it to build everything at once.

---

## 1. What We Are Building

A **local-first markdown note editor that runs in the browser** and reads/writes real `.md` files in a folder on the user's disk. It is a functional clone of Obsidian's core editing experience, minus everything a police investigation workbench does not need.

### Hard requirements (non-negotiable)

1. Runs at `localhost` in Chrome or Edge. **No backend, no server, no database.**
2. User clicks a button → native folder picker → chooses a folder on their disk.
3. The app lists every `.md` file in that folder and its subfolders, as a tree.
4. Clicking a file opens it; editing it **writes back to the real file on disk**.
5. User can create new notes and new folders from inside the app.
6. `[[Wiki-links]]` work: autocomplete while typing, clickable to navigate, and a backlinks panel.
7. Dark theme, three-pane layout, keyboard-driven.

### Explicitly NOT in scope

Mobile/responsive · login/accounts · cloud sync · plugins · themes · PDF export · image embeds · tables editor · Excalidraw · Dataview · spaced repetition · multiple vaults open at once.

---

## 2. Stack

| Layer | Choice | Why |
| :--- | :--- | :--- |
| Build tool | **Vite** | fast, zero config |
| Framework | **React 18 + TypeScript** | strict mode on |
| Styling | **Plain CSS + custom properties** | NOT Tailwind — v4 setup is a config rabbit hole and we are building six boxes |
| Markdown render | **`marked`** | one function call |
| Editor (Phase A) | **`<textarea>` + preview pane** | ships in one session |
| Editor (Phase B) | **CodeMirror 6** | true Obsidian-style live preview |
| File access | **File System Access API** | real disk read/write from the browser |
| Handle persistence | **`idb-keyval`** | remember the folder across reloads |

```bash
npm create vite@latest sb-vault -- --template react-ts
cd sb-vault
npm install
npm install marked idb-keyval
npm run dev
```

Phase B adds:
```bash
npm install codemirror @codemirror/state @codemirror/view @codemirror/language @codemirror/commands @codemirror/lang-markdown @lezer/highlight
```

---

## 3. The Critical Piece — File System Access API

This is the whole reason the app can work with no backend. **Read this section carefully before writing any file code.**

### Browser support

**Chrome and Edge only.** Firefox and Safari do not support `showDirectoryPicker`. Detect it on boot and show a clear message rather than failing silently:

```ts
export const fsSupported = 'showDirectoryPicker' in window;
```

It also requires a **secure context** — `localhost` counts, so dev works fine.

### Opening a folder

Must be triggered by a real user gesture (a click). It cannot run on page load.

```ts
export async function pickVault(): Promise<FileSystemDirectoryHandle> {
  const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
  await idbSet('vaultHandle', handle);   // persist for next launch
  return handle;
}
```

### Walking the folder recursively

```ts
export interface VaultFile {
  path: string;                         // "Suspects/Vikram Singh.md"
  name: string;                         // "Vikram Singh.md"
  handle: FileSystemFileHandle;
}

export async function walkVault(
  dir: FileSystemDirectoryHandle,
  prefix = ''
): Promise<VaultFile[]> {
  const out: VaultFile[] = [];
  for await (const entry of dir.values()) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.kind === 'directory') {
      if (entry.name.startsWith('.')) continue;          // skip .obsidian, .git
      out.push(...await walkVault(entry, path));
    } else if (entry.name.endsWith('.md')) {
      out.push({ path, name: entry.name, handle: entry });
    }
  }
  return out;
}
```

### Reading and writing

```ts
export async function readFile(h: FileSystemFileHandle): Promise<string> {
  const file = await h.getFile();
  return file.text();
}

export async function writeFile(h: FileSystemFileHandle, text: string): Promise<void> {
  const w = await h.createWritable();
  await w.write(text);
  await w.close();                       // MUST close or nothing is saved
}
```

### Creating files and folders

```ts
// nested path like "Suspects/New Note.md" — walk/create each segment
export async function createNote(
  root: FileSystemDirectoryHandle,
  path: string
): Promise<FileSystemFileHandle> {
  const parts = path.split('/');
  const filename = parts.pop()!;
  let dir = root;
  for (const part of parts) {
    dir = await dir.getDirectoryHandle(part, { create: true });
  }
  return dir.getFileHandle(filename, { create: true });
}
```

### Restoring the folder after a reload

Handles survive in IndexedDB, but **permission does not persist automatically** — it must be re-granted with a user gesture.

```ts
import { get as idbGet, set as idbSet } from 'idb-keyval';

export async function restoreVault(): Promise<FileSystemDirectoryHandle | null> {
  const handle = await idbGet<FileSystemDirectoryHandle>('vaultHandle');
  if (!handle) return null;
  const opts = { mode: 'readwrite' as const };
  if (await handle.queryPermission(opts) === 'granted') return handle;
  return null;  // show a "Reopen <folder name>" button; requestPermission on click
}
```

On boot: if a stored handle exists but permission isn't granted, show a button reading **"Reopen <folder name>"**. Clicking it calls `handle.requestPermission({mode:'readwrite'})` — that's the user gesture — then loads the vault.

### Autosave with debounce

Obsidian batches keystrokes into a debounced disk flush rather than writing on every keypress. Do the same: **1000 ms debounce**, plus an immediate flush when the user switches notes or the window loses focus.

```ts
const timer = useRef<number>();
function scheduleSave(handle: FileSystemFileHandle, text: string) {
  clearTimeout(timer.current);
  setStatus('unsaved');
  timer.current = window.setTimeout(async () => {
    await writeFile(handle, text);
    setStatus('saved');
  }, 1000);
}
```
Flush immediately on note switch and on `visibilitychange`. Never leave an unsaved buffer when the note changes — that's how users lose work.

### TypeScript types

The File System Access API types may not be in your `lib.dom`. If TS complains, add:
```bash
npm install -D @types/wicg-file-system-access
```
and add `"wicg-file-system-access"` to `compilerOptions.types` in `tsconfig.json`.

---

## 4. Project Structure

```
src/
├── main.tsx
├── App.tsx                    ← layout shell + top-level state
├── index.css                  ← design tokens + layout grid
├── fs/
│   ├── vault.ts               ← pickVault, walkVault, readFile, writeFile, createNote
│   └── persist.ts             ← idb handle storage, restoreVault
├── state/
│   └── useVault.ts            ← the single store: files, activeFile, content, dirty
├── components/
│   ├── TitleBar.tsx
│   ├── FileTree.tsx           ← left rail
│   ├── Editor.tsx             ← centre: textarea + preview
│   ├── Preview.tsx            ← rendered markdown, wiki-link click handling
│   ├── Backlinks.tsx          ← right rail
│   ├── WikiAutocomplete.tsx   ← the [[ dropdown
│   ├── QuickSwitcher.tsx      ← Cmd+O modal
│   ├── CommandPalette.tsx     ← Cmd+P modal
│   ├── SearchPanel.tsx        ← Cmd+Shift+F
│   └── StatusBar.tsx
└── lib/
    ├── markdown.ts            ← marked config + wiki-link pre-processing
    ├── links.ts               ← extract [[links]], resolve, build backlink index
    └── frontmatter.ts         ← parse/serialise YAML frontmatter
```

**One rule: only `src/fs/` touches the File System Access API.** Everything else works with plain strings and a file list. This keeps components testable and makes it trivial to swap in a real backend later.

---

## 5. Layout

Desktop only. **One breakpoint.** Below 1280px wide, show a "window too small" message instead of reflowing.

```css
.app {
  display: grid;
  height: 100vh;
  grid-template-columns: 240px 1fr 320px;
  grid-template-rows: 40px 1fr 24px;
  grid-template-areas:
    "title  title   title"
    "left   center  right"
    "status status  status";
}
.title  { grid-area: title;  }
.left   { grid-area: left;   overflow-y: auto; }
.center { grid-area: center; overflow: hidden; }
.right  { grid-area: right;  overflow-y: auto; }
.status { grid-area: status; }
```

| Region | Contents |
| :--- | :--- |
| **Title bar** (40px) | vault name · `+ New note` · `+ New folder` · `Open folder` |
| **Left rail** (240px) | search box, then the file tree — folders collapsible, `.md` files listed without the extension |
| **Centre** (flex) | the editor. Split view: raw markdown left, rendered preview right. Toggle to preview-only with `Cmd+E`. |
| **Right rail** (320px) | Backlinks panel (linked mentions + unlinked mentions), collapsible sections |
| **Status bar** (24px) | current file path · word count · `saved` / `unsaved` indicator |

Editor and preview columns are each capped at **72ch** content width, centred. Full-window-width prose is exhausting to read.

---

## 6. Design Tokens

Put this in `index.css` under `:root` and use `var(--token)` everywhere. **No hardcoded colours anywhere in any component.**

```css
:root {
  /* Surfaces */
  --bg-void:      #0B0C0E;
  --bg-base:      #131519;
  --bg-raised:    #1A1D22;
  --bg-overlay:   #22262C;
  --bg-inset:     #0E1013;

  /* Lines */
  --border:       #2A2F36;
  --border-strong:#3A414A;

  /* Text */
  --text-primary: #E6E8EA;
  --text-body:    #C4C9CF;
  --text-muted:   #8A9099;
  --text-faint:   #5A616B;
  --text-inverse: #0B0C0E;

  /* Semantic */
  --accent:       #E8B04B;   /* amber — links, selection, primary action */
  --accent-dim:   #8A6B2E;
  --accent-bg:    rgba(232,176,75,0.10);
  --danger:       #D4574E;
  --ok:           #5FA774;
  --info:         #5B8FC7;

  /* Type */
  --font-ui:   "Inter", system-ui, sans-serif;
  --font-note: "Inter", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;

  --fs-xs: 11px; --fs-sm: 12px; --fs-base: 13px;
  --fs-md: 15px; --fs-lg: 18px; --fs-xl: 22px;

  /* Space — 4px grid */
  --s1:4px; --s2:8px; --s3:12px; --s4:16px; --s5:24px; --s6:32px;

  --r-sm:4px; --r-md:6px; --r-lg:10px;
  --t-fast: 120ms cubic-bezier(0.2,0,0,1);
}
```

| Element | Font | Size | Line height |
| :--- | :--- | :--- | :--- |
| UI, tree, menus | `--font-ui` | 13px | 1.4 |
| Note body | `--font-note` | 15px | 1.65 |
| Note H1 / H2 / H3 | `--font-ui` 600 | 22 / 18 / 15px | 1.3 |
| Code, frontmatter | `--font-mono` | 12px | 1.5 |

Wiki-links render in `--accent`. Unresolved wiki-links (pointing at a note that doesn't exist) render in `--accent` at 50% opacity with a dashed underline — clicking one creates the note. That's Obsidian's behaviour and it's worth copying exactly.

---

## 7. Phase A — Features & Acceptance Criteria

Each row is one build step. **Ship and verify each before starting the next.**

| # | Feature | Done when |
| :-- | :--- | :--- |
| A1 | Layout shell + tokens | Six regions render at correct sizes, dark, "too small" message below 1280px |
| A2 | Open folder + file tree | Click "Open folder" → pick a real folder → every `.md` in it and its subfolders appears in a collapsible tree |
| A3 | Open & render a note | Click a file → its real content appears in the textarea and renders in the preview |
| A4 | Edit & autosave | Type → status shows `unsaved` → 1s later shows `saved` → the file on disk has actually changed (verify in Finder/Explorer) |
| A5 | Reopen on reload | Refresh the page → "Reopen <folder>" button → click → same vault loads with no re-picking |
| A6 | New note / new folder | Create both from the title bar; they appear on disk immediately |
| A7 | Wiki-link rendering | `[[Some Note]]` renders as an amber link; unresolved ones dashed at 50% |
| A8 | Wiki-link navigation | Click a link → opens that note. Click an unresolved one → creates it, then opens it |
| A9 | Wiki-link autocomplete | Typing `[[` opens a dropdown of note names; filters as you type; Enter inserts + closes `]]`; Esc closes; ↑↓ navigate |
| A10 | Backlinks panel | Right rail lists every note containing `[[Current Note]]`, with the surrounding line as context |
| A11 | Quick switcher | `Cmd/Ctrl+O` → fuzzy-filter modal over note names → Enter opens |
| A12 | Global search | `Cmd/Ctrl+Shift+F` → search all note contents → results with matching line, click to open |
| A13 | Command palette | `Cmd/Ctrl+P` → list of commands (new note, toggle preview, open folder…) |
| A14 | Frontmatter panel | YAML frontmatter at the top of a note renders as a key/value properties table in the preview, not as raw text |

**A9 is the fiddliest step in the whole build.** Budget the most time there. The trap: tracking the cursor position in the textarea and keeping the dropdown in sync as the user types and deletes.

---

## 8. Phase B — CodeMirror 6 Live Preview (optional, do after Phase A works)

Obsidian's editor is CodeMirror 6 with the Lezer incremental parser. The document in memory is always **pure plaintext markdown** — it is never HTML. Live preview is achieved with a `StateField<DecorationSet>`: when the cursor is outside a markdown token, `ReplaceDecoration` / `WidgetDecoration` swap the raw syntax for styled DOM; when the cursor enters the token, the decoration collapses and the raw syntax reappears for editing.

**Implement it that way if you attempt Phase B.** Never use `contenteditable` and never store HTML — that's the corruption path.

```
Phase B steps:
B1 · Replace the textarea with a CM6 EditorView, markdown language extension, dark theme from our tokens
B2 · Syntax highlighting for markdown tokens
B3 · A StateField<DecorationSet> that hides `**` `_` `#` marks when the cursor is not on that line
B4 · WidgetDecoration rendering [[links]] as clickable chips
B5 · Autocomplete via @codemirror/autocomplete instead of the custom dropdown
```

**Warning for the AI agent:** CodeMirror 6's API differs substantially from CodeMirror 5, and models frequently emit CM5 code or invented APIs. If a suggested import or method fails, check it against the CodeMirror 6 reference rather than trying variations. If B3 costs more than a session, stop — Phase A's split view is a perfectly good demo.

---

## 9. Known Traps

| Trap | Avoid it by |
| :--- | :--- |
| `createWritable()` without `close()` | Nothing is written. Always `await w.close()`. |
| Picker called without a user gesture | Only call `showDirectoryPicker` from a click handler. |
| Permission lost on reload | Store the handle in IndexedDB, then `requestPermission` behind a button click. |
| Writing on every keystroke | Debounce 1000ms. Flush on note switch and `visibilitychange`. |
| Losing edits when switching notes | Flush the buffer synchronously before loading the next file. |
| Re-walking the whole folder on every change | Walk once on open; update the in-memory list on create/delete. |
| Rebuilding the backlink index on every keypress | Build it once after the vault loads; update only the edited note's entry. |
| `.obsidian` / `.git` folders in the tree | Skip any directory starting with `.` |
| Firefox/Safari users seeing a blank app | Feature-detect on boot and show a clear "Chrome or Edge required" message. |
| Hardcoded hex colours | Every colour is `var(--token)`. No exceptions. |

---

## 10. Build Order — One Prompt Per Session

Run these in order. After each, verify the acceptance criterion, then commit.

```
STEP 1  Read the spec. Scaffold Vite + React + TS. Create index.css with the
        full token block from Section 6 and the layout grid from Section 5.
        Build App.tsx as the six-region shell with placeholder divs.
        Add the "window too small" guard below 1280px.
        Nothing else. → verify A1

STEP 2  Implement src/fs/vault.ts exactly as specified in Section 3:
        pickVault, walkVault, readFile, writeFile, createNote.
        Add src/fs/persist.ts with idb-keyval for handle storage and restoreVault.
        Add the feature-detect for showDirectoryPicker.
        Wire an "Open folder" button in the title bar and render the returned
        file list as a flat list in the left rail. → verify A2

STEP 3  Turn the flat list into a collapsible folder tree. Skip dot-directories.
        Show file names without the .md extension. → verify A2 fully

STEP 4  Clicking a file reads it and shows the raw text in a textarea in the
        centre pane, with a rendered preview beside it using marked. → verify A3

STEP 5  Debounced autosave per Section 3. Status bar shows saved/unsaved.
        Flush on note switch and on visibilitychange. → verify A4

STEP 6  Restore-on-reload flow with the "Reopen <folder>" button. → verify A5

STEP 7  New note and new folder from the title bar, with nested path support.
        → verify A6

STEP 8  Wiki-link rendering: pre-process [[X]] before marked, style resolved
        vs unresolved differently. → verify A7

STEP 9  Wiki-link click navigation, including create-on-click for unresolved.
        → verify A8

STEP 10 Wiki-link autocomplete dropdown. Take your time here. → verify A9

STEP 11 Backlinks panel in the right rail with line context. → verify A10

STEP 12 Quick switcher (Cmd+O). → verify A11

STEP 13 Global search (Cmd+Shift+F). → verify A12

STEP 14 Command palette (Cmd+P). → verify A13

STEP 15 Frontmatter properties panel. → verify A14
```

---

## 11. Standing Instructions For The Agent

- **Never** import `fs`, `path`, `child_process`, or any Node API. This is a browser app.
- **Only** `src/fs/` may call File System Access APIs.
- **No** hardcoded colours, sizes or fonts — use the tokens.
- **No** new dependencies without justification; every one is bundle size.
- Strict TypeScript. No `any` without a comment explaining why.
- Keep components under ~150 lines. Split when they grow.
- After each step, state the acceptance criterion and how you verified it.
- If a step is taking more than one session, stop and report what's blocking rather than half-finishing it.
