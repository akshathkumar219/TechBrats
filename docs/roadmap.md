# SyndicateBrain — Build Roadmap

**Assumption:** small team (2–4), building toward an SIH demo, working from `blueprint.md`. Day estimates assume one focused person per track; parallel tracks are marked. Adjust the calendar, keep the order — the order is the part that matters.

---

## The Governing Principle

**Build the spine before the organs.** The spine is: *file on disk → deterministic edge with provenance → visible on a graph → exportable as a certificate.* Everything else — LLM agents, GNN sandbox, pretty cards — is an organ hanging off that spine. Teams lose hackathons by building the organs first and discovering on the last night that nothing connects.

**Corollary:** the LLM is the *last* thing you wire in. If your pipeline needs the model to work, your pipeline is wrong. Build with a stubbed extractor that returns fixed JSON, and swap the real model in at the end. This also keeps your iteration loop at seconds instead of minutes.

**But write the fixtures on day one.** The hand-written input/expected pairs cost nothing, need no model, and do three jobs: they *are* the stub's output during Phases 1–3, they *are* the bake-off test set in Phase 4, and they *are* the regression suite forever after. See `docs/model-bakeoff.md`.

---

## Build Mechanics — Web First, Wrap Last

**You build a local web app for four weeks, then spend one day making it a desktop app.**

That is possible because of one decision: the frontend talks to the Python Brain over plain local HTTP, not through a desktop framework's IPC. So the exact same React bundle runs in a Chrome tab during development and inside Electron in production. Nothing is thrown away and nothing is ported.

```
DEV  (Phases 0-4)                       PROD (Phase 5)
┌──────────────────┐                    ┌─────────────────────────────┐
│ Chrome tab       │                    │ Electron window             │
│ localhost:5173   │                    │  └ same React bundle        │
│ Vite hot-reload  │                    │  + 4 native functions       │
└────────┬─────────┘                    └───────────┬─────────────────┘
         │ fetch/SSE                                │ fetch/SSE
         ▼                                          ▼
┌──────────────────┐                    ┌─────────────────────────────┐
│ uvicorn --reload │  ← same code →     │ frozen brain.exe, spawned   │
│ localhost:8787   │                    │ and supervised by Electron  │
└──────────────────┘                    └─────────────────────────────┘
```

**What this buys you**
- Chrome DevTools on the graph canvas. Debugging a 2,000-node Cytoscape layout inside a native webview is miserable; in Chrome it is normal work.
- Sub-second hot reload instead of a native rebuild on every CSS tweak.
- No native toolchain, no code signing, no packaging failures until the very end.
- **The shell choice stops being a day-one risk.** If Electron fights you in Phase 5, you demo in Chrome kiosk mode with Brain launched by a shell script and lose nothing that matters.

**The one rule that makes it work:** the frontend never touches `fs`, `path`, `child_process`, or any Node API. If a component needs a file, it asks Brain over HTTP. Violate this once and you have silently made the app un-runnable in a browser, which means you have lost the fallback and the fast dev loop together.

**The only genuinely native surface** — four functions, feature-detected, with browser fallbacks:

| `window.shell?.…` | Browser fallback |
| :--- | :--- |
| `pickFolder()` — native folder dialog | text input for the vault path |
| `pickFiles()` — native file dialog | drag-drop zone |
| `revealInFolder(path)` | hidden |
| `brainStatus()` | poll `/api/health` |

Write these as a thin `platform.ts` module on day one so no component ever branches on environment.

### Why Electron over Tauri

You were right, though not for the reason usually given.

| | Electron | Tauri |
| :--- | :--- | :--- |
| Bundle | ~150 MB (bundles Chromium) | ~10 MB (system webview) |
| Rendering | **Identical everywhere** | WebView2 / WKWebView / WebKitGTK — three engines, three behaviours |
| Native code | Node — the whole npm ecosystem | Rust |
| Packaging | `electron-builder`, very mature | `tauri build`, good but thinner |
| AI-assisted development | Enormous corpus; AI tools write Electron reliably | Much thinner corpus, especially for sidecar patterns |

The size argument is Tauri's headline advantage, and **it evaporates here**: this app already ships a ~250 MB frozen Python binary and pulls 5–7 GB of models. Adding 150 MB of Chromium is noise, and nobody deploying to a police laptop is counting megabytes against a 6 GB model download.

What you actually need is a **graph canvas that renders identically on the demo machine, the judges' machine, and a police laptop.** Cytoscape with a few thousand nodes behaves differently across three webview engines; bundled Chromium removes that entire class of problem. Combine that with no Rust in the critical path, and Electron is the correct call for this project.

