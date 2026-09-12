# perfect_future.md — What 16 Perfect Hours Looks Like

> This is the good timeline. Not the optimistic one — the *achievable* one, where everyone does their own track competently and nobody is a hero. Read it as the target shape of the day, and read `LEAD_NOTES.md` for what to do when reality diverges.

**Clock:** 16 working hours (W0–W16). Food breaks and sleep sit *outside* the count. Akshath works through the breaks (~19h). Sleep in shifts — three people down between the W8 and W12 marks, three between W12 and W15.

**The philosophy, stated once so it governs every decision below:** we are not chasing an MVP. We are chasing **twelve things that work perfectly and look finished.** Everything else goes on the SIH Future Scope slide as a deliberate engineering decision, which is a stronger artefact than a half-built feature. When in doubt: fewer things, finished.

---

## The Shape of the Perfect Day

| Block | What's happening | Gate |
| :--- | :--- | :--- |
| **W0–1** | Everyone's environment works. Repo live. Harleen's tokens land. | **Every laptop runs `make dev`. `ollama list` shows both models.** Nobody left behind. |
| **W1–2** | Akshath's `schemas.py` frozen, `mocks.py` merged, `guard.py` done. Announced out loud. | **🔴 Frontend unblocked at W2, not W10.** This gate is the whole plan. |
| **W2–6** | Five people heads-down on their own files. Akshath plants ground truth, then starts the canvas engine. Mehul's roster lands. | **W6: integration #1.** Hermaine's real subgraph renders on Akshath's real canvas. Ugly is fine. |
| **W6–11** | Editor, ingest, CDR, resolver, inspector, timeline. Mehul's full dataset lands W10. | **W11: integration #2.** Ingest → graph → canvas → inspector, end to end, once, by hand. |
| **W11–13** | Certificate. AI agent. Verification pass against ground truth. | **🔴 W12: AI go/no-go.** **🔴 W13: FEATURE FREEZE.** |
| **W13–15** | Bug fixes, empty states, visual pass, reset script, deck. Nothing new. | **W15: full demo run-through on the demo laptop.** |
| **W15–16** | Rehearse ×5. Battery. Wifi off. | Every stutter fixed or scripted around. |

---

## The Perfect Version of Each Person's Day

### Akshath — the contract, then the two hard things, then the room

**Perfect looks like:** `schemas.py` and `mocks.py` are merged and announced by W2, and from that moment **nobody in the room is ever waiting on him for anything.** `guard.py` refuses all four bypass attempts. Ground truth is planted and handed to Mehul by W3 with an entity list and two templates.

Then the canvas engine, and the perfect version of that is: **he sets the render budget before he writes a line of styling and tests it against Mehul's real 25,000-row data at W6, not against the 20-node mock.** A canvas that's beautiful at 20 nodes and a hairball at 2,000 is the most expensive mistake available in this build, and it's only discoverable early. He finds it at W6 and fixes it with a default filter.

The timeline scrubs and **layout never re-runs** — widths and opacity interpolate over frozen positions. Ten seconds of the best-looking thing in the demo.

The AI layer returns schema-valid JSON by W12 and the citation validator strips uncited sentences in code. **Or it doesn't, and he takes the fallback at W12 without negotiating with himself.** Both of those are the perfect outcome. What isn't perfect is believing at W15 that it's about to work.

He runs three integration checkpoints, merges every PR within ten minutes, holds the W13 freeze against everybody, and rehearses five times on battery.

**The failure mode he has to watch in himself:** he has two critical-path features *and* the merge queue *and* the deck. The perfect day is one where, whenever those conflict, **the merge queue wins.** A blocked teammate costs the project more than his own unfinished hour. Most of his value after W3 is unblocking five people, not writing code — and that will feel, at the time, like not working.

### Harleen — the claim, made felt

**Perfect looks like:** tokens land at W2 and **nobody writes a hex code for the rest of the build.** The three-pane shell is up by W5, and she has talked to Akshath about the centre-pane container *before* building it — so his Cytoscape instance survives the editor↔graph switch without remounting, and he never spends an hour debugging a layout jump that wasn't his fault.

