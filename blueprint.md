# SyndicateBrain — Golden Blueprint

**Problem Statement:** SIH26189 — AI-Powered Criminal Network Analysis System
**Product:** An air-gapped, Obsidian-style investigation workbench for police, with a deterministic criminal knowledge graph at its core and local AI agents on top.
**Status:** Spec locked. Storm-report findings supersede all earlier drafts.
**Build mode:** 24-hour on-site hackathon, 6 people, nothing pre-built — see `docs/hackathon-plan.md` for the cut scope and assignments. The phased roadmap in `docs/roadmap.md` is now the *post-hackathon* / full-product plan.
**Last updated:** 2026-09-10

---

## 0. Document Map

This is the **golden document**. It holds every product, architecture and design decision at the level you need to build from. Depth lives in `docs/`:

| Doc | What's in it |
| :--- | :--- |
| `blueprint.md` (this) | Product definition, principles, features, architecture, folder structure, models, agents, theme summary, guardrails |
| `docs/architecture.md` | Data model, graph schema, note frontmatter, pipeline internals, DB schemas, IPC contracts |
| `docs/agents.md` | Every agent: role, input, output schema, prompt skeleton, failure mode |
| `docs/design-system.md` | Full theme — tokens, typography, spacing, component specs, graph render rules |
| `docs/roadmap.md` | Phased build plan, demo-critical path, task breakdown |
| `docs/antigravity-build-spec.md` | Paste-into-Antigravity spec for the browser markdown vault editor (File System Access API, layout, tokens, 15-step build order) |
| `docs/hackathon-plan.md` | **The 24-hour on-site build plan** — scope cut, 6-person task assignments, git workflow, hour-by-hour timeline, pre-venue prep |
| `docs/prompts.md` | Ready-to-paste prompt sequence for building the app with a coding agent, plus setup steps |
| `docs/model-bakeoff.md` | Fixture spec, scoring harness, candidates and decision rule for picking the extraction model |
| `docs/pitch-deck.md` | SIH 6-slide submission content (storm-corrected) |
| `docs/_blueprint_v1_archive.md` | Original pre-storm blueprint, kept for reference only — **do not build from this** |

---

## 1. What We Are Building — One Paragraph

SyndicateBrain is a desktop application that behaves like Obsidian but is purpose-built for a detective working a syndicate case. A case is a **vault** on disk: plain markdown files, `[[wiki-links]]`, backlinks, tags, graph view, quick switcher, global search — all the muscle memory of Obsidian. On top of that vault sits a criminal intelligence engine: it ingests FIRs, CDR dumps, tower dumps, chargesheets and field notes; resolves messy Indian names and aliases into single entities; builds a deterministic knowledge graph where every edge points back to a raw source record; runs graph analytics (centrality, Leiden communities, temporal decay) to surface syndicate structure; and runs local LLM agents that write suspect dossiers, keep a running `Delta_Log.md` of what changed, answer questions with line-level citations, and export a BSA §63 evidentiary certificate for any subgraph. Everything runs offline on a police laptop. Nothing leaves the machine.

**The one-line pitch:** *Obsidian for detectives — with a court-admissible graph underneath and an AI that never gets to invent a connection.*

---

## 2. The Constitution — Six Non-Negotiable Laws

Every design decision downstream must obey these. They come from the verified storm briefing and they are what separates this from every other GNN-on-a-graph hackathon project.

**Law 1 — Evidence is immutable.**
Raw ingested files live in a read-only tier. No agent, no code path, no user action modifies them. Every file is SHA-256 hashed at ingest and the hash is stored. Chain of custody is a filesystem guarantee, not a promise.

**Law 2 — The map is deterministic; the AI only suggests.**
The primary graph contains **only** edges derivable by a deterministic query over raw records (this call appears in row 4,182 of `CDR_9812345678.csv`). Neural link prediction never writes into this graph. It writes into a separate, visually distinct **Hypothesis Sandbox** labelled *Investigative Leads — Non-Evidentiary*.

**Law 3 — Every edge carries provenance.**
Click any edge in the UI → see the exact source file, row/page, timestamp, and the Cypher/SQL that produced it. An edge that cannot show its provenance does not render in the primary graph.

**Law 4 — Nothing is asserted without a citation.**
The copilot answers only from retrieved graph + document context, and every claim carries an inline source badge that jumps to the exact line. No badge → the sentence does not ship.

