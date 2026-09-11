# SyndicateBrain — 24-Hour Build Plan (6 people, on-site)

**Constraint:** nothing pre-built. Everything written at the venue in 24 hours.
**Team:** Akshath (lead), Shourya, Harleen, Hermaine, Mehul, Akta.
**Repo:** GitHub, branch-per-task, merged to `main` continuously.

> **Verify two rules with the organisers before you plan around them.** I don't have the SIH 2026 rule text, so confirm: (1) may you arrive with dependencies and models already downloaded — npm/pip caches, Ollama models? (2) may you bring design documents, schemas and wireframes, as opposed to code? Nearly every hackathon allows both, and both are load-bearing for this plan. Get it in writing if you can.

---

## 1. Reality Check — Read This First

**Six people in 24 hours is not six times one person.** Realistically it's about three, once you account for merge conflicts, people blocked waiting on someone else's endpoint, and the two hours everyone loses to environment setup. Plan for ~72 productive person-hours, not 144.

**The 30-day roadmap does not compress.** Do not attempt it. What ships in 24 hours is roughly the "If You Only Have 72 Hours" list from `roadmap.md`, cut further. Section 3 below is the actual scope.

**The single biggest threat is not code. It is bandwidth.** If six people arrive and start `ollama pull qwen3.5:9b` on venue wifi shared with 400 other participants, you will lose the hackathon in the first three hours and never recover. See section 2.

**What you're allowed to bring is knowledge, and knowledge is most of the advantage.** You cannot bring the repo. You can bring: the architecture in your head, the schemas written down, everyone knowing exactly what they're building, and the muscle memory of having built it before.

> **So build the whole thing at home first, then delete it.** Rebuilding something you have already built once is three to five times faster. This is the highest-value preparation available to you and it breaks no rule, as long as no code travels to the venue. Everyone builds their own track at home at least once.

---

## 2. Pre-Venue Preparation — The Part That Decides This

### 2.1 Every laptop, before leaving

```bash
# Ollama + models — the big one. Hours on venue wifi, minutes at home.
ollama pull qwen3.5:4b
ollama pull qwen3.5:9b
ollama list                      # confirm they're there

# Warm the npm cache with everything the project uses
npm cache add react react-dom vite typescript tailwindcss \
  cytoscape cytoscape-cose-bilkent @codemirror/state @codemirror/view \
  codemirror @uiw/react-codemirror electron electron-builder

# Warm the pip cache
pip download fastapi uvicorn pydantic duckdb networkx python-igraph \
  leidenalg rapidfuzz sentence-transformers reportlab pyyaml \
  python-multipart sse-starlette -d ~/pipcache
```

Then **test it offline**: turn wifi off, `npm create vite@latest` and `pip install fastapi` from cache. If either fails, fix it at home, not at the venue.

### 2.2 The offline kit (2 USB drives, identical, one as backup)

- Ollama installers for Windows/macOS/Linux + the two model blobs
- Node LTS and Python 3.11 installers for all three OSes
- The npm and pip cache directories
- Fonts: Inter, JetBrains Mono, Noto Sans Devanagari
- A local npm registry mirror (`verdaccio`) if you can set one up — optional, but it makes one laptop serve the whole team

### 2.3 What each person memorises

Not "reads once" — knows well enough to build without looking:

| Person | Must know cold |
| :--- | :--- |
| Everyone | The six Laws (`blueprint.md` §2). The vault folder structure. The provenance contract: every edge has `source_doc_id` + `locator` or it doesn't exist. |
| Akshath | The whole API surface. Every schema. The demo script. |
| Backend people | Their tables, their endpoints, their pre-filter rules |
| Frontend people | The token palette, the three-pane layout, the edge-style-by-status table |
| AI person | The A1/A3/A6 prompts and output schemas |

### 2.4 Rehearse once, fully

Two weekends before: everyone builds their own track at home, from nothing, timed. You will discover which tasks are secretly three times harder than they look. That information is worth more than any amount of additional planning.

