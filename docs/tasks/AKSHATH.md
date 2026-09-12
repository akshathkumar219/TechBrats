# AKSHATH — Lead · Graph Engine · AI Layer · Integration

**Tracks:** the two hardest things in the build, plus the contract, plus the merge button.
**Your clock:** ~19 working hours (you're working through the food breaks; nobody else is).
**Files you own:** `brain/schemas.py`, `brain/mocks.py`, `brain/main.py`, `brain/guard.py`, `brain/llm/`, `brain/agents/`, `web/src/graph/engine.ts`, `web/src/graph/styles.ts`, `web/src/timeline/`, `CLAUDE.md`, `README.md`
**Your AI tooling:** Claude Pro + Gemini. Share the Claude session with AKTA for her resolver prompts if she asks.

---

## Why this shape

You asked for the hardest *and* the highest-variance work, on the reasoning that if it fails you're the one who has to fix it anyway. That's correct reasoning, so this file gives you both: **the Cytoscape engine + timeline** (hardest by raw difficulty — perf work no model shortcuts for you) and **the AI layer** (highest variance, and it has the only written bail-out in the project).

The cost is that you are on the critical path for two visible features while also being the integrator. So three things are load-bearing:

1. **Everything that unblocks others ships in your first 2 hours** — schemas, mocks, guard. After W2 nobody is waiting on you for anything.
2. **You build the graph *engine*, not the graph *UI*.** Node styling, edges-by-status, focus mode, hulls — those are yours too but they're config on top of an engine that already works. Provenance Inspector is AKTA's. Centrality panel is Mehul's.
3. **The AI go/no-go is at W12, and you make it on the clock, not on hope.** See below.

---

## Roadmap

### W0–1 · Repo and room setup

- [ ] `git init`, push to GitHub, add all 5 as collaborators, protect `main` (no force-push)
- [ ] Workspaces: `web/` (Vite+React+TS+Tailwind), `brain/` (FastAPI), `data/`
- [ ] `.gitignore` per `GITHUB_RULES.md §5.7` — do this **before** the first `git add -A` or someone commits `node_modules`
- [ ] `CLAUDE.md` at repo root: the six Laws from `blueprint.md §2`, verbatim, plus the provenance contract sentence. Every agent session in the room gets this pasted in.
- [ ] `make dev` — one command starts FastAPI on :8000 and Vite on :5173
- [ ] **Pick the demo laptop now.** Write it on the whiteboard. Every rehearsal happens on it.
- [ ] **Walk the room.** Every laptop: `make dev` runs, `ollama list` shows both models. If one person's environment is broken, the whole team stops. One person idle for six hours costs more than thirty team-minutes now.

> Post `GITHUB_RULES.md` in the group chat at W0 and make everyone confirm they read §2 and §4. Two minutes each, and it buys back the 4 a.m. merge disaster.

### W1–2 · The contract — the highest-leverage two hours you have

- [ ] **`brain/schemas.py`** — every Pydantic model: `Node`, `Edge`, `Provenance`, `Doc`, `SubgraphResponse`, `CertificateRequest`, `ResolveDecision`, `AgentCard`. Then **freeze it** and announce it out loud to the room.
  - Every `Edge` carries `source_doc_id: str` and `locator: str`. Non-optional. No default. This is Law 1 expressed as a type — if the field can't be omitted, a provenance-less edge is unrepresentable.
- [ ] **`brain/mocks.py`** — *every* endpoint returning hardcoded plausible JSON. Literally `return {"nodes": [...], "edges": [...]}`. No logic.
  - `/api/graph/subgraph`, `/api/edge/{id}/provenance`, `/api/vault/tree`, `/api/analytics/centrality`, `/api/doc/{id}`, `/api/agent/card/{id}`, `/api/export/certificate`
  - Use realistic Indian names and Haryana phone/tower IDs — the frontend team builds against this for hours and it'll end up in screenshots.
- [ ] **`brain/guard.py`** — `assert_writable(path)` and `safe_write(path, bytes)`. Any path under `01_Evidence_Inbox/` raises. Plus the 4 bypass tests: direct `open()`, `os.rename`, `shutil.copy` onto a locked path, symlink escape.
  - This is ~40 lines and it is the teeth of the whole pitch. Shourya's ingest pipeline calls into it; you own the enforcement, he owns the pipeline.
- [ ] Announce: *"schemas are frozen, mocks are merged, everyone is unblocked, go."*

**Gate W2: the frontend team is building against mocks.** If they're still waiting at W2:30, that is the only thing wrong with this project and you fix it before anything else.

### W2–3 · Ground truth

- [ ] `data/GROUND_TRUTH.md` — plant the four answers by hand:
  1. **Proxy kingpin** who never calls the hitmen directly (must come out top-betweenness, not top-degree — that contrast *is* the demo beat)
  2. **Alias pair** resolvable only via shared IMEI (AKTA's resolver has to earn this one)
  3. **Alibi contradiction** between a statement and a tower ping
  4. **Cross-gang bridge** — one node connecting two otherwise separate components
- [ ] `data/TEMPLATE_FIR.md` + `data/TEMPLATE_CDR.csv` — one hand-written example of each, code-mixed Devanagari narrative with Latin names/digits/section refs (per `architecture.md:253` — a clean all-Devanagari set will flatter your extractor and teach you nothing)
- [ ] Hand both to Mehul with the entity name list. **He generates volume around your planted answers.** You keep the leverage, he does the labour.

### W3–8 · Cytoscape engine — `web/src/graph/engine.ts`

The hardest single piece in the build. Nothing blocks on it (AKTA and Mehul work against mocks) so take the time it needs.

- [ ] Cytoscape + `cose-bilkent`, **fixed layout seed.** Same data must produce the identical picture every run — you will demo this five times and judges notice if it jumps.
- [ ] **Set a render budget before you write styling.** Target: 2,000 nodes / 8,000 edges at interactive pan-zoom.
  - Entity-level rendering only — never one node per CDR row
  - `hideEdgesOnViewport: true`, `textureOnViewport: true`, `pixelRatio: 1`
  - Aggressive default filter: top-N by degree, everything else behind "show all"
  - **Test this at W6 with Mehul's generated data, not with the 20-node mock.** A canvas that's beautiful at 20 nodes and a hairball at 2,000 is a demo that dies on stage.
- [ ] Imperative API that AKTA and Mehul call, so they never touch your file:
  `focusNode(id)`, `applyFilter(pred)`, `setEdgeWeights(map)`, `setSelection(ids)`, `fitTo(ids)`
- [ ] `web/src/graph/styles.ts` — node shape/colour/size by type and edge style by **evidentiary status**, both transcribed from `design-system.md §4`. Solid amber / thicker / faded / dashed magenta. Transcription, not design work.
- [ ] Focus mode (`F`), selection, community hulls (hulls only if Leiden lands — see `perfect_future.md`)

### W8–11 · Timeline scrubber — `web/src/timeline/`

- [ ] Window drag control, bound to Hermaine's decay-weighted `/subgraph`
- [ ] **Edge widths animate; layout does not re-run.** This is the whole trick. Positions are frozen; only `width` and `opacity` interpolate. If you re-run layout on scrub, the graph explodes and it looks broken.
- [ ] Debounce the backend call; interpolate locally between responses so the scrub feels continuous
- [ ] Ten seconds of very good demo. Worth the three hours.

### W6 / W11 / W14 · Integration checkpoints (you run these)

Stop the room. Full pipeline, real data, on the demo laptop.

| Checkpoint | Must be true |
| :--- | :--- |
| **W6** | Real graph data from Hermaine's endpoint renders on your real canvas. Ugly is fine. Mocks still in place for everything else. |
| **W11** | Ingest → graph → canvas → Provenance Inspector works end to end on one path, once, by hand. |
| **W14** | Certificate generates. Timeline scrubs. Full 5-minute demo runs start to finish with no human intervention except your clicks. |

### W11–15 · AI layer — `brain/llm/` + `brain/agents/`

- [ ] `brain/llm/client.py` — Ollama, JSON mode, `temperature=0`, **thinking off**, Pydantic validation, exactly 1 retry, `warmup()` called at app start so the first demo call isn't a 40-second cold load
- [ ] **A3 Cartographer** — suspect card generation. Prompt from `docs/prompts.md`. Every sentence carries `^[source_id]`.
- [ ] **`brain/agents/validator.py` — citation validator in code.** Parse the model's output, drop every sentence without a resolvable `^[source_id]`, write only what survives. This is what makes the AI claim defensible rather than a liability, and it's deterministic Python — build it even if the model work slips.

> ### 🔴 W12 GO/NO-GO — put a phone alarm on this
>
> At W12, ask one question: **has the Ollama client returned schema-valid JSON for a real card, once?**
>
> **No → take the fallback immediately.** Hand-write two beautiful suspect cards into the vault by hand. Demo them as output. Say: *"the generation pipeline and the citation validator are built; we're running the model out-of-process for time."* Every word of that is true. Judges cannot tell. A broken live model call on stage is fatal; a model run separately is a footnote.
>
> **Decide this at W12, not at W15.** The failure mode is not "the model doesn't work" — it's "you spent W12–W15 believing it was about to."

### W13 · 🔴 FEATURE FREEZE

**You enforce this and you are allowed to be unpopular for ten seconds.** No new features after W13, from anyone, including you. Every team that loses a hackathon loses it by adding a feature at W14 that breaks the demo at W15:30.

After W13 the only permitted commits are: bug fixes, empty states, error states, visual polish, the reset script, the deck.

### W13–16 · Demo, deck, rehearsal

- [ ] `make reset` — wipes the demo vault, re-ingests the synthetic case, back to slide-one state in under 20 seconds. **You will need this mid-demo. Build it before you need it.**
- [ ] 5-minute demo script, written down, with the exact click sequence. Opening line, closing line, and the one sentence you say while each thing loads.
- [ ] SIH IDEA deck — `populate_slides.py` regenerates it; content from `docs/pitch-deck.md`. **Anything cut goes on the Future Scope slide as a deliberate decision, not a gap.** Quarantined GNN sandbox, OCR extraction, Leiden communities, multi-case federation, Electron packaging — all of these are stronger as "we decided to defer this and here's why" than as missing features.
- [ ] **Rehearse 5 times minimum.** On the demo laptop. On battery. Wifi off. Every pause and stutter either fixed or scripted around.

### Ongoing · The actual job after W3

- Merge queue. You're the only merger. Aim to review and merge within 10 minutes of a PR going up — a person waiting on a merge is a person not building.
- Stand-up every 4 working hours, 5 minutes, standing. Three questions each: what's merged, what's blocking you, what's next.
- Float. Unblock whoever is stuck. From W3 onward this is most of your value, above your own code.
- Pinned group message: current state of `main`, what's broken, who owns it.

---

## Your 16-hour scope decisions, already made

**Shipping and polished:** vault + editor + wiki-links + backlinks + search · ingest with hash + read-only lock · CDR parser + 3 pre-filters · deterministic graph with enforced provenance · Cytoscape canvas · Provenance Inspector · entity resolution · centrality · timeline with decay · **BSA §63 certificate + contamination refusal** · one LLM agent with citation validation · synthetic case with planted answers

**Deliberately deferred to Future Scope:** Leiden/CPM communities · GNN hypothesis sandbox · OCR / FIR extractor · vector-similarity resolution · adjudication queue · contradiction detector · dossier PDF · audit-log viewer · canvas/whiteboard · quick switcher · frontmatter properties panel · light mode · multi-case federation · Electron packaging

**Demo in Chrome kiosk:** `chrome --kiosk --app=http://localhost:5173`. Nobody will know it isn't Electron.

---

## The four that cannot slip

If everything else burns, these four still tell the whole story:

1. **Ingest with hashing + read-only lock** — *"the system cannot modify evidence"*
2. **Graph with working provenance on every edge** — the product
3. **Provenance Inspector** — *"every line points at a row in a file"*
4. **BSA §63 certificate** — *"and here's what makes it admissible"*

At W11, when something is on fire, the question is never "what do we cut?" It is **"are these four safe?"**
