# SyndicateBrain — Architecture Reference

Companion to `blueprint.md`. This holds the schemas, contracts and internals you build directly against.

---

## 1. Graph Schema (KùzuDB)

### 1.1 Node tables

```cypher
CREATE NODE TABLE Person (
  id STRING PRIMARY KEY,          -- ULID
  canonical_name STRING,
  aliases STRING[],
  father_name STRING,
  age_est INT32,
  gender STRING,
  thana STRING,                   -- police station jurisdiction
  note_path STRING,               -- 02_AI_Brain/Suspects/xxx.md
  first_seen TIMESTAMP,
  last_seen TIMESTAMP,
  confidence DOUBLE               -- resolution confidence, NOT guilt
);

CREATE NODE TABLE Phone   (id STRING PRIMARY KEY, msisdn STRING, operator STRING,
                           first_seen TIMESTAMP, last_seen TIMESTAMP, note_path STRING);
CREATE NODE TABLE Device  (id STRING PRIMARY KEY, imei STRING, make STRING, note_path STRING);
CREATE NODE TABLE Vehicle (id STRING PRIMARY KEY, plate STRING, make STRING, note_path STRING);
CREATE NODE TABLE Tower   (id STRING PRIMARY KEY, cell_id STRING, lat DOUBLE, lon DOUBLE,
                           address STRING, note_path STRING);
CREATE NODE TABLE Location(id STRING PRIMARY KEY, name STRING, lat DOUBLE, lon DOUBLE, note_path STRING);
CREATE NODE TABLE Org     (id STRING PRIMARY KEY, name STRING, kind STRING,
                           detected_by STRING, note_path STRING);   -- kind: gang|firm|cell
CREATE NODE TABLE FIR     (id STRING PRIMARY KEY, fir_no STRING, thana STRING, sections STRING[],
                           filed_on DATE, doc_id STRING, note_path STRING);
CREATE NODE TABLE Event   (id STRING PRIMARY KEY, kind STRING, occurred_at TIMESTAMP,
                           summary STRING, note_path STRING);
CREATE NODE TABLE Doc     (id STRING PRIMARY KEY, path STRING, kind STRING, sha256 STRING,
                           bytes INT64, ingested_at TIMESTAMP, ingested_by STRING);
```

### 1.2 The provenance contract — every relationship table carries these five columns

```
source_doc_id  STRING     -- FK to Doc.id
locator        STRING     -- "row:4182"  |  "page:3,line:11-14"  |  "col:B,row:77"
observed_at    TIMESTAMP  -- when the event happened (NOT when we ingested)
weight         DOUBLE     -- raw, pre-decay
tier           STRING     -- 'deterministic' | 'hypothesis'   (hypothesis lives in a separate DB file)
```

**Rule:** an insert missing `source_doc_id` or `locator` is rejected at the DB access layer. There is no code path that can write an unsourced edge.

### 1.3 Relationship tables

```cypher
CREATE REL TABLE CALLED       (FROM Phone  TO Phone,   duration_s INT32, direction STRING, <provenance>);
CREATE REL TABLE SMS_TO       (FROM Phone  TO Phone,   <provenance>);
CREATE REL TABLE USES_PHONE   (FROM Person TO Phone,   <provenance>);
CREATE REL TABLE USES_DEVICE  (FROM Phone  TO Device,  <provenance>);   -- IMEI/IMSI pairing over time
CREATE REL TABLE PINGED       (FROM Phone  TO Tower,   <provenance>);
CREATE REL TABLE NAMED_IN     (FROM Person TO FIR,     role STRING, <provenance>);  -- accused|complainant|witness
CREATE REL TABLE CO_ACCUSED   (FROM Person TO Person,  fir_id STRING, <provenance>);
CREATE REL TABLE OWNS_VEHICLE (FROM Person TO Vehicle, <provenance>);
CREATE REL TABLE PRESENT_AT   (FROM Person TO Event,   basis STRING, <provenance>);
CREATE REL TABLE MEMBER_OF    (FROM Person TO Org,     method STRING, <provenance>);  -- method: 'leiden_cpm'
CREATE REL TABLE MENTIONS     (FROM Doc    TO Person,  <provenance>);
```

