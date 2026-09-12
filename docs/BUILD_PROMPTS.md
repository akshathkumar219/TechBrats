# BUILD_PROMPTS.md — the whole build, as copy-paste prompts

Every prompt in this project, in order, with who runs it and when.

**How to use this file.** Find your name. Find the current window on the clock.
Copy the PREAMBLE (§1), paste it at the top of a new Antigravity session, then
paste your prompt under it. One prompt = one branch = one PR. Never run two of
your own prompts in the same session.

**Two things this file supersedes:**

1. `docs/prompts.md` — written for one agent building alone, in order. Read it
   for context if you like. **Do not paste from it.** It will make you write
   into files you don't own.
2. `docs/tasks/HARLEEN.md` W0–W15 — that roadmap was built before the editor
   existed. It is already done. Harleen's real work is §4 of this file.

**Two architecture decisions, already made, that these prompts assume:**

- **The vault lives on disk and the browser reads it directly** via the File
  System Access API (`web/src/fs/`). FastAPI does **not** serve the file tree.
  `brain/` is analysis-only: graph, provenance, resolution, centrality,
  certificate, ingest, CDR.
- **`web/src/` already exists and works** — tokens, three-pane shell, tree, CM6
  editor, live preview, wiki-links, backlinks, search. Nobody rebuilds it.

---

## 1. PREAMBLE — paste this at the top of EVERY Antigravity session

```
CONTEXT — SyndicateBrain (SIH26189). An offline criminal-network investigation
workbench for Indian police. Repo layout: web/ (Vite + React + TS, already
built and working), brain/ (FastAPI), data/, docs/.

THE SIX LAWS. Every decision obeys these:
1. Evidence is immutable. Ingested files are read-only and SHA-256 hashed at
   ingest. No code path modifies them.
2. The map is deterministic; the AI only suggests. No inferred edge ever enters
   the primary graph.
3. Every edge carries provenance — source_doc_id + locator. An edge that cannot
   name its source document and line does not exist.
4. Nothing is asserted without a citation.
5. The graph is temporal. Edge weight decays with age. The default view is
   "active now", not "everything ever".
6. Identity resolution is blocked before it is fuzzy. Never compare every name
   to every other name.

THE VAULT LIVES ON DISK. The browser reads and writes it directly through the
File System Access API in web/src/fs/. FastAPI does not serve the file tree.
brain/ is analysis-only.

MY FILES. I own exactly these paths:
  <<< PASTE YOUR OWN LIST FROM YOUR TASK FILE HERE >>>
Do not create, edit, rename or delete anything outside that list. If a change
is needed elsewhere, stop and tell me which file and why. I will ask its owner.

RULES
- No hex codes, font sizes, or spacing values. Every value is a var(--token)
  from web/src/index.css. If the token doesn't exist, ask Harleen; don't invent.
- No hardcoded thresholds or tuning constants. They live in Case_Config.yaml.
- Read the referenced docs before writing code. Do not invent field names,
  endpoint shapes or CSV column names. If something is ambiguous, list the
  ambiguity and ask me — do not guess.
- When you replace a mocked endpoint, match brain/mocks.py byte-for-byte first,
  then delete the mock.
- Do not install a package that isn't already in package.json or
  requirements.txt without telling me first. We may be offline at the venue.
- Before you say you are done: the build runs, the feature works once by hand,
  and you touched no file outside my list. Show me the command output.

COMMITS
Format: "<TASK-ID>: one line, present tense". Example: "HER-T01: writer rejects
provenance-less edges".
Never commit to main. Never force-push. Never run `git checkout .` or
`git reset --hard`.
```

---

## 2. The timeline

Rows are working hours (W0–W16). A cell is the task ID that person is on.
🔴 = blocks someone else; ship it, don't polish it.

| Window | Akshath | Harleen | Hermaine | AKTA | Shourya | Mehul |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| W0–1 | AKS-T01 🔴 | HAR-T01 | setup | setup | setup | setup |
| W1–2 | AKS-T01 🔴 | HAR-T02 | read docs | read docs | read docs | read docs |
| W2 | AKS-T02 🔴 | HAR-T02 | HER-T01 🔴 | AKT-T01 | SHO-T01 | MEH-T01 |
| W2–3 | AKS-T03 🔴 | HAR-T03 | HER-T01 🔴 | AKT-T01 | SHO-T01 | MEH-T01 |
| W3–5 | AKS-T04 | HAR-T03 | HER-T01 🔴 | AKT-T02 | SHO-T02 | MEH-T02 |
| W5–6 | AKS-T04 | HAR-T04 | HER-T02 🔴 | AKT-T02 | SHO-T02 | MEH-T02 |
| **W6** | **INTEGRATION CHECK** | | | | | |
| W6–8 | AKS-T05 | HAR-T05 | HER-T03 🔴 | AKT-T02 | SHO-T02 | MEH-T03 |
| W8–10 | AKS-T06 | HAR-T05 | HER-T04 | AKT-T02 | SHO-T03 | MEH-T03 |
| W10–11 | AKS-T06 | HAR-T06 | HER-T05 | AKT-T03 | SHO-T04 | MEH-T04 verify |
| **W11** | **INTEGRATION CHECK** | | | | | |
| W11–13 | AKS-T07 | HAR-T06 | HER-T06 🏆 | AKT-T04 | SHO-T04 | MEH-T04 |
| **W12** | **AI GO/NO-GO** | | | | | |
| **W13** | **FEATURE FREEZE** | | | | | |
| W13–14 | AKS-T08 | HAR-T07 | HER-T06 🏆 | AKT-T04 | SHO-T05 | MEH-T05 |
| **W14** | **INTEGRATION CHECK** | | | | | |
| W14–16 | demo + deck | HAR-T07 | HER-T07 | AKT-T05 | SHO-T05 | MEH-T05 |

**The five gates.** W2 schemas + mocks merged. W6 real graph data on the real
canvas. W11 ingest → graph → canvas → inspector, end to end, once. W12 AI
go/no-go. W13 feature freeze, enforced.

