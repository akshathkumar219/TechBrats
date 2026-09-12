# SHOURYA — Vault, Ingest, CDR, Cross-Case

**Read `docs/CASE_MODEL.md` first**, especially §3 on folder structure.

**Track:** where evidence enters the system, and the one feature no detective
has today.
**Clock:** 16 working hours.
**You own exclusively:** `brain/vault.py`, `brain/ingest/`, `brain/cdr/`,
`brain/crosscase.py`
**You depend on:** Akshath's `schemas.py` and `guard.py` (both W2). Nothing
after that.
**Prompts:** SHO-T01 → T05, in `docs/BUILD_PROMPTS.md`

---

## Why this track matters

**The ingest refusal is the demo's opening thirty seconds.** Akshath drops an
FIR in, then opens a terminal inside the app and tries to append a byte to it,
and the system refuses. That's Law 1 made physical, and it lands harder than any
accuracy number. Your pipeline is what makes it true.

**Cross-case hits are the strongest single idea in the product.** A phone number
in Case 3 that also appears in Case 1 is something no detective can find today
without remembering it personally. It is deterministic, it needs no model, and
it is the clearest "this could actually be deployed" moment we have.

One note on sequencing: Akshath owns `guard.py` — the ~40 lines that enforce the
refusal — and you own the pipeline that calls into it. That's not a comment on
the work. `guard.py` is read by four people's code and a contract like that has
one author. Your half is larger and more interesting.

---

## Roadmap

### W2–4 · `brain/vault.py`

- [ ] `create_case(vault_path, case_name)` writes the **exact** structure from
      `CASE_MODEL.md` §3 — `00_Raw_Inputs/` through `07_AI_Synthesis/`, plus
      `Case_Config.yaml` and an empty `_Case_Index.md`. Exact, because Harleen's
      tree, AKTA's parser and Hermaine's index all assume these paths.
- [ ] `open_case(path)` validates the structure and returns metadata.
- [ ] `Case_Config.yaml`: case id, case name, created, **model provider**
      (`gemini` | `ollama`), model name, resolution thresholds, tool version.
      **Hermaine and Akshath both read keys from this — agree the names with
      them at W2 and then stop changing them.** List the keys in your commit body.
- [ ] `GET /api/cases` — the case list. The file *tree* is read by the browser
      off disk; you do not serve it.
- [ ] `.gitignore` must exclude `vaults/`. Nobody commits a case vault.

### W4–8 · `brain/ingest/` 🔴 MDP item 1

Pipeline in this exact order. The order is the guarantee.

- [ ] **Classify** — extension plus header sniff →
      `FIR | CDR | TowerDump | Statement | FieldLog`. Header sniff matters: a CDR
      arrives as `.xlsx`, `.csv` or `.txt` depending on the telco.
- [ ] **SHA-256 before it moves.** Hash the original bytes, not the copy.
- [ ] **Copy** into `00_Raw_Inputs/<type>/` with a sidecar `<filename>.sha256`.
- [ ] **Lock** — `chmod 0444` **and** register the path with Akshath's
      `guard.py`. Both, not either: filesystem permissions stop the OS, the
      guard stops the application.
- [ ] **Write the `Doc` record** — id, filename, type, sha256, ingest timestamp,
      original path. Every citation in the case points at one of these.
- [ ] `POST /api/ingest`.
- [ ] **Then try to break it yourself**, three ways, by hand: `open()`,
      `os.rename`, `shutil.copy`. Tell Akshath the moment it holds — he'll want
      to try breaking it himself, on stage.

### W8–10 · Integrity on open

- [ ] Re-hash every file in `00_Raw_Inputs/` on `open_case`, compare to sidecars.
- [ ] `GET /api/case/integrity` → `{"status": "verified" | "contaminated",
      "failures": [...]}`
- [ ] Harleen's status bar renders this: green *"Evidence verified · 14
      documents"* vs red *"⚠ 1 document modified since ingest."* Tell her the
      shape the moment it's real.

### W10–13 · `brain/cdr/` — parse and materialise

- [ ] Column-mapping profile in YAML — no two telcos ship the same headers.
      Airtel first, exactly matching `data/TEMPLATE_CDR.csv`.
- [ ] Load into **DuckDB**, not pandas-in-memory. You want SQL over it.
- [ ] **Normalise phone numbers once at load**: strip `+91`, leading `0`, spaces,
      dashes → canonical 10 digits. Un-normalised numbers are the single most
      common cause of a graph that silently has two nodes for one phone.
- [ ] Parse timestamps UTC-aware. Indian CDR uses `DD/MM/YYYY HH:MM:SS` —
      **watch the day/month order.** A US-style parse silently shifts the whole
      timeline and nobody notices until the demo.
- [ ] Every row keeps a stable `row:N` index — that's the locator every citation
      uses. Write a test that loads twice and asserts identical row numbers.
- [ ] **Materialise notes**: create/update `02_Identifiers/<number>.md` per
      distinct number and `06_Events/` notes for significant call clusters, with
      citations. This is what gives the graph record-derived edges. Write
      through Akshath's `linker.py` for anything that is a link.

### W13–16 · `brain/crosscase.py` 🔴 the feature nobody else will have

- [ ] Scan `02_Identifiers/` across **every** case folder in the vault. Same
      phone, IMEI, account or vehicle registration appearing in more than one
      case is a hit.
- [ ] `GET /api/crosscase/hits` → for each: the identifier, the cases, the notes.
- [ ] Deterministic. No model. Exact match on normalised values only — a fuzzy
      cross-case hit is a wrongful lead and there is no reason to risk it.
- [ ] Surfaced in the analysis result and in the identifier's own note.

---

## Do not build

Tower-dump geospatial analysis · OCR / FIR text extraction · more than one telco
profile · pre-filter heuristics (burst pair, night spike — cut) · multi-vault
support · `Delta_Log` automation.

## Priority order if you run short

Say so early — Akshath can re-route at W10 and cannot at W15.

1. **Ingest: classify → hash → lock → Doc record.** The demo's opening beat.
2. **CDR parse with stable row numbers.** The graph has no record-derived edges
   without it.
3. Case create/open + config keys
4. **Cross-case hits** — small, deterministic, disproportionately impressive
5. Integrity verification

**Fallback if the parser fights you:** parse `data/TEMPLATE_CDR.csv`'s profile
perfectly and hardcode the mapping. One telco profile that works beats three
that half-work, and nobody on the panel will ask about Jio's header format.