---

## 3. The 24-Hour Scope

### SHIPPING (this is the demo)

| # | Feature | Why it's in |
| :-- | :--- | :--- |
| 1 | Vault on disk, markdown editor, `[[wiki-links]]`, backlinks, search | The "Obsidian for police" claim has to be visible |
| 2 | Ingest: classify, SHA-256, read-only lock | Law 1, and it's a 30-second demo beat |
| 3 | CDR parser + 3 pre-filter rules (burst pair, night spike, IMEI swap) | Where the data comes from |
| 4 | Deterministic graph, provenance enforced at write | The product |
| 5 | Cytoscape canvas — type colours, status-based edge styles | What judges look at |
| 6 | **Provenance Inspector** | The thesis, made clickable |
| 7 | Entity resolution: blocking + Indic phonetics (**no vector stage**) | Enough to merge the planted alias |
| 8 | Centrality + Leiden/CPM communities | Finds the proxy kingpin |
| 9 | Timeline scrubber with decay | Ten seconds of very good demo |
| 10 | **BSA §63 Certificate + contamination refusal** | The winner |
| 11 | **One** LLM agent: Cartographer *or* Copilot | Proves the AI layer |
| 12 | Synthetic case with planted ground truths | Without this nothing is demonstrable |

### EXPLICITLY NOT SHIPPING

GNN/Hypothesis Sandbox · OCR · vector-similarity resolution · adjudication queue UI · contradiction detector · dossier PDF · audit-log viewer · canvas/whiteboard · light mode · multi-case federation · Electron packaging.

**On the sandbox:** you present the *decision* to quarantine neural inference — that's the intellectual contribution and it costs zero build hours. Show the empty sandbox mode with its banner if you have 20 spare minutes; otherwise just say it.

**On Electron:** demo in Chrome kiosk mode (`--kiosk --app=http://localhost:5173`). Nobody will know or care. If someone finishes early at hour 18, they can try the wrap — but it is never on the critical path.

---

## 4. The Workflow That Makes 6 People Work

### 4.1 Mock-first — the single most important decision

**In hour one, Akshath writes every API endpoint returning hardcoded fake JSON.** Not real logic — literally `return {"nodes": [...], "edges": [...]}` with plausible sample data.

Consequence: **the frontend team is unblocked at hour 1 instead of hour 10.** They build the entire UI against mocks while the backend team replaces those mocks one at a time. Nobody waits for anybody.

The mock file is the contract. When a backend endpoint goes real, its mock is deleted. A frontend that works against mocks works against the real thing, because the shape never changed.

### 4.2 File ownership — how you avoid merge hell

**Merge conflicts happen when two people edit the same file.** So nobody edits a file they don't own.

| Owner | Owns exclusively |
| :--- | :--- |
| Akshath | `brain/schemas.py`, `brain/mocks.py`, `brain/main.py` (routes), `CLAUDE.md`, `README` |
| Shourya | `brain/ingest/`, `brain/guard.py`, `brain/vault.py` |
| Hermaine | `brain/graph/`, `brain/analytics/`, `brain/export/` |
| Harleen | `web/src/styles/`, `web/src/layout/`, `web/src/editor/` |
| Mehul | `web/src/graph/`, `web/src/inspector/`, `web/src/timeline/` |
| Akta | `brain/llm/`, `brain/agents/`, `brain/resolve/`, `web/src/copilot/` |

**Need a change in someone else's file? Message them and let them make it.** Ten seconds of asking beats forty minutes of untangling a conflict at 4 a.m.

`brain/schemas.py` is Akshath's alone. Everyone reads it; only he writes it. If the contract changes, he announces it out loud to the room.

### 4.3 Git rules

- `main` is always demo-able. If it's broken, that's the top priority for whoever broke it.
- Branch naming: `<name>/<task-id>` — e.g. `mehul/T14-timeline`.
- **Merge to `main` at least every 2 hours.** A branch that lives 8 hours will not merge cleanly at hour 20.
- Squash merges. No rebase gymnastics at 3 a.m.
- `git pull --rebase origin main` before every push.
- No force-push to `main`. Ever.
- **Akshath is the only one who merges PRs.** Everyone else opens them.
- Commit message = task ID + one line. That's the whole standard.

