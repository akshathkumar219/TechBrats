# SIH 2026 — Deck Content (storm-corrected)

**PS ID:** SIH26189 · **Format:** Official 6-slide IDEA template
**Note:** this supersedes the deck content in `_blueprint_v1_archive.md`. That version claimed end-to-end GNN output and Louvain clustering — both are positions the verified research says not to take. `populate_slides.py` must be updated from this file before the next render.

---

## Slide 1 — Title Page

- **Problem Statement ID:** SIH26189
- **Problem Statement Title:** AI-Powered Criminal Network Analysis System
- **Project Name:** **SyndicateBrain** — Air-Gapped Investigation Workbench & Court-Admissible Criminal Graph
- **Theme:** Security & Law Enforcement / Smart Automation
- **PS Category:** Software
- **Team ID:** `[insert]` · **Team Name:** `[insert]`

---

## Slide 2 — Idea Title & Proposed Solution

### Idea Title
**SyndicateBrain: Offline "Second Brain" for Detectives with a Court-Admissible Criminal Knowledge Graph**

### Detailed explanation
- **A case is a vault.** An Obsidian-style workbench — markdown notes, `[[wiki-links]]`, backlinks, graph view — running fully offline on a police laptop.
- **Two-tier vault, enforced in code.** `01_Evidence_Inbox` is read-only and SHA-256 hashed at ingest; local AI agents may write only into `02_AI_Brain`. Chain of custody is a filesystem guarantee.
- **Decoupled dual-layer graph.** A deterministic knowledge graph where every edge points to an exact source row/page is the product. Neural link prediction is physically separated into a quarantined *Hypothesis Sandbox* labelled **Investigative Leads — Non-Evidentiary**.
- **`Delta_Log.md`.** Every ingest produces an auto-written changelog: new entities, new links, contradictions detected, suggested investigative steps — each sentence source-badged.
- **One-click BSA §63 Evidentiary Certificate.** Hashes, per-edge provenance, reproducible queries, and an explicit declaration that no machine inference contributed to any edge.

### How it addresses the problem
- Unifies multilingual FIR narratives with 50,000+ row CDR and tower-dump data into one queryable graph.
- Surfaces proxy kingpins who never contact operatives directly, via betweenness centrality over multi-hop intermediaries and IMEI-rotation chains.
- Preserves institutional case memory across officer transfers.

### Innovation and uniqueness
- **Admissibility-first architecture.** Built around BSA 2023 §63, not retro-fitted to it — the only design here that survives a defence challenge to the electronic-evidence package.
- **Structural anti-hallucination.** A citation validator strips any uncited sentence before it is written; the certificate exporter *refuses* if the selection is contaminated by AI-predicted edges.
- **100% air-gapped, CPU-only.** No cloud, no GPU, no server, no recurring cost.

---

## Slide 3 — Technical Approach

### Technologies
- **Shell/UI:** Electron + React + TypeScript + Tailwind (thin shell — all logic in a local Python service, so the app has no server and no network surface)
- **Graph rendering:** Cytoscape.js (physics layout, community hulls, temporal edge weighting)
- **Embedded storage:** KùzuDB (embedded Cypher graph) + SQLite FTS5 + sqlite-vec — zero servers
- **Entity resolution:** deterministic blocking → Indic Double-Metaphone → `multilingual-e5-small` embeddings (RapidFuzz for ordering/patronymic variance)
- **Graph analytics:** PageRank / betweenness, **Leiden with the Constant Potts Model**, exponential temporal decay `w(t) = w₀·e^(−λΔt)`
- **Link prediction (sandbox only):** PyTorch Geometric GAE, benchmarked against Adamic-Adar / Resource Allocation baselines
- **Local AI:** Ollama runtime — Qwen3.5 9B / 4B Instruct (Q4, Apache 2.0), GLiNER multilingual NER, Tesseract (hin+eng) OCR
- **Pre-filtering:** DuckDB deterministic rules compress 50k CDR rows to a few hundred candidate edges before any model runs

### Methodology
```
01_Evidence_Inbox (hashed, read-only)
   ├─ CDR/Tower → DuckDB deterministic pre-filter (night spikes, IMEI swaps, burst pairs, co-location)
   └─ FIR/Statements → OCR → GLiNER NER → Qwen JSON relation extraction (page:line retained)
                     ↓
   3-stage entity resolution (block → phonetic → vector) + human adjudication on the grey band
                     ↓
   Deterministic Knowledge Graph — every edge carries source_doc, locator, timestamp
          ├──────────────────────────────┬──────────────────────────────┐
   Centrality + Leiden/CPM        Hypothesis Sandbox (PyG)      Graph-RAG Copilot
   + temporal decay               NON-EVIDENTIARY, quarantined   cited answers only
                     ↓
   Deterministic orchestrator → agents write 02_AI_Brain (suspect cards, Delta_Log)
                     ↓
   BSA §63 Certificate  ·  Prosecution Dossier
```

---

## Slide 4 — Feasibility and Viability

### Feasibility
- **Zero infrastructure:** no GPU, no Docker, no Neo4j/Postgres server. Embedded databases inside the case folder.
- **Runs on issued hardware:** 8–16 GB commodity x86 police laptops, CPU-only, 4-bit quantised models. District police IT lines do not have enterprise GPUs — this is designed for the machines that actually exist.
- **Single installer:** `.exe` / `.dmg` / `.deb`. The vault is portable plain markdown, readable even without the app.

