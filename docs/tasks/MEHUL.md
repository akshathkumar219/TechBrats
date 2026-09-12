# MEHUL — Synthetic Case Data + Centrality Panel + UI States

**Your track:** the dataset the entire demo is proved against, then two self-contained UI pieces.
**Your clock:** 16 working hours.
**Files you own exclusively:** `data/`, `web/src/panels/centrality/`, `web/src/states/`
**You depend on:** Akshath's `GROUND_TRUTH.md` + templates (W3), his `mocks.py` (W2). Nothing else.
**Nobody is blocked on you before W8** — so you set your own pace in the first block.

---

## Why this track matters

`roadmap.md:108` says it outright: **the synthetic dataset is the highest-leverage work in the whole build.**

Here's why. Every other track builds machinery. Your track builds the thing that *proves the machinery works*. Akshath plants four answers in `GROUND_TRUTH.md` — a proxy kingpin, an alias pair, an alibi contradiction, a cross-gang bridge — and your job is to build a realistic case around them so that when the graph surfaces those four answers on stage, it's a demonstration rather than a claim.

**Without your data there is nothing to demo.** The graph renders an empty canvas. The certificate has nothing to certify. The resolver has nothing to resolve. Five people build the engine; you build the road.

Two properties matter more than volume:

- **It has to look real.** Judges will read an FIR narrative over Akshath's shoulder. `"Person1 called Person2"` reads as a toy. A code-mixed Haryana FIR with a section reference and a thana name reads as a system that could be deployed.
- **The planted answers have to be findable but not obvious.** If the proxy kingpin has the most calls, betweenness centrality is pointless. He has to be *unremarkable* on the surface and *structurally central* underneath. Akshath's ground-truth file specifies this; your noise is what hides him.

---

## Roadmap

### W2–3 · Read and plan

- [ ] Read `data/GROUND_TRUTH.md` and the two templates the moment Akshath hands them over
- [ ] Read `roadmap.md:101` — that's your target spec: **3 gangs · ~40 people · ~60 phones · 8 FIRs · 3 statements · 2 tower dumps · ~25,000 CDR rows**
- [ ] Read `architecture.md:253` on code-mixing. **This one matters:** real Haryana FIRs interleave Devanagari narrative with Latin-script names, digits and section references. A clean all-Devanagari set will flatter the extractor and teach us nothing.
- [ ] Write `data/README.md` — the entity roster: every person, their phones, their gang, their aliases, their vehicles. **This is your working document and everyone else will read it.** AKTA needs the alias list; Hermaine needs the gang membership to check her centrality output.
- [ ] Ask Akshath anything unclear now rather than at W8. He has slack at W3 and none at W12.

### W3–6 · The roster and the FIRs

- [ ] ~40 people with realistic Haryana/Punjab names — mix of surnames, some genuinely similar (`Vikram Singh` / `Vikram Sing` / `V. Singh`), some sharing a first name across gangs
- [ ] ~60 phone numbers, valid Indian mobile format, canonical 10-digit
- [ ] 3 gangs with overlapping-but-distinct membership, **plus the one cross-gang bridge node Akshath planted**
- [ ] **8 FIR narratives**, from his template. Each one needs: an FIR number in `NNNN/YYYY` format, a real Haryana thana name (Kharkhoda, Gohana, Sonipat Sadar, Rai, Ganaur), IPC/BNS section references, a complainant, named accused, a code-mixed narrative paragraph, and a date.
  - Vary the length. Real FIRs run from four lines to two pages.
  - **Names in Latin script inside Devanagari narrative** — that's the realistic case.
- [ ] **3 witness statements.** One of them contains the alibi contradiction Akshath planted — cross-check his ground-truth file for exactly what it must say and when.

> Write these by hand or with your AI assistant, but **read every one afterwards.** A generated FIR that says "the suspect engaged in criminal activity" is worse than nothing. It should say who, when, where, which section, and which phone.

### W6–10 · The CDR generator — `data/generate_cdr.py`

**Write this as a script, not as a hand-made CSV.** Two reasons: you'll need to regenerate with more noise when the graph turns out to be a hairball at W10, and a generator is a much better thing to point at in the Future Scope slide than a static file.