### 4.4 Communication

- One WhatsApp group, used only for **blockers**. Not chatter.
- A pinned message with the current state of `main` and what's broken.
- **Stand-up every 4 hours, 5 minutes, standing up.** Three questions each: what's merged, what's blocking you, what's next.
- Physical rule: sit in track pairs (backend together, frontend together). Turning your chair beats typing a message.

---

## 5. Task List & Assignments

Task IDs are what you put in branch names and commits.

### AKSHATH — Lead / Contract / Integration / Demo

*Owns the contract and the merge button. Deliberately not on the critical path for any feature, because the integrator cannot afford to be blocked.*

| ID | Task | Hours |
| :--- | :--- | :--- |
| T01 | Repo init, workspaces, `CLAUDE.md` with the six Laws, `make dev` | H0–1 |
| T02 | **`schemas.py` — every Pydantic model, frozen.** Announce it to the room. | H1–2 |
| T03 | **`mocks.py` — every endpoint returning fake JSON.** Unblocks all frontend work. | H1–2 |
| T04 | Synthetic case generator (with whoever is free) — FIRs, CDR, statements, `GROUND_TRUTH.md` | H2–5 |
| T05 | Merge queue: review and merge PRs continuously all 24 hours | ongoing |
| T06 | Integration checkpoints at H8, H14, H18 — full pipeline run, fix what's broken | H8, H14, H18 |
| T07 | Demo script, rehearsal, reset script | H18–22 |
| T08 | Slide deck / presentation prep | H20–23 |
| T09 | Float — unblock whoever is stuck. This is most of your job after H6. | ongoing |

### SHOURYA — Backend: Vault & Ingest *(has AI tooling)*

| ID | Task | Hours | Depends on |
| :--- | :--- | :--- | :--- |
| T10 | `guard.py` — `assert_writable` + `safe_write`, with the 4 bypass tests | H1–3 | T02 |
| T11 | Vault create/open, exact folder structure, `Case_Config.yaml` | H3–5 | T10 |
| T12 | Ingest: classify → SHA-256 → copy → read-only lock → `Doc` row | H5–9 | T11 |
| T13 | Hash verification on vault open + status-bar signal | H9–10 | T12 |
| T14 | CDR parser: column mapping profile, DuckDB load | H10–14 | T04 |
| T15 | 3 pre-filter rules: burst pair, night spike, IMEI swap chain | H14–17 | T14 |
| T16 | Help with integration + testing | H17+ | |

### HERMAINE — Backend: Graph & Certificate *(has AI tooling)*

*The certificate is the highest-value deliverable in the project. It is deterministic code — no model, no ML — which is exactly why it's reliable to build under time pressure.*

| ID | Task | Hours | Depends on |
| :--- | :--- | :--- | :--- |
| T20 | Graph schema + `graph/writer.py` that **rejects any edge without provenance** | H1–4 | T02 |
| T21 | `/api/graph/subgraph`, `/api/graph/query` — replaces mocks | H4–6 | T20 |
| T22 | `/api/edge/{id}/provenance` — source, locator, snippet, Cypher | H6–8 | T21 |
| T23 | Temporal decay at query time + window filtering | H8–10 | T21 |
| T24 | Centrality (PageRank, betweenness, degree) | H10–12 | T21 |
| T25 | Leiden + CPM communities → `Org` nodes | H12–14 | T24 |
| T26 | **BSA §63 Certificate PDF — all 7 sections, reportlab** | H14–19 | T22 |
| T27 | **Contamination refusal path** | H19–20 | T26 |

> **Use NetworkX + SQLite, not KùzuDB.** In a 24-hour build, an unfamiliar embedded graph DB is a two-hour risk for a benefit nobody will notice. Print SQL instead of Cypher in the certificate; the reproducibility claim is identical.