**Law 5 — The graph is temporal, not static.**
Every edge has a time. Edge weight decays exponentially. The default view is "active now", not "everything ever". Stale co-offences and recycled SIMs do not get to invent syndicates.

**Law 6 — Identity resolution is blocked before it is fuzzy.**
No naked Levenshtein across the dataset. Hard deterministic blocking → Indic phonetics → embeddings, in that order, and only ever within a block. A wrongful merge here is a wrongful arrest downstream.

---

## 3. Who Uses It

| User | What they do in the app |
| :--- | :--- |
| **Investigating Officer (IO)** | Drops evidence in, reads suspect cards, follows links, asks the copilot, scrubs the timeline |
| **Crime Branch / SP-level** | Reads the Daily Delta Briefing, looks at the syndicate graph, asks "who is the real head" |
| **Cyber cell analyst** | Runs CDR ingest, tunes resolution thresholds, reviews the Hypothesis Sandbox |
| **Prosecution-facing officer** | Selects a subgraph → exports the BSA §63 certificate + dossier PDF |

**The core loop:** drop evidence → open Delta_Log → follow the new links → ask the copilot → confirm or reject a hypothesis → export the dossier.

**Desktop only.** No mobile, no tablet, no web-hosted version. This is a deliberate security position, not a scoping shortcut: an investigation vault is a case file, and a case file does not belong on a phone. One platform means one screen size, one input model, and a fixed 3-pane layout — see `docs/design-system.md` §2b for what that lets us delete.

---

## 4. Vault & Folder Structure

A case is a folder. The folder *is* the database (plus two embedded DB files). It is portable, backup-able, and readable in plain Obsidian if the app dies — that portability is itself a selling point.

```
CASE_2026_NCB_047/                        ← the vault (one case = one vault)
│
├── 00_Case/
│   ├── Case_Overview.md                  ← human-authored, app-updated header block
│   ├── Team.md                           ← officers, roles, transfer log
│   └── Case_Config.yaml                  ← decay λ, thresholds, jurisdiction, custodian details
│
├── 01_Evidence_Inbox/                    ← READ-ONLY TIER. OS-enforced. Never written after ingest.
│   ├── FIR/
│   │   ├── FIR_0142_2025_Sonipat.pdf
│   │   └── FIR_0142_2025_Sonipat.pdf.sha256
│   ├── CDR/
│   │   ├── CDR_9812345678_Jan-Mar2026.csv
│   │   └── CDR_9812345678_Jan-Mar2026.csv.sha256
│   ├── TowerDump/
│   ├── Statements/                       ← interrogation & witness statements (text as recorded by the IO)
│   ├── FieldLogs/                        ← detective daily logs (.md or .txt, dropped by IO)
│   └── Misc/                             ← seizure memos, bank statements, vehicle records
│
├── 02_AI_Brain/                          ← THE ONLY WRITABLE TIER FOR AGENTS
│   ├── Delta_Log.md                      ← append-only changelog of every ingest run
│   ├── Suspects/
│   │   └── Vikram_Singh_@Vicky.md        ← auto-generated + human-editable suspect card
│   ├── Organisations/
│   │   └── Sonipat_Arms_Ring.md          ← Leiden-detected community, named by agent
│   ├── Phones/
│   │   └── 9812345678.md
│   ├── Vehicles/
│   ├── Locations/
│   │   └── Tower_HR_SNP_0147.md
│   ├── Events/
│   │   └── 2026-02-14_Kharkhoda_Seizure.md
│   ├── Hypotheses/                       ← Sandbox output. Every file banner-flagged NON-EVIDENTIARY.
│   │   └── H-0031_Vikram-to-Rehan_bridge.md
│   └── Briefings/
│       └── 2026-09-10_Daily_Delta.md
│
├── 03_Workspace/                         ← IO's own notes. Agents read, never write.
│   ├── Scratch.md
│   ├── Canvas/                           ← link-boards / whiteboards
│   └── Queries/                          ← saved Cypher / saved graph filters
│
├── 04_Exports/                           ← generated dossiers & certificates
│   ├── BSA63_Certificate_2026-09-10_subgraph-A.pdf
│   └── Dossier_Sonipat_Arms_Ring.pdf
│
└── .syndicate/                           ← app internals, hidden
    ├── graph.kz/                         ← KùzuDB embedded graph database
    ├── index.sqlite                      ← FTS5 search, hashes, audit log, resolution decisions
    ├── vectors.sqlite                    ← sqlite-vec embedding store
    ├── audit.log                         ← append-only, hash-chained action log
    └── models.json                       ← which local models produced which artefacts
```

