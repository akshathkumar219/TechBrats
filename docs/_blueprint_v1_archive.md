# SIH 2026 Presentation Blueprint (`blueprint.md`)
**Problem Statement ID:** SIH26189  
**Problem Statement Title:** AI-Powered Criminal Network Analysis System  
**Format:** Official Smart India Hackathon 6-Slide Template  

---

## Slide 1: Title Page

* **Problem Statement ID:** SIH26189
* **Problem Statement Title:** AI-Powered Criminal Network Analysis System
* **Project Name:** **SyndicateBrain** — *Air-Gapped "Second Brain" & Graph Intelligence Workbench for Detectives*
* **Theme:** Security & Law Enforcement / Smart Automation
* **PS Category:** Software
* **Team ID:** `[Insert Team ID]`
* **Team Name:** `[Insert Registered Team Name]`

---

## Slide 2: Idea Title & Proposed Solution

### Idea Title:
**SyndicateBrain: Offline "Second Brain" & Criminal Syndicate Intelligence Workbench**  
*(Combining Obsidian's Knowledge Graph + NotebookLM's Source-Grounded AI for Law Enforcement)*

### 1. Detailed Explanation of Proposed Solution:
* **The "Detective's Second Brain" Architecture**: An offline desktop application designed as an investigation workbench with a strict two-tier vault:
  * **01_Evidence_Inbox (Read-Only)**: Detectives continuously drop daily field logs, scanned FIRs, witness interrogations, and CDR dumps. Raw files are strictly immutable to preserve legal chain of custody.
  * **02_AI_Brain (Auto-Curated & Linked)**: Dedicated workspace where autonomous local AI agents synthesize data, update suspect profiles, and generate bi-directional `[[wiki-links]]`.
* **Dynamic Delta Changelog (`Delta_Log.md`)**: Whenever new evidence is added (e.g., September log), the AI autonomously documents new connections forged, alibi conflicts detected, and actionable leads generated—without touching original files.
* **Interactive Obsidian-Style Graph Canvas**: Visualizes the entire syndicate in real-time with physics-based node clustering, color-coded gang factions, and timeline playback.

### 2. How It Addresses the Problem:
* **Eliminates Manual Silos**: Unifies unstructured multilingual FIR narratives with massive structured CDR logs (phone calls, IMEI swaps, cell tower dumps) into a single queryable knowledge graph.
* **Solves Hidden Hierarchy**: Unmasks kingpins who never call hitmen directly by analyzing multi-hop intermediaries and covert burner phone rotations.
* **Continuous Case Memory**: Case progress is not lost when officers transfer; the "Second Brain" maintains full persistent institutional memory of the syndicate.

### 3. Innovation and Uniqueness:
* **100% Air-Gapped & Offline**: Zero cloud dependency; operates securely on local police laptops inside sensitive interrogation rooms or forensic labs.
* **Non-Destructive Sandbox**: Tamper-proof AI architecture that guarantees evidence integrity while providing continuous intelligence synthesis.
* **Strict Source-Grounded Citations**: NotebookLM-style verified answers—every link and summary cites the exact FIR page, CDR timestamp, or detective log entry.

---

## Slide 3: Technical Approach

### 1. Technologies & Stack (Optimized for Offline Desktop Execution):
* **Desktop Shell & UI**: **Tauri (Rust + React/TypeScript) + Tailwind CSS** (15MB lightweight native desktop app; 10x faster and more secure than heavy web platforms).
* **Graph Visualization**: **Cytoscape.js & React-Force-Graph-2D** (Interactive Obsidian-style physics graph with zoom, filter, and community clustering).
* **Embedded Data Storage**: **SQLite + KùzuDB / NetworkX** (Zero-server, embedded graph and relational storage stored directly in the local case vault).
* **Entity Disambiguation**: **RapidFuzz (C++ Levenshtein) + Double Metaphone + Sentence-Transformers** (Resolves Indian alias variations like *"Vicky"* vs *"Vikram Singh"*).
* **Graph ML & Link Prediction**: **PyTorch Geometric (PyG)** (Graph Autoencoders to predict hidden syndicate links and Louvain for community/gang detection).
* **Local AI Runtime**: **Local Ollama / Llama.cpp (Qwen 2.5 7B / 3B - Q4 Quantized)** (Optimized for multilingual Hindi/English FIRs, strict JSON extraction, and low-RAM police desktops).

### 2. Methodology & Implementation Pipeline:
```
[ 01_Evidence_Inbox (Read-Only) ] ──> [ Deterministic Pre-Filter (DuckDB/Pandas) ]
                                                    │
                                                    ▼
[ Local Fast Extractor (NER/OCR) ] ──> [ Hybrid Entity Disambiguation (Phonetic+Vector) ]
                                                    │
                                                    ▼
[ Heterogeneous Knowledge Graph ] <──> [ PyG GNN (Link Prediction & Louvain Gangs) ]
                                                    │
                                                    ▼
[ Multi-Agent Orchestrator ] ───────> [ 02_AI_Brain (Delta_Log.md & Suspect Cards) ]
                                                    │
                                                    ▼
                  [ Obsidian Graph UI + NotebookLM Copilot ]
```