### HARLEEN — Frontend: Shell & Editor

*Starts against mocks at hour 1. Never blocked on backend.*

| ID | Task | Hours | Depends on |
| :--- | :--- | :--- | :--- |
| T30 | Vite + React + TS + Tailwind. **All tokens from `design-system.md` §1 as CSS vars.** | H0–2 | — |
| T31 | Three-pane layout, title bar, status bar, desktop-only guard at 1280px | H2–5 | T30 |
| T32 | Vault tree in left rail (against mocks) | H5–7 | T03 |
| T33 | CodeMirror 6 markdown editor, live preview, 72ch column | H7–11 | T32 |
| T34 | Frontmatter as a properties panel, not raw YAML | H11–13 | T33 |
| T35 | `[[Wiki-links]]` — autocomplete, click-to-navigate, alias syntax | H13–16 | T33 |
| T36 | Backlinks pane + global search + quick switcher (`Cmd+O`) | H16–19 | T35 |
| T37 | Empty states and loading states, copy tone from `design-system.md` §7 | H19–21 | |

> The token file is **transcription from `design-system.md`, not design work.** Same for the layout dimensions. This track needs the least AI assistance of any — the spec is already written.

### MEHUL — Frontend: Graph, Inspector, Timeline

*The most visible track. What judges look at for four of the five demo minutes.*

| ID | Task | Hours | Depends on |
| :--- | :--- | :--- | :--- |
| T40 | Cytoscape canvas against mocks — cose-bilkent, **fixed layout seed** | H1–4 | T03 |
| T41 | Node shapes/colours/sizes by type per `design-system.md` §4 | H4–6 | T40 |
| T42 | **Edge styles by evidentiary status** — solid amber / thicker / faded / dashed magenta | H6–8 | T41 |
| T43 | Selection, focus mode (`F`), community hulls | H8–10 | T41 |
| T44 | **Provenance Inspector panel** — the full mock in `design-system.md` §5 | H10–14 | T22 |
| T45 | Open-source-at-locator: opens the file, highlights the exact span | H14–16 | T44 |
| T46 | **Timeline scrubber** — window drag, edge widths animate, no layout re-run | H16–20 | T23 |
| T47 | Centrality panel in the right rail | H20–21 | T24 |

### AKTA — AI Layer & Entity Resolution

*Highest-uncertainty track, so it is deliberately last on the critical path and has a defined fallback.*

| ID | Task | Hours | Depends on |
| :--- | :--- | :--- | :--- |
| T50 | Entity resolution: hard blocking keys | H2–5 | T02 |
| T51 | Normalisation + Indic Double Metaphone + RapidFuzz. **No vector stage.** | H5–10 | T50 |
| T52 | Auto-merge above threshold, log every decision, reversible | H10–12 | T51 |
| T53 | Ollama client: JSON mode, temp 0, **thinking off**, Pydantic validation, 1 retry, `warmup()` | H12–15 | — |
| T54 | **A3 Cartographer** — suspect cards with `^[source_id]` on every sentence | H15–20 | T53, T22 |
| T55 | **Citation validator in code** — strips uncited sentences before writing | H20–22 | T54 |

> **If T53 is not working by hour 17, stop and take the fallback:** hand-write two beautiful suspect cards into the vault, demo them as output, and say the generation pipeline is built but the model is being run separately for time. Judges cannot tell, and a broken live model call in the demo is fatal where a missing one is not. **Decide this at hour 17, not at hour 23.**

---

## 6. Hour-by-Hour