Hypothesis edges live in a **separate KùzuDB database file** (`.syndicate/hypotheses.kz`), not a flag on the same table. Physical separation makes accidental leakage into an export impossible.

### 1.4 Temporal decay — applied at query time, never baked in

```
effective_weight = weight * exp(-lambda * days_since(observed_at))
```
`lambda` from `Case_Config.yaml`. Defaults: CDR call edges `λ = 0.008` (~87-day half-life), co-accused edges `λ = 0.0005` (~4-year half-life), tower pings `λ = 0.02`. The timeline scrubber sets an absolute window *and* the decay reference date.

---

## 2. SQLite Schema (`.syndicate/index.sqlite`)

```sql
CREATE TABLE docs (
  id TEXT PRIMARY KEY, path TEXT UNIQUE, kind TEXT, sha256 TEXT NOT NULL,
  bytes INTEGER, ingested_at TEXT, ingested_by TEXT, page_count INTEGER
);

CREATE VIRTUAL TABLE doc_chunks USING fts5(
  doc_id UNINDEXED, chunk_id UNINDEXED, page UNINDEXED,
  char_start UNINDEXED, char_end UNINDEXED, text
);

CREATE VIRTUAL TABLE notes_fts USING fts5(path UNINDEXED, title, body);

CREATE TABLE resolution_decisions (
  id INTEGER PRIMARY KEY, left_id TEXT, right_id TEXT,
  block_key TEXT, phonetic_score REAL, vector_score REAL, combined REAL,
  decision TEXT,          -- auto_merge | auto_reject | pending | human_merge | human_reject
  decided_by TEXT, decided_at TEXT, reason TEXT, reverted_at TEXT
);

CREATE TABLE audit_log (
  seq INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT, actor TEXT, action TEXT,
  target TEXT, input_hash TEXT, output_hash TEXT,
  model TEXT, prev_hash TEXT, this_hash TEXT   -- hash chain: sha256(prev_hash || row)
);

CREATE TABLE ingest_runs (
  id TEXT PRIMARY KEY, started_at TEXT, finished_at TEXT,
  doc_ids TEXT, nodes_added INTEGER, edges_added INTEGER, delta_note_path TEXT
);
```

`.syndicate/vectors.sqlite` uses **sqlite-vec**: `embeddings(id, kind, ref_id, vec float[384])` where `kind ∈ {name, chunk}`.

---

## 3. Note Frontmatter Contract

Every agent-generated note carries machine-readable frontmatter. This is what makes the vault re-indexable and Obsidian-compatible.

```yaml
---
type: suspect                  # suspect | organisation | phone | vehicle | location | event | hypothesis
entity_id: 01JBQ7X8K2M4P9
canonical_name: Vikram Singh
aliases: [Vicky, Vikram s/o Ramesh, विक्रम सिंह]
thana: Kharkhoda
status: active                 # active | arrested | absconding | cleared
risk_flags: [armed, repeat_offender]
communities: [Sonipat_Arms_Ring]
degree: 14
pagerank: 0.0412
betweenness: 0.183
first_seen: 2025-11-03
last_seen: 2026-08-27
generated_by: syndicatebrain/0.1.0
model: qwen2.5:7b-instruct-q4_K_M
generated_at: 2026-09-10T11:04:22+05:30
human_edited: false
---
```

Body sections, in fixed order, written by the Cartographer:
`## Summary` → `## Identity & Aliases` → `## Verified Connections` → `## Timeline` → `## Contradictions` → `## Open Questions` → `## Sources`

**Source badge syntax** (rendered as a clickable chip by the editor):
```
Called Rehan Khan 31 times between 12–19 Feb 2026 ^[CDR_9812345678.csv row:4182-4213]
Named as accused in FIR 0142/2025 ^[FIR_0142_2025_Sonipat.pdf p:2 l:9]
```

