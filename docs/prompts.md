# SyndicateBrain — Build Prompts

A ready-to-paste prompt sequence for building the whole app with a coding agent (Claude Code / Sonnet 5). Each prompt is one working session with a verifiable done-condition. Run them in order.

---

## Part 0 — Setup (do this yourself, no AI)

### Install

```bash
# Node 20+ and Python 3.11+
node -v && python3 --version

# Ollama (macOS/Linux)
curl -fsSL https://ollama.com/install.sh | sh
# Windows: download from ollama.com

# Pull models now — this takes a while, start it in the background
ollama pull qwen3.5:4b
ollama pull qwen3.5:9b
```
*(Verify those tags exist on ollama.com/library at the time you run this — model names change. If they differ, use the current Qwen instruct tags in the 4B and 9B range.)*

### Create the repo

```bash
mkdir syndicatebrain && cd syndicatebrain
git init
mkdir -p web brain shell data docs

# copy the spec in — the agent reads these, so they must be in the repo
cp -r /path/to/SIH26/docs/* docs/
cp /path/to/SIH26/blueprint.md docs/blueprint.md
git add -A && git commit -m "spec"
```

**The spec docs must live inside the repo.** Every prompt below tells the agent to read them. If they're not there, the agent invents its own architecture and you get slop.

### Rules of engagement with the coding agent

1. **One prompt = one session = one commit.** Don't chain three prompts hoping it keeps up. It won't.
2. **Always end a session by committing.** `git commit` before starting the next prompt. When something breaks, `git diff` tells you what changed.
3. **If it produces something wrong, don't argue — restart the prompt with the correction added.** Re-prompting is cheaper than debating.
4. **Never let it skip the acceptance check.** If the prompt says "done when X", make it show you X.
5. **Never let it touch `brain/guard.py` after P3** except through a prompt that says so explicitly.
6. Keep `docs/` read-only to the agent unless you're deliberately updating the spec.

---

## Part 1 — Foundations

### P0 · Repo scaffold + project memory

```
Read docs/blueprint.md and docs/roadmap.md (the "Build Mechanics" section) in full.

Set up the repo skeleton:
- web/    Vite + React 18 + TypeScript + Tailwind. Strict TS.
- brain/  Python 3.11, FastAPI, uv or venv + requirements.txt.
- data/   empty, with a README describing what goes here.
- shell/  empty placeholder with a README saying "Electron, Phase 5".

Also write CLAUDE.md at the repo root. It must contain, tersely:
- What this project is (2 sentences)
- The six Laws from blueprint.md section 2, verbatim
- The repo layout and what each workspace owns
- The rule: web/ NEVER imports fs, path, child_process, or any Node API.
  All file access goes through the Brain HTTP API.
- The rule: NOTHING writes to disk except brain/guard.py::safe_write.
- Where to look things up: docs/architecture.md for schemas and API,
  docs/agents.md for agent contracts, docs/design-system.md for UI.

Add a Makefile (or package.json scripts) with: `make dev` running both
web and brain with hot reload, `make test`, `make gen` for the TS client.

Do NOT write any feature code. Scaffold only.

Done when: `make dev` starts Vite on :5173 and uvicorn on :8787, and
the browser shows a page that successfully fetches GET /api/health.
```

### P1 · Synthetic case generator

