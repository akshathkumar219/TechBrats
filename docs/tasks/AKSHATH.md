# AKSHATH — Lead · Agent Layer · Integration

**Read `docs/CASE_MODEL.md` first.** It is the architecture of record and it
replaces the earlier graph-store design.

**Track:** the contract, the agent layer, the link writer, the merge button.
**Clock:** ~19 working hours (you work through the food breaks; nobody else does).
**You own exclusively:** `brain/schemas.py`, `brain/mocks.py`, `brain/main.py`,
`brain/guard.py`, `brain/llm/`, `brain/agents/`, `brain/orchestrator.py`,
`brain/linker.py`, `Makefile`, `CLAUDE.md`, `README.md`
**Prompts:** AKS-T01 → T07, in `docs/BUILD_PROMPTS.md`

---

## Why this shape

The agent layer is the product now. It is also the highest-variance thing in the
build — it depends on a model behaving, and it has the only written bail-out in
the project. You took it for the right reason: if it fails you're the one
fixing it anyway.

Three things are load-bearing:

1. **Everything that unblocks others ships in your first two hours** — schemas,
   mocks, guard. After W2 nobody waits on you.
2. **Build the validator and the linker before the clever agents.** They are
   deterministic Python and they are what makes the AI defensible rather than a
   liability. They ship whether or not the model cooperates.
3. **The W12 go/no-go is on the clock, not on hope.**

---

## Roadmap

### W0–2 · The contract 🔴 blocks all five

- [ ] `brain/schemas.py` — `Entity`, `Link`, `Citation`, `Proposal`,
      `AnalysisResult`, `CaseIndexEntry`, `Doc`. **`Link` and `Proposal` both
      carry a non-optional `Citation`.** A link without a source is
      unrepresentable as a type. Freeze it and announce it out loud.
- [ ] `brain/mocks.py` — every endpoint returning hardcoded plausible JSON.
      Realistic Haryana names, phones, tower IDs. The frontend builds against
      this for hours and it ends up in screenshots.
- [ ] `brain/guard.py` — `assert_writable(path)`, `safe_write(path, bytes)`.
      Any path under `00_Raw_Inputs/` raises. Four bypass tests: direct `open()`,
      `os.rename`, `shutil.copy`, symlink escape.
- [ ] `Makefile` — `make dev` starts FastAPI on :8000 and Vite on :5173.

### W2–3 · Ground truth 🔴 blocks Mehul

- [ ] `data/GROUND_TRUTH.md` — plant four answers by hand:
      proxy kingpin (structurally central, unremarkable on volume) · alias pair
      resolvable only via shared IMEI · alibi contradiction between a statement
      and a tower ping · cross-case identifier hit
- [ ] `data/TEMPLATE_FIR.md` + `data/TEMPLATE_CDR.csv` — code-mixed Devanagari
      narrative with Latin names, digits and section refs
- [ ] Hand both to Mehul. He generates volume around your planted answers.

### W3–6 · The model layer — `brain/llm/`

- [ ] `client.py` as a **provider interface**, not a Gemini client. Gemini Flash
      and Ollama behind it, switched by one key in `Case_Config.yaml`. Keep the
      local path working — it's what answers "does police data leave the
      building?"
- [ ] JSON mode, temperature 0, Pydantic validation, exactly 1 retry, `warmup()`
      at app start.
- [ ] **`brain/agents/validator.py` first** — deterministic Python, no model.
      Parses output, drops every sentence without a resolvable `^[source_id]`,
      returns only what survives. Build this before any agent.

### W6–10 · `brain/orchestrator.py`

- [ ] Loads `_Case_Index.md`, fans out to per-folder reader agents, collects
      proposals, validates citations, returns one `AnalysisResult`.
- [ ] Specialist agents as prompts, not systems: connection finder ·
      contradiction detector. Cross-case hits are Shourya's and deterministic.
- [ ] `POST /api/case/analyse` — the **Analyse case** button calls this.
- [ ] Every proposal carries claim, reason, source file, locator, confidence.

### W10–12 · `brain/linker.py` — the only writer

- [ ] The single code path that writes a link into a note. Refuses any link
      without a resolvable citation. No force flag.
- [ ] Writes into the note's `## Links` section, with the citation inline and a
      trailing `<!-- ai:<proposal_id> accepted -->` marker.
- [ ] Rejected proposals logged to `07_AI_Synthesis/decisions.jsonl` and never
      re-proposed identically.
- [ ] `POST /api/proposal/{id}/accept` and `/reject`.

> ### 🔴 W12 GO/NO-GO — phone alarm on this
>
> One question: **has the orchestrator returned a schema-valid `AnalysisResult`
> with resolvable citations, once, on real case data?**
>
> **No → fallback immediately.** Hand-write two analysis results into
> `07_AI_Synthesis/` and demo them. Say: *"the orchestrator and the citation
> validator are built; we're running the model out-of-process for time."* Every
> word true. Decide at W12, not W15.

### W13 · 🔴 FEATURE FREEZE

You enforce it and you are allowed to be unpopular for ten seconds. After W13:
bug fixes, empty states, error states, polish, the reset script, the deck.

### W13–16 · Demo

- [ ] `make reset` — wipes the demo case, re-ingests, back to slide one in under
      20 seconds. Build it before you need it.
- [ ] 5-minute demo script with the exact click sequence, written down.
- [ ] Deck via `populate_slides.py`. Everything cut goes on Future Scope as a
      decision with a reason.
- [ ] **Rehearse 5 times minimum.** Demo laptop, on battery, wifi off — and if
      you're demoing on Flash, have a phone hotspot and a cached-response
      fallback for the exact demo path.

---

## Integration checkpoints — you run these, you stop the room

| When | Must be true |
| :--- | :--- |
| **W6** | A case folder renders in the tree, the copilot answers one question with a citation |
| **W11** | Drop a file in `00_Raw_Inputs/` → Analyse → proposals appear → accept one → the link is in the note and on the graph. Once, by hand. |
| **W14** | Full 5-minute demo runs start to finish with no intervention except your clicks |

## Ongoing, from W3 — most of your value

Merge queue (you're the only merger, 10-minute turnaround) · stand-up every 4
hours, 5 minutes, standing · float to whoever is stuck · pinned message with the
state of `main`.

## The four that cannot slip

1. Ingest with hashing and a lock that visibly refuses
2. Analyse case → proposals with citations
3. Accept/Reject writing a real link into a real note
4. The copilot answering from the case with a clickable citation