*(The old deck's "Tauri is 10× faster and more secure" line was marketing copy, not analysis. With all logic in a token-authenticated localhost service, the security difference is close to nil — and the deck no longer claims it.)*

### Repo Layout

```
syndicatebrain/
├── web/          Vite + React + TS + Tailwind — the entire UI
│   ├── src/platform.ts      ← the ONLY file that knows about window.shell
│   └── src/api/             ← generated TS client from Brain's OpenAPI schema
├── brain/        FastAPI — all logic, all disk I/O, all ML
│   ├── guard.py             ← safe_write. Nothing else writes to disk.
│   ├── schemas.py           ← Pydantic; source of truth for the API contract
│   └── bakeoff/             ← model harness (Phase 0)
├── shell/        Electron — ~200 lines, written in Phase 5
├── data/         synthetic generator + extraction fixtures
└── docs/         this folder
```

**Generate the TS client from Brain's OpenAPI schema** (`openapi-typescript`) and wire it into a `npm run gen` script. FastAPI publishes the schema for free from your Pydantic models. Hand-maintaining types on both sides of an HTTP boundary is the single biggest time sink in this architecture, and this removes it entirely.

---

## Phase 0 — Foundations *(Days 1–2)*

Do these in parallel; nothing downstream works without them.

| Track | Task | Done when |
| :--- | :--- | :--- |
| Data | **Generate the synthetic case.** 3 gangs, ~40 people, ~60 phones, 8 FIRs, 3 statements, 2 tower dumps, ~25,000 CDR rows. Plant the answers: one proxy kingpin who never calls the hitmen, one alias pair that only resolves via shared IMEI, one alibi contradiction, one cross-gang bridge. | The demo story is provably in the data |
| Frontend | **Vite + React + TS + Tailwind, running in a browser tab.** Three-pane layout, tokens from `design-system.md` as CSS vars. No Electron yet. | `npm run dev` → dark three-pane shell at localhost, hot reload |
| Backend | **FastAPI Brain skeleton** — health check, vault open, `guard.safe_write`, SQLite/Kùzu init. Run with `uvicorn --reload`. | Frontend fetches `/api/health` and renders the vault tree |
| Storage | Vault folder creation, KùzuDB + SQLite init, schemas from `architecture.md` | `.syndicate/` builds and a hand-written Cypher insert round-trips |
| Guard | **Path Guard + SHA-256 hashing + read-only lock.** | You can demo a refused write to `01_Evidence_Inbox` |
| AI-prep | **6 extraction fixtures + the bake-off harness** (`docs/model-bakeoff.md`). No models involved — hand-written input/expected pairs plus the scoring code. | `stub_extractor` returns fixture output; the harness runs and reports zeros |

> **The synthetic dataset is the highest-leverage 6 hours of the whole build.** Write the generator as a script so you can regenerate with more noise later. Never use real police data.

---

## Phase 1 — The Spine *(Days 3–7)*

**Goal by end of Phase 1:** drop a CSV and a PDF into the app, get a provenance-backed graph on screen, click an edge, see the exact source row.

| # | Task | Days |
| :-- | :--- | :--- |
| 1.1 | Ingest: drag-drop → classify → hash → lock → `Doc` rows + audit entry | 0.5 |
| 1.2 | CDR parser: profile-based column mapping + DuckDB load | 1 |
| 1.3 | Deterministic pre-filter rules (start with 3: burst pair, night spike, IMEI swap) | 1 |
| 1.4 | Graph writer with the **provenance contract enforced at the DB layer** | 0.5 |
| 1.5 | FIR path: PDF text extract (+ Tesseract if scanned) → chunk with page/char offsets | 1 |
| 1.6 | **Stubbed** extractor returning hand-written JSON for your synthetic FIRs | 0.25 |
| 1.7 | Graph canvas (Cytoscape) rendering nodes + edges with type colours | 1 |
| 1.8 | **Provenance Inspector** — click edge → source, hash, locator, snippet, Cypher | 0.75 |

**Phase 1 gate:** you can point at any line on screen and say where it came from. Do not proceed until this is true.

---

## Phase 2 — Intelligence *(Days 8–13)*

| # | Task | Days |
| :-- | :--- | :--- |
| 2.1 | Entity resolution stage 1: blocking keys | 0.5 |
| 2.2 | Stage 2: normalisation, honorific stripping, transliteration, Indic Double Metaphone | 1.5 |
| 2.3 | Stage 3: embeddings (`multilingual-e5-small`) + sqlite-vec, scoring, thresholds | 1 |
| 2.4 | **Adjudication queue UI** — the keyboard-driven merge/reject card | 1 |
| 2.5 | Centrality: PageRank, betweenness, degree → panel + node sizing | 0.5 |
| 2.6 | **Leiden + CPM** communities (`leidenalg`) → hulls + auto-named `Org` nodes | 1 |
| 2.7 | **Temporal decay + timeline scrubber** — the graph visibly breathes as you scrub | 1 |
| 2.8 | Vault editor: markdown render, `[[links]]`, backlinks pane, quick switcher, FTS search | 1.5 *(parallel track)* |

**Phase 2 gate:** the proxy kingpin you planted in the synthetic data is the top-betweenness node, and the alias pair merged for the right reason.

---

## Phase 3 — The Demo Winner *(Days 14–16)*

Do this **before** the LLM agents. It is the differentiator and it does not depend on a model.

| # | Task | Days |
| :-- | :--- | :--- |
| 3.1 | Subgraph selection (lasso + "2 hops from X") | 0.5 |
| 3.2 | Certificate generator: manifest, edge provenance table, Cypher reproduction block, exclusion declaration, Part A/B blocks, PDF body hash | 1.5 |
| 3.3 | **Contamination refusal** — selection touching sandbox elements blocks export and names them | 0.5 |
| 3.4 | Hash-chained audit log + audit viewer | 0.5 |

**Phase 3 gate:** hand the PDF to someone who has never seen the app and ask them to re-derive one edge from the raw CSV using only the certificate. If they can, you have built something no other team will have.

---

## Phase 4 — The AI Layer *(Days 17–22)*

Now, and only now, plug in the models.

| # | Task | Days |
| :-- | :--- | :--- |
| 4.1 | Ollama integration, model pull/detect, health check, JSON-mode wrapper + Pydantic validators | 1 |
| 4.1b | **Run the bake-off** — `docs/model-bakeoff.md`. Fixtures and harness already exist from Phase 0, so this is an afternoon, not a project. Commit `bakeoff_results.md`. | 0.5 |
| 4.2 | **A1 Extractor** — flip `BRAIN_EXTRACTOR` from `stub` to `ollama` with the winning model. The fixtures become the regression suite. | 1 |
| 4.3 | GLiNER NER pre-pass | 0.5 |
| 4.4 | **A3 Cartographer** — suspect cards with source badges and wiki-links | 1 |
| 4.5 | **A4 Delta** — `Delta_Log.md`, driven by a code-computed diff | 0.75 |
| 4.6 | **A6 Copilot** — Graph-RAG retrieval + citation post-validator | 1.5 |
| 4.7 | A5 Contradiction (deterministic detection, agent write-up) | 0.75 |
| 4.8 | A2 Resolver on the grey band | 0.5 |

**Phase 4 gate:** ask the copilot something the case file cannot answer and watch it refuse. Rehearse that moment — a model that says "the case file does not contain enough evidence" in front of judges is worth more than ten correct answers.

---

## Phase 5 — Sandbox & Polish *(Days 23–27)*

| # | Task | Days |
| :-- | :--- | :--- |
| 5.1 | **Adamic-Adar + Resource Allocation baselines first** — cheap, and they may beat the GNN | 0.5 |
| 5.2 | PyG GAE link prediction, CPU, separate `hypotheses.kz` DB | 1.5 |
| 5.3 | Sandbox mode UI: magenta border, permanent banner, accept→task/reject workflow | 1 |
| 5.4 | **Benchmark GNN vs heuristics on your data and put the honest number in the deck** | 0.5 |
| 5.5 | A7 Dossier export | 0.75 |
| 5.6 | Daily Delta Briefing note | 0.5 |
| 5.7 | **Wrap in Electron** — window, 4 native functions, sidecar supervision, `electron-builder` → `.exe` / `.dmg` / `.deb`, first-run model setup | 1.5 |
| 5.8 | Empty states, error states, loading states, onboarding of a fresh vault | 0.75 |

Reporting that classical heuristics matched your GNN is not a weakness in the pitch — it is proof you benchmarked instead of assuming, and it is exactly the finding the NeurIPS 2023 HeaRT work predicts. Own it.

---

## Phase 6 — Demo Hardening *(Days 28–30)*

- **Freeze the code.** New features stop. Only bug fixes.
- Rehearse the 5-minute demo **at least 8 times**, on the demo laptop, on battery, with wifi physically off.
- Pre-warm the models. Never let a judge watch a 40-second cold start.
- Build a **reset script**: one command restores the vault to its pre-demo state.
- Screenshot everything for the deck: Provenance Inspector, timeline scrubbing, sandbox banner, certificate PDF, a refused write, a refused export.
- Prepare answers for: *"how is this different from Palantir/i2?"*, *"what if the AI is wrong?"*, *"what's your accuracy?"*, *"is this admissible?"*

---

## The 5-Minute Demo Script

The order is deliberate — each beat sets up the next.

| Time | Beat | The line |
| :--- | :--- | :--- |
| 0:00 | Empty vault, wifi off, airplane mode visible | "Nothing here touches a network. Ever." |
| 0:20 | Drag in 8 FIRs + a 25,000-row CDR | "This is three weeks of manual Excel work." |
| 0:50 | Ingest runs; hashes appear; files go read-only | "Every file is hashed and locked. The system cannot modify evidence — watch." *(attempt the write, get refused)* |
| 1:20 | Graph appears, communities coloured | "Three gangs, detected by Leiden — not Louvain, and I'll say why in questions." |
| 1:50 | Centrality panel → the proxy kingpin lights up | "He never calls the hitmen. He's still the bridge." |
| 2:20 | **Click an edge → Provenance Inspector** | "Every single line on this screen points at a row in a file. Nothing here is a guess." |
| 2:45 | Scrub the timeline; network thins and re-forms | "Old links decay. A SIM recycled two years ago doesn't get to invent a syndicate." |
| 3:10 | Open `Delta_Log.md` | "The AI wrote this. Every sentence has a source badge." |
| 3:30 | Ask the copilot a question it *can* answer, then one it can't | "It just refused. That refusal is the product." |
| 4:00 | Press `H` — sandbox opens, magenta banner | "This is where the neural network lives. Quarantined. Labelled non-evidentiary." |
| 4:20 | Select a subgraph → **Generate BSA §63 Certificate** | "Hashes, provenance, the exact queries, and a declaration that no AI touched any of it." |
| 4:45 | Try to export *with* a hypothesis edge included → refused | "It won't let you. That's the whole point." |
| 5:00 | Close | "Offline. No GPU. No cloud. And it holds up in court." |

---

## If You Only Have 72 Hours

Cut ruthlessly to this, in this order. Everything else is optional.

**Keep:** synthetic data · ingest + hash + read-only lock · CDR parser + 2 pre-filter rules · deterministic graph with provenance · Cytoscape canvas · Provenance Inspector · centrality + Leiden · timeline scrubber · **BSA §63 certificate** · one LLM agent (Cartographer *or* Copilot, not both) · Delta_Log.

**Cut:** GNN sandbox entirely (say "architecturally quarantined, Phase 2" — the *decision* to quarantine it is the intellectual contribution, not the model) · OCR (use text-layer PDFs) · vector stage of resolution (blocking + phonetics carries the demo) · contradiction detector · dossier PDF · canvas/whiteboard · multi-case federation · light mode.

---

## Tooling & Efficiency Notes

- **One repo, four workspaces:** `web/` (Vite+React — the whole UI), `brain/` (Python FastAPI — all logic and disk I/O), `shell/` (Electron — added in Phase 5, ~200 lines), `data/` (synthetic generator + fixtures).
- **Write the JSON schemas first**, in one file, shared between Python (Pydantic) and TS (zod, generated). Schema drift between the sidecar and the UI is the #1 time sink in this architecture.
- **Golden-file tests:** commit expected extractor JSON for 5 fixture documents. When you swap models, the diff tells you instantly whether you regressed.
- **Seed everything.** Fixed random seeds in the generator, fixed layout seeds in Cytoscape. A graph that looks different every launch destroys demo rehearsal.
- **Never demo on a cold model.** Add a `warmup()` on app launch.
- **Log every agent call to a file you can `tail`.** You will spend more time debugging a malformed JSON response than writing the prompt.
- **Build the reset script on day 2, not day 29.**

---

## Risks, Ranked

| Risk | Mitigation |
| :--- | :--- |
| Electron packaging fights you in Phase 5 | The web build is always a working fallback — demo in Chrome kiosk mode with Brain started by a shell script. Judges will not care, and nothing about the product story changes. |
| KùzuDB bindings fight you | Fall back to SQLite + NetworkX. You lose the Cypher-in-the-certificate flourish; print the SQL instead. |
| Indic phonetics under-performs | Have a curated alias table as a backstop; the demo data is yours, so the merge you need *will* work. |
| 7B model too slow on the demo laptop | Ship 3B as the default and mention 7B as the "with 16 GB" tier. |
| Graph turns into a hairball | Aggressive default filters: entities only, effective_weight above threshold, 2-hop from a focus node. |
| Scope creep into Obsidian feature parity | You need O1–O7 only. Canvas, plugins, themes, sync are explicitly out. |