```
Read docs/blueprint.md sections 4 and 7, and docs/roadmap.md Phase 0.

Write data/generate_case.py — a seeded generator producing a synthetic
criminal case in data/synthetic_case/.

Produce:
- 8 FIR text files, code-mixed Hindi/English as real Haryana FIRs read:
  Devanagari narrative with Latin-script names, phone numbers, digits and
  BNS/IPC section references interleaved.
- 3 witness/interrogation statement text files.
- 25,000+ rows of CDR CSV across ~60 phone numbers, with realistic columns
  (Calling Party, Called Party, Call Date Time, Duration, IMEI, IMSI, Cell ID, LAC).
- 2 tower dump CSVs.

Plant these ground truths and document them in data/synthetic_case/GROUND_TRUTH.md:
1. A proxy kingpin: high betweenness, never directly calls the operatives.
2. An alias pair resolvable ONLY via a shared IMEI, not by name similarity.
3. An alibi contradiction: a statement placing someone in city A while their
   phone pings a tower in city B at the same time.
4. A cross-gang bridge: one person connecting two otherwise separate clusters.
5. A burner rotation: one person, three IMSIs on one IMEI over four months.
6. A decoy: two different people with near-identical names in the same thana
   who must NOT be merged.

Use a fixed random seed. Everything must regenerate identically.

Done when: `python data/generate_case.py` produces the files, and
GROUND_TRUTH.md lists each planted fact with the exact file and row/line
where it can be verified by hand.
```

### P2 · Extraction fixtures

```
Read docs/model-bakeoff.md sections 2 and 3 in full.

Create the 6 fixtures described there in data/fixtures/, using excerpts
from the FIRs generated in P1 (edit them as needed to hit each failure mode).

For each: fir_00N.txt (input) and fir_00N.json (hand-shaped expected output
matching the A1 Extractor schema in docs/agents.md).

Then write brain/bakeoff/score.py implementing exactly the five metrics in
model-bakeoff.md section 3, plus brain/bakeoff/run.py per section 5.

Also write brain/extract/stub.py per model-bakeoff.md section 8 — returns
fixture output for known chunks, raises StubMiss otherwise.

Do NOT call any model. This is all offline scaffolding.

Done when: `pytest brain/tests/test_score.py` passes with hand-made
pass/fail cases proving each metric detects its failure mode — especially
alias_fidelity catching a name that was wrongly expanded.
```
> **Do the fixture JSON by hand yourself, or at minimum review every line.** If a model wrote your ground truth, the bake-off measures agreement, not accuracy.

### P3 · Brain skeleton + the Path Guard

```
Read docs/architecture.md sections 1, 2, 7 and 8 in full.

Build the FastAPI Brain skeleton:
- brain/guard.py — assert_writable and safe_write EXACTLY as specified in
  architecture.md section 8. This is the most important file in the project.
- brain/schemas.py — Pydantic models for the API contract.
- brain/db.py — KùzuDB + SQLite init, creating every table in architecture.md
  sections 1 and 2. Hypothesis edges go in a SEPARATE .syndicate/hypotheses.kz.
- brain/vault.py — create/open a vault with the exact folder structure from
  blueprint.md section 4.
- Endpoints: /api/health, /api/vault/open, /api/vault/tree, /api/note/read,
  /api/note/write.

Add a CI check (script + Makefile target) that greps the whole brain/ tree
for bare open(...,'w'), Path.write_text, Path.write_bytes, shutil, and
os.remove OUTSIDE guard.py, and fails if any are found.

Write tests proving the guard blocks: a path outside the vault, a path
inside 01_Evidence_Inbox, a symlink pointing out of the vault, and a
path using ../ traversal.

Done when: those four guard tests pass and the CI grep check passes.
```

### P4 · Web shell + design system

```
Read docs/design-system.md in full, especially sections 1, 2b and 3.

Build the frontend shell in web/:
- All tokens from section 1 as CSS custom properties, with the light-mode
  overrides. Wire Tailwind to consume them.
- The three-pane layout from section 3: 40px title bar, 240px left rail,
  flex centre, 320px right rail, 56px timeline strip, 24px status bar.
- Desktop only. ONE breakpoint. Below 1280px width, render a
  "window too small" message instead of reflowing.
- web/src/platform.ts — the four window.shell functions with browser
  fallbacks, per architecture.md section 7. Nothing else may reference
  window.shell.
- The status bar with the permanent "offline" indicator and node/edge counts
  (zeros for now).

Fonts: Inter, JetBrains Mono, Noto Sans Devanagari — bundle them locally,
no CDN, no Google Fonts. This app must work with the network off.

Do NOT build any feature panes yet — placeholders only.

Done when: the layout renders at 1440x900, matches the token palette,
shows the too-small message at 1200px, and loads zero external resources
(verify in the network tab with the network disabled).
```

