# SHOURYA — Backend: Vault, Ingest, CDR Pipeline

**Your track:** where the evidence enters the system and where the data comes from.
**Your clock:** 16 working hours.
**Files you own exclusively:** `brain/vault.py`, `brain/ingest/`, `brain/cdr/`, `brain/prefilter/`
**You depend on:** Akshath's `schemas.py` + `guard.py` (both land W2). Nothing after that.
**Your AI tooling:** your own Gemini Pro.

---

## Why this track matters

Your track is the first thirty seconds of the demo and the fuel for everything after it.

**The ingest demo beat is one of the strongest in the project.** Akshath opens a terminal, tries to append a byte to an ingested FIR from inside the app's own console, and watches the system refuse. That's Law 1 made physical, and it lands harder than any accuracy number. Your pipeline is what makes that true.

**The CDR pipeline is where the graph gets its data.** 25,000 rows of call records become a syndicate structure. No parser, no graph.

**One note on how this is sequenced:** Akshath owns `guard.py` (the ~40 lines that enforce the write refusal) and you own the pipeline that calls into it. That's not a comment on the work — it's because `guard.py` is read by four other people's code and there can only be one author of a contract like that. Your pipeline is the larger and more interesting half.

---

## Roadmap

### W2–4 · `brain/vault.py` — vault lifecycle

- [ ] `create_vault(path, case_name)` — writes the **exact** folder structure from `blueprint.md §3`. Exact, because Harleen's tree UI and Hermaine's certificate both assume these paths:
  ```
  01_Evidence_Inbox/    Suspects/     Phones/    Locations/
  Events/               Organisations/  Hypotheses/
  Case_Config.yaml      Delta_Log.md
  ```
- [ ] `open_vault(path)` — validates the structure, loads `Case_Config.yaml`, returns case metadata
- [ ] `Case_Config.yaml`: case ID, case name, created timestamp, decay `lambda`, resolution thresholds, tool version. **Hermaine reads decay lambda from this; AKTA reads her thresholds from it.** Agree the key names with both of them at W2 and then stop changing them.
- [ ] `GET /api/vault/tree` — Harleen has been building against the mock since W3. **Match `mocks.py` byte-for-byte, then delete the mock.** A field-name difference costs her an hour.
- [ ] `.gitignore` must exclude `vaults/` — nobody commits a case vault.

### W4–8 · `brain/ingest/` — classify, hash, lock 🔴 MDP item #1

Pipeline, in this exact order. The order is the guarantee.

- [ ] **Classify** — extension plus header sniff → `FIR | CDR | TowerDump | Statement | FieldLog`. Header sniff matters because a CDR arrives as `.xlsx`, `.csv` and `.txt` depending on which telco sent it.
- [ ] **SHA-256** the file **before** it moves. Hash the original bytes, not the copy.
- [ ] **Copy** into `01_Evidence_Inbox/<type>/`, alongside a sidecar `<filename>.sha256`
- [ ] **Lock** — `chmod 0444` plus register the path with Akshath's `guard.py`. Both, not either: filesystem permissions stop the OS, the guard stops the application.
- [ ] **Write the `Doc` row** — id, filename, type, sha256, ingest timestamp, original path. Every edge in the graph will point at one of these rows, so this is the anchor of the whole provenance chain.
- [ ] `POST /api/ingest` — accepts a file, runs the pipeline, returns the `Doc`
- [ ] **Tell Akshath the moment this works.** It's the demo's opening beat and he'll want to try breaking it himself.

### W8–10 · Hash verification on open

- [ ] On `open_vault`, re-hash every file in `01_Evidence_Inbox/` and compare to its sidecar
- [ ] `GET /api/vault/integrity` → `{"status": "verified" | "contaminated", "failures": [...]}`
- [ ] Harleen's status bar renders this. **Green "Evidence verified · 14 documents" vs red "⚠ 1 document modified since ingest."**
- [ ] **Hermaine's contamination-refusal path calls this** — if a hash mismatches, her certificate refuses to generate. Tell her the response shape at W8; that link is the strongest moment in the demo and it runs through your endpoint.

### W10–14 · `brain/cdr/` — CDR parser

- [ ] Column-mapping profile in YAML, because no two telcos ship the same headers:
  ```yaml
  airtel:  {a_party: "Calling No", b_party: "Called No", ts: "Date & Time", dur: "Dur(s)", imei: "IMEI", cell: "Cell ID"}
  jio:     {a_party: "A_PARTY", ...}
  ```
- [ ] Load into **DuckDB**, not pandas-in-memory. 25,000 rows is fine either way, but DuckDB gives you SQL over it and Hermaine's certificate needs to print reproducible SQL.
- [ ] Normalise phone numbers: strip `+91`, leading `0`, spaces, dashes → canonical 10 digits. **Do this once at load.** Un-normalised numbers are the single most common cause of a graph that silently has two nodes for one phone.
- [ ] Parse timestamps to UTC-aware. Indian CDR dumps use `DD/MM/YYYY HH:MM:SS` — **watch the day/month order**, a US-style parse will silently shift your whole timeline and you won't notice until the demo.
- [ ] Every row keeps its `row:N` index — that's the `locator` Hermaine's provenance writer and AKTA's inspector both depend on. **Row numbers must be stable across reloads.**
- [ ] `POST /api/cdr/load`

### W14–16 · `brain/prefilter/` — three rules

Deterministic SQL over the DuckDB table. Each returns candidate edges *with* `source_doc_id` and `locator` attached — Hermaine's writer will reject them outright otherwise.

- [ ] **Burst pair** — pair A↔B with ≥ N calls in a ≤ T window. Defaults N=8, T=1h, both in `Case_Config.yaml`.
- [ ] **Night spike** — pair whose call volume between 00:00–05:00 is ≥ 3× their daytime rate
- [ ] **IMEI swap chain** — one IMEI carrying multiple numbers, or one number across multiple IMEIs, within a window. **This is the rule that feeds AKTA's planted alias merge** — tell her the moment it produces output.
- [ ] `GET /api/prefilter/candidates`

---

## Cut to Future Scope — do not build these

Tower dump geospatial analysis · OCR / FIR text extraction · pre/post-incident contact rule · co-location rule · more than three pre-filter rules · Delta_Log automation · multi-vault support

---

## Priority order if you run short

Say so early rather than late — Akshath can re-route work at W10 and cannot at W15.

1. **Ingest: classify → hash → lock → Doc row** — MDP item #1, the demo's opening beat
2. **CDR parse + DuckDB load with stable row numbers** — Hermaine's graph has no data without it
3. Vault create/open + tree endpoint
4. Hash verification on open
5. Pre-filter rules — **burst pair and IMEI swap first**; night spike is the one to drop

**Fallback if the parser is fighting you:** Akshath's `data/TEMPLATE_CDR.csv` is already the right shape. Parse that one profile perfectly and hardcode the mapping. One telco profile that works beats three that half-work, and nobody on the judging panel will ask about Jio's header format.
