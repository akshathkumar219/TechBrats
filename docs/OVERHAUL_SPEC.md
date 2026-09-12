# SyndicateBrain — Audit & Overhaul Spec

**Author:** Opus 5 (audit) · **Implementer:** Sonnet · **Date:** 2026-09-13
**This document supersedes `docs/ui-cleanup-plan.md` and `docs/UX_BUGS_AND_FIXES.md`.**

---

## Context

SyndicateBrain is an offline investigation workbench for police: a case is a folder
of markdown notes; an agent layer proposes links; a human accepts them. Judged demo
is imminent, so the priority order is **reliability on stage → visible polish →
architectural correctness**.

Two prior docs exist. `docs/UX_BUGS_AND_FIXES.md` has every box ticked — **that
checklist is wrong**. Verified against live code: BUG-02 (proposal/inspector/diff
panels unreachable) and BUG-09 (edge selection) are still open, and BUG-10's
hardcoded fallbacks are still in place. `docs/ui-cleanup-plan.md` is largely
implemented (shell.css exists, tokens consolidated, ribbon trimmed, shortcuts modal
shipped) but Phase E (editor one-frame) and Phase G (right rail) did not land.

The audit found three classes of problem:

1. **~2,500 lines of finished, tested UI are never mounted.** The entire Law 2
   human-in-the-loop review flow — the product's core claim — is unreachable in the
   running app.
2. **Three mutually contradictory colour systems** and a type scale collapsed into
   an 11–13px band, plus four CSS variables that are used but never defined.
3. **The AI pipeline silently returns empty.** Root cause identified and confirmed
   in code (§C1). Analysis is also fully sequential despite being called "fan-out".

Decisions taken with Akshath before writing this:
- Theme stays **Obsidian Light**; the `--evidence`/`--danger` collision gets fixed.
- Type scale **+2 steps AND row heights raised**.
- Graph becomes a **custom force canvas**; the Cytoscape path is deleted.
- `AnalyseButton`'s fabricated-proposals fallback is **replaced with cached real output**.

---

## Severity key

**P0** blocks the demo story · **P1** visible defect or wrong data on screen ·
**P2** polish and consistency · **P3** cleanup

---

# A. Dead & unmounted code (P0)

## A1 — The entire review flow is unreachable · P0

`web/src/components/Workspace.tsx:859-888` hardcodes `<CopilotPanel>` as the whole
right rail. `PanelHost` (`web/src/workspace/PanelHost.tsx`, 330 lines, a finished
4-tab host) is exported from `workspace/index.ts` and imported by nobody.

Consequence: pressing **Analyse Case** runs the pipeline, dispatches
`syndicate-brain:case-analysed`, and `ProposalPanel` + `WhatChangedPanel` both
*listen for that event* (`proposals/ProposalPanel.tsx:49`,
`changed/WhatChangedPanel.tsx:59`) — but neither is mounted, so nothing happens.
The detective can never Accept or Reject. Law 2 has no UI.

**Fix.** Replace the hardcoded aside with `PanelHost`, tabs
`copilot | proposals | inspector | changed`. Hold `activeRightPanel` in `Workspace`.
On `case-analysed`, switch to `proposals` and show a count badge. Note `PanelHost`
currently returns `null` when collapsed (`PanelHost.tsx:250-252`), losing panel
state — change to `hidden` so state survives collapse.

**Verify:** Analyse → Proposals tab auto-opens with a badge → Accept writes the link
into the note's `## Links` with a `<!-- ai:prop_XXXX accepted -->` marker.

## A2 — Edge selection never reaches the Inspector · P0

`Workspace.tsx:843-852` mounts `ObsidianGraphView` without an `onSelectEdge` prop.
`EdgeInspector` listens for `syndicate-brain:edge-selected`
(`inspector/EdgeInspector.tsx:62`) and never receives it.

**Fix.** Pass `onSelectEdge` → dispatch `syndicate-brain:edge-selected` → `PanelHost`
switches to the Inspector tab. Per `ui-cleanup-plan.md` §G.27, do not force-expand the
rail if the user collapsed it in the last few seconds.

## A3 — Delete dead files · P3

Confirmed zero importers outside their own island or test:

