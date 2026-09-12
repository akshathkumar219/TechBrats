# HARLEEN — Frontend Shell, Case Tree, Proposal Panel

**Read `docs/CASE_MODEL.md` first.**

**Track:** everything a judge sees before the graph loads, plus the one panel
that makes the AI trustworthy.
**Clock:** 16 working hours.
**You own exclusively:** `web/src/index.css`, `web/src/components/`,
`web/src/editor/`, `web/src/lib/`, `web/src/state/`, `web/src/fs/`,
`web/src/proposals/`, `web/public/`
**Prompts:** HAR-T01 → T07, in `docs/BUILD_PROMPTS.md`

---

## Start here: your old roadmap is already built

The editor shell, design tokens, three-pane layout, file tree, CodeMirror
editor, live preview, wiki-link autocomplete, backlinks and global search all
**exist and work** in `web/src/`. Akshath built them before the team formed.

You are not rebuilding any of it. You **own** it now, and your track is the ten
hours of work that turns it from a working editor into a demo-grade product —
plus the Proposal panel, which is new and is the most important UI in the build.

---

## Roadmap

### W0–1 · Fonts and the token audit

- [ ] Self-host Inter, JetBrains Mono, **Noto Sans Devanagari** from the USB kit
      into `web/public/fonts/`. `font-display: swap`. Devanagari is not
      optional — half the FIR content is Devanagari and a fallback render looks
      broken on a projector.
- [ ] Audit `web/src/` for hardcoded hex, px sizes and spacing outside
      `index.css`. Replace with the existing tokens. **Nobody writes a hex code
      after this lands.** If someone needs a colour that isn't a token, they ask
      you and you add it.

### W1–3 · Case-folder tree

- [ ] The left rail now shows **cases**, not one flat vault:
      `Case_01_.../`, `Case_02_.../`, each containing the numbered subfolders
      from `CASE_MODEL.md` §3.
- [ ] Type icons per folder. Person rows show `role:` from frontmatter as a
      small badge — accused, witness, complainant. **Never invent a label the
      record doesn't carry.**
- [ ] Rails collapsible, widths draggable, persisted to `localStorage`.
- [ ] Status bar: case name, evidence-verified state, note count, link count.
- [ ] Desktop-only guard below 1280px. Don't build responsive — it's a police
      workstation tool and saying so is a feature.

### W3–5 · The graph seam 🔴 talk to Akshath and AKTA first

- [ ] The centre pane toggles between editor and AKTA's graph canvas
      **without remounting either.** Keep both mounted, toggle with `hidden`.
      If the canvas remounts, the layout re-runs and the graph jumps.
- [ ] One stable container div the graph attaches to once, at mount, forever.

### W5–8 · Raw Inputs and the button

- [ ] Drop zone on `00_Raw_Inputs/` → calls Shourya's `POST /api/ingest`.
- [ ] Locked files render with a lock glyph and a muted row. Showing the
      guarantee before anyone clicks is a demo beat Akshath will point at.
- [ ] A write attempt on a locked file surfaces the refusal as a toast, not a
      silent failure. Tone from `design-system.md` §7.
- [ ] **The Analyse case button.** Prominent, one per case, calls
      `POST /api/case/analyse`. Loading state that shows *which* agent is
      running, not a spinner — on stage, visible work reads as capability.

### W8–12 · 🏆 The Proposal panel — `web/src/proposals/`

The most important thing in your track. This is what turns the AI from a slop
generator into an analyst with a human editor.

- [ ] Three sections from `AnalysisResult`: **New Connections**, **Files to
      Update**, **Summary**.
- [ ] Every proposed connection is a card: what it claims, why, the source file
      and locator as a clickable chip, the model's confidence, and **Accept /
      Reject**.
- [ ] Accept calls `POST /api/proposal/{id}/accept` — Akshath's linker writes
      the link. Reject logs it. The card animates out either way.
- [ ] **Files to Update are read-only suggestions.** No accept button, no edit
      button. Text saying what to add and where. The AI does not edit note
      bodies and the UI must make that obvious.
- [ ] A count of AI-added links somewhere visible, with a way to see them all.

### W12–14 · `openFileAt` 🔴 blocks AKTA and Hermaine

- [ ] `openFileAt(path, line, span?)` — opens the file, scrolls to the line,
      highlights the span. Works whether or not the file is open and whether or
      not the editor is the visible pane.
- [ ] A right-rail panel host so the copilot, the graph inspector and the
      proposal panel mount without anyone editing your layout files.
- [ ] **Ship this at W12.** AKTA and Hermaine both need it and neither has hours
      at W15. Agree the signature with both before you build it.

### W14–16 · Polish 🔴 after feature freeze

Empty states for every pane, using Mehul's shared components. Loading
skeletons, not spinners. Focus ring and hover state on every interactive
element. Then walk the whole UI at 1920×1080 on the demo laptop and **list every
misalignment before fixing any of them.**

Copy tone throughout: *"Named as accused in 3 FIRs"*, never *"High risk
individual."*

---

## Do not build

Light mode · responsive layouts · a tag pane · an outline pane · fuzzy search
ranking · anything after W13.

## If you get ahead

Ask Akshath first. In rough order of value: help Hermaine with the copilot
panel; the Devanagari display-gloss side panel with its `MACHINE TRANSLATION —
NOT A SOURCE` banner; graph-view-from-editor.