---

## 3. AKSHATH — lead, graph engine, AI layer

Own list for the preamble: `brain/schemas.py`, `brain/mocks.py`, `brain/main.py`,
`brain/guard.py`, `brain/llm/`, `brain/agents/`, `web/src/graph/`,
`web/src/timeline/`, `CLAUDE.md`, `README.md`, `Makefile`

### AKS-T01 · W1–2 · `akshath/T01-contract` 🔴 blocks all five

> Done when: uvicorn starts and all seven endpoints return valid JSON.

```
Read docs/tasks/AKSHATH.md section "W1-2 · The contract", plus
docs/architecture.md and blueprint.md, before writing anything. Those are the
spec. Do not invent fields — if something is ambiguous, ask me.

Build three things:

1. brain/main.py — FastAPI app. CORS open to localhost:5173. Routes mounted,
   nothing else. Add requirements.txt (fastapi, uvicorn, pydantic v2).

2. brain/schemas.py — Pydantic v2 models: Node, Edge, Provenance, Doc,
   SubgraphResponse, CertificateRequest, ResolveDecision, AgentCard.
   CRITICAL: Edge carries source_doc_id: str and locator: str as required
   fields, no default, not Optional. An edge without provenance must be
   impossible to construct. This is Law 3 expressed as a type.

3. brain/mocks.py — hardcoded plausible JSON, zero logic, for:
   /api/graph/subgraph, /api/edge/{id}/provenance, /api/analytics/centrality,
   /api/doc/{id}, /api/agent/card/{id}, /api/export/certificate,
   /api/vault/integrity
   Realistic Indian names, Haryana phone numbers and tower IDs (HR-SNP-0147
   format). ~20 nodes. Every mock Edge must validate against the real schema —
   no raw dicts that bypass Pydantic.

Also add a Makefile at repo root: `make dev` starts uvicorn on :8000 and vite
on :5173 together.

Do not touch web/src/ except vite proxy config if needed.
Verify: uvicorn starts clean, curl each of the seven endpoints, show me output.
Commit "AKS-T01: schemas frozen, mocks serving, FastAPI wired". Push, don't merge.
```

### AKS-T02 · W2 · `akshath/T02-guard` 🔴 blocks Shourya

> Done when: all four bypass tests fail loudly.

```
Read docs/tasks/AKSHATH.md "brain/guard.py" and blueprint.md Law 1.

Build brain/guard.py — about 40 lines:
- assert_writable(path) — raises on any path under 01_Evidence_Inbox/
- safe_write(path, bytes) — calls assert_writable first
- a registry of locked paths that Shourya's ingest registers into

Then write tests/test_guard.py with four bypass attempts that must ALL raise:
1. direct open(path, 'w') on a locked path
2. os.rename onto a locked path
3. shutil.copy onto a locked path
4. symlink escape — a symlink outside the inbox pointing into it

No force parameter. No skip_validation flag. No internal path that bypasses it.
Run pytest and show me all four passing.
Commit "AKS-T02: guard refuses writes to evidence inbox". Push, don't merge.
```

### AKS-T03 · W2–3 · `akshath/T03-ground-truth` 🔴 blocks Mehul

> The four planted answers are **your** judgment. Antigravity writes the file
> around your decisions — see §9.

```
Read docs/tasks/AKSHATH.md "W2-3 · Ground truth", architecture.md line 253 on
code-mixing, and data/README.md if it exists.

I will give you the four planted answers. Your job is to write them up, not to
invent them.

Create data/GROUND_TRUTH.md documenting, for each of the four:
1. Proxy kingpin — who, why he must rank ~15th on degree and 1st on betweenness
2. Alias pair — the two names, the shared IMEI, the two-week window
3. Alibi contradiction — which statement, which tower ping, which timestamps
4. Cross-gang bridge — which node, which two components

Then create two templates:
- data/TEMPLATE_FIR.md — one hand-written example. FIR number NNNN/YYYY, a real
  Haryana thana name, IPC/BNS section refs, complainant, named accused, a
  code-mixed narrative paragraph (Devanagari narrative, Latin-script names,
  digits and section references), a date.
- data/TEMPLATE_CDR.csv — Airtel-style headers, ~10 example rows, timestamps
  DD/MM/YYYY HH:MM:SS, cell IDs HR-SNP-0147 format.

The templates are the contract Mehul generates 25,000 rows against. Get the
column names and the FIR field set exactly right.
Commit "AKS-T03: ground truth planted, templates written". Push, don't merge.
```

### AKS-T04 · W3–6 · `akshath/T04-engine`

> Done when: 2,000 nodes / 8,000 edges pan and zoom without stutter.

```
Read docs/tasks/AKSHATH.md "W3-8 · Cytoscape engine" and design-system.md §4.

Build web/src/graph/engine.ts — Cytoscape + cose-bilkent.

Non-negotiable:
- Fixed layout seed. Identical data must produce the identical picture every
  run. I will demo this five times and judges notice if it jumps.
- Render budget first, styling second. Target 2,000 nodes / 8,000 edges at
  interactive pan-zoom. Set hideEdgesOnViewport: true, textureOnViewport: true,
  pixelRatio: 1. Entity-level rendering only — never one node per CDR row.
- Default filter: top-N by degree, everything else behind a "show all" toggle.
- Expose exactly this imperative API and nothing else, so other people never
  open this file: focusNode(id), applyFilter(pred), setEdgeWeights(map),
  setSelection(ids), fitTo(ids). Plus a selection-change event others subscribe to.

Read from /api/graph/subgraph (mocked for now). Generate a 2,000-node synthetic
fixture to benchmark against — do NOT benchmark on the 20-node mock. Report the
frame timings you measure.
Commit "AKS-T04: cytoscape engine renders at budget". Push, don't merge.
```

### AKS-T05 · W6–8 · `akshath/T05-styles`