**Human-edit protection:** if a user edits an agent-written note, the app sets `human_edited: true` and thereafter the Cartographer appends to an `## Machine Update` section instead of rewriting the body. Officer's words are never overwritten.

---

## 4. CDR Ingest — Vendor-Agnostic Mapping

Indian operators ship different column names. Ship a mapping profile system rather than hardcoding.

`.syndicate/cdr_profiles/*.yaml`:
```yaml
name: generic_v1
detect:
  any_header_contains: ["Calling", "Called", "IMEI", "Cell ID"]
map:
  a_party:    ["Calling Party", "A Party", "Caller", "MSISDN_A"]
  b_party:    ["Called Party", "B Party", "Callee", "MSISDN_B"]
  start_time: ["Call Date Time", "Start Time", "Date & Time"]
  duration_s: ["Duration", "Call Duration(s)"]
  call_type:  ["Type", "Call Type", "CT"]
  imei:       ["IMEI", "IMEI A"]
  imsi:       ["IMSI", "IMSI A"]
  cell_id:    ["Cell ID", "First CGI", "CGI_A"]
  lac:        ["LAC", "TAC"]
datetime_formats: ["%d/%m/%Y %H:%M:%S", "%d-%m-%Y %H:%M", "%Y-%m-%d %H:%M:%S"]
```

Unmapped columns surface a **column-mapping UI** — the analyst maps them once and the profile is saved to the vault.

### Deterministic pre-filter rules (DuckDB, run before anything touches an LLM)

| Rule | SQL shape | Why it matters |
| :--- | :--- | :--- |
| Night-window spike | calls where `hour(start) BETWEEN 0 AND 5`, grouped, count > p95 | operational coordination |
| Burst pair | ≥ N calls between the same pair inside a 24 h window | active planning |
| One-way pattern | A→B ≥ 10, B→A = 0 | command relationship, not friendship |
| IMEI swap chain | same IMEI, changing IMSI over time (or reverse) | burner rotation |
| Pre/post-incident contact | first & last contact within ±T of an FIR incident time | direct linkage to the offence |
| Tower co-location | ≥ 2 distinct MSISDNs on the same cell in the same 30-min window | who else was there |
| Silent period | pair active, then zero contact starting within 24 h of an arrest | counter-surveillance behaviour |

Output is a compact candidate-edge table. **The LLM never sees raw CDR rows** — this is both a token-budget decision and an accuracy decision.

---

## 5. Entity Resolution — The Three Stages

### Stage 1 — Blocking (deterministic, cheap, mandatory)
Candidate pairs are generated **only** if they share at least one hard key:
`msisdn` | `imei` | `vehicle_plate` | `(soundex(father_name), thana)` | `(thana, age_bucket_5yr)` | `aadhaar_last4` (if lawfully present)

Anything not sharing a block key is never compared. This is the wrongful-arrest firewall.

### Stage 2 — Indic phonetic hashing (within block)
- Normalise: transliterate Devanagari → Latin (ISO 15919 or `indic-transliteration`), lowercase, strip honorifics (`Sri`, `Shri`, `Md.`, `Mohd`, `s/o`, `w/o`, `alias`, `urf`).
- Expand a curated abbreviation table: `Md → Mohammed/Mohammad/Muhammad`, `Ram. → Ramesh/Ramdev`, `Rj → Raj/Rajesh`.
- Encode with **Double Metaphone**, plus a Devanagari-aware variant handling `v↔b` (Vikas/Bikash), `s↔sh`, `k↔q`, `f↔ph`, aspiration collapse (`kh→k`), schwa deletion.
- `RapidFuzz.token_set_ratio` on normalised strings for the ordering/patronymic problem (`Vikram Singh` vs `Singh Vikram s/o Ramesh`).

### Stage 3 — Vector similarity (only inside a matched phonetic block)
Cosine similarity on `multilingual-e5-small` embeddings of a composed identity string:
`"{name} | s/o {father} | {thana} | ~{age}"`