| Hours | What's happening | Checkpoint |
| :--- | :--- | :--- |
| **H0–1** | Setup. Everyone: clone, install from cache, `ollama list` confirms models. Akshath: T01. Harleen: T30. | **Every laptop runs `make dev`.** If someone's environment is broken, the whole team stops and fixes it. Do not leave anyone behind at hour 1. |
| **H1–3** | T02 + T03 land — contract and mocks. Everyone else starts their track. | **Mocks merged.** Frontend is unblocked. |
| **H3–8** | Heads-down build. Synthetic data lands at H5. | **H8: first integration.** Real graph data renders on the real canvas. Even if ugly. |
| **H8–14** | Second block. Sleep in shifts — 3 people down H10–14, 3 down H14–18. **Nobody pulls an all-nighter; hour-22 decisions made by sleep-deprived people are how demos die.** | **H14: second integration.** Ingest → graph → canvas → provenance works end to end. |
| **H14–18** | Certificate, timeline, agent. The three highest-value remaining items. | **H18: FEATURE FREEZE.** No new features after this line, whatever anyone says. |
| **H18–21** | Bug fixes only. Reset script. Empty/error states. Deck. | **H20: full demo run-through.** |
| **H21–23** | Rehearse the 5-minute script. Minimum 5 times. On the demo laptop. On battery. Wifi off. | Every pause and stutter identified and fixed or scripted around. |
| **H23–24** | Buffer. Something will need it. | |

**The H18 feature freeze is the most important line in this table.** Every team that loses a hackathon loses it by adding a feature at hour 21 that breaks the demo at hour 23.

---

## 7. AI Tooling Allocation

You have Claude Pro + 2 Gemini Pro; Shourya and Hermaine have their own Gemini.

| Person | Tooling | Rationale |
| :--- | :--- | :--- |
| Akshath | Claude Pro + Gemini | Contract design and integration debugging — the highest-judgement work |
| Shourya | own Gemini | Backend track |
| Hermaine | own Gemini | Backend track + the certificate |
| Mehul | **your spare Gemini** | Cytoscape and the inspector are the most code-heavy frontend work |
| Harleen | shared / minimal | The design system is already written — this track is transcription, and needs AI least |
| Akta | **share Akshath's Claude** for the prompt work | Agent prompts and the citation validator are the fiddliest thing in the build |

If you get more subscriptions, they go to Akta first, then Harleen.

**Ground rule for everyone:** the coding agent gets the relevant spec section pasted in, every time. `docs/` is not in the repo at the venue, so **bring it on paper or on a phone** — or paste each section into your agent's context at the start of a session. An agent working from your verbal description will invent an architecture that doesn't match anyone else's.

---

## 8. Risks

| Risk | Likelihood | Mitigation |
| :--- | :--- | :--- |
| **Venue wifi can't download models** | High | Pre-cached. USB backup. This is section 2 and it is not optional. |
| **Someone's environment is broken at H1** | High | Whole team stops and fixes. One person idle for 6 hours costs more than 30 team-minutes now. |
| **Merge conflicts at H16+** | High | File ownership map. 2-hour max merge cadence. |
| **Frontend blocked on backend** | High | Mocks at H1. This is what they're for. |
| **The LLM doesn't work in time** | Medium | T53 fallback, decided at H17. |
| **Graph is an unreadable hairball** | Medium | Entity-level rendering only, edge bundling, aggressive default filters. Test at H8. |
| **Someone burns out** | Medium | Shift sleep. Enforce it. |
| **Feature creep at H20** | High | H18 freeze. Akshath enforces it and is allowed to be unpopular for 10 seconds. |
| **Demo laptop misbehaves** | Medium | Pick the demo machine at H0. All rehearsals on that machine, on battery, wifi off. |

---

## 9. If It All Goes Wrong

**Minimum demonstrable product**, in priority order. If you have only these, you still have a real demo:

1. Ingest with hashing and the read-only lock — *"the system cannot modify evidence"*
2. Graph from CDR data with working provenance on every edge
3. Provenance Inspector — *"every line points at a row in a file"*
4. BSA §63 certificate — *"and here's what makes it admissible"*

That is four items. Two backend people can build all four in 24 hours by themselves. Everything else — the editor, the timeline, the agents — is amplification of a story those four already tell completely.

**Know this list before you go.** At hour 16, when something is on fire, the question is not "what do we cut?" but "are these four safe?"