| File | Status |
| :--- | :--- |
| `components/TitleBar.tsx` (108) | superseded by Workspace; nothing renders it |
| `components/TreeItem.tsx` (83) | FileTree inlines its rows |
| `components/WikiAutocomplete.tsx` (76) | CM6 `autocompletion()` replaced it |
| `state/useWikiAutocomplete.ts` | same island |
| `lib/caret.ts` | same island |
| `graph/GraphPane.tsx` (279) | only its own test imports it — see §B1 |
| `graph/engine.ts`, `graph/styles.ts` | Cytoscape path — see §B1 |
| `.app` 6-region grid in `index.css` | ghost layout, never used |

`components/IngestDropZone.tsx` (687) is also unimported — **do not delete**; either
mount it behind the ingest flow or leave it and note it as unwired. Ask before removing.

Remove `cytoscape` + `cytoscape-cose-bilkent` from `web/package.json` once §B1 lands.

---

# B. Graph — rewrite as a custom force canvas (P1)

Today `ObsidianGraphView.tsx` (883 lines) uses `force-graph` on a 2D canvas and is the
only mounted graph. Keep that foundation; fix it properly. Cytoscape is deleted.

## B1 — Consolidate to one implementation

Delete `GraphPane.tsx`, `engine.ts`, `styles.ts`, `focus_and_states.test.tsx`,
`engine.test.ts`, `styles.test.ts` and the two cytoscape deps. Port the two behaviours
worth keeping from `engine.ts` into `ObsidianGraphView`: `F` = focus 1-hop neighbourhood
(`engine.ts:241-267`) and the top-N-by-degree filter.

> `styles.test.ts` / `engine.test.ts` assert the **dark amber palette** — they lock in
> the wrong design system. Deleting them is correct, not a loss of coverage.

## B2 — Correctness bugs in the current renderer

| Bug | Location | Fix |
| :--- | :--- | :--- |
| Links drawn **twice** every frame — force-graph's default *plus* the custom one, so a grey line shows under every red highlight | `ObsidianGraphView.tsx:405` `linkCanvasObjectMode(() => 'after')` | `'replace'` |
| **No collision force** — nodes fully overlap | `:549-564` | add `d3-force` collide, radius = node radius + 2 |
| Orphans pinned via `fx/fy` **forever**, never released | `:134-135` | release after first settle |
| Toggling *Hide Orphans* rebuilds every node object → simulation restarts from seed, all positions lost | `:87-178` memo keyed on `hideOrphans` | filter at render, keep node identity |
| ForceGraph instance never destroyed; `innerHTML = ''` only | `:275`, `:529` | call `fg._destructor()` in cleanup |
| Leaks `window.__obsidianFg` | `:487` | remove, or gate behind `import.meta.env.DEV` |
| Mount effect has `[]` deps but closes over `processedNodes` / `getNodeColor` → permanently stale closure | `:532` | read from a ref |
| Hover recomputes the full highlight memo + `fg.refresh()` on every mousemove — O(n) per frame | `:181-208`, `:221-239`, `:449` | bail out early when `searchQuery` is empty; skip refresh when the hovered id is unchanged |
| `ctx.measureText` per labelled node per frame | `:372` | cache width on the node object, invalidate on zoom bucket change |
| ~12 uses of `any` against the repo's strict-TS rule | `:14, 61, 291, 300, 308, …` | type them |
| Dead CSS block with no markup | `obsidian-graph.css:17-55` | delete |

## B3 — Make it look and feel like Obsidian

- **Colours from tokens only.** `ObsidianGraphView` has 18 raw hex values (`:243-266`,
  `:279`, `:338-349`, `:388`, `:428`, `:855-864`) forming a *third* entity palette that
  agrees with neither `--e-*` nor `styles.ts`. Resolve `--e-person` etc. via
  `getComputedStyle` **once on mount**, cache in a ref.
- **Node size by degree**, keep `clamp(2.4 + sqrt(degree)*1.6, 2.6, 10.5)` but raise the
  ceiling now that type is larger.
- **Curved links.** Obsidian's signature. `force-graph` supports `linkCurvature`; use
  a small constant (~0.12) and draw a quadratic bezier in `linkCanvasObject`.
- **Labels**: current rule hides them at default zoom (`:363`) — the graph reads as
  anonymous dots. Show labels for nodes with `degree >= 3` at default zoom, fade the
  rest in by opacity across zoom rather than snapping on.