---

## Part 2 — The Spine

### P5 · Vault, editor, and the Obsidian core

```
Read docs/architecture.md section 3 (note frontmatter) and
docs/blueprint.md section 5.1 (features O1-O7).

Build:
- Brain: vault tree, note read/write (via safe_write only), frontmatter
  parse/serialise, FTS5 indexing of notes into index.sqlite.
- Web: file tree in the left rail; CodeMirror 6 markdown editor in the
  centre with live preview; frontmatter rendered as a properties panel
  at the top of the note, not as raw YAML.
- [[Wiki-links]] with autocomplete, alias syntax [[Target|shown]],
  click to navigate.
- Backlinks pane in the right rail (linked mentions + unlinked mentions).
- Quick switcher (Cmd/Ctrl+O) and command palette (Cmd/Ctrl+P).
- Global search (Cmd/Ctrl+Shift+F) over FTS5.

Editor content column caps at 72ch. Devanagari renders in Noto Sans
Devanagari at +1px with 1.75 line-height.

Done when: you can create a note, link to another with [[ ]], click through,
see the backlink appear on the other side, and find both via search.
```

### P6 · Ingest — hash, classify, lock

```
Read docs/blueprint.md section 6.3 and docs/architecture.md sections 1 and 2.

Build the ingest pipeline stage 1:
- POST /api/ingest/stage — takes paths, classifies each file
  (FIR | CDR | TowerDump | Statement | FieldLog | Misc) by extension and
  header sniff, computes SHA-256, returns a preview WITHOUT committing.
- POST /api/ingest/commit — copies files into 01_Evidence_Inbox/<kind>/,
  writes the .sha256 sidecar, sets the file read-only (0444 on Unix,
  read-only attribute on Windows), inserts a Doc row, writes an audit_log
  entry with the hash chain.
- GET /api/ingest/{id}/events — SSE progress stream.
- On vault open, verify every stored SHA-256 and surface any mismatch
  loudly in the status bar.
- Web: drag-drop ingest zone, staging preview table showing filename /
  kind / hash / size, commit button, live progress.

Done when: you can drag in the P1 synthetic files, see them hashed and
classified, and afterwards a write attempt to any file in 01_Evidence_Inbox
fails at the OS level. Show that failure.
```

### P7 · CDR parser + deterministic pre-filter

```
Read docs/architecture.md section 4 in full.

Build:
- brain/ingest/cdr.py — profile-based column mapping per section 4, loading
  into DuckDB. Ship the generic_v1 profile. If columns don't map, return
  the unmapped headers so the UI can ask.
- Implement all 7 pre-filter rules in the table in section 4, each as a
  separate, individually testable SQL function returning candidate edges
  with provenance (source row numbers).
- Web: column-mapping UI shown when a profile doesn't match; saves the new
  profile into the vault.

The LLM must never see raw CDR rows. This module's output is the only
thing downstream consumes.

Done when: the 25,000-row synthetic CDR loads in under 5 seconds, each of
the 7 rules has a passing unit test, and the burner-rotation ground truth
from P1 is detected by the IMEI-swap rule.
```

### P8 · Knowledge graph + provenance contract