* **Step 1: Ingestion & Pre-Filtering**: Deterministic parsing compresses 50,000+ CDR rows into key anomalies (night spikes, IMEI swaps) before LLM ingestion.
* **Step 2: Hybrid Entity Resolution**: Matches suspect aliases, phone numbers, and vehicle plates across separate FIRs using phonetic and semantic similarity.
* **Step 3: Graph Construction & GNN**: Builds multi-relational graph (`Suspect` - `Phone` - `Tower` - `FIR`) and executes GNN link prediction.
* **Step 4: Orchestrator & Auto-Dossier**: Multi-agent pipeline writes new verified insights into `Delta_Log.md` and generates court-admissible dossiers.

---

## Slide 4: Feasibility and Viability

### 1. Feasibility Analysis:
* **Zero Infrastructure Overhead**: No expensive GPU cloud instances, No Docker clusters, and No external database servers (Neo4j/Postgres replaced by embedded SQLite & KùzuDB).
* **Hardware Compatibility**: Runs seamlessly on standard police-issued laptops (8GB–16GB RAM) using 4-bit quantized local models.
* **Rapid Deployment**: Packaged as a single standalone executable installer (`.dmg` for macOS, `.exe` for Windows, `.deb` for Linux).

### 2. Potential Challenges and Risks:
* **Challenge A (Data Noise & Scale)**: Police CDR files contain millions of routine calls, creating visual "hairballs" and token bloat.
* **Challenge B (Phonetic & Dialect Variations)**: Suspect names in Indian FIRs have irregular spellings across regional languages and English.
* **Challenge C (AI Hallucination in Criminal Cases)**: LLMs generating false connections could compromise court evidence and criminal trials.
* **Challenge D (Chain-of-Custody Integrity)**: Risk of AI modifying or corrupting raw investigation evidence.

### 3. Mitigation Strategies:
* **Solution A**: Deterministic pre-filtering with DuckDB filters out background noise, feeding only high-risk anomalies to the graph and LLM.
* **Solution B**: Double-Metaphone phonetic encoding combined with dense vector embeddings to reliably match colloquial Indian aliases.
* **Solution C**: Strict Graph-RAG with line-level verifiable citations; the AI cannot assert any link without a linked source badge.
* **Solution D**: Read-only OS filesystem sandbox—the engine physically blocks any write attempt outside the designated `02_AI_Brain/` folder.

---

## Slide 5: Impact and Benefits

### 1. Potential Impact on Target Audience:
* **Target Audience**: State Police Departments, Crime Branch, Anti-Terror Squads (ATS), National Investigation Agency (NIA), Narcotics Control Bureau (NCB), and Cybercrime Units.
* **Investigation Velocity**: Reduces complex multi-file syndicate mapping from **3–4 weeks of manual Excel cross-checking to under 5 minutes**.
* **Unmasking Proxy Kingpins**: Graph centrality algorithms (Betweenness & PageRank) immediately identify behind-the-scenes leaders and covert brokers who avoid direct phone contact.
* **Continuity of Investigation**: Solves the critical issue of lost institutional knowledge during officer transfers by preserving a living, searchable case memory.

### 2. Concrete Benefits:
* **Operational Benefits**:
  * Automated **"Daily Delta Briefing"** keeps Senior Officers updated every morning with newly identified suspect links and alibi contradictions.
  * Instant generation of court-ready prosecution dossiers with verifiable evidence trails.
* **Security & Sovereignty Benefits**:
  * **100% Data Sovereignty**: Confidential police intelligence never leaves the police intranet or air-gapped machine.
* **Economic Benefits**:
  * **Zero Recurring Cloud Costs**: Eliminates monthly API fees and costly cloud database subscriptions, saving police departments lakhs annually.

---

## Slide 6: Research and References

### 1. Research Papers & Algorithmic Foundations:
* **Community Detection**: Blondel, V. D., et al. (2008). *"Fast unfolding of communities in large networks (Louvain Method)"*. Journal of Statistical Mechanics.
* **Graph Neural Networks (PyG)**: Kipf, T. N., & Welling, M. (2016). *"Variational Graph Auto-Encoders (GAE)"*. NIPS Workshop on Machine Learning on Graphs.
* **Entity Disambiguation**: Christen, P. (2012). *"Data Matching: Concepts and Techniques for Record Linkage, Entity Resolution, and Duplicate Detection"*. Springer.
* **Graph-RAG Methodology**: Edge, D., et al. (2024). *"From Local to Global: A Graph RAG Approach to Query-Focused Summarization"*. Microsoft Research.

### 2. Standards & Framework References:
* **Police Record Guidelines**: Crime and Criminal Tracking Network & Systems (CCTNS) Data Standards, Ministry of Home Affairs (MHA), Government of India.
* **Telecommunications Standards**: Department of Telecommunications (DoT) CDR & Tower Dump Data Specifications.
* **Open Source Frameworks**: PyTorch Geometric (`torch_geometric`), RapidFuzz C++ Library, Tauri Desktop Shell, Ollama Local Model Runtime.