The CodeMirror editor is the piece that earns the product's name. Perfect is: `[[` autocompletes, links navigate on click, unresolved links render differently, aliases work, and **the backlinks pane shows surrounding context**. That last one is the single feature that makes the vault feel like an investigation rather than a folder. She checks a real code-mixed Devanagari/Latin paragraph early, so mixed-script line-height is right long before a judge reads one on a projector.

Then she stops. She does **not** build the quick switcher or the frontmatter panel, and she spends W15–16 on empty states, focus rings and a full-UI alignment walk on the demo laptop instead. On a projector that pass is worth more than either cut feature.

**Her track needs the least AI help of anyone's** — the design system is already written, so her hours go to execution quality rather than deliberation. That's an advantage, not a demotion.

### Hermaine — the guarantee and the headline

**Perfect looks like:** `writer.py` rejects provenance-less edges by W5 with **no `force` flag, no bypass path, and four tests that fail loudly.** She agrees the `locator` string format with AKTA at W2 and it never changes again — so the inspector and the certificate parse the same thing all day.

The subgraph endpoint matches `mocks.py` byte-for-byte, so Akshath's canvas lights up at W6 with zero rework. She caps at 2,000 nodes / 8,000 edges instead of shipping him a 50,000-edge response that blows his render budget. Decay is query-time and returns under 200ms, so the timeline scrub feels continuous.

**Then the decision that defines her day: she starts the certificate at W11 no matter what else is unfinished.** Centrality half-done at W11 stays half-done. The certificate is the highest-value artefact in the project and it must never be the thing that ran out of time. Perfect is seven full sections, every SHA-256 printed, reproducible SQL, deterministic output — and it **looks like a legal document**: serif body, numbered sections, signature block, page *n of m*.

And then the last 45 minutes: **contamination refusal.** A system that declines to certify evidence whose hash no longer matches. No competing team will show anything like it. That's the mic-drop, and in the perfect timeline it exists because she protected the time for it.

She also cuts Leiden without argument, having understood *why*: **betweenness alone finds the proxy kingpin.** Community hulls only draw the gang boundaries. Cutting it costs the demo nothing and buys the certificate two hours.

### AKTA — precision on both sides of the stack

**Perfect looks like:** blocking keys by W5 with **no block larger than 50 members**, because she logs block sizes instead of assuming. Three-stage matching working by W10: normalisation, then Indic Double Metaphone, then RapidFuzz — and **no vector stage**, because a probabilistic step in the one part of the pipeline that has to be explainable in court is the wrong trade, and she can say why on stage.

`Vikram`/`Bikram` collide. `Mohd`/`Mohammad` collide. Every merge decision is in `decisions.jsonl` with all three stage scores, every merge is reversible, and no source row is ever destroyed — because destroying one would violate Law 1.

**The moment that defines her track:** at W11 she loads Mehul's real data and the planted alias pair merges — **and merges for the IMEI reason.** Not by accident, not on a name-similarity coincidence. Because when Akshath says on stage *"these two merged because they shared a handset for two weeks in February"*, that sentence has to be true.

Then she switches stacks and the inspector renders the **raw source snippet** — not paraphrased, not translated, not cleaned, because that rawness *is* the guarantee. She asks Harleen for `openFileAt()` at W12 when Harleen has hours, not at W15 when she doesn't. And the beat lands: click a locator, the original FIR opens, the exact line highlights.

### Shourya — the opening thirty seconds, and the fuel

**Perfect looks like:** vault structure exactly as specified at W4, so Harleen's tree and Hermaine's certificate both find what they expect. Ingest working by W8 — classify, hash-before-move, copy, `chmod 0444` **plus** guard registration, `Doc` row written. He tells Akshath the moment it works, and Akshath immediately tries to break it. It refuses. **That's the demo's opening beat and it's his.**

The CDR parser normalises phone numbers **once, at load** — so the graph never quietly has two nodes for one phone. Timestamps parse as `DD/MM/YYYY`, because he checked the day/month order rather than trusting a default that would have silently shifted the entire timeline. Row numbers are stable across reloads, because Hermaine's provenance and AKTA's inspector both cite them.

Three pre-filter rules, and the IMEI swap chain is the one he prioritises — because it's what feeds AKTA's planted alias merge, and he tells her the moment it produces output.