### Scoring & thresholds
```
combined = 0.45*phonetic + 0.35*vector + 0.20*context
           where context = shared phones/vehicles/FIRs/co-accused, normalised
```
| Band | Action |
| :--- | :--- |
| ≥ 0.92 | auto-merge, logged, reversible |
| 0.75 – 0.92 | **human adjudication queue** — side-by-side evidence card, one keystroke to merge/reject |
| < 0.75 | auto-reject, logged |

Every decision is a row in `resolution_decisions` and is **reversible** — an un-merge rebuilds affected notes.

---

## 5b. Hindi Handling — Extract, Do Not Translate

**Rule: Devanagari source text is never translated before extraction.** The model reads Hindi and emits structured English-keyed JSON whose *values* preserve the original script.

Why translation is banned in the pipeline:
1. **Alias matching depends on surface form.** `विक्रम` → `Vikram` → `Bikram` is exactly the variance the phonetic stage is built to catch. Translate first and you have destroyed the signal before resolution ever sees it.
2. **Provenance points at the original.** A locator says `page:3 line:11` of a Hindi FIR. If the extracted claim came from an English translation, the certificate's citation no longer points at text a court can read against the record.
3. **The FIR is the evidence.** A machine translation of it is a derived artefact, and a derived artefact in the evidence chain is an attack surface. §63 asks what the record says, not what a model thought it said.

**What the extractor stores for every entity** (already in the A1 schema):
```json
{ "surface":    "विक्रम सिंह उर्फ विक्की",   // verbatim, Devanagari, never altered
  "normalized": "Vikram Singh",              // ISO-15919 transliteration, for blocking/phonetics
  "aliases":    ["विक्की", "Vicky"] }
```
Notes and graph nodes display `surface` with `normalized` beneath. Search matches either.

**Where translation IS allowed:** a display-only English gloss of an FIR narrative, shown in a side panel for an officer who does not read Hindi, rendered with a permanent `MACHINE TRANSLATION — NOT A SOURCE` banner. It is never indexed, never cited, never entered into the graph, and never appears in an export. P2 feature; skip for the prototype.

**Prototype scope:** Hindi + English only. Other Indic languages are a later addition and require nothing architectural — the transliteration table and the OCR language pack change, the pipeline does not. Say exactly this if a judge asks about coverage; it is a stronger answer than claiming eleven languages you have not tested.

**Synthetic data implication:** your fixture FIRs must be genuinely code-mixed — Devanagari narrative with Latin-script names, numbers and section references interleaved, the way real Haryana FIRs actually read. A clean all-Devanagari test set will make the extractor look better than it is.

---

## 6. Graph-RAG Retrieval (Copilot)

```
question
  │
  ├─▶ entity linking: match question spans to known entities (FTS + vector on names)
  │
  ├─▶ SUBGRAPH RETRIEVAL: k-hop (k=2 default) around matched entities, filtered to the
  │     active timeline window, ordered by effective_weight. Cap ~120 edges.
  │
  ├─▶ DOCUMENT RETRIEVAL: FTS5 BM25 + vector top-k over doc_chunks, restricted to docs
  │     referenced by the retrieved subgraph. Cap ~12 chunks.
  │
  ├─▶ CONTEXT ASSEMBLY: subgraph rendered as a provenance-annotated edge list +
  │     the chunks, each with a stable source_id
  │
  ├─▶ Qwen3.5-9B, temp 0, thinking off, system prompt: answer ONLY from context; every sentence
  │     must end with one or more ^[source_id]; if context is insufficient, say so
  │
  └─▶ VALIDATOR: strip any sentence lacking a resolvable source_id; if >40% stripped,
        discard the answer and return "insufficient evidence in this case file"
```

The validator is the important part. It converts "we prompted it not to hallucinate" into "it structurally cannot ship an uncited claim."

---

## 7. Brain HTTP API (frontend ↔ Python)