```
Read docs/architecture.md sections 1.2, 1.3 and 1.4.

Build brain/graph/writer.py:
- The ONLY way edges enter the graph.
- It REJECTS any edge missing source_doc_id or locator. Not a warning — an
  exception. Write a test proving it.
- Applies the temporal decay formula from section 1.4 at query time, never
  at write time.
- GET /api/graph/subgraph, /api/graph/query, /api/edge/{id}/provenance.

The provenance endpoint returns: source document, exact locator, the
verbatim snippet at that locator, observed_at, weight, effective_weight,
and the Cypher that reproduces the edge.

Wire the CDR candidate edges from P7 into the graph.

Done when: the synthetic CDR produces a populated graph, and
/api/edge/{id}/provenance for any edge returns a snippet you can find by
hand in the source CSV at the stated row number.
```

### P9 · Graph canvas

```
Read docs/design-system.md section 4 in full — node shapes, sizes, edge
colours and styles by evidentiary status.

Build the graph canvas in the centre pane with Cytoscape.js:
- cose-bilkent layout, fixed seed so it renders identically every launch.
- Node shape and colour by entity type, size by PageRank (stub at uniform
  for now), label above 0.6 zoom.
- Edge colour/style/width by evidentiary status EXACTLY per the table:
  verified solid amber, corroborated thicker, decayed at 25% opacity.
- Focus mode (F key): local graph, everything else at 15% opacity.
- Selection ring in --evidence.
- Edge bundling: repeated calls between the same pair collapse into one
  weighted edge. Never render 25,000 individual call events.

Done when: the synthetic case renders as a readable graph in under 3
seconds, and it looks identical on every reload.
```

### P10 · Provenance Inspector

```
Read docs/design-system.md section 5 (the Provenance Inspector mock) and
docs/architecture.md section 8.

Build the right-rail Provenance Inspector: selecting any node or edge shows
the panel exactly as mocked — relation, source file, SHA-256 with a copy
button, locator, observed date, weight and effective weight, the verbatim
source snippet, the reproducing Cypher with a copy button, and
[Open source] / [Add to selection] buttons.

[Open source] opens the source document in the centre pane, scrolled to the
locator with that span highlighted.

Done when: clicking any edge in the graph shows real provenance, and
[Open source] lands on the correct row of the correct CSV with the row
visibly highlighted.
```

> **Stop here and check.** This is the Phase 1 gate from the roadmap: you can point at anything on screen and show where it came from. Do not proceed until that is true for every edge type.

---

## Part 3 — Intelligence

### P11 · Entity resolution, 3 stages

```
Read docs/architecture.md section 5 in full.

Build brain/resolve/ implementing the three stages IN ORDER:
- blocking.py — hard keys only. Pairs not sharing a block key are NEVER
  compared. This is the wrongful-arrest firewall; write a test proving
  two similarly-named people in different thanas with no shared identifier
  are never even scored.
- phonetic.py — normalisation (honorific stripping, ISO-15919
  transliteration), Indic-adapted Double Metaphone with the v/b, s/sh, k/q,
  f/ph and aspiration-collapse rules, RapidFuzz token_set_ratio.
- vectors.py — multilingual-e5-small embeddings in sqlite-vec, cosine
  similarity, computed ONLY within a matched phonetic block.
- score.py — the weighted combination and the three threshold bands.

Every decision writes a resolution_decisions row and must be reversible.

Done when: the P1 ground truths hold — the IMEI-shared alias pair merges,
and the near-identical-names decoy does NOT merge. Both as tests.
```

### P12 · Adjudication queue

```
Read docs/design-system.md section 5 (Adjudication card) and
docs/architecture.md section 5.

Build the grey-band (0.75-0.92) human adjudication UI in the right rail:
two-column side-by-side comparison, matching fields highlighted in --ok,
conflicting in --danger, shared hard keys pinned at top with a key glyph,
the three sub-scores shown.

Keyboard: M merge, R reject, ? need-more-info, J/K navigate. An analyst
must be able to clear 50 pairs in a couple of minutes without a mouse.

Merges are reversible: an un-merge rebuilds the affected notes and graph edges.

Done when: you can clear a queue of 20 synthetic grey-band pairs entirely
by keyboard, and un-merging one restores the prior graph state exactly.
```