- **Hover = dim others**, don't recolour: neighbours keep their type colour at full
  opacity, everything else drops to ~0.15. Currently hover paints neighbours red
  (`:349 '#f87171'`), which collides with `--danger`.
- **Drag-to-pin**: `onNodeDragEnd` sets `fx/fy`; a pinned node gets a small ring;
  double-click on a pinned node unpins.
- **Missing affordances** to add: zoom in/out buttons next to zoom-to-fit; a legend
  keyed to entity type (there is a hardcoded one at `:855-864` — rebuild from tokens);
  a tooltip on hover (`nodeLabel` is never set, so force-graph's tooltip is unused);
  arrowheads on directional edges.
- **Edge semantics from the design system** (`docs/design-system.md` §4): record-derived
  = solid; AI-proposed = **dashed**, `--hypothesis`; contradiction-adjacent =
  `--danger`. Right now every edge looks identical except AI edges being slightly
  bluer. This distinction *is* the product's constitution made visible — it is worth
  more than any other graph change.
- **Settling animation**: `warmupTicks(60)` runs the sim invisibly then snaps. Drop to
  ~10 and let it visibly settle — that motion is what makes it feel alive.

## B4 — Bad data in `defaultData.ts` · P1

`web/src/graph/defaultData.ts` (4,719 lines, 82 nodes / 174 edges) is the fallback when
vault parsing yields nothing (`Workspace.tsx:135`).

- `names` fields contain **literal escaped-unicode sequences instead of decoded
  Devanagari** (e.g. `:12`) — these render as raw backslash text on screen.
- `person_0035`'s `names` is a mangled single-element array of a stringified list (`:44-46`).

Both are a bad export from the Python side. Re-export, or fix in place and fix the
exporter. Also add a dev-only console warning when the fallback is used, so "the graph
looks fine" never hides "the vault failed to parse".

---

# C. AI pipeline (P0 → P2, ranked)

## C1 — Empty proposals: root cause found · P0

Three compounding causes, confirmed in code:

**(a) The schema is never enforced.** `brain/llm/client.py:94` sends
`"format": "json"` to Ollama. That guarantees *syntactically* valid JSON and nothing
more. Ollama accepts a **JSON Schema object** as `format` — pass `schema_dict`
(already computed at `client.py:121`) instead of the string.

**(b) A wrong key silently produces an empty list.**
`ConnectionFinderOutput.proposals` is `Field(default_factory=list)`
(`agents/connection_finder.py:48`). Pydantic ignores extra keys, so a model returning
`{"connections": [...], "summary": "..."}` **validates successfully with
`proposals == []`**. No error, no retry. The orchestrator then logs
`0 proposal(s)` (`orchestrator.py:533`) — indistinguishable from a real no-finding.
The single-key repair at `client.py:148-149` only fires when the response has exactly
one key, so a two-key response slips straight through.

> This is the bug. A 46-second call returning `[]` is this line.

**Fix:** make `proposals` required (drop the default), so a key mismatch raises
`ValidationError` and the existing retry actually runs. Same for
`ContradictionOutput`. Keep the alias-repair but widen it: map any list-valued key to
the expected list field when the expected key is absent.

**(c) No few-shot example anywhere.** For a 3B–8B local model emitting a nested
list-of-objects, one worked example is the largest remaining quality lever. Add a
single compact input→output exemplar to `CONNECTION_FINDER_SYSTEM_PROMPT`
(`connection_finder.py:25-33`) and the contradiction prompt.

**Also:** `orchestrator.py:635` discards a good live run —
`if (len(res.new_connections) < 5 or res.dropped_proposals_count < 1) and cached_result`.
A live run returning 4 proposals, or one where the validator dropped nothing, is thrown
away in favour of the fixture. Change to: use cached **only** when the live run errored
or returned zero.

**Verify:** with Ollama up, `POST /api/case/analyse` for Case_01 returns ≥1 proposal
with a `source_doc_id` that appears verbatim in the evidence. With the schema fix
reverted, the same call returns `[]` — that contrast is the regression test.

## C2 — Speed and never-hangs · P0

- **"Fan-out" is a sequential `for` loop** (`orchestrator.py:515`). No asyncio, no
  threads. Six index slices + contradiction + summary = 8 serial LLM calls.
  → Run the six slice calls with `concurrent.futures.ThreadPoolExecutor` (the Ollama
  client is blocking `urllib`, so threads are the right tool). Contradiction can join
  the same wave; summary stays last.
- **The 150s budget is only checked *between* calls** (`orchestrator.py:518`), so one
  hung call blows it arbitrarily. Worst case today: 8 calls × 2 attempts × 60s timeout
  = **~16 minutes**. → Per-call deadline via the executor plus a wall-clock cap on the
  whole wave; return partial results rather than nothing.
- **`ConnectionError` triggers a pointless 60s retry.** `client.py:159` catches
  `(ValidationError, json.JSONDecodeError, Exception)` — the first two are redundant and
  `Exception` swallows `ConnectionError`. → Let connection errors fail fast; retry only
  on validation/parse errors.
- **`warmup()` exists on both clients and is never called** (`client.py:187, 289`).
  → Call it on FastAPI startup so the first demo click doesn't eat cold-start.
- **Evidence starvation**: `MAX_EVIDENCE_PACK_CHARS = 2500` (`orchestrator.py:69`)
  against ~33 KB of source — truncation lands inside the *first* FIR, and the same
  truncated pack is resent for every slice. → Raise the cap and give each slice
  evidence relevant to it rather than the same first 2.5 KB six times.
- **Frontend**: `AnalyseButton` shows a 4-stage animation on a timer, not on real
  progress. Stream or poll real stage transitions, and add a visible timeout state so
  it can never look hung.

## C3 — Law 4 / citations · P1

The reported "accept endpoint bypasses validation" is **fixed** — `linker.py:597-609`
builds `valid_sources` and `linker.py:671-688` returns HTTP 400 on `ValueError`. Four
real holes remain:

1. **The two `build_valid_sources` have drifted.** `orchestrator.py:188-223` *scans*
   every `.md` for `^[TOKEN` and yields `DOC_FIR_0058/0067/0073/0094/0142/0185/0211/0312`,
   `DOC_STMT_001/002/003`, `DOC_TD_HR_SNP_0147`. `linker.py:150-194` does **not** scan —
   it uses file stems plus a **hardcoded 5-alias list** (`linker.py:189-192`). So a
   proposal citing `DOC_FIR_0312` passes analysis, is shown to the detective, and then
   **fails Accept with HTTP 400**. → One implementation, imported by both. Delete the
   hardcoded alias list.
2. **Cross-case proposals are injected *after* validation.** `orchestrator.py:569, 580`
   validate; `orchestrator.py:593` then calls `augment_analysis_result`, which appends
   proposals citing the synthetic `DOC_CASE_MATCH` (`crosscase.py:527-542`) and appends
   `^[DOC_CASE_MATCH row:1]` to the summary (`:564-569`). These bypass Law 4 and are
   un-acceptable downstream. → Either validate after augmentation with
   `DOC_CASE_MATCH` as a registered source, or give cross-case hits their own
   non-proposal UI treatment.
3. **`crosscase.apply_cross_case_links` self-validates** — `crosscase.py:469` puts the
   caller's own `cit.source_doc_id` into the set it is checked against. Tautological.
4. **`_fallback_write_link` accepts `valid_sources` and never reads it**
   (`cdr/loader.py:32-138`) — no locator regex, no resolvability check, and it will
   `write_text` a brand-new note (`:66-75`). Only reachable on `ImportError`
   (`:142-148`), but it is a real second writer, against CASE_MODEL §6's "linker.py is
   the single code path". → Delete it; let the import error propagate.

Note `validator.py:58-59`: `is_source_resolvable` returns `True` for any non-empty id
when `valid_sources is None` — fail-open. That default is what makes hole #1 dangerous.

## C4 — Copilot retrieval honesty · P1

- `retrieval/service.py:236-296` holds ~60 lines of **hardcoded canned answers** keyed
  on substrings (`"malik"`, `"rohtak"`, `"scorpio"`, `"pistol"`), served whenever
  `07_AI_Synthesis/.cache_ready` exists — which it does, for Case_01, in both `data/`
  and `vaults/`. The module docstring claims "No keyword-matched canned answers."
  Anything unmatched falls through to the Vikram Singh dossier (the old BUG-07).
  → Gate behind an explicit, **visible** demo-mode flag, or delete. Unmatched queries
  must fall through to the live pipeline, never to an unrelated persona.
- `service.py:147-166` force-inserts specific person notes on specific keywords. Same
  problem, same fix.
- `service.py:395-406` softens Law 4: if the validated answer has zero surviving
  citations, it scrapes citations out of the *context pack* and pins the
  **un-validated** answer back. That is exactly the thing Law 4 forbids.
  → Show the real "I don't know" state instead; `CopilotPanel` already has one.
- Retrieval is naive keyword scoring with **no chunking** — whole files are dumped
  (`build_context_pack`, `service.py:177-229`), `chunks_meta` is computed and never
  used, and the +2-per-hit scan only reads the **first 1000 chars** of each note
  (`service.py:131`). Acceptable for demo scale; note as Future Scope unless time allows.

## C5 — Config & error handling · P2

- **Config discovery is case-blind.** `load_case_config` (`client.py:306-325`) only
  checks CWD and the literal path `vaults/Case_01_Sonipat_Arms/Case_Config.yaml`.
  Both the orchestrator and retrieval call `get_llm_client(config_path=None)`, so
  **analysing Case_02 reads Case_01's config**. → Thread the resolved case dir through.
- **`resolve_case_dir` has four implementations**: `orchestrator.py:82`,
  `retrieval/service.py:53` (byte-identical), `integrity.py:102` (different signature),
  and `linker.py:62` as `resolve_case_directory`. → One, in a shared module.
  Same for `_cache_dir` / `_prefer_cache_flag`, duplicated verbatim in
  `orchestrator.py:468/487` and `service.py:232/309`.
- **`google-genai` is not in `requirements.txt`** — the documented Gemini "parachute"
  cannot be deployed. Add it, or delete the claim from CASE_MODEL §7.
- **Silent `except Exception: continue` on evidence reads** —
  `orchestrator.py:204, 237, 252`. An unreadable note silently shrinks the valid-source
  universe, so good proposals get dropped by Law 4 with no trace. → Log at warning with
  the path; surface a count in the response.
- **`vault.py:546`** swallows index-refresh failure after a note save → stale index,
  which is precisely the Law 5 failure mode CASE_MODEL §5 warns about. → Surface it.
- `POST /api/index/rebuild` and `/refresh` (`index/build.py:585`, `incremental.py:476`)
  are defined on a router `main.py` never mounts. → Mount, or delete.
- `GET /api/doc/{id}` (`main.py:93`) still serves from `brain/mocks.py`.

---

# D. Design system (P1)

## D1 — Fix the colour collisions · P1

`--evidence` and `--danger` are **both `#DC2626`** (`index.css:79, 87`). Verified
evidence and a contradiction are the same colour, which destroys the design system's
one organising rule. `--e-person` and `--e-event` are also both `#DC2626`.

Decision: **keep Obsidian Light, keep red as the app accent, give evidence its own hue.**

```
--evidence      #1D4ED8   deep blue  — verified, provenance-backed
--evidence-dim  #1E40AF
--evidence-bg   rgba(29,78,216,0.08)
--hypothesis    #9333EA   purple     — AI-predicted, NON-EVIDENTIARY   (unchanged)
--danger        #DC2626   red        — contradiction, refusal          (unchanged)
--ok            #16A34A                                                (unchanged)
```

Then re-separate the entity accents so no two share a value, and update
`docs/design-system.md` §1 to describe the light theme that actually ships (it
currently documents a dark amber theme that exists nowhere in the running app).

## D2 — Four undefined variables in active use · P1

| Token | Used at | Effect |
| :--- | :--- | :--- |
| `--color-amber` | `Workspace.tsx:515` (**no fallback**), `:725`, `StatusBar.tsx:106` | the bookmark ★ currently renders with **no colour at all** |
| `--color-green` | `SettingsModal.tsx:135,139,143,147` | integrity ticks unstyled |
| `--color-red` | `Workspace.tsx:801` | unstyled |
| `--ease-spring` | `shell.css:750,764,775,813` | always falls back inline; fallback-only by accident |

Define `--ease-spring: cubic-bezier(0.16,1,0.3,1)` properly; replace the three
`--color-*` with the semantic tokens.

## D3 — Type scale +2 and raised rows · P1

93% of all text in the app is 11–13px (118 uses of `--fs-xs` alone). There is no
practical hierarchy. Bump the scale **and** the rows together so density relaxes with
the text rather than getting cramped:

```
--fs-xs  11 → 12      --row        36 → 40
--fs-sm  12 → 13      --ws-ribbon  42 → 46
--fs-base 13 → 15     --ws-icon    28 → 32
--fs-md  15 → 17      --ws-tabbar  38 → 40
--fs-lg  18 → 20      --row-status 24 → 26
--fs-xl  22 → 24
--fs-2xl 28 → 30
```

Add the missing scales while here:

```
--lh-tight 1.25   --lh-base 1.5   --lh-loose 1.65
--fw-regular 400  --fw-medium 500  --fw-semibold 600
--track-caps 0.04em
```

`font-weight: bold` is requested in places but **only Inter 400/500/600 are loaded**
(`index.css:4-24`) — 700 is synthesised. Either load a 700 face or map bold → 600.

Then re-tier components so panel titles, body text and metadata visibly differ instead
of all landing on `--fs-xs`. Untokenised heights to fold into `--row`: `.ws-subhead`
34px, `.ws-pane-foot` 40px, `.ws-pane-head-tier2` 32px (`shell.css`).

**Watch for:** fixed-width panes (`clamp(240px,18vw,280px)` left, `clamp(300px,22vw,360px)`
right) and `.ws-tab { max-width: 200px }` will tighten. Check every pane at 1280×720.

## D4 — Add the missing token scales · P2

- **Elevation**: 20 distinct `box-shadow` literals, one token. Six are **dark-theme
  leftovers on a light theme** and read as black smears: `0 16px 36px rgba(0,0,0,0.55)`
  ×3 (`index.css:990, 1065, 1191`), `0 8px 24px rgba(0,0,0,0.45)` (`:935`),
  `0 16px 32px rgba(0,0,0,0.5)` (`:898`), `0 4px 12px rgba(0,0,0,0.4)` (`shell.css:324`).
  → `--shadow-1/2/3` + `--shadow-glow`, all light-appropriate.
- **Z-index**: raw `2,5,10,15,20,100,1000` across 8 files.
  `AnalyseButton.tsx:173` uses `1000`, tying the modal overlay (`index.css:887`) — the
  dropdown can render over a modal. → `--z-base/sticky/dropdown/overlay/modal/tooltip`.
- **Duration** separate from easing. `--t-fast`/`--t-med` bundle both into one string
  so a duration can't be reused alone; 11 raw durations exist (`800ms`, `1200ms`,
  `180ms`, `0.18s`, `1.8s`, …). → `--d-fast/base/slow` + `--ease-*`, compose at use site.