**And the perfect version of his worst case:** if the parser fights him at W12, he **says so in the group chat** and ships one telco profile perfectly instead of three that half-work. Nobody on the judging panel will ask about Jio's header format. One working profile is a finished feature; three broken ones are a bug.

### Mehul — the road the engine drives on

**Perfect looks like:** he reads `GROUND_TRUTH.md`, `roadmap.md:101` and the code-mixing note at W2 and asks his questions at W3, when Akshath has slack. `data/README.md` — the entity roster — is written early, and AKTA and Hermaine both use it.

Eight FIR narratives that **read as real**: thana names, section references, a named complainant, Latin names inside Devanagari narrative, lengths varying from four lines to two pages. He reads every one after generating it and deletes anything that says "engaged in criminal activity."

The CDR generator is **a script, not a hand-made CSV**, so he can regenerate with more noise when the graph turns out to be a hairball. He asks Shourya for the exact header names at W6 rather than guessing. And the structure gets planted properly: **the proxy kingpin ranks ~15th on degree and 1st on betweenness**, the alias pair shares an IMEI and nothing else, burst pairs and night spikes exist for Shourya's rules to catch, and there is enough ordinary noise that the analytics look like analytics instead of a diagram of the answer.

**The hour that defines his day is W10–11:** he walks his dataset through Shourya's parser, Hermaine's centrality, AKTA's resolver and Akshath's canvas, and *checks that all four planted answers actually surface.* If the kingpin isn't top-betweenness, he tunes and regenerates. That verification pass is the difference between a dataset and a proof.

Then the centrality panel, defaulting to betweenness-descending because that's the punchline, and a shared empty-state component everyone else uses instead of writing their own.

**And the honest version of perfect for him:** if he's behind at W8, **he says so.** Akshath can generate a fallback dataset in 40 minutes at W8 and cannot at W14. Saying it early costs nothing.

---

## The Five Gates That Define the Day

Everything above is detail. These five are the day.

| # | Gate | If it slips |
| :-- | :--- | :--- |
| 1 | **W2 — schemas + mocks merged, frontend unblocked** | Three frontend people idle for hours. This is the most expensive possible slip and it's entirely within Akshath's control. |
| 2 | **W6 — real graph data on real canvas** | You discover at W12 that the pipeline doesn't connect, with no time to fix it. |
| 3 | **W11 — end-to-end once, by hand** | You're integrating during the polish window and the demo has no rehearsals. |
| 4 | **🔴 W12 — AI go/no-go, decided** | Three hours burned on hope, and a live model call that fails on stage. |
| 5 | **🔴 W13 — feature freeze, enforced** | The feature added at W14 breaks the demo at W15:30. This is how most teams lose. |

---

## What Winning Actually Looks Like

Not the most features. **This sequence, run five times without a stutter:**

1. Open the vault. Status bar: *"Evidence verified · 14 documents."*
2. Ingest an FIR. Watch the hash appear and the file go read-only. Try to modify it from the app's own console. **Watch it refuse.**
3. The graph. 40 people, 3 gangs, readable — not a hairball.
4. Centrality panel. **The proxy kingpin is 1st on betweenness and 15th on degree.** *"This is the man the data says runs it, and he never speaks to the people who do the work."*
5. Click his edge. **Provenance Inspector: the FIR filename, its SHA-256, `page:2 line:9`, and the raw Devanagari line it came from.** Click the locator — the original document opens with that line highlighted.
6. Two names in the graph are one person. *"These merged because they shared a handset for two weeks in February — nothing else connects them."*
7. Scrub the timeline. Edges thicken and fade across three months. The bridge between two gangs appears in one two-week window.
8. **Export the BSA §63 certificate.** Seven sections, every hash, the reproducible SQL.
9. Modify one source file on disk. Export again. **It refuses, and names the document.**
10. *"Everything you just saw ran offline on a laptop. Nothing left the machine."*

Ten beats. Every one of them works, and every one of them looks finished.

**That is the perfect future. Everything cut goes on the Future Scope slide — and a team that can explain why it deferred a GNN sandbox reads as more serious than a team that half-built one.**