### P13 · Analytics — centrality, Leiden, decay

```
Read docs/blueprint.md sections 5.2 (P8, P9) and 6.3, and
docs/architecture.md section 1.4.

Build brain/analytics/:
- PageRank, betweenness, degree — computed over the decayed graph for the
  active time window.
- Leiden with the Constant Potts Model via leidenalg. NOT Louvain.
  Communities become Org nodes with MEMBER_OF edges (method='leiden_cpm').
- Recompute on ingest and on timeline window change.
- Web: centrality panel in the right rail, ranked, with the metric explained
  in plain language. Community hulls behind clusters on the canvas.

Copy rule from design-system.md section 7: never say "kingpin" or
"mastermind". Say "highest betweenness centrality in this network".

Done when: the P1 proxy kingpin is the top-betweenness node, the three
planted gangs come out as three communities, and the cross-gang bridge
person shows high betweenness with low degree.
```

### P14 · Timeline scrubber

```
Read docs/architecture.md section 1.4 and docs/design-system.md section 3.

Build the always-visible timeline strip:
- Draggable window with both handles, plus [ and ] to step.
- Setting the window filters edges AND sets the decay reference date.
- Edge widths animate to their new effective_weight — the network visibly
  thins and thickens as you scrub. This is the best 10 seconds of the demo;
  make the transition smooth (200ms) and never re-run layout while scrubbing.
- A lambda control in Case_Config.yaml, surfaced in a settings popover.

Done when: scrubbing from Jan to Aug visibly changes the network shape
without the layout jumping, at 30fps or better on the synthetic case.
```

---

## Part 4 — The Demo Winner

### P15 · BSA §63 Certificate exporter

```
Read docs/blueprint.md section 9 in full. This is the most important
feature in the product.

Build:
- Subgraph selection: lasso on canvas, plus "everything within N hops of X".
- POST /api/export/bsa63 producing a PDF with ALL SEVEN sections listed in
  blueprint.md section 9, in that order.
- EVERY value in the PDF is assembled by code from the database. No LLM
  touches this endpoint. The exclusion declaration is fixed template text.
- CONTAMINATION REFUSAL: if any node or edge in the selection comes from
  hypotheses.kz, the export refuses, returns the offending element ids, and
  the UI shows them listed. It must never silently drop them.
- The certificate button is the only filled amber button in the app; it
  turns --danger when the selection is contaminated.

Done when: you can export a certificate, and a person who has never seen
the app can use it alone to re-derive one edge from the raw CSV by hand.
Test that yourself before moving on.
```

### P16 · Audit log + viewer

```
Read docs/architecture.md section 2 (audit_log) and blueprint.md Law 1.

Build:
- Hash-chained audit log: every row's this_hash = sha256(prev_hash || row).
- Every write, every ingest stage transition, every agent call, every export.
- GET /api/audit/tail, and a verify endpoint that walks the chain and
  reports the first broken link.
- Web: audit viewer with filtering by actor/action/date.

Done when: tampering with any audit row directly in SQLite makes the
verify endpoint report exactly that row as the break point.
```

---

## Part 5 — The AI Layer

### P17 · Model runtime + bake-off run

```
Read docs/model-bakeoff.md sections 4, 5 and 6.

Build brain/llm/:
- Ollama client with JSON mode, temperature 0, THINKING MODE OFF, and
  Pydantic validation with exactly one retry (validation error appended)
  then a loud failure. Never a silent fallback.
- warmup() called on app launch.
- Model id, version and quantisation recorded into .syndicate/models.json
  and stamped on every generated artefact.

Then run the bake-off harness from P2 against the candidates in
model-bakeoff.md section 4 and write bakeoff_results.md.

Apply the decision rule in section 6 and tell me which model wins and why,
showing the table.

Done when: bakeoff_results.md is committed and a winner is selected by the
stated gates, not by vibes.
```

### P18 · A1 Extractor