- **Radius**: ~11 raw values bypass `--r-*`; `--r-full` exists and is never used while
  six files write `50%`.

## D5 — Kill the shadow palettes · P1

Three entity-colour systems disagree. Person is `#DC2626` in `index.css`, `#E8B04B` in
`graph/styles.ts:74-105`, `#4f46e5` in `ObsidianGraphView.tsx:247`.

`styles.ts:74-105` is a **complete dark-theme fallback map (32 values)** that contradicts
every same-named token in `index.css`, and `engine.test.ts:380-381` asserts it. It dies
with §B1. `ObsidianGraphView`'s hex goes with §B3. After both, grep for
`#[0-9a-fA-F]{3,8}` under `web/src` and expect zero hits outside `index.css`.

---

# E. Layout, icons, motion (P2)

## E1 — Pane resizing is advertised and disabled · P2

`Workspace.tsx:15` documents "Panes collapse + drag-resize". `shell.css:515-518`:
`.ws-handle { display: none !important }`. There is **no pointer/drag code anywhere**
in `src/`, and `--ws-handle: 5px` is a dead token.

Either implement it (pointer events on the handle, clamp to the existing min/max,
persist to `localStorage` beside `sb_right_open`) or delete the token, the CSS and the
comment. For a judged demo, implementing it is worth it — resizable panes are what make
a workbench read as a real tool.