```
Read design-system.md §4 in full. This is transcription, not design work.

Build web/src/graph/styles.ts:
- Node shape, colour and size by entity type
- Edge style by EVIDENTIARY STATUS — solid amber, thicker, faded, dashed
  magenta. AKTA's inspector badge uses the same palette, so a magenta dashed
  edge and a magenta badge must visibly agree.
- Every value a var(--token) from web/src/index.css. Zero hex codes.

Then add focus mode to engine.ts: pressing F on a selected node dims everything
more than 1 hop away. Selection highlight. Escape clears.
Commit "AKS-T05: node and edge styling by evidentiary status". Push, don't merge.
```

### AKS-T06 · W8–11 · `akshath/T06-timeline`

```
Read docs/tasks/AKSHATH.md "W8-11 · Timeline scrubber".

Build web/src/timeline/ — a window-drag scrubber bound to Hermaine's
/api/graph/subgraph window_start / window_end params.

THE WHOLE TRICK, do not get this wrong: edge widths animate, layout does NOT
re-run. Node positions are frozen. Only width and opacity interpolate. If you
re-run layout on scrub the graph explodes and it looks broken.

- Debounce the backend call
- Interpolate locally between responses so the scrub feels continuous
- Never call the layout algorithm from this file

Test by scrubbing the full range with the 2,000-node fixture. Positions must be
pixel-identical at the start and end of a scrub.
Commit "AKS-T06: timeline scrubs without relayout". Push, don't merge.
```

### AKS-T07 · W11–15 · `akshath/T07-ai-layer`

> Build the validator **first**. It ships whether or not the model works.

```
Read docs/tasks/AKSHATH.md "W11-15 · AI layer" and docs/prompts.md for the A3
Cartographer prompt text.

Build in this order:

1. brain/agents/validator.py FIRST — deterministic Python, no model. Parses
   generated text, drops every sentence lacking a resolvable ^[source_id],
   writes only what survives. This is Law 4 in code and it must exist even if
   the model work slips entirely.

2. brain/llm/client.py — Ollama. JSON mode, temperature=0, thinking OFF,
   Pydantic validation against AgentCard, exactly 1 retry. warmup() called at
   app start so the first demo call isn't a 40-second cold load.

3. brain/agents/cartographer.py — suspect card generation. Every sentence
   carries ^[source_id]. Output goes through the validator before it is written
   anywhere.

Verify: the validator drops an uncited sentence from a hand-written test input.
Then, separately, whether the model returns schema-valid JSON once.
Commit "AKS-T07: citation validator and cartographer". Push, don't merge.
```

### AKS-T08 · W13–16 · `akshath/T08-reset`

```
Build `make reset` at repo root: wipes the demo vault, re-ingests the synthetic
case from data/, returns to slide-one state in under 20 seconds. Time it and
show me.

I will need this mid-demo. It must be idempotent and it must never touch
anything outside the demo vault path.
Commit "AKS-T08: make reset restores demo state". Push, don't merge.
```

---

## 4. HARLEEN — shell, editor, vault UX

**Your task file's W0–W15 roadmap is already built.** Tokens, three-pane shell,
tree, CM6 editor, live preview, wiki-links, backlinks and search all exist in
`web/src/`. You are not rebuilding them — you now **own** them, and your job is
the ten hours of work that makes them demo-grade.

Own list for the preamble: `web/src/index.css`, `web/src/components/`,
`web/src/editor/`, `web/src/lib/`, `web/src/state/`, `web/src/fs/`,
`web/public/`

### HAR-T01 · W0–1 · `harleen/T01-fonts`

```
Read design-system.md §1 and web/src/index.css (387 existing tokens — read them
before adding anything).

1. Self-host three fonts from the USB kit into web/public/fonts/: Inter,
   JetBrains Mono, Noto Sans Devanagari. @font-face with font-display: swap.
   Noto Devanagari is NOT optional — half the FIR content is Devanagari and a
   fallback render looks broken on a projector.
2. Wire them to the existing type tokens in index.css. Do not add new tokens if
   one already exists for the job.
3. Audit: grep the whole of web/src/ for hardcoded hex colours, px font sizes
   and px spacing values outside index.css. List every one you find, then
   replace it with the correct existing token. If no token fits, tell me before
   inventing one.

Verify: render a code-mixed paragraph (Devanagari narrative with Latin names
and digits inline) and screenshot it. Both scripts must sit correctly on the
same line.
Commit "HAR-T01: self-hosted fonts and token audit". Push, don't merge.
```

### HAR-T02 · W1–3 · `harleen/T02-shell`

```
Read design-system.md §2 and the existing web/src/components/ shell.

Finish the three-pane shell that already exists:
- Rails collapsible, widths draggable, widths persisted to localStorage
- Title bar: case name, vault path, offline indicator
- Status bar: vault hash status, doc count, node/edge count. Wire the hash
  status to GET /api/vault/integrity — use the mock until Shourya's real one
  lands around W9. Green "Evidence verified · 14 documents" vs red
  "⚠ 1 document modified since ingest."
- Desktop-only guard below 1280px: a clean "SyndicateBrain requires a desktop
  display" panel. Do not build responsive layouts. It's a police workstation
  tool and saying so is a feature.

Commit "HAR-T02: rails persist, status bar wired to integrity". Push, don't merge.
```

### HAR-T03 · W3–5 · `harleen/T03-pane-swap` 🔴 coordinate with Akshath first

```
Read design-system.md §2. TALK TO AKSHATH BEFORE STARTING — this is the one
integration seam in my track.

The centre pane must switch between the markdown editor and Akshath's Cytoscape
canvas WITHOUT remounting either. If the canvas remounts, his layout re-runs and
the graph jumps, which costs him an hour of perf debugging that isn't his fault.

Keep both mounted. Toggle visibility with the `hidden` attribute, never with
conditional rendering or display:none via a style prop.

Provide a stable container div that his engine can attach to once, at mount,
and never again. Give him the ref shape he asks for. Do not import from or edit
web/src/graph/.

Verify: switch panes ten times, confirm the graph's node positions are
pixel-identical before and after.
Commit "HAR-T03: pane swap without remount". Push, don't merge.
```