```
Read docs/agents.md sections 0 and A1 in full.

Replace brain/extract/stub.py with the real extractor:
- GLiNER multilingual NER pre-pass for PERSON/PHONE/VEHICLE/LOCATION spans.
- The A1 prompt exactly as skeletoned, with the winning model from P17.
- Chunks of <=3000 tokens with page and char offsets preserved through
  the whole path.
- Devanagari surface forms preserved VERBATIM in `surface`; transliteration
  in `normalized`. Read docs/architecture.md section 5b — extract, never
  translate.
- Config flag BRAIN_EXTRACTOR = stub | ollama, defaulting to ollama.

Wire the P2 fixtures in as a pytest regression suite with the P17 scores
as floors. Any prompt edit that drops a score below its floor fails CI.

Done when: all 6 fixtures pass their floors, and specifically fixture 002
proves the model does not expand a bare alias into a full name.
```

### P19 · Cartographer + Delta

```
Read docs/agents.md sections A3 and A4 in full.

Build:
- The orchestrator state machine from the end of agents.md, checkpointed
  into ingest_runs so a crash resumes.
- A3 Cartographer: suspect/org/event cards in the fixed section order, with
  ^[source_id] on every factual sentence and [[wiki-links]] for every known
  entity. Honours human_edited by appending a "## Machine Update" section
  instead of overwriting.
- A4 Delta: appends one dated section to Delta_Log.md per ingest run. The
  DIFF IS COMPUTED IN CODE; the agent only narrates it.
- A citation validator that strips any factual sentence without a resolvable
  source_id BEFORE anything is written to disk.
- A banned-word assertion in tests: no "kingpin", "mastermind", "suspicious",
  "dangerous", "clearly" in generated cards.

Done when: ingesting the synthetic case produces suspect cards where every
sentence carries a working source badge, and Delta_Log.md correctly reports
the planted contradiction and the new cross-gang bridge.
```

### P20 · Copilot with citation enforcement

```
Read docs/architecture.md section 6 and docs/agents.md section A6 in full.

Build:
- Graph-RAG retrieval exactly as specified: entity linking, k-hop subgraph
  filtered to the active window and capped at ~120 edges, FTS5+vector
  document retrieval capped at ~12 chunks restricted to docs referenced by
  the subgraph.
- The A6 system prompt verbatim.
- The POST-VALIDATOR IN CODE, not prompt: split into sentences, drop any
  factual sentence without a resolvable source_id, verify each cited
  source_id actually exists in the retrieved context, and if >40% is
  dropped discard the whole answer and return the insufficiency message.
- Web: copilot panel in the right rail, answers with clickable source
  badges that jump to the exact locator.

Done when: it correctly answers "who connects the two gangs" WITH working
citations, AND it returns the insufficiency message for a question the case
file cannot answer. Both are demo beats — verify both.
```

---

## Part 6 — Sandbox, Wrap, Harden

### P21 · Hypothesis Sandbox

```
Read docs/blueprint.md section 5.2 (P14), Law 2, and
docs/design-system.md section 4 ("The Sandbox is a mode, not a layer").

Build:
- FIRST: Adamic-Adar and Resource Allocation baselines. They are cheap and
  may beat the GNN.
- THEN: PyTorch Geometric GAE link prediction, CPU only, writing ONLY to
  .syndicate/hypotheses.kz.
- Benchmark GNN vs the heuristics on the synthetic case and write the honest
  numbers to bakeoff_results.md. If the heuristics win, say so — that is a
  finding, not a failure.
- Sandbox mode (H key): persistent magenta 2px border around the whole
  canvas, undismissable banner reading
  "INVESTIGATIVE LEADS — NON-EVIDENTIARY · NOT ADMISSIBLE AS EVIDENCE".
  Predicted edges dashed magenta with marching ants.
- Accept creates an investigative TASK for the officer. It does NOT create
  a graph edge. Ever.

Done when: exiting sandbox mode removes every predicted edge from view, and
attempting a BSA §63 export on a selection containing one is refused by P15.
```