## E2 — Layout fragility · P2

- **Two breakpoints disagree.** `index.css:475` `@media (max-width:1279px)` shows the
  "window too small" wall; `shell.css:394` `@media (max-width:1200px)` shrinks panes —
  **unreachable dead CSS** behind the wall. Delete the 1200px rule.
- `.ws` uses `height: 100vh` (`shell.css:190`) on top of `height:100%` on
  `html,body,#root` — two sources of truth, and `100vh` is wrong with dynamic browser
  chrome. Use `100%` or `100dvh`, once.
- The editor is hidden with the `hidden` attribute rather than unmounted
  (`Workspace.tsx:819`), so **CodeMirror stays mounted at zero dimensions** while the
  graph is up — a measurement and scroll-restore hazard on switch back. Call
  `view.requestMeasure()` on re-show.
- Tabs scroll horizontally with `::-webkit-scrollbar { display: none }`
  (`shell.css:729`) and no affordance — tabs silently disappear. Add edge fades or
  scroll buttons. Same pattern at `.panel-host-head` (`shell.css:1152`).
- `Workspace.tsx:254` closes a tab on a `setTimeout(160)` hand-synced to a CSS
  animation. Use `animationend`.
- Fallback mismatch: `var(--ws-tabbar, 36px)` at `shell.css:576, 887, 1139` but the
  token is 38px.