- [ ] ~25,000 rows: `a_party, b_party, timestamp, duration_s, imei, cell_id`
- [ ] Headers matching Shourya's Airtel profile exactly — **ask him for the header names at W6**, don't guess
- [ ] Timestamps `DD/MM/YYYY HH:MM:SS`, spread over ~3 months
- [ ] Cell IDs in Haryana format (`HR-SNP-0147`), ~15 towers, geographically plausible clusters
- [ ] **Now plant the structure:**
  - **Proxy kingpin:** talks only to 2–3 lieutenants, never to the hitmen. Modest call volume. He must rank ~15th on degree and 1st on betweenness. **Verify this with Hermaine at W11 once her centrality endpoint is live** — if he doesn't come out top-betweenness, add or remove lieutenant calls until he does. This is the single most important number in your dataset.
  - **Alias pair:** two numbers that never call each other, share an IMEI for a two-week window. That IMEI overlap is the *only* signal linking them — AKTA's resolver has to find it and nothing else may give it away.
  - **Burst pairs:** 2–3 pairs with ≥8 calls in an hour, so Shourya's rule has something to catch
  - **Night spikes:** 2 pairs heavily weighted to 00:00–05:00
  - **Noise:** every person makes ordinary calls to non-suspects. Without noise the graph is a clean diagram of the answer and the analytics look trivial.
- [ ] **2 tower dumps** — subsets of CDR rows by `cell_id`, including the ping that contradicts the statement alibi
- [ ] `data/GENERATION_NOTES.md` — what you planted, where, and the row numbers. Akshath needs this for the demo script.

### W10–11 · Verification with the team 🔴 your most valuable hour

- [ ] Load your data through Shourya's parser. Does it parse clean? Fix header or format mismatches on your side.
- [ ] Check Hermaine's centrality output against `GROUND_TRUTH.md`. **Proxy kingpin top-betweenness?** If not, tune and regenerate.
- [ ] Check AKTA's resolver merges the alias pair — and merges it *for the IMEI reason*.
- [ ] Look at Akshath's canvas with your full dataset. **Is it a readable graph or a hairball?** If it's a hairball, that's your signal to cut entity count or tighten the default filter — tell him which, he'll set the filter.

### W11–14 · Centrality panel — `web/src/panels/centrality/`

Self-contained React panel in the right rail. Own file, one endpoint, nobody depends on it.

- [ ] Table from `GET /api/analytics/centrality`: node name, type badge, degree, betweenness, PageRank
- [ ] Sortable by column. **Default sort: betweenness descending** — that's the demo's punchline, so it should be the first thing on screen.
- [ ] Click a row → calls Akshath's `focusNode(id)`. **Use his exposed API; do not touch `engine.ts`.**
- [ ] Styling from Harleen's tokens. **No hex codes** — if you need a colour that isn't a token, ask her to add one.
- [ ] Mock data is already in `mocks.py`, so you can build the whole panel before Hermaine's endpoint is real.

### W14–16 · UI states — `web/src/states/` 🔴 after feature freeze

Small, and worth more than it sounds: on a projector, polish is most of what judges perceive.

- [ ] A shared `<EmptyState>` component — icon, headline, one line of body, optional action. Everyone uses yours instead of writing their own.
- [ ] A shared `<LoadingSkeleton>` — shaped placeholders, not spinners
- [ ] An `<ErrorState>` for failed API calls
- [ ] Copy tone from `design-system.md §7`: **"Named as accused in 3 FIRs"**, never **"High risk individual"**. The product never editorialises about people; it reports what the record says. That rule holds in empty-state copy too.

---

## Cut to Future Scope — do not build these

Real OCR'd scanned FIRs · geospatial tower plotting · more than 3 gangs · >25k CDR rows · chargesheet documents · a second telco CDR profile · multi-case datasets

---

## Priority order if you run short

1. **Roster + the 4 planted answers in a working CDR file** — nothing demos without this
2. **8 FIR narratives that read as real**
3. Verification pass with Hermaine, AKTA and Shourya at W10–11
4. Centrality panel
5. Shared UI states

**If you're behind at W8, say so in the group chat.** Akshath can generate a smaller dataset himself in 40 minutes at W8. He cannot at W14. Telling us early costs nothing; telling us late costs the demo.