### HAR-T04 · W5–7 · `harleen/T04-locked-files`

```
Read blueprint.md Law 1 and §3 (the folder structure), and design-system.md §7
for copy tone.

The vault tree reads the disk directly through web/src/fs/. Files under
01_Evidence_Inbox/ are locked by Law 1.

1. Render locked files with a lock glyph and a muted row in the tree. Showing
   the guarantee before anyone clicks anything is a demo beat Akshath will point
   at.
2. Opening a locked file works normally — read-only.
3. A write attempt on a locked file surfaces the refusal as a toast, not a
   silent failure. Copy tone from design-system.md §7 — factual, never
   editorialising.
4. Folder icons per entity type for Suspects/, Phones/, Locations/, Events/,
   Organisations/, Hypotheses/.

Commit "HAR-T04: locked evidence renders locked and refuses writes". Push, don't merge.
```

### HAR-T05 · W7–10 · `harleen/T05-reading`

```
Read design-system.md line 96 and the existing web/src/editor/.

Reading-quality pass on the editor that already exists:
- Content column caps at 72ch, centred. Full-window-width FIR narratives are
  exhausting and judges will be reading over Akshath's shoulder.
- Mixed-script line height: Devanagari and Latin on the same line must both look
  correct. Test with a real code-mixed paragraph from data/TEMPLATE_FIR.md, not
  with lorem ipsum.
- Live preview styling — headings, bold, italic, lists, code, blockquotes —
  audited against design-system.md. Inline as you type, not a split pane.
- Save on blur and on Cmd/Ctrl+S, in addition to the existing autosave. Never
  lose a keystroke.

Screenshot a real FIR narrative at 1920x1080 and show me.
Commit "HAR-T05: reading column, mixed-script metrics, save on blur". Push, don't merge.
```

### HAR-T06 · W10–13 · `harleen/T06-editor-api` 🔴 blocks AKTA

> AKTA needs this at W15 and you don't have the hours then. Ship it at W12.

```
AKTA needs to open a source file at an exact line from her Provenance Inspector.
Talk to her about the signature before you build it.

Expose from the editor module:
  openFileAt(path: string, line: number, span?: [number, number])
It opens the file in the editor, scrolls to the line, and highlights the exact
span. It must work whether or not the file is currently open, and whether or not
the centre pane is currently showing the editor (switch it).

Also provide a right-rail panel host so AKTA's inspector and Mehul's centrality
panel mount into the rail without either of them editing my layout files.

Export both from a single clearly named module. Document the signatures in a
comment block at the top. Do not change them after W13.
Commit "HAR-T06: openFileAt and right-rail panel host". Push, don't merge.
```

### HAR-T07 · W13–16 · `harleen/T07-polish` — after feature freeze

```
Read design-system.md §7. Use Mehul's shared components from web/src/states/ —
do not write your own EmptyState, LoadingSkeleton or ErrorState.

Polish pass, no new features:
- Empty states for every pane: no vault open, empty folder, no backlinks, no
  search results, nothing selected
- Loading skeletons, not spinners
- Every interactive element gets a visible focus ring and a hover state
- Copy tone: "Named as accused in 3 FIRs", never "High risk individual". The
  product reports what the record says; it never editorialises about people.

Then walk the entire UI at 1920x1080 and list every misalignment you find before
fixing any of them. Show me the list.
Commit "HAR-T07: empty states, skeletons, focus rings". Push, don't merge.
```

---

## 5. HERMAINE — graph core, provenance, BSA §63 certificate

Own list: `brain/graph/`, `brain/analytics/`, `brain/export/`

### HER-T01 · W2–5 · `hermaine/T01-writer` 🔴 blocks Akshath and AKTA

> Done when: all four provenance tests fail loudly. Agree the `locator` string
> format with AKTA before you write a line.

```
Read docs/tasks/HERMAINE.md "W2-5", blueprint.md Laws 1 and 3, and
brain/schemas.py (already merged — mirror it exactly).

Use NetworkX + SQLite. NOT KuzuDB — an unfamiliar embedded graph DB is a
two-hour risk for a benefit nobody in the room will notice.

1. SQLite tables: nodes, edges, docs, provenance. Schema mirrors the Pydantic
   models exactly.
2. brain/graph/writer.py — add_edge() raises ProvenanceError if source_doc_id or
   locator is missing, or doesn't resolve to a real Doc row. No force parameter.
   No skip_validation flag. No internal path that bypasses it.
3. Four tests that must fail loudly:
   - no source_doc_id
   - locator present but source_doc_id dangling
   - both present but the doc row doesn't exist
   - both present but the locator is outside the document's range
4. Document the locator format in the module docstring and do not change it
   after W2: "page:3 line:11" for documents, "row:48219" for CDR. AKTA's
   inspector and my certificate both parse this string.

Run pytest, show me all four passing.
Commit "HER-T01: writer rejects provenance-less edges". Push, don't merge.
```

### HER-T02 · W5–7 · `hermaine/T02-queries` 🔴 blocks the W6 gate

```
Read docs/tasks/HERMAINE.md "W5-7" and brain/mocks.py.

Build:
- GET /api/graph/subgraph — params case_id, center, depth, types[],
  window_start, window_end, min_weight. Returns the SubgraphResponse shape
  EXACTLY as brain/mocks.py returns it.
- GET /api/graph/query — filtered node/edge fetch

Match mocks.py byte-for-byte first. Diff your response against the mock
programmatically and show me the diff is empty. Then delete the mock. The
frontend has been building against that shape for five hours; one field-name
difference costs two people an hour each.

Hard cap: LIMIT 2000 nodes, 8000 edges, ordered by degree descending. Akshath's
canvas has a render budget and a 50,000-edge response blows it.
Commit "HER-T02: real subgraph endpoint replaces mock". Push, don't merge.
```

### HER-T03 · W7–9 · `hermaine/T03-provenance` 🔴 blocks AKTA