- `AnalyseButton.tsx:57-58` uses `var(--ws-icon, 30px)`; the token is 28px.
- `--ws-*` are scoped to `.ws` (`shell.css:184-187`), so anything rendered in a portal
  silently gets the fallback. Move them to `:root`.

## E3 — One icon system · P2

Icons are currently **three** systems:

1. A `|`-delimited path-string map + `Svg({d})` at 16px/stroke 1.7
   (`Workspace.tsx:20-47`, 17 icons).
2. **Duplicated** hand-written SVG components: `PanelHost.tsx:55-107` at 15px/1.7
   (its `CopilotIcon` path is byte-identical to `I.copilot`), `TitleBar.tsx:44-91` at
   13px/2, `Workspace.tsx:696,708,743,756` at 14px/2.
3. **~45 emoji used as functional UI** — flags, locks, folders, checks, crosses, stars
   across StatusBar, ShortcutsModal, Editor, AnalyseButton, IngestDropZone, Workspace,
   SettingsModal, ProposalPanel, EdgeInspector, ErrorState, FileTree.

Emoji render in OS colour, ignore `currentColor`, and break the monochrome forensic
tone completely — an emoji glyph in a police evidence tool reads as a chat sticker.

**Fix.** One `web/src/lib/icons.tsx` exporting the path map plus a single `<Icon
name size={16|20} />` that takes size from a token and uses one stroke weight (1.75).
Replace every emoji with a path icon. Keep the existing path-string approach — it is
small, offline, and correct for a tool shipping to police laptops. No icon library.

