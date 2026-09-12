# AKTA — Graph View + Edge Inspector

**Read `docs/CASE_MODEL.md` first**, especially §4 on link format.

**Track:** the visual half of the product — the button that turns a folder of
notes into a network.
**Clock:** 16 working hours.
**You own exclusively:** `web/src/graph/`, `web/src/inspector/`
**You depend on:** Akshath's `schemas.py` (W2). Nothing after that — you build
against mocks until real notes exist.
**Prompts:** AKT-T01 → T05, in `docs/BUILD_PROMPTS.md`

---

## Why this track changed, and why it's yours

The entity-resolution pipeline you were going to own is gone — the model does
most of that in-prompt now, and what's left is conservative identifier matching
that lives in the agent layer. What replaced it is bigger and more visible: the
graph is the demo's centrepiece, and it's the hardest frontend work in the
build.

**There is no graph database.** The vault is the database. You parse markdown
notes and their wiki-links into a node/edge set and render it. That means the
picture on stage is *provably* the same thing as the files on disk — there is no
second store that can drift. It also means your parser is the only thing
standing between a correct vault and a wrong graph.

---

## Roadmap

### W2–5 · `web/src/graph/parse.ts` — vault to graph

- [ ] Walk a case folder. Every entity note is a node: id, type, display name,
      `role:` if present, all from frontmatter.
- [ ] Every line in a note's `## Links` section is an edge. Parse the target,
      the reason text, the `^[source locator]` citation, and the trailing
      `<!-- ai:... -->` marker if there is one.
- [ ] **An edge with no resolvable citation does not render.** Log it loudly
      instead — a link without a source is a bug in whoever wrote it.
- [ ] An unresolved wiki-link (target note doesn't exist) renders as a distinct
      node style, not as an error. For a detective an unresolved link is a
      useful signal: named but not yet worked up.
- [ ] Pure function, no React, fully unit-testable. Write the tests.

### W5–9 · `web/src/graph/engine.ts` — Cytoscape

- [ ] Cytoscape + `cose-bilkent`, **fixed layout seed.** Identical vault must
      produce the identical picture every run. You will see this demoed five
      times and judges notice if it jumps.
- [ ] **Render budget before styling.** Target 2,000 nodes / 8,000 edges at
      interactive pan-zoom: `hideEdgesOnViewport: true`,
      `textureOnViewport: true`, `pixelRatio: 1`, default filter to top-N by
      degree with everything else behind "show all". Benchmark on a generated
      2,000-node fixture, not on the 20-node mock.
- [ ] Imperative API so nobody else opens your file:
      `focusNode(id)`, `applyFilter(pred)`, `setSelection(ids)`, `fitTo(ids)`,
      plus a selection-change event others subscribe to.
- [ ] Mount into Harleen's stable container **once**. Never remount — talk to
      her about the seam at W3, not at W9.

### W9–12 · Two edge classes 🔴 the thing that makes the AI honest

This is Law 2 made visible and it is not optional.

- [ ] **Record-derived edges** — parsed from a CDR row or an FIR line, written
      by a human or by a deterministic rule. Solid, amber, full weight.
- [ ] **AI-proposed edges** — carrying an `ai:` marker. Dashed, magenta,
      visually distinct at a glance across a room.
- [ ] A **Leads layer toggle** that hides every AI-derived edge. Pressing it on
      stage and watching the graph thin out is a fifteen-second answer to "how
      much of this did the machine make up?"
- [ ] Colours from `design-system.md` §4, as tokens. AKTA's magenta edge and the
      proposal card's magenta badge must visibly agree — same token, not two
      similar hexes.

### W12–15 · `web/src/inspector/` — click an edge

- [ ] Right-rail panel, mounts into Harleen's panel host, opens on edge
      selection.
- [ ] Shows: the claim, the reason, the source file with its type badge, the
      locator as `p:3 line:11` or `row:48219`, and **the raw source snippet**,
      ±2 lines, monospace, matched span highlighted. Raw — not paraphrased, not
      translated, not cleaned. The rawness is the guarantee.
- [ ] Whether the edge is record-derived or AI-accepted, and if AI-accepted, who
      accepted it and when.
- [ ] Clicking the locator calls Harleen's `openFileAt(path, line, span)` —
      opens the note, scrolls, highlights. **Agree the signature with her at
      W12**, she has the hours then and not at W15.

> *"Here is the connection. Here is the exact line in the original FIR it came
> from."* That is the most persuasive fifteen seconds available to this project.

### W15–16 · Focus mode and states 🔴 after freeze

- [ ] `F` on a selected node dims everything more than one hop away. Escape
      clears.
- [ ] Empty: no case open. Empty: case has no links yet. Loading skeleton.
      Error: parse failed, naming the file that broke it.

---

## Do not build

A graph database · Leiden/CPM community hulls · a GNN hypothesis sandbox ·
geospatial plotting · graph editing from the canvas (links are written by
Akshath's linker, never by the UI) · a second layout algorithm.

## Priority order if you run short

1. Parser correct + graph renders from real notes
2. Two edge classes visibly distinct + the Leads toggle
3. Edge inspector with the raw snippet
4. Click-through to the source line
5. Focus mode

If you're behind at W13, tell Akshath before he finds out at the W14 check.