```
Read docs/tasks/HERMAINE.md "W7-9". This is MDP item 3 — the thesis made
clickable.

GET /api/edge/{id}/provenance returns, for any edge:
- Source document: filename, type, SHA-256, ingest timestamp
- Locator, in the fixed format
- THE ACTUAL SNIPPET of source text, plus or minus 2 lines of context, RAW.
  Not paraphrased, not translated, not cleaned. The rawness is the guarantee.
- The SQL that produced the edge, as a copy-pasteable string
- derivation_chain, if the edge came from a resolved entity — agree the exact
  field shape with AKTA before building this part

Commit "HER-T03: provenance endpoint returns raw source snippet". Push, don't merge.
```

### HER-T04 · W9–10 · `hermaine/T04-decay`

```
Read docs/tasks/HERMAINE.md "W9-11" and blueprint.md Law 5.

Temporal decay at QUERY time, not write time: weight * exp(-lambda * age_days),
lambda read from Case_Config.yaml (Shourya owns the key names — ask him).
Write-time decay would mean rewriting the whole graph on every scrub.

Window filtering on window_start / window_end. Akshath's timeline calls this
repeatedly during a drag, so it must return in UNDER 200ms on the full synthetic
case. Index edges(timestamp). Benchmark it and show me the number.
Commit "HER-T04: query-time decay under 200ms". Push, don't merge.
```

### HER-T05 · W10–11 · `hermaine/T05-centrality`

```
brain/analytics/centrality.py — PageRank, betweenness, degree via NetworkX.
GET /api/analytics/centrality.

Then verify against data/GROUND_TRUTH.md the moment Mehul's data lands. The
planted proxy kingpin must come out TOP BETWEENNESS while ranking unremarkable
on degree. That contrast is the demo beat.

If he doesn't surface, tell Akshath immediately — it's a data problem, not a
code problem, but you are the only person who will notice it.
Commit "HER-T05: centrality endpoint, betweenness verified". Push, don't merge.
```

### HER-T06 · W11–15 · `hermaine/T06-certificate` 🏆

> **Start this at W11 whatever else is unfinished.** If centrality is half-done,
> leave it half-done.

```
Read docs/tasks/HERMAINE.md "W11-15" and blueprint.md for the seven certificate
sections. Do not abbreviate the section list.

brain/export/certificate.py using reportlab. All seven sections.
- Every claim cites a source_doc_id + locator
- Every source document's SHA-256 printed in full
- The SQL that generated the subgraph, printed verbatim, so a third party can
  re-run it
- Tool version, generation timestamp, case ID

DETERMINISTIC: the same subgraph in produces a BYTE-IDENTICAL PDF out. Fix the
timestamp to the case's ingest time rather than now(), so you can actually
assert this. Write the test that generates twice and diffs the bytes.

It must LOOK like a legal document on a projector: serif body, numbered
sections, a signature block, page "n of m". Judges read this for about fifteen
seconds; it has to read as official in the first two.
Commit "HER-T06: BSA 63 certificate generates deterministically". Push, don't merge.
```

### HER-T07 · W15–16 · `hermaine/T07-refusal` 🔴 the mic-drop

```
45 minutes of work and the strongest moment in the demo.

If ANY edge in the requested subgraph lacks resolvable provenance, or any source
document's SHA-256 no longer matches the file on disk (call Shourya's
/api/vault/integrity), the certificate DOES NOT GENERATE.

Instead: a refusal page naming the exact offending edge, document, and reason.
Make the refusal page look as considered as the certificate itself — same
typography, same seriousness. A system that refuses to certify contaminated
evidence is doing something no competitor will show.
Commit "HER-T07: certificate refuses contaminated evidence". Push, don't merge.
```

---

## 6. AKTA — entity resolution + Provenance Inspector

Own list: `brain/resolve/`, `web/src/inspector/`

### AKT-T01 · W2–5 · `akta/T01-blocking`

```
Read docs/tasks/AKTA.md "W2-5" and blueprint.md Law 6.

Blocking first — 40 people is 780 comparisons, 4,000 is 8 million. Two records
only enter comparison if they share at least one block.

Hard blocking keys: shared phone number, shared IMEI, shared vehicle
registration, same FIR + same role, first-initial + Soundex of surname.

Log block sizes. Any block with more than 50 members is a bad key — flag it
loudly rather than silently costing seconds per merge.

GET /api/resolve/candidates returns candidate pairs with their matching block.
Commit "AKT-T01: blocking keys and candidate pairs". Push, don't merge.
```

### AKT-T02 · W5–10 · `akta/T02-matching` — the core of the track

> Split this into two branches if it runs past 90 minutes: stages 1–2, then 3.

```
Read docs/tasks/AKTA.md "W5-10" carefully. Naked Levenshtein is not good enough
for Indian names — that finding is why this pipeline has three stages.

Stage 1 — normalisation. Transliterate Devanagari to Latin
(indic-transliteration). Strip honorifics: Shri, Sh., Smt., Mr, S/o, W/o, alias,
urf. Collapse whitespace, casefold. Normalise systematic variants:
Singh/Sing, Kumar/Kr, Mohammad/Mohd/Md.

Stage 2 — phonetics. Double Metaphone, Indic-tuned. Vikram/Bikram MUST collide
(v/b is a real Haryanvi variation, not a typo). Rehan/Rehaan must collide.

Stage 3 — RapidFuzz token_set_ratio on normalised strings, ONLY within a
phonetic collision.

NO vector or embedding stage. It is cut. Three deterministic stages I can defend
in court beat four where one is a black box.

Score fusion: 0.5 * phonetic + 0.3 * fuzzy + 0.2 * shared-context (shared
phones, vehicles, FIRs, co-accused). Thresholds in Case_Config.yaml, never
hardcoded.

Write a test table of at least 20 name pairs with expected match/no-match and
show me it passing.
Commit "AKT-T02: three-stage matching". Push, don't merge.
```

### AKT-T03 · W10–12 · `akta/T03-merge`

