# MEHUL — Synthetic Case Data + What Changed + UI States

**Read `docs/CASE_MODEL.md` first**, especially §3 and §4 — your notes have to
match that format exactly or nothing downstream parses them.

**Track:** the dataset the entire demo is proved against, then two
self-contained UI pieces.
**Clock:** 16 working hours.
**You own exclusively:** `data/`, `web/src/changed/`, `web/src/states/`
**You depend on:** Akshath's `GROUND_TRUTH.md` + templates (W3).
**Nobody is blocked on you before W8** — you set your own pace in the first block.
**Prompts:** MEH-T01 → T05, in `docs/BUILD_PROMPTS.md`

---

## Why this track matters

Every other track builds machinery. Your track builds the thing that *proves the
machinery works.*

Akshath plants four answers in `GROUND_TRUTH.md` — a proxy kingpin, an alias
pair, an alibi contradiction, a cross-case identifier hit — and you build a
realistic case around them, so that when the system surfaces those four on
stage it's a demonstration rather than a claim.

**Without your data there is nothing to demo.** The graph renders an empty
canvas. The copilot has nothing to answer from. The orchestrator has nothing to
analyse. Five people build the engine; you build the road.

Two properties matter more than volume:

- **It has to look real.** Judges read an FIR narrative over Akshath's shoulder.
  `"Person1 called Person2"` reads as a toy. A code-mixed Haryana FIR with a
  section reference and a thana name reads as a system that could be deployed.
- **The planted answers must be findable but not obvious.** If the proxy kingpin
  has the most calls, finding him is trivial and the analysis looks pointless.
  He is unremarkable on the surface and structurally central underneath. Your
  noise is what hides him.

---

## Roadmap

### W2–3 · Read and plan

- [ ] Read `data/GROUND_TRUTH.md` and both templates the moment Akshath hands
      them over. Read `CASE_MODEL.md` §4 twice — frontmatter fields, the
      `## Links` section, the `^[source locator]` citation format. **Get this
      wrong and AKTA's parser produces an empty graph.**
- [ ] Read `architecture.md:253` on code-mixing. Real Haryana FIRs interleave
      Devanagari narrative with Latin-script names, digits and section refs. A
      clean all-Devanagari set flatters us and teaches us nothing.
- [ ] Target: **3 gangs · ~40 people · ~60 identifiers · 8 FIRs · 3 statements ·
      2 tower dumps · ~25,000 CDR rows**, plus a **second small case** carrying
      the cross-case identifier hit.
- [ ] Write `data/README.md` — the entity roster: every person, their
      identifiers, their gang, aliases, vehicles. Everyone reads this.
- [ ] Ask Akshath anything unclear **now**. He has slack at W3 and none at W12.

### W3–6 · The roster and the narratives

- [ ] ~40 people, realistic Haryana/Punjab names. Some genuinely similar
      (`Vikram Singh` / `Vikram Sing` / `V. Singh`), some sharing a first name
      across gangs.
- [ ] ~60 identifiers in valid Indian mobile format, canonical 10 digits.
- [ ] 3 gangs, overlapping but distinct, plus the cross-gang bridge node.
- [ ] **8 FIR narratives** from the template: FIR number `NNNN/YYYY`, a real
      Haryana thana (Kharkhoda, Gohana, Sonipat Sadar, Rai, Ganaur), IPC/BNS
      section refs, complainant, named accused, a code-mixed narrative
      paragraph, a date. **Vary the length** — real FIRs run four lines to two
      pages.
- [ ] **3 witness statements.** One carries the alibi contradiction — check
      `GROUND_TRUTH.md` for exactly what it must say and when.
- [ ] **A second case folder** with 6–8 notes, sharing exactly one identifier
      with the main case. This is Shourya's cross-case demo.

> Write these with your AI assistant if you like, but **read every one
> afterwards.** A generated FIR that says *"the suspect engaged in criminal
> activity"* is worse than nothing. It must say who, when, where, which section,
> and which phone.