**Why this shape:**
- `01` vs `02` is the legal firewall. It is enforced in code (path guard in the Rust layer) *and* at the OS level (read-only permission bits set at ingest).
- `03_Workspace` exists so the officer's own thinking is never confused with machine output.
- `.syndicate/` is derived state. Delete it and the app rebuilds everything from `01` — this is the proof that the vault is the source of truth.

---

## 5. Feature List

### 5.1 Obsidian Core (the base the whole thing sits on)

| # | Feature | Priority |
| :-- | :--- | :--- |
| O1 | Markdown vault on disk, live-preview editor | P0 |
| O2 | `[[Wiki-links]]` with autocomplete, alias links `[[Vikram_Singh\|Vicky]]` | P0 |
| O3 | Backlinks pane ("Linked mentions" / "Unlinked mentions") | P0 |
| O4 | YAML frontmatter properties (typed: entity_type, aliases, risk, status) | P0 |
| O5 | Graph view — force-directed, zoom, pan, filter, focus/local-graph mode | P0 |
| O6 | Global search (FTS5) + Quick Switcher (`Cmd/Ctrl+O`) | P0 |
| O7 | Command palette (`Cmd/Ctrl+P`) | P0 |
| O8 | Tags + tag pane | P1 |
| O9 | Split panes / tabs | P1 |
| O10 | Templates for note types | P1 |
| O11 | Canvas / link-board (freeform spatial arrangement) | P2 |
| O12 | Daily note (auto-created field log for the IO) | P1 |
| O13 | Outgoing-links pane, hover preview | P2 |

### 5.2 The Police Intelligence Layer

| # | Feature | Priority |
| :-- | :--- | :--- |
| P1 | **Evidence ingest** — drag a folder of PDFs/CSVs, auto-classify, hash, lock read-only | P0 |
| P2 | **CDR parser** — vendor-agnostic column mapping, 50k+ rows, deterministic anomaly pre-filter | P0 |
| P3 | **FIR/statement extractor** — OCR (hin+eng) → NER → structured entities with page/line offsets | P0 |
| P4 | **3-stage entity resolution** — blocking → Indic phonetics → embeddings, with a human adjudication queue | P0 |
| P5 | **Deterministic knowledge graph** — KùzuDB, every edge provenance-linked | P0 |
| P6 | **Graph canvas** — faction colouring, entity-type icons, edge style = evidentiary status | P0 |
| P7 | **Timeline scrubber** — filter the graph to any date window; exponential edge decay | P0 |
| P8 | **Centrality panel** — PageRank / Betweenness / Degree → "proxy kingpin" ranking | P0 |
| P9 | **Leiden community detection (CPM)** — auto-named gang factions | P0 |
| P10 | **Suspect card auto-generation** — agent writes and maintains the dossier note | P0 |
| P11 | **`Delta_Log.md`** — what's new since last ingest: new entities, new links, contradictions | P0 |
| P12 | **Graph-RAG copilot** — question box, cited answers, jump-to-source | P0 |
| P13 | **BSA §63 Certificate exporter** — one click, per subgraph | P0 — *the demo winner* |
| P14 | **Hypothesis Sandbox** — GNN link prediction, visually quarantined, accept/reject workflow | P1 |
| P15 | **Alibi / contradiction detector** — temporal conflicts between statement and tower ping | P1 |
| P16 | **Burner-phone rotation detection** — IMEI/IMSI swap chains, deterministic rule | P1 |
| P17 | **Tower-dump co-location** — who else was at the scene in the window | P1 |
| P18 | **Prosecution dossier PDF** — full syndicate write-up with evidence trail | P1 |
| P19 | **Daily Delta Briefing** — morning summary note for senior officers | P1 |
| P20 | **Audit log viewer** — hash-chained record of every action taken in the case | P1 |
| P21 | **Multi-case federation** — search across vaults for a phone/name | P2 |
| P22 | **Vehicle / bank statement parsers** | P2 |

---

## 6. Architecture