```
Read docs/tasks/AKTA.md "W10-12" and blueprint.md Law 1.

- Auto-merge above the high threshold. Between thresholds, flag as needs_review
  and surface it in the UI as a COUNT ONLY. The adjudication queue is cut.
- Every merge decision written to brain/resolve/decisions.jsonl: both record IDs,
  every stage score, which block matched, the threshold used, timestamp. Nothing
  implicit.
- Every merge REVERSIBLE. Keep the original records. A merge writes a
  canonical-entity mapping; it never destroys a source row. Destroying a source
  row would violate Law 1.
- derivation_chain field on the resolved entity, e.g. "Person_0031 merged from
  Vikram Singh (FIR_0142 p:2 l:9) + Vicky (CDR row:48219), matched on shared
  IMEI 8****". Hermaine's certificate renders this too — agree the exact field
  shape with her before building.

Then verify against data/GROUND_TRUTH.md: the planted alias pair must merge, and
it must merge FOR THE IMEI REASON. A merge that happens for the wrong reason is
worse than no merge — it means my explanation on stage is false.
Commit "AKT-T03: merge log, reversibility, derivation chain". Push, don't merge.
```

### AKT-T04 · W12–15 · `akta/T04-inspector`

```
Read design-system.md §5 and build that mock faithfully. It is already designed
— this is execution, not invention.

web/src/inspector/ — a right-rail panel that opens on edge selection.
Subscribe to Akshath's selection event and call his setSelection. DO NOT open
web/src/graph/engine.ts. Mount into Harleen's right-rail panel host.

Renders from /api/edge/{id}/provenance:
- Source doc: filename, type badge, SHA-256 in a monospace token — this is the
  trust signal, give it real visual weight
- Locator, as "page:3 line:11"
- THE RAW SOURCE SNIPPET, monospace, plus or minus 2 lines of context, with the
  matched span highlighted. Raw — not paraphrased, not translated, not cleaned.
- The generating SQL in a collapsible block with a copy button
- Derivation chain, if a resolved entity is involved
- Evidentiary status badge, colours from design-system.md §4 — the same palette
  Akshath's edge styles use, so a magenta dashed edge and a magenta badge
  visibly agree

Zero hex codes. Every colour a token.
Commit "AKT-T04: provenance inspector renders source of truth". Push, don't merge.
```

### AKT-T05 · W15–16 · `akta/T05-open-at-locator` — the beat

```
Harleen shipped openFileAt(path, line, span) at W12. Use it.

Clicking the locator in the inspector opens that file in her editor, scrolls to
the line, and highlights the exact span. Do not reach into her files — call her
exported function.

This is the single most persuasive fifteen seconds available to this project:
"here is the claim, here is the exact line in the original FIR it came from."

Then the states, using Mehul's shared components:
- Nothing selected: empty state
- Loading state
- Provenance missing: say so LOUDLY in red. An edge without provenance shouldn't
  exist, so the UI treats it as an alarm, not a blank.
Commit "AKT-T05: click locator opens source at line". Push, don't merge.
```

---

## 7. SHOURYA — vault, ingest, CDR

Own list: `brain/vault.py`, `brain/ingest/`, `brain/cdr/`, `brain/prefilter/`

**Changed from your task file:** there is no `GET /api/vault/tree`. The browser
reads the vault directly from disk. You still create the folder structure and
`Case_Config.yaml` on disk, and you still own `/api/vault/integrity`.

### SHO-T01 · W2–4 · `shourya/T01-vault`

```
Read docs/tasks/SHOURYA.md "W2-4" and blueprint.md §3 for the exact folder
structure.

NOTE: the file tree is served by the browser reading disk directly, not by an
API. Do not build /api/vault/tree. Everything else in that section stands.

brain/vault.py:
- create_vault(path, case_name) writes the EXACT folder structure from
  blueprint.md §3: 01_Evidence_Inbox/, Suspects/, Phones/, Locations/, Events/,
  Organisations/, Hypotheses/, plus Case_Config.yaml and Delta_Log.md. Exact,
  because Harleen's tree UI and Hermaine's certificate both assume these paths.
- open_vault(path) validates the structure, loads Case_Config.yaml, returns case
  metadata.
- Case_Config.yaml holds: case ID, case name, created timestamp, decay lambda,
  resolution thresholds, tool version.

Hermaine reads decay lambda from this file and AKTA reads her thresholds from
it. Agree the key names with both of them BEFORE you write the file, then stop
changing them. List the key names you chose in your commit message body.

Also add vaults/ to .gitignore — nobody commits a case vault.
Commit "SHO-T01: vault create and open, config keys frozen". Push, don't merge.
```

### SHO-T02 · W4–8 · `shourya/T02-ingest` 🔴 MDP item 1

```
Read docs/tasks/SHOURYA.md "W4-8" and blueprint.md Law 1. Akshath's
brain/guard.py is already merged — call into it, don't reimplement it.

Pipeline, in THIS EXACT ORDER. The order is the guarantee.
1. Classify — extension plus header sniff, to FIR | CDR | TowerDump | Statement
   | FieldLog. Header sniff matters: a CDR arrives as .xlsx, .csv or .txt
   depending on which telco sent it.
2. SHA-256 the file BEFORE it moves. Hash the original bytes, not the copy.
3. Copy into 01_Evidence_Inbox/<type>/ alongside a sidecar <filename>.sha256
4. Lock — chmod 0444 AND register the path with guard.py. Both, not either:
   filesystem permissions stop the OS, the guard stops the application.
5. Write the Doc row — id, filename, type, sha256, ingest timestamp, original
   path. Every edge in the graph points at one of these rows.

POST /api/ingest accepts a file, runs the pipeline, returns the Doc.

Then try to break it yourself: after ingest, attempt to append a byte to the
file with open(), with os.rename, and with shutil.copy. Show me all three
failing.
Commit "SHO-T02: ingest classifies, hashes, locks, records". Push, don't merge.
```

### SHO-T03 · W8–10 · `shourya/T03-integrity`