Plain REST + SSE on `127.0.0.1:<port>`, `Authorization: Bearer <per-launch token>`. Not Electron IPC — that is the point. The same calls work from a browser tab during development and from the packaged app in production.

All paths below are `/api/...`. Types shown as the TS client wrapper.

```ts
// Vault
vault_open(path): CaseMeta
vault_tree(): TreeNode[]
note_read(path): { frontmatter, body }
note_write(path, body): void        // Path Guard enforced
note_backlinks(path): Backlink[]
search(query, opts): SearchHit[]

// Ingest
ingest_stage(paths): StagedFile[]   // classify + hash preview, before commit
ingest_commit(runOpts): IngestRunId
ingest_progress(runId): { stage, pct, message }   // SSE: GET /api/ingest/{id}/events

// Graph
graph_query(cypher, params): GraphResult
graph_subgraph(entityIds, hops, window): { nodes, edges }
graph_metrics(window): { pagerank, betweenness, degree }
graph_communities(window, resolution): Community[]
edge_provenance(edgeId): { doc, locator, snippet, cypher }

// Sandbox
sandbox_predict(window): Hypothesis[]
sandbox_accept(hypothesisId): void   // creates a TASK for the officer, NOT an edge
sandbox_reject(hypothesisId, reason): void

// Agents
agent_run(name, payload): AgentResult
copilot_ask(question, window): { answer, citations }

// Export
export_bsa63(subgraphSelection): { pdfPath, refusedElements? }
export_dossier(orgId): { pdfPath }
audit_tail(n): AuditRow[]
```

**The only things the Electron shell provides that a browser cannot**, exposed on `window.shell` and feature-detected so the browser build degrades gracefully:

```ts
window.shell?.pickFolder(): string | null        // native folder dialog → vault path
window.shell?.pickFiles(): string[]              // native file dialog → ingest
window.shell?.revealInFolder(path): void         // "show in Finder/Explorer"
window.shell?.brainStatus(): 'starting'|'ready'|'dead'
```
In the browser build these are `undefined` and the UI falls back to a text input for the vault path and a drag-drop zone for ingest. Four functions. That is the entire native surface of this application.

---

## 8. The Path Guard (Python) — the physical enforcement of Law 1

```python
WRITABLE = ("02_AI_Brain", "03_Workspace", "04_Exports", ".syndicate")

def assert_writable(vault: Path, target: Path) -> Path:
    t = target.resolve(strict=False)              # resolves symlinks — no escape via link
    v = vault.resolve(strict=True)
    if not t.is_relative_to(v):
        raise GuardError(f"outside vault: {t}")
    if t.is_relative_to(v / "01_Evidence_Inbox"):
        raise GuardError("01_Evidence_Inbox is read-only — evidence is immutable")
    if not any(t.is_relative_to(v / d) for d in WRITABLE):
        raise GuardError(f"not a writable tier: {t}")
    return t

# The ONLY sanctioned write primitive in the codebase.
def safe_write(vault: Path, target: Path, data: bytes | str) -> None:
    p = assert_writable(vault, target)
    p.parent.mkdir(parents=True, exist_ok=True)
    tmp = p.with_suffix(p.suffix + ".tmp")
    tmp.write_bytes(data if isinstance(data, bytes) else data.encode())
    tmp.replace(p)                                 # atomic
    audit("write", str(p))
```
Every write in the entire app — API handler, orchestrator, agent — funnels through `safe_write`. Enforce it with a lint rule or a CI grep: **no bare `open(..., "w")`, `Path.write_*`, or `shutil` call anywhere outside `guard.py`.** A guard you can bypass by forgetting is not a guard. Additionally, `01_Evidence_Inbox` files get `0444` (Unix) / read-only attribute (Windows) at ingest, and the app verifies stored SHA-256 on every vault open, flagging any drift loudly.

**Demo this.** Open a terminal, try to `echo x >> 01_Evidence_Inbox/FIR_0142.pdf` from inside the app's own agent console, watch it refuse. That thirty seconds is worth more than any accuracy number.