### 6.1 Layer Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│  UI  —  React + TypeScript + Tailwind                                │
│  (a browser tab in dev; the same bundle inside Electron in prod)     │
│  Editor(CodeMirror6) │ GraphCanvas(Cytoscape) │ Copilot │ Timeline   │
└───────────────────────────────┬──────────────────────────────────────┘
                                │  HTTP + SSE  →  127.0.0.1:<port>, bearer token
                                │  (identical in a browser tab and in the shipped app)
                                │
        ┌───────────────────────┴───────────────────────┐
        │  SHELL — Electron (thin, added in Phase 5)    │
        │  • window, menus, native file/folder dialogs  │
        │  • spawns + supervises the Brain sidecar      │
        │  • spawns/detects Ollama                      │
        │  • packaging & auto-update                    │
        │  NO business logic. Deletable without         │
        │  breaking the app — it still runs in Chrome.  │
        └───────────────────────┬───────────────────────┘
                                │
┌───────────────────────────────▼──────────────────────────────────────┐
│  BRAIN — Python (FastAPI, PyInstaller-frozen)                        │
│  THE ONLY THING THAT TOUCHES DISK. Real from day 1.                  │
│  • Path Guard (blocks every write outside 02/03/04)  ← Law 1         │
│  • SHA-256 hashing + hash-chained audit log                          │
│  • Vault FS watcher, markdown/frontmatter parser                     │
│  • KùzuDB + SQLite, Cypher execution, provenance resolver            │
│  • OCR (Tesseract hin+eng) · NER (GLiNER) · RapidFuzz + Indic phon.  │
│  • sentence-transformers · DuckDB CDR pre-filter                     │
│  • igraph/leidenalg · PyTorch Geometric (sandbox)                    │
│  • Agent orchestrator state machine                                  │
└───────────┬──────────────────────────────────────────────────────────┘
            │ local HTTP