```
On open_vault, re-hash every file in 01_Evidence_Inbox/ and compare to its
sidecar.

GET /api/vault/integrity returns
  {"status": "verified" | "contaminated", "failures": [...]}

Harleen's status bar renders this and Hermaine's contamination-refusal path
calls it. Match brain/mocks.py byte-for-byte, then delete the mock. Tell both of
them the response shape the moment it's real.
Commit "SHO-T03: integrity verification on vault open". Push, don't merge.
```

### SHO-T04 · W10–14 · `shourya/T04-cdr`

```
Read docs/tasks/SHOURYA.md "W10-14" and data/TEMPLATE_CDR.csv.

- Column-mapping profile in YAML, because no two telcos ship the same headers.
  Airtel profile first and exactly matching the template.
- Load into DuckDB, not pandas-in-memory. Hermaine's certificate needs to print
  reproducible SQL.
- Normalise phone numbers ONCE at load: strip +91, leading 0, spaces, dashes, to
  canonical 10 digits. Un-normalised numbers are the single most common cause of
  a graph that silently has two nodes for one phone.
- Parse timestamps to UTC-aware. Indian CDR dumps use DD/MM/YYYY HH:MM:SS —
  WATCH THE DAY/MONTH ORDER. A US-style parse silently shifts the whole timeline
  and nobody notices until the demo.
- Every row keeps its row:N index. That's the locator Hermaine's writer and
  AKTA's inspector both depend on. Row numbers MUST be stable across reloads —
  write a test that loads twice and asserts identical row numbers.

POST /api/cdr/load.

If the parser fights you: parse the Airtel template profile perfectly and
hardcode the mapping. One telco profile that works beats three that half-work.
Commit "SHO-T04: CDR parses into DuckDB with stable row numbers". Push, don't merge.
```

### SHO-T05 · W14–16 · `shourya/T05-prefilter`

```
Read docs/tasks/SHOURYA.md "W14-16".

Deterministic SQL over the DuckDB table. Each rule returns candidate edges WITH
source_doc_id and locator attached — Hermaine's writer rejects them outright
otherwise.

1. Burst pair — pair A-B with at least N calls in a window of T. Defaults N=8,
   T=1h, both from Case_Config.yaml.
2. IMEI swap chain — one IMEI carrying multiple numbers, or one number across
   multiple IMEIs, within a window. THIS RULE FEEDS AKTA'S PLANTED ALIAS MERGE —
   tell her the moment it produces output.
3. Night spike — pair whose 00:00-05:00 call volume is at least 3x their daytime
   rate.

Build them in that order. Night spike is the one to drop if time runs out.

GET /api/prefilter/candidates.
Commit "SHO-T05: three deterministic pre-filter rules". Push, don't merge.
```

---

## 8. MEHUL — synthetic case data, centrality panel, UI states

Own list: `data/`, `web/src/panels/centrality/`, `web/src/states/`

### MEH-T01 · W2–3 · `mehul/T01-roster`

```
Read data/GROUND_TRUTH.md, data/TEMPLATE_FIR.md, data/TEMPLATE_CDR.csv,
roadmap.md line 101, and architecture.md line 253 on code-mixing.

Target spec: 3 gangs, ~40 people, ~60 phones, 8 FIRs, 3 statements, 2 tower
dumps, ~25,000 CDR rows.

Write data/README.md — the entity roster. Every person, their phones, their
gang, their aliases, their vehicles. This is my working document and everyone
else reads it: AKTA needs the alias list, Hermaine needs gang membership to
check her centrality output.

~40 people with realistic Haryana/Punjab names. Some genuinely similar
(Vikram Singh / Vikram Sing / V. Singh), some sharing a first name ACROSS gangs.
~60 phone numbers in valid Indian mobile format, canonical 10 digits.
3 gangs with overlapping-but-distinct membership, plus the one cross-gang bridge
node from GROUND_TRUTH.md.

Do NOT reveal the planted answers in this file in a way that makes them obvious
— the roster is a cast list, not a solution key.
Commit "MEH-T01: entity roster and gang structure". Push, don't merge.
```

### MEH-T02 · W3–6 · `mehul/T02-narratives`

> Read every generated FIR afterwards yourself. See §9.

```
Read data/TEMPLATE_FIR.md, data/README.md, and architecture.md line 253.

Write 8 FIR narratives from the template. Each needs: an FIR number in NNNN/YYYY
format, a real Haryana thana name (Kharkhoda, Gohana, Sonipat Sadar, Rai,
Ganaur), IPC/BNS section references, a complainant, named accused, a code-mixed
narrative paragraph, and a date.

- VARY THE LENGTH. Real FIRs run from four lines to two pages.
- Names in LATIN script inside DEVANAGARI narrative. That is the realistic case
  and a clean all-Devanagari set will flatter our extractor and teach us nothing.
- Every narrative says WHO, WHEN, WHERE, WHICH SECTION and WHICH PHONE. An FIR
  that says "the suspect engaged in criminal activity" is worse than nothing.

Then 3 witness statements. ONE of them contains the alibi contradiction from
GROUND_TRUTH.md — cross-check that file for exactly what it must say and when.
Commit "MEH-T02: eight FIRs and three statements". Push, don't merge.
```

### MEH-T03 · W6–10 · `mehul/T03-cdr-generator`

> Ask Shourya for his exact Airtel header names at W6. Do not guess.

```
Read docs/tasks/MEHUL.md "W6-10" and data/GROUND_TRUTH.md.

Write data/generate_cdr.py — a SCRIPT, not a hand-made CSV. I will need to
regenerate with more noise when the graph turns out to be a hairball at W10.

~25,000 rows: a_party, b_party, timestamp, duration_s, imei, cell_id.
Headers matching Shourya's Airtel profile EXACTLY — ask him, don't guess.
Timestamps DD/MM/YYYY HH:MM:SS spread over ~3 months.
Cell IDs in HR-SNP-0147 format, ~15 towers, geographically plausible clusters.

Now plant the structure from GROUND_TRUTH.md:
- PROXY KINGPIN: talks only to 2-3 lieutenants, never to the hitmen. Modest call
  volume. He must rank around 15th on degree and 1st on betweenness. This is the
  single most important number in the dataset.
- ALIAS PAIR: two numbers that NEVER call each other, sharing an IMEI for a
  two-week window. That IMEI overlap is the ONLY signal linking them. Nothing
  else may give it away.
- BURST PAIRS: 2-3 pairs with at least 8 calls in an hour.
- NIGHT SPIKES: 2 pairs heavily weighted to 00:00-05:00.
- NOISE: every person makes ordinary calls to non-suspects. Without noise the
  graph is a clean diagram of the answer and the analytics look trivial.

Also generate 2 tower dumps — subsets of CDR rows by cell_id, including the ping
that contradicts the statement alibi.

Write data/GENERATION_NOTES.md: what you planted, where, and the row numbers.
Akshath needs this for the demo script.
Commit "MEH-T03: CDR generator with planted structure". Push, don't merge.
```