## E4 — Motion · P2

- **Zero `prefers-reduced-motion` support** anywhere in `src/`, despite three infinite
  animations (`copilot-blink`, `copilot-pulse`, `skeleton-shimmer`). → One global block
  reducing durations to `0.01ms` and stopping infinite loops.
- `transition: all var(--t-fast)` appears 9× — a repaint hazard. Name the properties.
- Four off-token values: `transform 0.1s ease`, `transform 0.12s ease-out`,
  `border-color 0.15s ease`, `all 0.15s ease`.
- **Missing motion that would help**: proposal cards should animate in on arrival (the
  most important moment in the demo); accept/reject should animate the card out;
  panel tab switches should cross-fade; graph focus mode should ease opacity rather
  than snap. Use `--d-fast` + `--ease-spring` consistently.
- `states/` (`EmptyState`, `ErrorState`, `LoadingSkeleton`, 12 importers) is the
  healthiest part of the codebase — reuse it rather than writing new empty states.

## E5 — Split `Workspace.tsx` · P2

905 lines against the repo's own "components under ~150 lines" rule (`web/CLAUDE.md`).
Extract: `Ribbon`, `LeftPane`, `TabBar`, `SubHead`, `RightRail`. Also fold the
CSS-in-JS `<style>` blocks in `AnalyseButton.tsx`, `IngestDropZone.tsx`, `FileTree.tsx`
into `shell.css` — that is where most remaining hardcoded values hide, out of reach of
any stylesheet-level token pass.

---

# F. Wrong data on screen (P1)

- `Workspace.tsx:897` — `linkCount={graphData?.edges?.length ?? 36}`. Hardcoded 36.
- `StatusBar.tsx:40` fetches `http://127.0.0.1:8000/api/case/integrity` on mount and
  **silently falls back to fiction** when offline: `document_count: 8`,
  `'14 unresolved leads'` (`:106`), `noteCount = 42`, `linkCount = 36`.
  The status bar is described in `docs/design-system.md` §3 as *"a trust surface"* —
  it must show an honest unknown state, never invented counts.