### P22 · Electron wrap

```
Read docs/roadmap.md "Build Mechanics" and docs/architecture.md section 7.

Build shell/ in Electron:
- Main process: create the window, spawn and supervise the frozen Brain
  binary on a random high port with a per-launch bearer token, spawn or
  detect Ollama, kill children cleanly on quit.
- Preload exposing ONLY the four functions in platform.ts:
  pickFolder, pickFiles, revealInFolder, brainStatus.
- Freeze Brain with PyInstaller.
- electron-builder config for .exe, .dmg and .deb.
- First-run flow: check Ollama, check models, offer to pull if missing.
- CSP locked down. No remote content. devTools off in production.

CRITICAL: do not move any logic into the shell. Verify by deleting the
shell and confirming the app still works in Chrome against a manually
started Brain.

Done when: a built installer launches, opens a vault, ingests, and exports
a certificate with no dev server running — and the browser build still works.
```

### P23 · Demo hardening

```
Read docs/roadmap.md Phase 6 and "The 5-Minute Demo Script".

Build:
- data/reset_demo.sh — one command restores the vault to its pre-demo state.
- Model warmup on launch so no judge watches a cold start.
- Empty states, error states and loading states for every pane, with the
  copy tone from design-system.md section 7.
- A "window too small", "Brain not responding" and "Ollama not found"
  recovery path that explains itself instead of white-screening.
- Fixed layout seed verified: the graph renders identically every launch.

Then walk the 5-minute demo script end to end and report every point where
the app hesitates, stutters, or shows something confusing.

Done when: the full script runs twice in a row, from reset, with the
network disabled, without a single unexplained pause.
```

---

## Part 7 — Utility Prompts

Keep these around; you'll use them constantly.

**When something breaks**
```
Read CLAUDE.md first.

[paste the error]

Before changing anything: tell me your hypothesis for the root cause and
how you'll confirm it. Do not write a fix until I agree with the diagnosis.
```

**When it drifts from the spec**
```
Read CLAUDE.md and docs/blueprint.md section 2 (the six Laws).

Review the code you just wrote against those Laws and against
docs/architecture.md. List every violation. Do not fix anything yet —
just list them.
```

**Before every commit**
```
Show me the diff. For each changed file, one line on why it changed.

Then check: does anything in this diff write to disk outside guard.py?
Does anything in web/ import a Node API? Does any new edge insert path
skip the provenance requirement?
```

**When it wants to add a dependency**
```
Why this package? What is the smallest thing in it that we need? Can we do
that in under 30 lines ourselves? This app ships offline to police laptops —
every dependency is bundle size and audit surface.
```

**When you're behind schedule**
```
Read docs/roadmap.md, the "If You Only Have 72 Hours" section.

Given what is built so far, what is the minimum remaining work to run the
5-minute demo script end to end? List it in order. Tell me explicitly what
to abandon.
```

---

## Order of Play

```
SETUP → P0 → P1 → P2 → P3 → P4        Foundations       (~2 days)
      → P5 → P6 → P7 → P8 → P9 → P10  The Spine         (~5 days)   ← GATE
      → P11 → P12 → P13 → P14         Intelligence      (~5 days)   ← GATE
      → P15 → P16                     Demo Winner       (~3 days)   ← GATE
      → P17 → P18 → P19 → P20         AI Layer          (~5 days)   ← GATE
      → P21 → P22 → P23               Wrap & Harden     (~5 days)
```

**The gates are not optional.** Each one is a place where continuing on a broken foundation costs you a week later. The roadmap states each gate's pass condition.

**If you are short on time**, P21 (the GNN sandbox) is the first thing to cut — the *decision* to quarantine neural inference is the intellectual contribution, and you can present that decision without having built the model. P22 is the second: demo in Chrome kiosk mode.