### MEH-T04 · W11–14 · `mehul/T04-centrality-panel`

```
web/src/panels/centrality/ — a self-contained React panel. Mount into Harleen's
right-rail panel host.

Table from GET /api/analytics/centrality: node name, type badge, degree,
betweenness, PageRank. Sortable by column.

DEFAULT SORT: betweenness descending. That's the demo's punchline, so it's the
first thing on screen.

Click a row calls Akshath's focusNode(id). Use his exposed API. DO NOT open
web/src/graph/engine.ts.

Styling from Harleen's tokens. No hex codes — if you need a colour that isn't a
token, ask her to add one.

Mock data is already in brain/mocks.py, so build the whole panel before
Hermaine's endpoint is real.
Commit "MEH-T04: centrality panel sorted by betweenness". Push, don't merge.
```

### MEH-T05 · W14–16 · `mehul/T05-ui-states` — after feature freeze

```
Read design-system.md §7 for copy tone.

web/src/states/ — shared components everyone else imports instead of writing
their own:
- <EmptyState> — icon, headline, one line of body, optional action
- <LoadingSkeleton> — shaped placeholders, not spinners
- <ErrorState> — for failed API calls

Copy tone: "Named as accused in 3 FIRs", never "High risk individual". The
product never editorialises about people; it reports what the record says. That
rule holds in empty-state copy too.

Export them from one index. Tell Harleen and AKTA the moment they're available.
Commit "MEH-T05: shared empty, loading and error states". Push, don't merge.
```

---

## 9. Not for Antigravity — the human tasks

These do not go in a prompt. An agent will produce something plausible and
wrong, and you will not notice until the demo.

### Akshath

- **Pick the four planted answers.** Which person is the proxy kingpin, which
  two names are the alias pair, which statement contradicts which tower ping,
  which node bridges which gangs. These are demo-design judgments. Antigravity
  writes `GROUND_TRUTH.md` *around* your decisions (AKS-T03), it does not make
  them.
- **Review every PR before merging.** You are the only merger. Ten-minute
  turnaround; a person waiting on a merge is a person not building.
- **Announce the schema freeze out loud** when AKS-T01 merges. Not in chat. Out
  loud, in the room.
- **Run the W6 / W11 / W14 integration checks** yourself, on the demo laptop.
- **Call the W12 AI go/no-go on the clock.** One question: has the Ollama client
  returned schema-valid JSON for a real card, once? No means take the fallback
  immediately — hand-write two suspect cards and demo them as output. Decide at
  W12, not W15. The failure mode is not "the model doesn't work", it's "you
  spent three hours believing it was about to."
- **Enforce the W13 feature freeze.** You are allowed to be unpopular for ten
  seconds.
- **Write the 5-minute demo script** — the exact click sequence, the opening
  line, the closing line, and the one sentence you say while each thing loads.
- **Rehearse 5 times minimum.** On the demo laptop, on battery, wifi off.

### Everyone, at W0

- Clone, `npm install` in `web/`, `pip install -r requirements.txt`
- `ollama pull` both models — start this first, it's slow
- Read `docs/tasks/GITHUB_RULES.md` §2 and §4 and confirm in the group chat
- Confirm `make dev` runs on your laptop. **If one person's environment is
  broken the whole team stops.** One person idle for six hours costs more than
  thirty team-minutes now.

### Cross-person agreements — settle these at W2, in person, not in code

| What | Between | Why |
| :--- | :--- | :--- |
| `locator` string format | Hermaine ↔ AKTA | Both parse it; changing it later breaks both |
| `derivation_chain` field shape | AKTA ↔ Hermaine | Certificate and inspector both render it |
| `Case_Config.yaml` key names | Shourya ↔ Hermaine ↔ AKTA | Decay lambda and thresholds read from it |
| Airtel CDR header names | Shourya ↔ Mehul | Generator must match parser exactly |
| Centre-pane container contract | Harleen ↔ Akshath | Canvas must not remount |
| `openFileAt` signature | Harleen ↔ AKTA | Ship at W12; AKTA has no hours at W15 |
| `/api/vault/integrity` shape | Shourya ↔ Harleen ↔ Hermaine | Status bar and refusal path both call it |

### Judgment calls no agent should make

- **Mehul:** read every generated FIR narrative yourself. A generated FIR that
  says "the suspect engaged in criminal activity" reads as a toy on a projector.
- **Mehul:** tune the proxy kingpin's call volume by hand until betweenness
  actually surfaces him. That's iteration against Hermaine's real output at W11,
  not a thing you can specify upfront.
- **AKTA:** confirm the alias pair merges *for the IMEI reason*, not just that it
  merges. A merge for the wrong reason means the explanation on stage is false.
- **Hermaine:** judge whether the certificate *looks* legal at 1920x1080 on the
  projector. That's an eye, not a test.
- **Harleen:** the 1920x1080 alignment walk. List the problems before fixing any.

### Escalation

If you are behind, say so **early**. Akshath can re-route work at W10 and cannot
at W15. Telling the room early costs nothing; telling it late costs the demo.

At W11, when something is on fire, the question is never "what do we cut?" It is
**"are these four safe?"** — ingest with hashing and lock · graph with enforced
provenance · Provenance Inspector · BSA §63 certificate.
