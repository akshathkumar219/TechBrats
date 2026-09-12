# HERMAINE — Backend: Graph Core, Provenance Enforcement, BSA §63 Certificate

**Your track:** the product, and the single highest-value deliverable in the project.
**Your clock:** 16 working hours.
**Files you own exclusively:** `brain/graph/`, `brain/analytics/`, `brain/export/`
**You depend on:** Akshath's `schemas.py` (W2). Blocked on nobody after that.
**Blocked on you:** Akshath's canvas (W6), AKTA's inspector (W8). Your first two tasks unblock two people — ship them fast, polish them later.

---

## Why this track matters

Two things in this project are genuinely novel, and you own both.

**The provenance writer.** Every competing project will have a graph. Ours refuses to store an edge that can't name its source document and line. That's not a feature bolted on top — it's enforced at the write boundary, which means the guarantee is structural rather than aspirational. You are the person who makes that true.

**The BSA §63 certificate.** This is the headline. It's what turns "nice graph visualisation" into "output a court can accept." And it is the best-engineered task in the build: **deterministic code, no model, no ML, no probability.** Given the same subgraph it produces a byte-identical PDF, every single time. Under time pressure that reliability is worth more than any clever feature — which is exactly why it's yours.

---

## Roadmap

### W2–5 · `brain/graph/writer.py` — the enforcement layer 🔴 unblocks Akshath

- [ ] Tables in SQLite: `nodes`, `edges`, `docs`, `provenance`. Schema mirrors Akshath's Pydantic models exactly.
- [ ] **`add_edge()` raises `ProvenanceError` if `source_doc_id` or `locator` is missing or doesn't resolve to a real `Doc` row.** No `force` parameter. No `skip_validation` flag. No internal path that bypasses it. If someone asks you to add one, the answer is no.
- [ ] Four tests that must fail loudly: no `source_doc_id` · `locator` present but `source_doc_id` dangling · both present but the doc row doesn't exist · both present but the locator is outside the document's range
- [ ] `locator` format is fixed and documented in your module docstring: `page:3 line:11` for documents, `row:48219` for CDR. **AKTA's inspector and your certificate both parse this string** — agree the format with her at W2 and never change it after.

> **Use NetworkX + SQLite. Not KùzuDB.** An unfamiliar embedded graph DB is a two-hour risk in a 16-hour build for a benefit nobody in the room will notice. Print SQL in the certificate instead of Cypher — the reproducibility claim is byte-for-byte identical and the judges are reading the *guarantee*, not the query dialect.

### W5–7 · Query endpoints 🔴 unblocks Akshath's canvas at W6

- [ ] `GET /api/graph/subgraph` — params `case_id`, `center`, `depth`, `types[]`, `window_start`, `window_end`, `min_weight`. Returns Akshath's `SubgraphResponse` shape exactly.
- [ ] `GET /api/graph/query` — filtered node/edge fetch
- [ ] **Match `mocks.py` byte-for-byte, then delete the mock.** The frontend has been building against that shape for five hours; if your real response differs by one field name you cost Akshath and AKTA an hour each.
- [ ] Hard cap: `LIMIT 2000` nodes, `8000` edges, ordered by degree descending. Akshath's canvas has a render budget and a 50,000-edge response is how you blow it.

### W7–9 · `GET /api/edge/{id}/provenance` 🔴 unblocks AKTA

This is the thesis made clickable — MDP item #3. Returns, for any edge:

- [ ] Source document: filename, type, SHA-256, ingest timestamp
- [ ] Locator: the exact `page:line` or `row:N`
- [ ] **The actual snippet of source text**, ±2 lines of context, raw — not paraphrased, not translated, not cleaned
- [ ] The SQL that produced the edge, as a copy-pasteable string
- [ ] Derivation chain if the edge came from a resolved entity (`Person A` merged from `Vikram Singh` + `Vicky` — AKTA's resolver writes this; agree the field shape with her)

### W9–11 · Temporal decay + centrality

- [ ] **Decay at query time, not at write time.** `weight * exp(-lambda * age_days)`, `lambda` configurable in `Case_Config.yaml`. Write-time decay means re-writing the whole graph on every scrub — that's why it's query-time.
- [ ] Window filtering on `window_start` / `window_end`. Akshath's timeline scrubber calls this repeatedly during a drag, so it needs to return in **under 200ms** on the full synthetic case. Index `edges(timestamp)`.
- [ ] `brain/analytics/centrality.py` — PageRank, betweenness, degree via NetworkX. Endpoint `GET /api/analytics/centrality`.
  - **Betweenness is the demo beat.** Akshath planted a proxy kingpin who never calls the hitmen: he must come out top-*betweenness* while ranking unremarkable on degree. Verify against `data/GROUND_TRUTH.md` the moment Mehul's data lands. If the planted answer doesn't surface, tell Akshath immediately — it's a data problem, not your problem, but only you will notice it.

### W11–15 · 🏆 `brain/export/certificate.py` — BSA §63

**Start this at W11 whatever else is unfinished.** It is the highest-value thing in the project and it must not be the thing that ran out of time. If centrality is half-done at W11, leave it half-done and start the certificate.

- [ ] `reportlab`. All seven sections per `blueprint.md` — do not abbreviate the section list.
- [ ] Every claim in the PDF cites a `source_doc_id` + `locator`
- [ ] Every source document's SHA-256 printed in full
- [ ] The SQL that generated the subgraph, printed verbatim, so a third party can re-run it
- [ ] Tool version + generation timestamp + case ID
- [ ] **Deterministic:** same subgraph in → byte-identical PDF out. Fix the timestamp to the case's ingest time rather than `now()` so you can actually assert this. Write the test.
- [ ] It must **look** like a legal document on a projector — serif body, numbered sections, a signature block, page `n of m`. Judges will read this on screen for maybe fifteen seconds; it has to read as official in the first two.

### W15–16 · 🔴 Contamination refusal — the mic-drop

- [ ] If **any** edge in the requested subgraph lacks resolvable provenance, or any source document's SHA-256 no longer matches the file on disk, the certificate **does not generate.**
- [ ] Instead: a refusal page naming the exact offending edge, document, and reason.
- [ ] This is 45 minutes of work and it's the strongest moment in the demo — a system that *refuses to certify contaminated evidence* is doing something no competitor will show. Make the refusal page look as considered as the certificate itself.

---

## Cut to Future Scope — do not build these

Leiden/CPM community detection · GNN hypothesis sandbox · contradiction detector · adjudication queue · audit-log viewer · dossier PDF · multi-case federation · KùzuDB/Cypher

**On Leiden specifically:** it was in scope and it's been cut. Community hulls only draw the gang boundaries — **betweenness alone already finds the proxy kingpin**, which is the actual demo beat. If you finish the certificate *and* contamination refusal before W14 and `main` is green, ask Akshath about adding it. Not before.

---

## The two things that cannot slip

1. **`writer.py` rejecting provenance-less edges** — if this is soft, the entire pitch is a claim instead of a guarantee
2. **The certificate generating and looking legal** — this is what the judges remember

Everything else on this page is amplification. If you're behind at W13, tell Akshath which of the rest you're dropping; don't quietly compress these two.
