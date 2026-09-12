# AKTA — Entity Resolution + Provenance Inspector

**Your track:** the two pieces of precision work in the build — making messy Indian names resolve into single entities, and making provenance clickable.
**Your clock:** 16 working hours.
**Files you own exclusively:** `brain/resolve/`, `web/src/inspector/`
**You depend on:** Akshath's `schemas.py` + `mocks.py` (W2), Hermaine's `/api/edge/{id}/provenance` (W9 — you build against the mock until then)
**Your AI tooling:** ask Akshath to share his Claude session for the phonetic-matching and normalisation work. It's the fiddliest logic in the project and worth the best model in the room.

---

## Why this track matters, and why it's split across two stacks

Your morning is Python and your afternoon is React. That's deliberate, not an accident of leftovers — both halves are **precision** work where the difficulty is in getting details exactly right rather than in volume, and that's a different skill from the two bulk-build tracks.

**Entity resolution** is what makes the graph true. Real Indian police data has the same person as *Vikram Singh*, *Vikram Sing*, *विक्रम सिंह*, *V. Singh* and *Vicky*. Without resolution the graph has five nodes and the syndicate structure is invisible. Akshath has planted an alias pair in the synthetic data that resolves **only** via a shared IMEI — your resolver has to earn that one, and when it does, it's a demo beat.

**The Provenance Inspector** is MDP item #3 — the thesis made clickable. Judges are told every edge points at a source; the inspector is the fifteen seconds where they *see* it. It's the most-looked-at panel in the right rail.

---

## Roadmap — Part 1: Entity Resolution (`brain/resolve/`)

### W2–5 · Blocking keys

Don't compare every name to every other name — 40 people is 780 comparisons and 4,000 is 8 million. Block first, compare only within blocks.

- [ ] Hard blocking keys: shared phone number · shared IMEI · shared vehicle registration · same FIR + same role · first-initial + Soundex of surname
- [ ] Two records only enter comparison if they share at least one block. Log block sizes — **any block with more than 50 members is a bad key** and will quietly cost you seconds per merge.
- [ ] `GET /api/resolve/candidates` returning candidate pairs with their matching block

### W5–10 · Three-stage matching 🔴 the core of your track

This is the piece the storm report specifically called out: **naked Levenshtein is not good enough for Indian names** and that finding is why the pipeline has three stages.

- [ ] **Stage 1 — normalisation.** Transliterate Devanagari → Latin (`indic-transliteration`). Strip honorifics: `Shri`, `Sh.`, `Smt.`, `Mr`, `S/o`, `W/o`, `alias`, `urf`. Collapse whitespace, casefold. Normalise the systematic variants: `Singh`/`Sing`, `Kumar`/`Kr`, `Mohammad`/`Mohd`/`Md`.
- [ ] **Stage 2 — phonetics.** Double Metaphone, Indic-tuned. `Vikram`/`Bikram` must collide (v/b is a real Haryanvi variation, not a typo). `Rehan`/`Rehaan` must collide.
- [ ] **Stage 3 — RapidFuzz** `token_set_ratio` on the normalised strings, only within a phonetic collision.
- [ ] **🔴 No vector/embedding stage.** It was in the original spec and it is cut. `sentence-transformers` on CPU is slow, needs a model download, and adds a probabilistic step to the one part of the pipeline that most needs to be explainable in court. Three deterministic stages you can defend beat four where one is a black box.
- [ ] Score fusion: `0.5 * phonetic + 0.3 * fuzzy + 0.2 * shared-context` (shared phones/vehicles/FIRs/co-accused). Thresholds go in `Case_Config.yaml`, not hardcoded.

### W10–12 · Merge, log, reverse

- [ ] Auto-merge above the high threshold. Between thresholds → flag as `needs_review` and **surface it in the UI as a count only**; the adjudication queue is cut.
- [ ] **Every merge decision written to `brain/resolve/decisions.jsonl`:** both record IDs, every stage score, which block matched, the threshold used, timestamp. Nothing implicit.
- [ ] **Every merge reversible.** Keep the original records; a merge writes a canonical-entity mapping, it never destroys a source row. Destroying a source row would violate Law 1.
- [ ] `derivation_chain` field on the resolved entity — *"`Person_0031` merged from `Vikram Singh` (FIR_0142 p:2 l:9) + `Vicky` (CDR row:48219), matched on shared IMEI 8****"*. **Hermaine's certificate and your own inspector both render this** — agree the exact field shape with her at W2 and don't change it after.
- [ ] **Verify against `data/GROUND_TRUTH.md` the moment Mehul's data lands.** The planted alias pair must merge, and it must merge *for the IMEI reason*. A merge that happens for the wrong reason is worse than no merge — it means your explanation on stage is false.

---

## Roadmap — Part 2: Provenance Inspector (`web/src/inspector/`)

### W12–15 · The panel

Build the full mock in `design-system.md §5`. Faithfully — it's already designed, so this is execution, not invention.

- [ ] Right-rail panel, opens on edge selection. Call Akshath's `setSelection` / listen to his selection event — **do not touch his engine file.**
- [ ] Renders from `/api/edge/{id}/provenance`:
  - Source doc: filename, type badge, **SHA-256 shown in a monospace token** — this is the trust signal, give it real visual weight
  - Locator, as `page:3 line:11`
  - **The raw source snippet**, monospace, ±2 lines of context, with the matched span highlighted. Raw text — not paraphrased, not translated, not cleaned. That rawness *is* the guarantee.
  - The generating SQL, in a collapsible block with a copy button
  - Derivation chain, if the edge involves a resolved entity
- [ ] **Evidentiary status badge** — colours from `design-system.md §4`, the same palette Akshath's edge styles use, so a magenta dashed edge and a magenta badge visibly agree.

### W15–16 · Open-source-at-locator 🔴 the beat

- [ ] Click the locator → opens that file in Harleen's editor, scrolls to the line, highlights the exact span.
- [ ] **Coordinate with Harleen at W12, not W15.** You need a `openFileAt(path, line, span)` call on her editor. Ask her for it early; she has the hours at W12 and does not at W15. Don't reach into her files.
- [ ] This is the single most persuasive fifteen seconds available to this project. *"Here is the claim. Here is the exact line in the original FIR it came from."* Judges nod at that.

### W16 · Polish 🔴 after feature freeze

- [ ] Empty state: nothing selected. Loading state. Error state: provenance missing → **say so loudly in red**, because an edge without provenance shouldn't exist and the UI should treat it as an alarm, not a blank.

---

## Cut to Future Scope — do not build these

Vector/embedding similarity stage · adjudication queue UI · fuzzy transliteration learning · cross-case entity linking · manual merge/split UI · contradiction detector

---

## Priority order if you run short

1. **Three-stage matching working on the planted alias pair** — without this the graph is provably wrong
2. **Inspector rendering doc + locator + raw snippet** — MDP item #3
3. Open-source-at-locator
4. SQL block + derivation chain in the inspector
5. Everything else

If you're behind at W13, tell Akshath before he finds out at the W14 integration check.
