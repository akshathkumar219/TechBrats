# HARLEEN — Frontend: Shell, Editor, Wiki-links, Search

**Your track:** the "Obsidian for police" claim. Everything a judge sees before the graph even loads.
**Your clock:** 16 working hours.
**Files you own exclusively:** `web/src/styles/`, `web/src/layout/`, `web/src/editor/`, `web/src/tree/`, `web/src/search/`
**You depend on:** Akshath's `mocks.py` (W2). After that, nothing — you are never blocked on a backend person.

---

## Why this track matters

The product claim is *"Obsidian's muscle memory, purpose-built for a detective."* The graph proves the intelligence; **your track proves the claim.** If the editor feels like a real editor — links autocomplete, backlinks appear, search is instant — the whole product reads as a tool someone could actually work in. If it feels like a textarea, the graph looks like a science project bolted to a form.

You have the least dependency and the most surface. That means you set your own pace and you own the quality bar for the visual layer. Read `design-system.md` cover to cover in your first 20 minutes — a lot of your work is faithful transcription rather than invention, which is a gift: **the design decisions are already made, so spend your hours on execution quality instead of deliberation.**

---

## Roadmap

### W0–2 · Foundation

- [ ] Vite + React + TypeScript + Tailwind. `npm ci` from the pre-warmed cache — do **not** hit the network.
- [ ] **`web/src/styles/tokens.css`** — every token from `design-system.md §1` as a CSS custom property. All of them, including the ones nothing uses yet. Colours, type scale, spacing, radii, shadows, the edge-status palette.
  - Tailwind config reads from these vars, not from hardcoded hex. One place to change a colour; every component follows.
  - **Nobody in the room is allowed to write a hex code after this lands.** If someone needs a colour that isn't a token, they ask you and you add the token.
- [ ] Fonts from the USB kit, self-hosted: Inter, JetBrains Mono, Noto Sans Devanagari. `@font-face` with `font-display: swap`. **Noto Devanagari is not optional** — half the FIR content is Devanagari and a fallback-font render looks broken on a projector.
- [ ] Commit and push. Tell the room tokens are live.

### W2–5 · Three-pane shell — `web/src/layout/`

- [ ] Layout per `design-system.md §2`: left rail (vault tree) · centre (editor or canvas) · right rail (inspector / backlinks / centrality)
- [ ] Title bar: case name, vault path, offline indicator
- [ ] Status bar: vault hash status (Shourya's endpoint feeds this — mock it until W8), doc count, node/edge count
- [ ] Rails collapsible, widths draggable, widths persisted in `localStorage`
- [ ] Desktop-only guard: below 1280px show a clean "SyndicateBrain requires a desktop display" panel. Don't build responsive — it's a police workstation tool and saying so is a feature.
- [ ] **Pane-swap without remount.** The centre pane switches between editor and graph canvas. Akshath's Cytoscape instance must survive that switch — if the canvas remounts, layout re-runs and the graph jumps. Keep both mounted, toggle visibility with `hidden`.

> ⚠️ Talk to Akshath before you finalise the centre pane container. This is the one integration seam in your track and getting it wrong costs him an hour of perf debugging that isn't his fault.

### W5–7 · Vault tree — `web/src/tree/`

- [ ] Tree from `/api/vault/tree` (mocked until Shourya's real one lands ~W9). Folder structure exactly as `blueprint.md §3` — `01_Evidence_Inbox/`, `Suspects/`, `Phones/`, `Locations/`, `Events/`, `Organisations/`, `Hypotheses/`
- [ ] Type icons per `design-system.md §4`. Expand/collapse with state persisted.
- [ ] **Read-only files render with a lock glyph and a muted row.** Files under `01_Evidence_Inbox/` are locked by Law 1 — showing that in the tree makes the guarantee visible before anyone clicks anything. Cheap, and it's a demo beat Akshath can point at.
- [ ] Click opens in the editor. Active file highlighted.

### W7–11 · CodeMirror 6 editor — `web/src/editor/`

The biggest single piece of your track. Budget the full four hours.

- [ ] `@uiw/react-codemirror`, markdown mode, `oneDark`-derived theme built from **your tokens**, not the stock palette
- [ ] Live preview — headings, bold/italic, lists, code, blockquotes styled inline as you type (Obsidian's Live Preview model, not a split pane)
- [ ] **Content column caps at 72ch, centred** (`design-system.md:96`). Full-window-width FIR narratives are exhausting to read and judges will be reading over your shoulder.
- [ ] Devanagari and Latin in the same line must both look correct — mixed-script FIR narratives are the normal case here, not an edge case. Check line-height with a real code-mixed paragraph from Akshath's template early.
- [ ] Save on blur + `Cmd/Ctrl+S`. Never lose a keystroke.
- [ ] **Write attempts on a locked file surface the guard's refusal as a toast**, not a silent failure. Copy tone from `design-system.md §7`.

### W11–14 · Wiki-links and backlinks — the thing that makes it feel real

- [ ] **`[[` triggers autocomplete** over all vault note titles. Fuzzy match, keyboard-navigable, Enter inserts.
- [ ] Rendered links styled per tokens; **click navigates**, and a link to a note that doesn't exist yet renders in the "unresolved" style (Obsidian's behaviour — and for a detective, an unresolved link is a genuinely useful signal that an entity is named but not yet worked up)
- [ ] Alias syntax `[[Vikram Singh|the accused]]` — display text differs from target
- [ ] **Backlinks pane** in the right rail: every note that links here, with the surrounding line as context. This is the single highest-value feature in your track for the demo — it's what makes the vault feel like an investigation rather than a folder.

### W14–15 · Search

- [ ] Global search across note bodies. Debounced, results grouped by folder, match highlighted in context.
- [ ] Plain substring + case-insensitive is enough. **Do not build fuzzy ranking** — nobody in a 5-minute demo will type a typo, and the hours are better spent on the polish pass below.

### W15–16 · Polish pass 🔴 after feature freeze

Feature freeze is at W13 — from there your job is making what exists look finished. This is not filler; on a projector it is most of what judges perceive.

- [ ] Empty states for every pane: no vault open, empty folder, no backlinks, no search results. Copy tone from `design-system.md §7` — *"Named as accused in 3 FIRs"*, never *"High risk individual"*.
- [ ] Loading skeletons, not spinners
- [ ] Every interactive element has a visible focus ring and a hover state
- [ ] Walk the whole UI at 1920×1080 **on the demo laptop** and fix every misalignment you find

---

## Cut to Future Scope — do not build these

Quick switcher (`Cmd+O`) · frontmatter-as-properties-panel · tag pane · graph-view-from-editor · light mode · outline pane · fuzzy search ranking

We are not chasing feature count. **Six things that look and feel finished beat twelve that half-work** — everything above goes on the Future Scope slide as a deliberate decision.

---

## If you get ahead

In rough order of value: (1) help AKTA with the Provenance Inspector — it's React and it's on the critical path; (2) take the Devanagari display-gloss side panel with its `MACHINE TRANSLATION — NOT A SOURCE` banner (`architecture.md:249`) — small, and it plays extremely well with a judging panel; (3) quick switcher.

**Ask Akshath before starting any of them.** Do not add anything after W13.
