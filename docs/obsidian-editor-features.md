# Obsidian Editor — Feature Checklist

**How to use this:** tick what you actually want. Don't tick everything — tick what you'd notice missing. Then hand the ticked list back and it becomes a build spec.

**Effort key:** 🟢 free with a stock CodeMirror 6 extension · 🟡 small custom code · 🔴 real custom work

---

## A · List & Indentation Behaviour
*The stuff that makes typing notes feel right. Almost all free with CM6.*

- [ ] 🟢 **Enter continues a list** — Enter on `- item` gives you `- ` on the next line
- [ ] 🟢 **Enter on an empty bullet exits the list** — press Enter twice to stop listing
- [ ] 🟢 **Tab indents, Shift+Tab outdents** a list item
- [ ] 🟢 **Ordered lists auto-renumber** when you insert or delete an item
- [ ] 🟢 **Checkbox lists continue** — Enter on `- [ ] task` gives `- [ ] `
- [ ] 🟡 **Nested list bullets change glyph** by depth (• → ◦ → ▪)
- [ ] 🔴 **Drag a list item to reorder it**, children moving with it
- [ ] 🟡 **Cmd+↑ / Cmd+↓ moves the current line** up or down

## B · Formatting Shortcuts
*Mostly one keymap entry each.*

- [ ] 🟡 **Cmd+B** wraps selection in `**`, and unwraps if already bold
- [ ] 🟡 **Cmd+I** wraps in `*` / unwraps
- [ ] 🟡 **Cmd+K** wraps in `[selection](url)` with the cursor in the url
- [ ] 🟡 **Select text, type `[`** → wraps it rather than replacing it (same for `(`, `"`, `` ` ``)
- [ ] 🟢 **Auto-pair brackets** — typing `[` gives `[]` with the cursor between
- [ ] 🟡 **Typing `[[`** opens the note autocomplete
- [ ] 🟡 **Cmd+E** toggles edit ↔ preview
- [ ] 🟡 **Paste a URL over selected text** → becomes `[selected](url)`

## C · Live Preview Rendering
*The `StateField<DecorationSet>` work — syntax marks hide when the cursor is elsewhere and reappear when you move onto the line. This is the real Obsidian feel, and the real custom work.*

- [ ] 🔴 **The decoration engine itself** — hide/reveal on cursor position. Build this first; everything below is then incremental.
- [ ] 🟡 **Headings render at size**, `#` marks hidden
- [ ] 🟡 **Bold / italic render**, `**` and `*` hidden
- [ ] 🟡 **`- ` renders as a bullet glyph**, the dash hidden
- [ ] 🟡 **`[[Links]]` render as chips** — amber, no brackets shown
- [ ] 🟡 **Blockquotes get a left border**, `>` hidden
- [ ] 🟡 **Checkboxes render as real clickable boxes** — clicking one edits the file
- [ ] 🟡 **Code blocks get a background** and monospace
- [ ] 🔴 **Tables render as tables** (pipes hidden)
- [ ] 🟡 **Horizontal rules render as a line**
- [ ] 🟡 **Tags `#tag` render as pills**
- [ ] 🔴 **Callouts** — `> [!note]` renders as a coloured box

## D · Navigation & Structure

- [ ] 🟢 **Fold headings** — click the gutter arrow to collapse a section
- [ ] 🟢 **Fold list items**
- [ ] 🟡 **Outline panel** — document headings listed in the right rail, click to jump
- [ ] 🟡 **Frontmatter as a properties table** instead of raw YAML
- [ ] 🟡 **Sticky heading** — the current section's heading pinned at the top while scrolling

## E · Editor Quality-of-Life
*Free, and their absence is immediately noticeable.*

- [ ] 🟢 **Undo/redo grouped by typing burst**, not per keystroke
- [ ] 🟢 **Multi-cursor** (Cmd+click, Cmd+D for next occurrence)
- [ ] 🟢 **Find & replace within a note** (Cmd+F)
- [ ] 🟢 **Line wrapping** with proper indent continuation
- [ ] 🟢 **Bracket matching highlight**
- [ ] 🟡 **Cursor position remembered** per note when you switch away and back
- [ ] 🟡 **Word count + character count** in the status bar
- [ ] 🟡 **Typewriter scrolling** (current line stays centred) — optional, some people hate it

## F · Deliberately Out of Scope

Not building these, and the police use case doesn't need them:

Graph view styling options · plugins/community themes · Excalidraw · Dataview · spaced repetition · PDF annotation · image embeds & attachments · audio recorder · slides mode · sync · publish · mobile · multiple vaults · vim mode · LaTeX math.

---

## What You Get For Almost Free

Switching from `<textarea>` to CodeMirror 6 with these stock extensions hands you most of section A, all of section E, and section D's folding — before you write any custom code:

```ts
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { markdown } from '@codemirror/lang-markdown';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { closeBrackets, closeBracketsKeymap, autocompletion } from '@codemirror/autocomplete';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { foldGutter, foldKeymap, indentOnInput, bracketMatching } from '@codemirror/language';
```

`@codemirror/lang-markdown` ships `insertNewlineContinueMarkup` — that alone gives list continuation, empty-bullet exit, and checkbox continuation.

**So the honest split:** roughly 60% of "it feels like Obsidian" is configuration. The remaining 40% is section C, and section C is really *one* hard thing (the decoration engine) followed by a dozen easy ones.