┌───────────▼──────────────────────┐
│  OLLAMA (local model runtime)    │
│  Qwen3.5-9B-Instruct  Q4_K_M     │
│  Qwen3.5-4B-Instruct  Q4_K_M     │
│  (JSON mode, thinking off)       │
└──────────────────────────────────┘
                    │
         ┌──────────▼───────────┐
         │  STORAGE (on disk)   │
         │  vault/*.md          │
         │  graph.kz (KùzuDB)   │
         │  index.sqlite (FTS5) │
         │  vectors.sqlite      │
         └──────────────────────┘
```

### 6.2 Process Model — and why the shell is deliberately thin

Three processes, all local:
1. **Electron shell** — window, menus, native dialogs, process supervision, packaging. **No business logic.** It is a browser with a native file picker.
2. **Brain** (Python FastAPI, frozen binary) — owns the filesystem, the databases, and every rule in §2. Bound to `127.0.0.1` on a random high port with a per-launch bearer token. Zero external network calls, enforced in config.
3. **Ollama** — local LLM runtime. Detected, or guided install on first run.

**The important architectural consequence:** because the frontend talks to Brain over plain local HTTP, *the same frontend runs in a normal browser tab*. You develop the entire UI in Chrome with Vite hot-reload and devtools — no rebuild, no native toolchain — and only wrap it at the end. The shell becomes a late, low-risk, one-day decision instead of a day-one commitment that blocks everything.

**Law 1 lives in Brain, not the shell.** Every file operation in the entire system goes through one Python function. That is a stronger guarantee than splitting file I/O between a Rust layer and a Python layer, and it removes a third language from the critical path.

**Honest tradeoff:** the "15 MB app" claim from the earlier draft was never real once you ship a Python sidecar and quantised models. Realistic installer: **~400–550 MB** with Electron, plus **~5–7 GB** of models pulled on first run. State this honestly — "no cloud, no GPU, no server, no internet" is the true and still-impressive claim, and nobody deploying to a police laptop cares about 150 MB.

### 6.3 The Pipeline

```
[01_Evidence_Inbox]  drag & drop
        │
        ├─▶ CLASSIFY (extension + header sniff)  →  FIR | CDR | TowerDump | Statement | FieldLog
        │
        ├─▶ HASH (SHA-256) + write .sha256 sidecar + chmod read-only + audit entry
        │
        ▼
┌─── STRUCTURED PATH (CDR / TowerDump) ───┐   ┌─── UNSTRUCTURED PATH (FIR / Statement) ───┐
│ DuckDB load, schema-map columns          │   │ OCR if scanned (Tesseract hin+eng)         │
│ Deterministic pre-filter:                │   │ Language detect → chunk with page/line offs│
│  • night-window call spikes (00:00-05:00)│   │ GLiNER NER: PERSON/PHONE/VEHICLE/LOCATION/ │
│  • IMEI↔IMSI swap chains                 │   │            ORG/DATE/WEAPON/AMOUNT          │
│  • one-way / short-burst call patterns   │   │ Qwen-4B pass: relation extraction, strict  │
│  • co-location in tower dumps            │   │   JSON, temperature 0, schema-validated    │
│  • first/last contact before an incident │   │ Every entity keeps: file, page, char span  │
│ Output: candidate edges + anomaly flags  │   │ Output: entity mentions + candidate edges  │
└──────────────────┬───────────────────────┘   └──────────────────┬─────────────────────────┘
                   └──────────────┬───────────────────────────────┘
                                  ▼
            ┌──── ENTITY RESOLUTION (3 stages, strictly ordered) ────┐
            │ 1. BLOCK  — father's name, thana, DOB/age window,      │
            │             MSISDN, IMEI, vehicle plate. Hard keys.    │
            │ 2. PHONETIC — Indic-adapted Metaphone/Soundex within   │
            │             block ("Md"→"Mohammed", "Vikas"↔"Bikash")  │
            │ 3. VECTOR — cosine sim on multilingual embeddings,     │
            │             ONLY inside a matched phonetic block       │
            │ Score ≥ 0.92 auto-merge │ 0.75–0.92 → HUMAN QUEUE      │
            │ Every merge decision written to index.sqlite, reversible│
            └──────────────────────────┬─────────────────────────────┘
                                       ▼
            ┌──── DETERMINISTIC KNOWLEDGE GRAPH (KùzuDB) ────┐
            │ Nodes: Person, Phone, IMEI, Vehicle, Location, │
            │        Tower, Organisation, FIR, Event, Doc    │
            │ Every edge row carries: source_doc_id, locator │
            │        (row# / page:line), observed_at, weight │
            │ Temporal decay applied at query time:          │
            │        w(t) = w0 · exp(−λ·Δt)                   │
            └──────────────────────────┬─────────────────────┘
                        ┌──────────────┴──────────────┐
                        ▼                             ▼
        ┌── ANALYTICS (deterministic) ──┐   ┌── HYPOTHESIS SANDBOX ──┐
        │ PageRank, Betweenness, Degree │   │ PyG GAE link prediction │
        │ Leiden + CPM communities      │   │ Adamic-Adar / Resource  │
        │ Shortest paths, k-hop bridges │   │  Allocation baselines    │
        │ Temporal window filters       │   │ Output → Hypotheses/*.md │
        │ → writes to primary graph     │   │ NEVER writes to primary  │
        └──────────────┬────────────────┘   └────────────┬────────────┘
                       └────────────────┬────────────────┘
                                        ▼
        ┌──────── AGENT ORCHESTRATOR (deterministic state machine) ────────┐
        │  Cartographer → Suspect/Org/Event cards in 02_AI_Brain           │
        │  Delta        → Delta_Log.md entry for this run                  │
        │  Contradiction→ alibi conflicts, flagged in cards                │
        │  Briefing     → Briefings/YYYY-MM-DD_Daily_Delta.md              │
        └──────────────────────────────┬───────────────────────────────────┘
                                       ▼
        ┌──────────── UI: Vault + Graph + Copilot + Export ────────────────┐
        │  Copilot: Graph-RAG, cited answers                               │
        │  Export:  BSA §63 Certificate │ Prosecution Dossier              │
        └──────────────────────────────────────────────────────────────────┘
```

Full schemas, column mappings and query contracts → `docs/architecture.md`.

---

## 7. AI Model Stack

All local. All quantised. All offline. *(Sizes are approximate — verify against the actual GGUF/HF artefacts before you pin them in the deck.)*

| Role | Model | Approx size | Why |
| :--- | :--- | :--- | :--- |
| Primary reasoning & writing | **Qwen3.5-9B-Instruct** Q4_K_M (Ollama) | ~5-6 GB | Broadest non-Latin/Devanagari coverage in the CPU-viable band; Apache 2.0. **Disable thinking mode for all extraction calls** — reasoning traces leak into JSON. |
| Fast extraction pass | **Qwen3.5-4B-Instruct** Q4_K_M | ~2.5 GB | Bulk per-document relation extraction; the 8 GB-laptop tier runs 4B for everything |
| Zero-shot NER | **GLiNER multilingual** | ~500 MB | Faster and more consistent than LLM NER for PERSON/PHONE/VEHICLE spans |
| Embeddings | **multilingual-e5-small** (or `bge-m3` if RAM allows) | ~470 MB | Devanagari + Latin in one space; used for resolution + Graph-RAG |
| Vector store | **sqlite-vec** | — | Embedded, zero-server, sits in the vault |
| OCR | **Tesseract 5** (`hin`+`eng`) | ~50 MB | Scanned FIRs; PaddleOCR as fallback for bad scans |
| Graph ML (sandbox only) | **PyTorch Geometric** GAE + Adamic-Adar/RA baselines | — | CPU-only; always benchmarked *against* the classical heuristics |

**Hard rules on model use**
- Temperature `0`. Always. Every call.
- Every extraction call returns **schema-validated JSON** or it is retried once then failed loudly — never silently patched.
- No LLM ever writes into the graph directly. It emits candidate JSON; deterministic Rust/Python code validates and inserts.
- Model name + version + quantisation is recorded in `.syndicate/models.json` and stamped into every generated artefact.

---

## 8. Agent Architecture

**The orchestrator is code, not an LLM.** It is a deterministic state machine that runs on ingest. The agents are stateless, single-purpose, strictly-schema'd LLM calls. This is what makes the system auditable.

```
                       ORCHESTRATOR (Python state machine)
                       ingest_run(files) → ordered stages
                                  │
   ┌───────┬───────────┬──────────┼──────────┬─────────────┬──────────┐
   ▼       ▼           ▼          ▼          ▼             ▼          ▼
[A1]    [A2]        [A3]       [A4]       [A5]          [A6]       [A7]
Extractor Resolver  Cartographer Delta   Contradiction  Copilot   Dossier
```

| # | Agent | Trigger | Input | Output | Writes to |
| :-- | :--- | :--- | :--- | :--- | :--- |
| A1 | **Extractor** | per document, on ingest | doc chunk + span offsets | entities + candidate relations (strict JSON) | nothing (returns to orchestrator) |
| A2 | **Resolver** | only for scores in the 0.75–0.92 grey band | two candidate records + their evidence | merge / no-merge + reason | adjudication queue in `index.sqlite` |
| A3 | **Cartographer** | after graph commit | entity + its full deterministic neighbourhood + provenance | suspect/org/event card markdown with `[[links]]` and source badges | `02_AI_Brain/Suspects` etc. |
| A4 | **Delta** | end of every ingest run | graph diff (before/after node & edge sets) | changelog section: new entities, new links, strengthened links, new contradictions, suggested next actions | `Delta_Log.md` (append-only) |
| A5 | **Contradiction** | after graph commit | statement claims + tower/CDR timeline for that person | list of temporal/spatial conflicts with both sources cited | flags inside suspect cards |
| A6 | **Copilot** | user question | Graph-RAG retrieval (k-hop subgraph + top-k document chunks) | cited answer; refuses if retrieval is empty | nothing (UI only) |
| A7 | **Dossier** | user clicks export | selected subgraph + all provenance rows | structured prosecution write-up | `04_Exports/` |

**Universal agent contract**
- Stateless. Every call gets its full context explicitly; no hidden memory.
- Output is JSON against a schema, validated before anything is written.
- Every factual sentence must carry a `source_id`; sentences without one are stripped by the validator, not by trust.
- Agents may only write through the orchestrator's `write_brain(path, content)`, which the Rust Path Guard rejects for any path outside `02_AI_Brain/`.
- Every agent run appends to `.syndicate/audit.log` with model, prompt hash, input hash, output hash.

Full prompt skeletons and JSON schemas → `docs/agents.md`.

---

## 9. The BSA §63 Certificate Exporter — Spec

This is the single feature that wins the room. Build it early, demo it last.

**Legal basis:** Section 63, Bharatiya Sakshya Adhiniyam 2023 (replaced IEA §65B on 1 July 2024) requires, for secondary electronic evidence, a two-part certificate — Part A by the custodian of the device/record, Part B by an expert — accompanied by a hash value of the electronic record. *[Verify the exact current Schedule wording against indiacode.nic.in before you put clause text on a slide.]*

**Interaction:** select a subgraph in the graph canvas (lasso or "everything within 2 hops of X") → click **Generate BSA §63 Evidentiary Certificate** → PDF appears in `04_Exports/`.

**The generated PDF contains:**
1. **Cover** — case number, jurisdiction, generating officer, UTC + IST timestamp, app version.
2. **Record manifest** — every source file in the subgraph: filename, SHA-256, byte size, ingest timestamp, ingesting officer.
3. **Edge provenance table** — one row per edge: `Person A — RELATION → Person B`, source file, exact locator (CSV row / PDF page:line), observed timestamp, and the verbatim Cypher query that reproduces it.
4. **Reproduction block** — the full query set, so a third party can re-derive the identical subgraph from the same raw files.
5. **Exclusion declaration** — an explicit, prominent statement that **no machine-learning inference, link prediction, or probabilistic scoring contributed to any edge in this certificate**, listing which subsystems were excluded.
6. **Part A / Part B signature blocks** — pre-formatted, blank, ready for wet signature.
7. **Certificate hash** — SHA-256 of the PDF body itself, printed on the last page.

**Hard constraint:** if any node or edge in the selection originates from the Hypothesis Sandbox, the export **refuses** and tells the user exactly which elements to remove. Never silently drop them. The refusal is a feature — show it in the demo.

---

## 10. Theme & Visual Identity

Summary here; full tokens and component specs in `docs/design-system.md`.

**Name:** *Case File* — dark-first, forensic, quiet. Not a "cyber security dashboard" with neon. It should look like a serious instrument, not a movie prop.

**The organising idea: colour encodes evidentiary status.** This is the design system's whole reason for existing, and it makes Law 2 visible at a glance.

| Status | Colour | Edge style | Where |
| :--- | :--- | :--- | :--- |
| **Verified** (deterministic, provenance-backed) | Amber `#E8B04B` | solid, 2px | primary graph, suspect cards |
| **Corroborated** (2+ independent sources) | Amber, brighter + halo | solid, 3px | primary graph |
| **Weak / decayed** (old, low weight) | Amber at 30% opacity | solid, 1px | primary graph |
| **Hypothesis** (AI-predicted) | Magenta `#C2569E` | **dashed**, 1.5px, animated dash | sandbox only, always with a `NON-EVIDENTIARY` chip |
| **Contradiction / alibi conflict** | Red `#D4574E` | solid + warning glyph | anywhere |

**Base palette**
```
--bg-void      #0B0C0E   app chrome, outside panes
--bg-base      #131519   editor / main surface
--bg-raised    #1A1D22   panels, cards, sidebar
--bg-overlay   #22262C   modals, popovers, hover
--border       #2A2F36
--text-primary #E6E8EA
--text-muted   #8A9099
--text-faint   #5A616B
--accent       #E8B04B   (amber — verified/evidence)
--hypothesis   #C2569E   (magenta — AI, non-evidentiary)
--danger       #D4574E   (red — contradiction)
--ok           #5FA774   (green — confirmed/adjudicated)
--info         #5B8FC7   (blue — system/info)
```

**Type**
- UI & body: **Inter** (fallback: system sans)
- Editor & notes: **iA Writer Quattro** or **Inter** — 15px / 1.65 line-height
- Code, Cypher, hashes, provenance locators: **JetBrains Mono** 13px
- Names in Devanagari must render correctly — bundle **Noto Sans Devanagari**

**Layout**: Obsidian's three-pane skeleton — left rail (vault tree, search, tags, graph, ingest), centre (editor / graph canvas / timeline), right rail (backlinks, provenance inspector, copilot). 4px spacing grid. 6px radii. Almost no shadows; separation comes from `--border` and surface elevation.

**Motion**: fast and minimal. 120ms for state, 200ms for panels. The graph physics settle is the only animation allowed to be showy.

---

## 11. What We Explicitly Do NOT Build

Say these out loud in the pitch — the judges will be looking for exactly these traps.

- ❌ **End-to-end GNN that outputs the syndicate map.** Neural prediction is triage, quarantined in the sandbox.
- ❌ **Louvain.** Its resolution limit merges unrelated cells into fake mega-syndicates. We use **Leiden + Constant Potts Model**.
- ❌ **Naked Levenshtein / unconstrained embeddings for name matching.** Blocking first, always.
- ❌ **Static graphs.** Every edge is temporal and decays.
- ❌ **Any claim that AI output is evidence.** The certificate exporter's exclusion declaration exists to make this structural, not rhetorical.
- ❌ **Risk scores on individuals / predictive policing.** No "likelihood this person commits a crime". Chicago SSL and the UK Gangs Matrix are the cautionary precedents; cite them as our reason for *not* doing it.
- ❌ **Cloud anything.** No API calls, no telemetry, no update pings.
- ❌ **GPU requirement.** CPU-native by design; district police lines run commodity x86.

---

## 12. Open Decisions

| # | Decision | Current call | Revisit if |
| :-- | :--- | :--- | :--- |
| D1 | Tauri vs Electron | **Electron.** The bundle-size argument dies the moment you ship a Python sidecar and 5 GB of models — 150 MB on top is noise. Electron gives one Chromium that renders identically on every machine (critical for a graph-heavy app you will demo on one specific laptop), the whole npm ecosystem, mature `electron-builder` packaging, and no Rust in the critical path. | Only if final bundle size becomes a stated evaluation criterion |
| D2 | KùzuDB vs NetworkX-in-memory | **KùzuDB** — real Cypher = real provenance story | Kùzu bindings misbehave; NetworkX + SQLite is the fallback |
| D3 | Where the filesystem + Path Guard live | **In the Python Brain**, not the shell. One language owns all disk I/O; the shell stays deletable. | — |
| D4 | Bundle Ollama vs detect-and-guide | **Detect, guide if missing** for the hackathon; bundle for the real installer | — |
| D5 | Embedding model | **multilingual-e5-small** | Indic name recall is poor in testing → try `bge-m3` |
| D6 | Demo dataset | Synthetic, generated by us, clearly labelled | Never use real FIR/CDR data |
| D7 | Speech-to-text for interrogation audio | **Cut from scope entirely.** Audio and video are increasingly cloneable and therefore weak evidence; a system built on chain-of-custody should not lean on a medium it cannot authenticate. Statements enter as text, as recorded by the IO. | Only if a PS requirement mandates audio |
| D8 | NVIDIA models (Parakeet ASR / Nemotron LLM) | **Rejected.** See §12.1. | NVIDIA ships a sub-10B, CPU-first, Indic-capable open model |

### 12.1 Models Evaluated and Rejected

| Model | Why it looked attractive | Why it's out |
| :--- | :--- | :--- |
| **NVIDIA Parakeet TDT 0.6B** (v2/v3) | Best-in-class ASR speed; proven in another local project | ASR only — irrelevant to this pipeline. v2 is English-only; v3 covers 25 **European** languages, no Hindi or any Indic language. Moot anyway now that D7 cuts audio from scope. |
| **NVIDIA Nemotron Nano 9B v2** | Hybrid Mamba-Transformer, reasoning toggle, strong instruction-following | Official language list is English, German, Spanish, French, Italian, Japanese — **no Hindi**. Model card states it is GPU-optimised and does not run efficiently on CPU. Both are disqualifying for this deployment target. |
| **NVIDIA Nemotron 3 Nano / Super** (2026) | Latest generation, MoE efficiency, strong agentic benchmarks | Smallest is 30B total / ~3.5B active — too large for an 8 GB police laptop at Q4, and the family is explicitly optimised for H100/A100/Blackwell. Indic coverage unconfirmed. |

**The constraint that decides this:** CPU-only, 8–16 GB RAM, Hindi + English. That triple eliminates the entire NVIDIA open-model line as of Sept 2026. **Qwen remains the call** — the Qwen line has the broadest non-Latin-script coverage of any open family in the CPU-viable band. Gemma 4 is cleaner on structured output but is optimised for English and weaker on Devanagari, which is the wrong trade here. *[Model generation and sizes: verify against the official model cards before pinning — this landscape moves monthly.]*

*Re-evaluate if:* NVIDIA ships a sub-10B CPU-first model with documented Indic coverage, or an AI4Bharat/Sarvam Indic-tuned model reaches comparable JSON-mode reliability.

---

## 13. Where To Go Next

Build order, day estimates, and the demo-critical path: **`docs/roadmap.md`**.