### W6–10 · `data/generate_cdr.py`

**A script, not a hand-made CSV.** You will regenerate with more noise when the
graph turns out to be a hairball at W10, and a generator is a much better thing
to point at on the Future Scope slide.

- [ ] ~25,000 rows: `a_party, b_party, timestamp, duration_s, imei, cell_id`.
      Headers matching Shourya's Airtel profile **exactly — ask him at W6, don't
      guess.**
- [ ] Timestamps `DD/MM/YYYY HH:MM:SS` over ~3 months. Cell IDs `HR-SNP-0147`
      format, ~15 towers, plausible geographic clusters.
- [ ] Plant the structure:
      - **Proxy kingpin** — talks only to 2–3 lieutenants, never to the hitmen.
        Modest volume. Must rank ~15th by call count and 1st by structural
        centrality. **The single most important number in your dataset.**
      - **Alias pair** — two numbers that never call each other, sharing an IMEI
        for a two-week window. That overlap is the *only* signal. Nothing else
        may give it away.
      - **Noise** — everyone makes ordinary calls to non-suspects. Without noise
        the graph is a clean diagram of the answer and the analysis looks trivial.
- [ ] 2 tower dumps — CDR subsets by `cell_id`, including the ping that
      contradicts the statement alibi.
- [ ] `data/GENERATION_NOTES.md` — what you planted, where, and the row numbers.
      Akshath needs this for the demo script.

### W10–11 · Verification with the team 🔴 your most valuable hour

Not a prompt. Sit with three people in turn.

- [ ] **Shourya** — does your data parse clean through his CDR loader? Fix
      mismatches on *your* side.
- [ ] **Akshath** — run Analyse case on your data. Does the orchestrator find
      the planted connections? Does the contradiction surface?
- [ ] **AKTA** — look at the graph with your full dataset. Readable or hairball?
      If it's a hairball, tell her whether to cut entity count or tighten the
      default filter. She sets the filter.

### W11–14 · `web/src/changed/` — the What Changed view

A self-contained React panel. Own file, one endpoint, nobody depends on it.

- [ ] After an Analyse run, show the diff: *3 new connections proposed · 2 files
      to update · 1 contradiction found · 1 cross-case hit.*
- [ ] Each row clickable, jumping to the relevant proposal card in Harleen's
      panel. Use her exposed functions; **do not edit her files.**
- [ ] This is the natural landing screen after pressing the button. Make it read
      at a glance from across a room.
- [ ] Styling from Harleen's tokens. **No hex codes** — if you need a colour
      that isn't a token, ask her to add one.

### W14–16 · `web/src/states/` 🔴 after feature freeze

Small, and worth more than it sounds — on a projector, polish is most of what
judges perceive.

- [ ] `<EmptyState>` — icon, headline, one line of body, optional action.
      Everyone imports yours instead of writing their own.
- [ ] `<LoadingSkeleton>` — shaped placeholders, not spinners.
- [ ] `<ErrorState>` for failed calls.
- [ ] Copy tone from `design-system.md` §7: **"Named as accused in 3 FIRs"**,
      never **"High risk individual."** The product reports what the record says;
      it never editorialises about people. That holds in empty-state copy too.
- [ ] Tell Harleen, AKTA and Hermaine the moment these are available.

---

## Do not build

Real OCR'd scanned FIRs · geospatial tower plotting · more than 3 gangs ·
>25k CDR rows · chargesheets · a second telco profile · more than one extra case.

## Priority order if you run short

1. **Roster + the planted answers in a working CDR file + notes in the right
   format** — nothing demos without this
2. **8 FIR narratives that read as real**
3. The second case for the cross-case hit
4. Verification pass at W10–11
5. What Changed view
6. Shared UI states

**If you're behind at W8, say so in the group chat.** Akshath can generate a
smaller dataset himself in 40 minutes at W8. He cannot at W14. Telling us early
costs nothing; telling us late costs the demo.