- `AnalyseButton.tsx:310-368` — **~70 lines of fabricated proposals** (named suspects,
  fake CDR rows, fake SHA locators) presented as backend output whenever the API is
  offline or returns non-OK. Decision: **delete the inline fixture and fall back to a
  real previously-computed analysis JSON from `07_AI_Synthesis/`**, rendered with a
  persistent, visible "Cached analysis — not a live run" marker. If no cache exists,
  show the error state.

> This one matters beyond correctness. A tool whose entire pitch is court-admissible
> provenance must never put invented evidence on screen under any condition.

---

# Suggested order

| # | Block | Why here |
| :-- | :-- | :-- |
| 1 | **F** — remove fabricated data | Small, and nothing else should ship on top of fake numbers |
| 2 | **A1/A2** — mount PanelHost + edge wiring | Restores the core demo story; ~2,500 lines become reachable |
| 3 | **C1** — schema + required field + few-shot | The AI actually returns proposals; A1 has nothing to show without it |
| 4 | **D1/D2** — colour collisions + undefined vars | Cheap, and every later visual change depends on correct tokens |
| 5 | **D3** — type scale + row heights | Biggest perceived quality jump; do after D1 so it's done once |
| 6 | **C2** — parallel fan-out, warmup, deadlines | Turns a 2–16 min analysis into a demo-safe one |
| 7 | **B1/B2** — one graph, fix the renderer bugs | Deletes Cytoscape; unblocks B3 |
| 8 | **B3/B4** — Obsidian look + data fix | The "cooler graph" ask |
| 9 | **C3/C4** — Law 4 holes, canned answers | Correctness; visible if a judge probes |
| 10 | **E1–E5** — resizing, icons, motion, split | Polish |
| 11 | **A3, C5, D4, D5** — dead code, config, scales | Cleanup |

---

# Verification

Run after each block, not at the end.

**Backend**
```bash
cd "/Users/akshathkumar/SIH'26"
python3 -m pytest -q                      # baseline 117 passing — keep it there
python3 -m uvicorn brain.main:app --reload
curl -s localhost:8000/health
curl -s -X POST localhost:8000/api/case/analyse \
  -H 'Content-Type: application/json' \
  -d '{"case_id":"Case_01_Sonipat_Arms"}' | python3 -m json.tool
```
Expect: ≥1 `new_connections` entry; every `source_doc_id` appears verbatim in a file
under `00_Raw_Inputs/`; total wall time under 60s with Ollama warm. Then
`POST /api/proposal/<id>/accept` must return 200 and write into the note's `## Links` —
if it 400s, §C3.1 is not fixed.

**Frontend**
```bash
cd "/Users/akshathkumar/SIH'26/web"
npm run build     # tsc -b && vite build — must be 0 errors
npm run lint
npm test
npm run dev
```

**Manual pass** (Chrome, 1440×900, then 1280×720):
1. Open vault → tree renders, no console errors, **zero form-field a11y warnings**.
2. Analyse Case → Proposals tab auto-opens with a badge → Accept writes a link →
   What Changed shows the diff.
3. ⌘G → graph settles visibly, labels legible at default zoom, hover dims others,
   drag pins a node, AI edges are visibly dashed and a different colour from evidence
   edges.
4. Click an edge → Inspector tab opens with source, SHA and locator.
5. Ask Copilot something **outside** the canned set (e.g. "which towers appear in more
   than one FIR?") → either a cited answer or an honest "I don't know". Never the
   Vikram Singh dossier.
6. **Kill the backend, click Analyse** → cached-and-labelled or an error. Never
   fabricated proposals. Status bar shows unknown, not `8 documents · 36 links`.
7. Resize the window to 1279px → the "window too small" wall, cleanly.
8. Enable *Reduce Motion* in macOS → no infinite animations.

**Grep gates**
```bash
grep -rnE '#[0-9a-fA-F]{3,6}' web/src --include=*.ts --include=*.tsx   # expect 0
grep -rn 'color-amber\|color-green\|color-red' web/src                  # expect 0
grep -rn 'cytoscape' web/src web/package.json                           # expect 0
```

---

# Out of scope

Dark mode / theme toggle · embeddings or BM25 retrieval · Electron packaging ·
mobile or responsive layouts · the ribbon | left | centre | right shell itself ·
`IngestDropZone` wiring (decide separately).