### Challenges and risks
- **A — Scale & noise:** millions of routine CDR rows produce visual hairballs and token bloat.
- **B — Indian name variance:** transliteration, patronymic omission, aliases (`urf`), regional spelling.
- **C — Hallucinated links:** a false AI connection in a chargesheet is a catastrophic failure.
- **D — Evidence tampering:** any write to raw evidence destroys admissibility.
- **E — Over-clustering:** naive modularity merges unrelated gangs into one fake syndicate.

### Mitigation
- **A:** DuckDB deterministic pre-filter + entity-level (not event-level) rendering + edge bundling + temporal decay.
- **B:** hard deterministic blocking before any fuzzy matching, Indic phonetic hashing, embeddings only within blocks, human adjudication on the 0.75–0.92 band, every merge reversible and logged.
- **C:** citation validator strips uncited sentences; neural predictions physically stored in a separate database and barred from exports.
- **D:** OS-level read-only tier + a single-choke-point Path Guard + SHA-256 verification on every vault open + hash-chained audit log.
- **E:** Leiden with the Constant Potts Model, which resolves Louvain's proven resolution limit and guarantees well-connected communities.

---

## Slide 5 — Impact and Benefits

### Target audience
State Police & Crime Branch, ATS, NIA, NCB, cyber cells, district SP offices.

### Impact
- Compresses multi-file syndicate mapping from **weeks of manual Excel cross-checking to minutes**.
- **Unmasks proxy leadership** — betweenness and multi-hop analysis surface brokers who never make a direct call.
- **Continuity across transfers** — the case retains its full reasoning history, not just its files.
- **Survives the defence.** The evidence package is built to answer a §63 admissibility challenge, which is where electronic-evidence cases are actually lost.

### Benefits
- **Operational:** automated Daily Delta Briefing; instant prosecution dossiers with a verifiable evidence trail; contradiction and alibi conflicts surfaced automatically.
- **Security & sovereignty:** 100% offline — confidential intelligence never leaves the machine. Deployable inside air-gapped forensic labs and interrogation rooms.
- **Economic:** no cloud subscriptions, no GPU procurement, no per-seat database licensing.
- **Rights-protective:** no individual risk scoring, no predictive policing. The system prioritises leads for human verification; it never recommends coercive action.

---

## Slide 6 — Research and References

### Algorithmic & academic foundations
- Traag, Waltman & van Eck (2019). *From Louvain to Leiden: guaranteeing well-connected communities.* Scientific Reports 9:5233 — basis for choosing Leiden/CPM over Louvain.
- Li et al. (2023). *Evaluating Graph Neural Networks for Link Prediction: Current Pitfalls and New Benchmarking (HeaRT).* NeurIPS 2023 — basis for benchmarking GNNs against classical heuristics.
- Kipf & Welling (2016). *Variational Graph Auto-Encoders.* NIPS Workshop on Graph ML — sandbox link-prediction model.
- Christen (2012). *Data Matching: Concepts and Techniques for Record Linkage, Entity Resolution and Duplicate Detection.* Springer — 3-stage resolution design.
- Edge et al. (2024). *From Local to Global: A Graph RAG Approach to Query-Focused Summarization.* Microsoft Research — copilot retrieval design.
- Cavallaro et al. (2020). *Disrupting resilient criminal networks through data analysis: the case of the Sicilian Mafia.* PLOS ONE 15(8):e0236443 — covert-network sparsity and counter-surveillance.
- Sparrow (1991). *The application of network analysis to criminal intelligence.* Social Networks 13(3) — foundational criminal network analysis.

### Legal, standards & cautionary precedent
- **Bharatiya Sakshya Adhiniyam, 2023** (Act 47 of 2023), **Section 63** — dual-part certification and hash requirements for secondary electronic evidence; in force from 1 July 2024, replacing IEA §65B. *(Verify exact Schedule wording at indiacode.nic.in before final submission.)*
- CCTNS Data Standards, Ministry of Home Affairs; DoT CDR & tower-dump specifications.
- Saunders, Hunt & Hollywood (2016). *Predictions put into practice: a quasi-experimental evaluation of Chicago's predictive policing pilot.* J. Exp. Criminol. 12:347–371 — why we do not score individuals.
- UK ICO (2018). *Enforcement Notice to the Metropolitan Police Service (Gangs Matrix).* — why speculative relational scoring is quarantined.

### Open-source stack
PyTorch Geometric · leidenalg / igraph · RapidFuzz · KùzuDB · DuckDB · sqlite-vec · GLiNER · Electron · FastAPI · Ollama · Cytoscape.js · Tesseract

---

## Talking Points for Q&A

**"How is this different from Palantir / IBM i2?"** — Those are cloud or server products with licence costs and a black box in the middle. This runs air-gapped on an issued laptop at zero recurring cost, and every edge is reproducible from raw files by a third party.

**"What's your accuracy?"** — For the deterministic graph, accuracy is not a meaningful metric: an edge either exists in the source record or it does not. Accuracy applies only to entity resolution and to the sandbox, and we report both separately, benchmarked against classical baselines.

**"What if the AI is wrong?"** — Then a lead is wrong, and a human discards it. The AI cannot be wrong about evidence, because it is architecturally barred from producing evidence.

**"Why no mobile app?"** — Deliberate. An investigation vault holds unredacted suspect data, and a phone is a lost-and-stolen device with a cloud backup switched on by default. Air-gapped desktop is the only deployment where the chain-of-custody guarantees actually hold.

**"Is this admissible?"** — The graph is not evidence; the underlying records are. What we produce is the §63 certificate that makes those records admissible, plus a declaration of exactly which subsystems were excluded from it.
