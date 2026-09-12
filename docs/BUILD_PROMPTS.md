# BUILD_PROMPTS.md — the build, in the order it happens

Solo build. Every prompt, in the order you send them. Read top to bottom and you
are reading the day.

**How to run it.** Two messages per task: the scoping message (§0), then the
preamble (§1) + the step's prompt. You check it on localhost, say COMMIT, the
agent commits. No branches, no PRs — you work straight on `main`.

**Push at the end of every block.** The commits are your undo history; the push
is your offsite backup. A block is 3–5 hours of work, so if the laptop dies
between pushes, that is what you lose. Push more often if a block runs long.

**Run 2–3 sessions in parallel.** Different tasks, same repo, separate terminal
tabs. The agent doesn't need you while it builds — that's where the speed is.
Don't run two tasks that touch the same file at once.

**What this file assumes — read `docs/CASE_MODEL.md` before anything else.**

- **The vault is the database.** Entities are markdown notes, links are
  wiki-links inside them, the graph parses the vault. No SQLite, no graph store.
- **One folder per case**, with numbered subfolders (`00_Raw_Inputs/` …
  `07_AI_Synthesis/`) and a `_Case_Index.md` memory file.
- **The AI may only write links, and only after a human accepts them.**
  Everything else is a proposal the detective applies by hand.
- **Provider is Ollama**, behind a provider interface with Gemini as the
  parachute.
- **`web/src/` already exists and works** — tokens, three-pane shell, tree, CM6
  editor, live preview, wiki-links, backlinks, search. Don't rebuild it.

**This supersedes** `blueprint.md` §3 and `docs/architecture.md` wherever they
describe the retired graph-store design.

---

## 0. Two messages per task

### Message 1 — scope it

```
Read docs/CASE_MODEL.md in full, then find step ▸ <N> in
docs/BUILD_PROMPTS.md — the one labelled <TASK-ID>.

Work on THAT STEP ONLY. Do not read ahead and do not start any other step, even
if one looks unfinished or broken.

Confirm you have read both, tell me in one line what you understand the task to
be, and wait. Do not start until I say GO.
```

If what it says back is wrong, correct it in plain English before you say GO.
Ten seconds there saves an hour.

### Message 2 — the preamble, then the step

Paste §1, then the step's prompt underneath it, then `GO`.

The preamble is not a formality. It is what stops the agent inventing a
different frontmatter shape at step 20 than it used at step 7. With nobody else
reading the code, that drift is the thing most likely to quietly break you.

### Then — check it, then commit

`make dev`, click the thing, confirm it does what the step said. Then:

```
COMMIT

git add <the files this task touched>
git commit -m "<the commit message printed under the step>"
```

Glance at `git status` before you say COMMIT. You're looking for one thing:
files the task had no business touching.

**At the end of each block: `git push origin main`.**

---

## 1. PREAMBLE — paste this at the top of EVERY Antigravity session

```
CONTEXT — SyndicateBrain (SIH26189). An offline-capable criminal-investigation
workbench for Indian police. A detective keeps a case as a folder of markdown
notes, drops raw evidence into 00_Raw_Inputs/, presses "Analyse case", and an
agent layer returns New Connections, Files to Update, and a Summary. A copilot
answers questions about the case with a citation on every claim. A button swaps
the centre pane to a graph of the same vault.

Repo layout: web/ (Vite + React + TS, already built and working), brain/
(FastAPI), data/, docs/.

READ docs/CASE_MODEL.md BEFORE WRITING ANY CODE. It defines the folder
structure, the note frontmatter, the link format, the citation format and the
index file. Getting any of those wrong breaks three other people's work.

THE SIX LAWS. Every decision obeys these:
1. Evidence is immutable. Files in 00_Raw_Inputs/ are hashed, chmod 0444, and
   registered with brain/guard.py. No code path modifies them.
2. The map is deterministic; the AI only proposes. Record-derived links and
   AI-proposed links are different classes, stored and rendered differently.
3. Every link carries its reason — a source file and a locator. A link without
   one does not get written.
4. Nothing is asserted without a citation. An uncited sentence is dropped before
   the user sees it.
5. The case is temporal. Notes and links carry dates.
6. Identity is resolved conservatively — hard signals only, never name
   similarity alone.

THE PERMISSION BOUNDARY — the one rule that matters most:
The ONLY thing the AI may write into the vault is a link, and only after a human
clicks Accept. It never edits note bodies, never renames files, never touches
00_Raw_Inputs/. brain/linker.py is the single code path that writes a link.

SCOPE. Touch only the files this step is about. If a change is needed somewhere
else, stop and tell me which file and why before you touch it — I may have
another session working in there right now.

RULES
- No hex codes, font sizes or spacing values. Every value is a var(--token) from
  web/src/index.css. If the token doesn't exist, tell me and I'll add it.
- No hardcoded thresholds, model names or provider keys. They live in
  Case_Config.yaml.
- Do not invent field names, endpoint shapes, frontmatter keys or CSV column
  names. If something is ambiguous, list the ambiguity and ask me — don't guess.
- When you replace a mocked endpoint, match brain/mocks.py byte-for-byte first,
  then delete the mock.
- Do not install a package that isn't already in package.json or
  requirements.txt without telling me first. We may be offline at the venue.
- Before you say you are done: the build runs, the feature works once by hand,
  and you touched no file outside my list. Show me the command output.

GIT — WAIT FOR MY WORD

We work on main. No branches, no PRs.

While working: do not commit. Build the thing, then STOP and tell me what
changed and exactly how to check it on localhost.

When I reply with the word COMMIT, and only then:
  git status                    <- show me the output BEFORE you add anything
  git add <the files this task touched>
  git commit -m "<the exact message I give you>"

Do not push. I push at the end of each block.

NEVER, under any circumstance:
- git push --force
- git reset --hard, git checkout ., git clean, git stash drop
- git add -A without showing me git status first
- amend or rewrite a commit that already exists
If a git command errors, STOP and show me the error verbatim. Do not run a
different command to work around it.
```

---

## 2. Progress

Tick as you go. Four are already on `main`.

**Block 1 · W0–2** ✅ AKS-T01 ✅ AKS-T02 ✅ HAR-T01 ✅ HAR-T02
**Block 2 · W2–3** ✅ AKS-T03 ✅ SHO-T01 ✅ HER-T01 ✅ AKT-T01 ✅ MEH-T01
**Block 3 · W3–6** ✅ AKS-T04 ✅ HAR-T03 ✅ AKT-T02 ✅ SHO-T02 ✅ MEH-T02 ✅ HER-T02
**Block 4 · W6–10** ✅ AKS-T05 ✅ HER-T03 ✅ HAR-T04 ✅ MEH-T03 ✅ AKT-T03 ✅ SHO-T03
**Block 5 · W10–11** ✅ AKS-T06 ✅ SHO-T04 ✅ HER-T04 ✅ HAR-T05 ✅ [verify by hand]
**Block 6 · W11–13** ✅ MEH-T04 ✅ AKT-T04 ✅ HAR-T06 ✅ HER-T05
**Block 7 · W13–16** ✅ MEH-T05 ✅ SHO-T05 ✅ AKS-T07 ✅ HAR-T07 ✅ AKT-T05 ✅ HER-T06

Task IDs keep their original prefixes — they're in the commit messages and in
`docs/tasks/*.md`, so leaving them alone keeps the history greppable.

**If you fall behind, this is the cut list**, in order: focus mode · What
Changed · edge inspector raw snippet · contradiction detection · cross-case hits
· most of the polish pass. Every one goes on the Future Scope slide as a
decision with a reason.

**These four cannot be cut:** ingest that visibly refuses · Analyse returning
cited proposals · Accept writing a real link · the copilot answering with a
clickable citation.

---

# BLOCK 1 · W0–W2 — setup and the contract

Only Akshath and Harleen write code here. Everyone else does the W0 setup in
§10 and reads their task file plus `CASE_MODEL.md`. Your first prompt is Block 2.

---

### ▸ 1. AKS-T01 — contract

```
Read docs/CASE_MODEL.md in full, then docs/tasks/AKSHATH.md "W0-2 · The
contract". Do not invent fields — if something is ambiguous, ask me.

1. brain/main.py — FastAPI app, CORS to localhost:5173, routes mounted.
   requirements.txt with fastapi, uvicorn, pydantic v2, pyyaml.

2. brain/schemas.py — Pydantic v2: Entity, Link, Citation, Proposal,
   AnalysisResult, CaseIndexEntry, Doc.
   CRITICAL: Link and Proposal each carry a Citation as a required field — no
   default, not Optional. Citation carries source_doc_id: str and locator: str,
   both required. A link without a source must be impossible to construct.
   Locator format is fixed: "p:3 l:11" for documents, "row:48219" for CDR.
   Document it in the module docstring.

3. brain/mocks.py — hardcoded plausible JSON, zero logic, for:
   /api/cases, /api/case/analyse, /api/copilot/ask, /api/case/integrity,
   /api/crosscase/hits, /api/doc/{id}
   Realistic Haryana names, phone numbers, tower IDs (HR-SNP-0147). The
   /api/case/analyse mock returns a full AnalysisResult with 5 proposed
   connections, 2 files to update and a summary — the frontend builds the
   Proposal panel against this for hours.

4. Makefile at repo root: `make dev` starts uvicorn on :8000 and vite on :5173.

Verify: uvicorn starts clean, curl every endpoint, show me the output.
When you are finished, stop and tell me what changed and how to check it on
localhost. Do not commit until I reply COMMIT.
```

> **Commit:** `AKS-T01: schemas frozen, mocks serving, FastAPI wired`

---

### ▸ 2. HAR-T01 — fonts

```
Read design-system.md §1 and web/src/index.css (387 existing tokens — read them
before adding anything).

1. Self-host Inter, JetBrains Mono and Noto Sans Devanagari from the USB kit
   into web/public/fonts/. @font-face with font-display: swap. Noto Devanagari
   is NOT optional — half the FIR content is Devanagari and a fallback render
   looks broken on a projector.
2. Wire them to the existing type tokens. Don't add a token if one already fits.
3. Audit web/src/ for hardcoded hex colours, px font sizes and px spacing
   outside index.css. List every one you find, then replace with the correct
   existing token. If no token fits, tell me before inventing one.

Verify: render a code-mixed paragraph (Devanagari narrative, Latin names and
digits inline) and screenshot it. Both scripts must sit correctly on one line.
When you are finished, stop and tell me what changed and how to check it on
localhost. Do not commit until I reply COMMIT.
```

> **Commit:** `HAR-T01: self-hosted fonts and token audit`

---

### ▸ 3. AKS-T02 — guard

```
Read docs/CASE_MODEL.md §2 Law 1.

brain/guard.py, about 40 lines:
- assert_writable(path) — raises on any path under 00_Raw_Inputs/
- safe_write(path, bytes) — calls assert_writable first
- a registry of locked paths that your ingest registers into

Then tests/test_guard.py with four bypass attempts that must ALL raise:
  direct open(path,'w') · os.rename onto a locked path · shutil.copy onto a
  locked path · symlink escape (a symlink outside the inbox pointing into it)

No force parameter. No skip_validation flag. No internal path that bypasses it.
Run pytest and show me all four passing.
When you are finished, stop and tell me what changed and how to check it on
localhost. Do not commit until I reply COMMIT.
```

> **Commit:** `AKS-T02: guard refuses writes to raw inputs`

---

### ▸ 4. HAR-T02 — case tree

```
Read docs/CASE_MODEL.md §3 and §4, and the existing web/src/components/ tree.

The left rail now shows CASES, not one flat vault. Each case folder contains the
numbered subfolders 00_Raw_Inputs/ through 07_AI_Synthesis/.

- Case list at the top level, expandable into the numbered subfolders
- Type icons per folder. A person's row shows role: from frontmatter as a small
  badge — accused, witness, complainant, victim, officer. Never invent a label
  the record doesn't carry.
- Rails collapsible, widths draggable, persisted to localStorage
- Status bar: case name, evidence-verified state (GET /api/case/integrity, mock
  for now), note count, link count
- Desktop-only guard below 1280px: a clean "SyndicateBrain requires a desktop
  display" panel. Do not build responsive layouts.

When you are finished, stop and tell me what changed and how to check it on
localhost. Do not commit until I reply COMMIT.
```

> **Commit:** `HAR-T02: case-folder tree with role badges`

---

> ## 🚪 GATE W2 — say it out loud: *"schemas are frozen, mocks are merged, guard is in, everyone go."*
>
> If anyone is still waiting at W2:30, that is the only thing wrong with this
> project and Akshath fixes it before anything else.

---

> ## ⬆️ END OF BLOCK 1 — push now
>
> ```bash
> git push origin main
> ```
>
> Everything since the last push is only on this laptop until you run that.

---

# BLOCK 2 · W2–W3 — everyone starts

---

### ▸ 5. AKS-T03 — ground truth

> **Decide the four planted answers yourself, on paper, before sending this.**
> See §10.

```
Read docs/tasks/AKSHATH.md "W2-3 · Ground truth", docs/CASE_MODEL.md §4, and
architecture.md line 253 on code-mixing.

I will give you the four planted answers. Write them up; do not invent them.

data/GROUND_TRUTH.md documenting each of:
1. Proxy kingpin — who, and why he must be structurally central while
   unremarkable on call volume
2. Alias pair — the two names, the shared IMEI, the two-week window
3. Alibi contradiction — which statement, which tower ping, which timestamps
4. Cross-case identifier hit — which identifier, which two cases

Then two templates:
- data/TEMPLATE_FIR.md — one hand-written example note in the exact frontmatter
  and ## Links format from CASE_MODEL.md §4. FIR number NNNN/YYYY, a real
  Haryana thana, IPC/BNS section refs, complainant, named accused, a code-mixed
  narrative paragraph, a date.
- data/TEMPLATE_CDR.csv — Airtel-style headers, ~10 rows, DD/MM/YYYY HH:MM:SS,
  cell IDs HR-SNP-0147.

These are the contract Mehul generates 25,000 rows and 40 notes against. The
frontmatter keys and the citation format have to be exactly right.
When you are finished, stop and tell me what changed and how to check it on
localhost. Do not commit until I reply COMMIT.
```

> **Commit:** `AKS-T03: ground truth planted, note and CDR templates written`

---

### ▸ 6. SHO-T01 — vault

> Decide the `Case_Config.yaml` key names now and write them down — your index
> builder and orchestrator both read them, and changing them later is expensive.

```
Read docs/CASE_MODEL.md §3 and docs/tasks/SHOURYA.md "W2-4".

NOTE: the file tree is read by the browser off disk. Do not build a tree
endpoint.

brain/vault.py:
- create_case(vault_path, case_name) writes the EXACT structure from
  CASE_MODEL.md §3 — 00_Raw_Inputs/ through 07_AI_Synthesis/, plus
  Case_Config.yaml and an empty _Case_Index.md. Exact, because your tree,
  your parser and your index all assume these paths.
- open_case(path) validates the structure, returns metadata
- Case_Config.yaml: case id, case name, created, model provider
  (gemini | ollama), model name, resolution thresholds, tool version
- GET /api/cases returns the case list

Hermaine and Akshath both read keys from this file. Use exactly the key names I
give you and list them back to me when you're done.
Also add vaults/ to .gitignore.
When you are finished, stop and tell me what changed and how to check it on
localhost. Do not commit until I reply COMMIT.
```

> **Commit:** `SHO-T01: case create and open, config keys frozen`

---

### ▸ 7. HER-T01 — index

```
Read docs/CASE_MODEL.md §5 in full, and §4 for the note format.

brain/index/build.py:
- Walk a case folder. For every entity note, parse YAML frontmatter and body
  into one CaseIndexEntry: id, type, role, file path, names, identifiers,
  existing links, the 3-5 facts that matter, and the file's mtime.
- Write _Case_Index.md exactly as CASE_MODEL.md §5 describes — markdown with
  YAML frontmatter, grouped by folder.
- It must stay small enough to sit in a model context whole. Target under 300
  lines for an 80-note case. Report the actual line and token count.
- POST /api/index/rebuild — full rebuild, an explicit action.

Build it against your TEMPLATE_FIR.md format. If a note doesn't parse, log
the filename loudly and skip it — never guess at malformed frontmatter.
When you are finished, stop and tell me what changed and how to check it on
localhost. Do not commit until I reply COMMIT.
```

> **Commit:** `HER-T01: case index builds from vault`

---

### ▸ 8. AKT-T01 — parser

```
Read docs/CASE_MODEL.md §4 in full — the note frontmatter and the ## Links
format. Your parser is the only thing between a correct vault and a wrong graph.

web/src/graph/parse.ts — a pure function, no React, fully unit-testable:
- Every entity note becomes a node: id, type, display name, role from
  frontmatter
- Every line in a note's ## Links section becomes an edge. Parse the target,
  the reason text, the ^[source locator] citation, and the trailing
  <!-- ai:... --> marker if present.
- An edge with NO resolvable citation does not render. Log it loudly instead —
  a link without a source is a bug in whoever wrote it.
- An unresolved wiki-link (target note doesn't exist) becomes a distinct node
  style, not an error. For a detective that's a useful signal.

Write the unit tests: a well-formed note, a note with a missing citation, an
unresolved link, an AI-marked link, malformed frontmatter. Show them passing.
When you are finished, stop and tell me what changed and how to check it on
localhost. Do not commit until I reply COMMIT.
```

> **Commit:** `AKT-T01: vault parses into nodes and edges`

---

### ▸ 9. MEH-T01 — roster

> Wait for AKS-T03 to merge — you need `GROUND_TRUTH.md` and both templates.

```
Read data/GROUND_TRUTH.md, data/TEMPLATE_FIR.md, data/TEMPLATE_CDR.csv, and
docs/CASE_MODEL.md §4 TWICE. Frontmatter keys, the ## Links section, the
^[source locator] citation format. Get this wrong and the graph is empty.

Target: 3 gangs, ~40 people, ~60 identifiers, 8 FIRs, 3 statements, 2 tower
dumps, ~25,000 CDR rows, plus a second small case carrying the cross-case hit.

Write data/README.md — the entity roster. Every person, their identifiers, gang,
aliases, vehicles. Everyone on the team reads this document.

~40 realistic Haryana/Punjab names. Some genuinely similar (Vikram Singh /
Vikram Sing / V. Singh), some sharing a first name across gangs. ~60 identifiers
in valid Indian mobile format, canonical 10 digits. 3 gangs, overlapping but
distinct, plus the cross-gang bridge node from GROUND_TRUTH.md.

Do NOT make the planted answers obvious in this file. It's a cast list, not a
solution key.
When you are finished, stop and tell me what changed and how to check it on
localhost. Do not commit until I reply COMMIT.
```

> **Commit:** `MEH-T01: entity roster and gang structure`

---

> ## ⬆️ END OF BLOCK 2 — push now
>
> ```bash
> git push origin main
> ```
>
> Everything since the last push is only on this laptop until you run that.

---

# BLOCK 3 · W3–W6 — toward the first checkpoint

---

### ▸ 10. AKS-T04 — llm

> Build the validator **before** the client. It ships whether or not the model
> cooperates.

```
Read docs/CASE_MODEL.md §7 and docs/tasks/AKSHATH.md "W3-6".

In this order:

1. brain/agents/validator.py FIRST — deterministic Python, no model. Parses
   generated output, drops every sentence lacking a resolvable ^[source_id],
   returns only what survives plus a list of what it dropped. This is Law 4 in
   code and it must exist even if all the model work slips.

2. brain/llm/client.py as a PROVIDER INTERFACE, not an Ollama client. One
   abstract class, two implementations: Ollama (the DEFAULT — provider: ollama)
   and Gemini Flash. Which one runs is a key in Case_Config.yaml, nothing else
   changes. Both must work: local is what we ship and demo, Gemini is the
   parachute if local output is unusable.
   JSON mode, temperature 0, Pydantic validation against the target schema,
   exactly 1 retry, warmup() at app start.

3. A smoke test that runs the same prompt through both providers and asserts
   both return a schema-valid object.

Verify: the validator drops an uncited sentence from a hand-written test input.
Show me that, then the provider smoke test.
When you are finished, stop and tell me what changed and how to check it on
localhost. Do not commit until I reply COMMIT.
```

> **Commit:** `AKS-T04: citation validator and provider-agnostic model client`

---

### ▸ 11. HAR-T03 — graph seam

```
Read design-system.md §2. This is the one integration seam between the shell and
the graph — get the container contract right now, not at step 12.

The centre pane must toggle between the markdown editor and your graph canvas
WITHOUT remounting either. If the canvas remounts, the layout re-runs and the
graph jumps.

Keep both mounted. Toggle visibility with the `hidden` attribute, never with
conditional rendering or a display:none style prop.

Provide one stable container div her engine attaches to once, at mount, and
never again. Give her the ref shape she asks for. Do not import from or edit
web/src/graph/.

Add the toggle control itself — a clear button in the title bar, not a hidden
shortcut. Judges need to see it being pressed.

Verify: switch panes ten times, confirm node positions are pixel-identical
before and after.
When you are finished, stop and tell me what changed and how to check it on
localhost. Do not commit until I reply COMMIT.
```

> **Commit:** `HAR-T03: graph pane toggle without remount`

---

### ▸ 12. AKT-T02 — engine

```
Read docs/tasks/AKTA.md "W5-9" and design-system.md §4.

web/src/graph/engine.ts — Cytoscape + cose-bilkent, fed by your parser.

Non-negotiable:
- Fixed layout seed. The same vault must produce the identical picture every
  run. This gets demoed five times and judges notice if it jumps.
- Render budget BEFORE styling. Target 2,000 nodes / 8,000 edges at interactive
  pan-zoom: hideEdgesOnViewport: true, textureOnViewport: true, pixelRatio: 1,
  and a default filter to top-N by degree with the rest behind "show all".
  Benchmark on a generated 2,000-node fixture, not the 20-node mock. Report
  frame timings.
- Expose exactly this API so nobody else opens this file: focusNode(id),
  applyFilter(pred), setSelection(ids), fitTo(ids), plus a selection-change
  event others subscribe to.
- Mount into your stable container ONCE. Never remount.

When you are finished, stop and tell me what changed and how to check it on
localhost. Do not commit until I reply COMMIT.
```

> **Commit:** `AKT-T02: cytoscape engine renders the vault at budget`

---

### ▸ 13. SHO-T02 — ingest

```
Read docs/tasks/SHOURYA.md "W4-8" and CASE_MODEL.md §2 Law 1. your
brain/guard.py is merged — call into it, don't reimplement it.

Pipeline in THIS EXACT ORDER. The order is the guarantee.
1. Classify — extension plus header sniff → FIR | CDR | TowerDump | Statement |
   FieldLog. Header sniff matters: a CDR arrives as .xlsx, .csv or .txt
   depending on the telco.
2. SHA-256 the file BEFORE it moves. Hash the original bytes, not the copy.
3. Copy into 00_Raw_Inputs/<type>/ with a sidecar <filename>.sha256
4. Lock — chmod 0444 AND register the path with guard.py. Both, not either.
5. Write the Doc record — id, filename, type, sha256, ingest timestamp,
   original path. Every citation in the case points at one of these.

POST /api/ingest accepts a file, runs the pipeline, returns the Doc.

Then try to break it yourself: after ingest, attempt to append a byte with
open(), with os.rename, and with shutil.copy. Show me all three failing.
When you are finished, stop and tell me what changed and how to check it on
localhost. Do not commit until I reply COMMIT.
```

> **Commit:** `SHO-T02: ingest classifies, hashes, locks, records`

---

### ▸ 14. MEH-T02 — narratives

> Read every generated FIR yourself afterwards. See §10.

```
Read data/TEMPLATE_FIR.md, data/README.md, docs/CASE_MODEL.md §4, and
architecture.md line 253.

Write 8 FIR narratives as notes in the exact CASE_MODEL.md §4 format —
frontmatter, body, ## Links with ^[source locator] citations. Each needs an FIR
number NNNN/YYYY, a real Haryana thana (Kharkhoda, Gohana, Sonipat Sadar, Rai,
Ganaur), IPC/BNS section references, a complainant, named accused, a code-mixed
narrative paragraph, and a date.

- VARY THE LENGTH. Real FIRs run four lines to two pages.
- Names in LATIN script inside DEVANAGARI narrative. A clean all-Devanagari set
  flatters us and teaches us nothing.
- Every narrative says WHO, WHEN, WHERE, WHICH SECTION, WHICH PHONE. An FIR that
  says "the suspect engaged in criminal activity" is worse than nothing.

Then 3 witness statements — one carries the alibi contradiction from
GROUND_TRUTH.md, exactly as that file specifies.

Then a SECOND case folder with 6-8 notes, sharing exactly one identifier with
the main case. That's your cross-case demo.
When you are finished, stop and tell me what changed and how to check it on
localhost. Do not commit until I reply COMMIT.
```

> **Commit:** `MEH-T02: eight FIRs, three statements, second case`

---

### ▸ 15. HER-T02 — incremental

> Skip this and the demo breaks silently. It's the highest-risk thing in your
> track.

```
Read docs/CASE_MODEL.md §5 on staleness.

The failure mode: a detective edits a note by hand, the index still describes
the old version, and the copilot answers from a stale line.

- On copilot open, compare each index entry's stored mtime against the file on
  disk. Any file newer than its entry gets re-read and THAT ENTRY ALONE
  rebuilt. Never the whole index mid-session.
- A deleted file drops its entry. A new file gets one.
- Benchmark it: this runs on every copilot open, so it must be imperceptible.
  Under 200ms for an 80-note case. Show me the number.

Write the test: build an index, touch one note, refresh, assert exactly one
entry changed and the others kept their original values byte-for-byte.
When you are finished, stop and tell me what changed and how to check it on
localhost. Do not commit until I reply COMMIT.
```

> **Commit:** `HER-T02: incremental index refresh with staleness detection`

---

> ## 🛑 CHECKPOINT W6 — stop and check
>
> **Must be true:** a case folder renders in the tree with role badges, the graph
> toggle swaps panes without remounting, and the index builds from real notes.
> Ugly is fine.

---

> ## ⬆️ END OF BLOCK 3 — push now
>
> ```bash
> git push origin main
> ```
>
> Everything since the last push is only on this laptop until you run that.

---

# BLOCK 4 · W6–W10 — the agent layer and the copilot

---

### ▸ 16. AKS-T05 — orchestrator

```
Read docs/CASE_MODEL.md §6 in full and docs/tasks/AKSHATH.md "W6-10".

brain/orchestrator.py:
1. Loads _Case_Index.md (your format — read it, don't rebuild it)
2. Fans out to per-folder reader agents — People, Events, Locations,
   Identifiers, Organisations — each getting the relevant slice of the index
   plus the new raw input
3. Collects proposals, runs every one through brain/agents/validator.py
4. Returns one AnalysisResult: new_connections[], files_to_update[], summary

Specialist agents as PROMPTS in brain/agents/, not as systems:
- connection_finder.py — proposes links, each with a reason and a citation
- contradiction.py — a statement that conflicts with a tower ping or another
  statement

Every proposal carries: the claim, the reason, the source file, the locator, and
the model's confidence. A proposal without a resolvable citation is dropped by
the validator and counted, not returned.

POST /api/case/analyse — this is what the Analyse case button calls. Match
brain/mocks.py byte-for-byte, then delete the mock.

Verify: run it on your case data and show me the full AnalysisResult JSON,
plus how many proposals the validator dropped.
When you are finished, stop and tell me what changed and how to check it on
localhost. Do not commit until I reply COMMIT.
```

> **Commit:** `AKS-T05: orchestrator returns validated proposals`

---

### ▸ 17. HER-T03 — retrieval

```
Read docs/CASE_MODEL.md §5 and docs/tasks/HERMAINE.md "W7-10".

brain/retrieval/ — two-tier:
- Tier 1: the whole _Case_Index.md into context, every question. It's small.
- Tier 2: from the index, select the 3-5 notes the question actually needs, read
  them in full, build the context pack.
- Hard cap the pack and SAY SO in the response when you truncate. A silently
  truncated context is an answer confidently missing half the case.
- Every retrieved chunk keeps its source path and line offsets. The citation
  chips are built from these, so they must survive retrieval intact.

POST /api/copilot/ask → { answer, citations[], notes_retrieved[] }
Use your brain/llm/client.py — do not write your own model call.
Every sentence goes through his validator before it returns.

Verify: ask three questions against your case, show me the answers and which
notes were retrieved for each.
When you are finished, stop and tell me what changed and how to check it on
localhost. Do not commit until I reply COMMIT.
```

> **Commit:** `HER-T03: two-tier retrieval with surviving citations`

---

### ▸ 18. HAR-T04 — raw inputs

```
Read docs/CASE_MODEL.md §2 Law 1 and §3, and design-system.md §7 for copy tone.

1. A drop zone on 00_Raw_Inputs/ that calls your POST /api/ingest. Show
   the classify → hash → lock steps as they happen, not a spinner.
2. Locked files render with a lock glyph and a muted row. Showing the guarantee
   before anyone clicks is a demo beat.
3. A write attempt on a locked file surfaces the refusal as a toast, not a
   silent failure. Factual tone, never editorialising.
4. THE ANALYSE CASE BUTTON. Prominent, one per case, calls
   POST /api/case/analyse. The loading state names which agent is currently
   running — on stage, visible work reads as capability.

When you are finished, stop and tell me what changed and how to check it on
localhost. Do not commit until I reply COMMIT.
```

> **Commit:** `HAR-T04: ingest drop zone, locked files, analyse button`

---

### ▸ 19. MEH-T03 — cdr generator

> Ask Shourya for his exact Airtel header names first. Don't guess.

```
Read docs/tasks/MEHUL.md "W6-10" and data/GROUND_TRUTH.md.

data/generate_cdr.py — a SCRIPT, not a hand-made CSV. I'll need to regenerate
with more noise when the graph turns out to be a hairball at W10.

~25,000 rows: a_party, b_party, timestamp, duration_s, imei, cell_id. Headers
matching your Airtel profile EXACTLY. Timestamps DD/MM/YYYY HH:MM:SS over
~3 months. Cell IDs HR-SNP-0147 format, ~15 towers, plausible clusters.

Plant the structure from GROUND_TRUTH.md:
- PROXY KINGPIN: talks only to 2-3 lieutenants, never the hitmen. Modest volume.
  Must rank ~15th by call count and 1st by structural centrality. The single
  most important number in the dataset.
- ALIAS PAIR: two numbers that NEVER call each other, sharing an IMEI for a
  two-week window. That overlap is the ONLY signal. Nothing else may give it
  away.
- NOISE: everyone makes ordinary calls to non-suspects. Without noise the graph
  is a clean diagram of the answer and the analysis looks trivial.

Also 2 tower dumps — CDR subsets by cell_id, including the ping that
contradicts the statement alibi.

data/GENERATION_NOTES.md — what you planted, where, and the row numbers.
When you are finished, stop and tell me what changed and how to check it on
localhost. Do not commit until I reply COMMIT.
```

> **Commit:** `MEH-T03: CDR generator with planted structure`

---

### ▸ 20. AKT-T03 — edge classes

```
Read docs/CASE_MODEL.md §2 Law 2 and design-system.md §4. This is not optional
polish — it's the thing that makes the graph falsifiable.

Two visually distinct edge classes:
- RECORD-DERIVED — parsed from a CDR row or an FIR line, or written by a human.
  Solid, amber, full weight.
- AI-PROPOSED — carrying an <!-- ai:... --> marker. Dashed, magenta, distinct at
  a glance from across a room.

Plus a LEADS LAYER TOGGLE that hides every AI-derived edge. Pressing it on stage
and watching the graph thin out is a fifteen-second answer to "how much of this
did the machine make up?"

web/src/graph/styles.ts — node shape, colour and size by entity type; edge style
by class. Every value a var(--token). ZERO hex codes. Use the same magenta token
the proposal card uses, so the edge and the badge visibly agree.

When you are finished, stop and tell me what changed and how to check it on
localhost. Do not commit until I reply COMMIT.
```

> **Commit:** `AKT-T03: record-derived vs AI-proposed edges, leads toggle`

---

### ▸ 21. SHO-T03 — integrity

```
On open_case, re-hash every file in 00_Raw_Inputs/ and compare to its sidecar.

GET /api/case/integrity → {"status": "verified" | "contaminated",
"failures": [...]}

your status bar renders this: green "Evidence verified · 14 documents" vs
red "⚠ 1 document modified since ingest." Match brain/mocks.py byte-for-byte,
then delete the mock.
When you are finished, stop and tell me what changed and how to check it on
localhost. Do not commit until I reply COMMIT.
```

> **Commit:** `SHO-T03: integrity verification on case open`

---

> ## ⬆️ END OF BLOCK 4 — push now
>
> ```bash
> git push origin main
> ```
>
> Everything since the last push is only on this laptop until you run that.

---

# BLOCK 5 · W10–W11 — the loop closes

---

### ▸ 22. AKS-T06 — linker

```
Read docs/CASE_MODEL.md §6 "The permission boundary" and §4 on link format.

brain/linker.py — the SINGLE code path that writes a link into a note. Nothing
else in the codebase writes to a note's ## Links section, ever.

- Refuses any link without a resolvable citation. No force flag, no
  skip_validation, no internal bypass.
- Writes into the note's ## Links section: the wiki-link, the reason, the
  ^[source locator] citation inline, and a trailing
  <!-- ai:<proposal_id> accepted --> marker.
- Writes both directions where the relationship is symmetric.
- Never touches the note body. Never renames. Never touches 00_Raw_Inputs/.
- Rejected proposals append to 07_AI_Synthesis/decisions.jsonl with the full
  proposal, the reason, and a timestamp. Never re-propose an identical one.

POST /api/proposal/{id}/accept and POST /api/proposal/{id}/reject

Verify: accept a proposal, show me the note diff. Then try to write a link with
a missing citation and show it refusing.
When you are finished, stop and tell me what changed and how to check it on
localhost. Do not commit until I reply COMMIT.
```

> **Commit:** `AKS-T06: linker is the only writer of links`

---

### ▸ 23. SHO-T04 — cdr

```
Read docs/tasks/SHOURYA.md "W10-13" and data/TEMPLATE_CDR.csv.

- Column-mapping profile in YAML. Airtel first, exactly matching the template.
- Load into DuckDB, not pandas-in-memory.
- Normalise phone numbers ONCE at load: strip +91, leading 0, spaces, dashes →
  canonical 10 digits. Un-normalised numbers are the most common cause of a
  graph that silently has two nodes for one phone.
- Timestamps UTC-aware. Indian CDR uses DD/MM/YYYY HH:MM:SS — WATCH THE
  DAY/MONTH ORDER. A US-style parse shifts the whole timeline silently.
- Every row keeps a stable row:N index — that's the locator every citation uses.
  Write a test that loads twice and asserts identical row numbers.
- MATERIALISE NOTES: create/update 02_Identifiers/<number>.md per distinct
  number, and 06_Events/ notes for significant call clusters, in the exact
  CASE_MODEL.md §4 format with citations. Write links through your
  brain/linker.py — never write to a ## Links section directly.

POST /api/cdr/load
When you are finished, stop and tell me what changed and how to check it on
localhost. Do not commit until I reply COMMIT.
```

> **Commit:** `SHO-T04: CDR parses to DuckDB and materialises notes`

---

### ▸ 24. HER-T04 — copilot panel

```
Read docs/tasks/HERMAINE.md "W10-13".

web/src/copilot/ — right-rail panel, mounts into your panel host.

- Message list, input at the bottom. Match the existing shell exactly — no new
  visual language, no new component library.
- Stream the answer if the provider supports it. On a projector, text appearing
  reads as thinking; a three-second blank panel reads as broken.
- Show which notes were retrieved for this answer, collapsed by default. Judges
  like seeing the working.
- Zero hex codes. Every colour a var(--token) from web/src/index.css.

When you are finished, stop and tell me what changed and how to check it on
localhost. Do not commit until I reply COMMIT.
```

> **Commit:** `HER-T04: copilot panel with streaming answers`

---

### ▸ 25. HAR-T05 — proposals

```
Read docs/CASE_MODEL.md §6 "Proposals" and docs/tasks/HARLEEN.md "W8-12".

web/src/proposals/ — renders an AnalysisResult in three sections: New
Connections, Files to Update, Summary.

NEW CONNECTIONS — each is a card:
- What it claims, in one line
- Why — the reason text
- The source file and locator as a CLICKABLE CHIP
- The model's confidence
- ACCEPT and REJECT buttons

Accept calls POST /api/proposal/{id}/accept — your linker writes the link.
Reject calls /reject. The card animates out either way.

FILES TO UPDATE — read-only suggestions. NO accept button. NO edit button. Text
saying what to add and where. The AI does not edit note bodies and this UI must
make that obvious at a glance.

SUMMARY — plain prose, with citation chips.

Also: a count of AI-added links somewhere visible in the shell, with a way to
see them all listed.

Build against brain/mocks.py until your real endpoint lands.
When you are finished, stop and tell me what changed and how to check it on
localhost. Do not commit until I reply COMMIT.
```

> **Commit:** `HAR-T05: proposal panel with accept and reject`

---

### ▸ 26. Verification pass — **by hand, no prompt**

Sit with three people in turn:

- Does your data parse clean through his CDR loader? Fix
  mismatches on *your* side.
- Run Analyse case on your data. Does the orchestrator find the
  planted connections? Does the contradiction surface? If not, it's a data
  problem and only you can fix it.
- Look at the graph with your full dataset. Readable or hairball? If
  hairball, decide whether to cut entity count or tighten the default filter.

---

> ## 🛑 CHECKPOINT W11 — stop and check
>
> **Must be true, once, by hand, on the demo laptop:** drop a file in
> `00_Raw_Inputs/` → press Analyse → proposals appear with citations → accept
> one → the link is in the note **and** on the graph.
>
> When something is on fire here, the question is never "what do we cut?" It is
> **"are these four safe?"** — ingest that visibly refuses · Analyse returning
> cited proposals · Accept writing a real link · the copilot answering with a
> clickable citation.

---

> ## ⬆️ END OF BLOCK 5 — push now
>
> ```bash
> git push origin main
> ```
>
> Everything since the last push is only on this laptop until you run that.

---

# BLOCK 6 · W11–W13 — to the freeze

---

### ▸ 27. MEH-T04 — what changed

```
web/src/changed/ — a self-contained React panel. Own file, one endpoint, nobody
depends on it.

After an Analyse run, show the diff at a glance:
  3 new connections proposed · 2 files to update · 1 contradiction found ·
  1 cross-case hit

Each row clickable, jumping to the relevant card in your proposal panel.
Use her exposed functions — do not edit her files.

This is the natural landing screen after pressing the button. It must read from
across a room. Styling from your tokens, no hex codes.
When you are finished, stop and tell me what changed and how to check it on
localhost. Do not commit until I reply COMMIT.
```

> **Commit:** `MEH-T04: what changed summary view`

---

### ▸ 28. AKT-T04 — inspector

```
Read design-system.md §5 and docs/tasks/AKTA.md "W12-15".

web/src/inspector/ — right-rail panel, mounts into your panel host, opens
on edge selection. Subscribe to your own engine's selection event.

Shows:
- The claim and the reason
- Source document: filename, type badge, ingest timestamp
- Locator, as "p:3 l:11" or "row:48219"
- THE RAW SOURCE SNIPPET — monospace, ±2 lines of context, matched span
  highlighted. Raw: not paraphrased, not translated, not cleaned. That rawness
  IS the guarantee.
- Whether the edge is record-derived or AI-accepted, and if AI-accepted, when
- Evidentiary status badge using the same tokens as your edge styles

Zero hex codes.
When you are finished, stop and tell me what changed and how to check it on
localhost. Do not commit until I reply COMMIT.
```

> **Commit:** `AKT-T04: edge inspector shows the raw source`

---

### ▸ 29. HAR-T06 — open file at

> **Do this before steps 30 and 35** — both call into it.

```
Two exports, from one clearly named module:

1. openFileAt(path: string, line: number, span?: [number, number])
   Opens the file in the editor, scrolls to the line, highlights the span. Works
   whether or not the file is currently open, and whether or not the editor is
   the visible centre pane (switch it if not).

2. A right-rail panel host, so the copilot, the edge inspector and the proposal
   panel mount into the rail without any of them editing my layout files.

Document both signatures in a comment block at the top. Do not change them after
W13 — three people call them.

Verify: call openFileAt on a closed file while the graph pane is showing, and
confirm it switches panes, opens, scrolls and highlights.
When you are finished, stop and tell me what changed and how to check it on
localhost. Do not commit until I reply COMMIT.
```

> **Commit:** `HAR-T06: openFileAt and right-rail panel host`

---

### ▸ 30. HER-T05 — citation chips

```
Every claim in a copilot answer carries an inline chip: source file + locator.

Clicking a chip calls your openFileAt(path, line, span) — opens the note,
scrolls, highlights the span.

An uncited sentence is DROPPED BEFORE RENDER. Use your
brain/agents/validator.py; do not write your own.

Verify: ask a question whose answer spans two notes, and click through both
chips to the right lines.
When you are finished, stop and tell me what changed and how to check it on
localhost. Do not commit until I reply COMMIT.
```

> **Commit:** `HER-T05: citation chips click through to source`

---

> ## ⏰ W12 — GO/NO-GO. decide, on the clock.
>
> One question: **has the orchestrator returned a schema-valid `AnalysisResult`
> with resolvable citations, once, on real case data?**
>
> **No → fallback immediately.** Hand-write two analysis results into
> `07_AI_Synthesis/` and demo them. Say: *"the orchestrator and the citation
> validator are built; we're running the model out-of-process for time."* Every
> word true. Decide at W12, not W15.
>
> We are on Ollama, so the demo is fully offline — no wifi dependency. Confirm
> `warmup()` runs at app start, or your first call on stage is a 40-second cold
> load. If local output is unusable, flipping to Gemini is one config key.

---

> ## 🔴 W13 — FEATURE FREEZE. enforce it on yourself.
>
> No new features from anyone, including him. Permitted from here: bug fixes,
> empty states, error states, visual polish, the reset script, the deck.
>
> Every team that loses a hackathon loses it by adding a feature at W14 that
> breaks the demo at W15:30.

---

> ## ⬆️ END OF BLOCK 6 — push now
>
> ```bash
> git push origin main
> ```
>
> Everything since the last push is only on this laptop until you run that.

---

# BLOCK 7 · W13–W16 — polish, cross-case, rehearsal

---

### ▸ 31. MEH-T05 — ui states

> First in the block — steps 34, 35 and 36 all import these.

```
Read design-system.md §7 for copy tone.

web/src/states/ — shared components everyone imports instead of writing their
own:
- <EmptyState> — icon, headline, one line of body, optional action
- <LoadingSkeleton> — shaped placeholders, not spinners
- <ErrorState> — for failed calls

Copy tone: "Named as accused in 3 FIRs", never "High risk individual". The
product reports what the record says; it never editorialises about people. That
rule holds in empty-state copy too.

Export from one index.
When you are finished, stop and tell me what changed and how to check it on
localhost. Do not commit until I reply COMMIT.
```

> **Commit:** `MEH-T05: shared empty, loading and error states`

---

### ▸ 32. SHO-T05 — crosscase

```
Read docs/tasks/SHOURYA.md "W13-16".

brain/crosscase.py — scan 02_Identifiers/ across EVERY case folder in the vault.
The same phone, IMEI, account or vehicle registration appearing in more than one
case is a hit.

GET /api/crosscase/hits → for each: the identifier, the cases it appears in, and
the note paths.

DETERMINISTIC. No model. Exact match on normalised values only — a fuzzy
cross-case hit is a wrongful lead and there's no reason to risk it.

Surface it in two places: in the AnalysisResult, and as a line in the
identifier's own note (written through your linker).

Verify against your second case — the planted identifier must be the hit.
When you are finished, stop and tell me what changed and how to check it on
localhost. Do not commit until I reply COMMIT.
```

> **Commit:** `SHO-T05: cross-case identifier hits`

---

### ▸ 33. AKS-T07 — reset

```
`make reset` at repo root: wipes the demo case, re-ingests the synthetic case
from data/, rebuilds the index, returns to slide-one state in under 20 seconds.
Time it and show me.

Idempotent. Never touches anything outside the demo vault path.

Also a --cached flag that serves recorded responses for the exact demo path, so
a model that stalls or degrades mid-demo doesn't kill the run.
When you are finished, stop and tell me what changed and how to check it on
localhost. Do not commit until I reply COMMIT.
```

> **Commit:** `AKS-T07: make reset restores demo state`

---

### ▸ 34. HAR-T07 — polish

```
Read design-system.md §7. Use your components from web/src/states/ — do not
write your own.

No new features:
- Empty states for every pane: no case open, empty folder, no proposals yet, no
  search results, nothing selected
- Loading skeletons, not spinners
- Visible focus ring and hover state on every interactive element
- Copy tone: "Named as accused in 3 FIRs", never "High risk individual"

Then walk the entire UI at 1920x1080 and LIST every misalignment you find before
fixing any of them. Show me the list first.
When you are finished, stop and tell me what changed and how to check it on
localhost. Do not commit until I reply COMMIT.
```

> **Commit:** `HAR-T07: empty states, skeletons, focus rings`

---

### ▸ 35. AKT-T05 — focus states

```
- Focus mode: F on a selected node dims everything more than one hop away.
  Escape clears.
- Clicking the locator in the inspector calls your openFileAt(path, line,
  span). Do not reach into her files — call her exported function.
- States, using your shared components: no case open · case has no links yet ·
  loading skeleton · parse error, naming the file that broke it.

"Here is the connection. Here is the exact line in the original FIR it came
from." That click-through is the most persuasive fifteen seconds in the project
— make sure it never fails.
When you are finished, stop and tell me what changed and how to check it on
localhost. Do not commit until I reply COMMIT.
```

> **Commit:** `AKT-T05: focus mode, click-through, graph states`

---

### ▸ 36. HER-T06 — states

```
States for the copilot, using your shared components:
- No case open
- Thinking
- Provider unreachable — say which provider and that the local one is available
- NO ANSWER FOUND

Make "I don't know" a real, well-designed answer. A copilot that says "nothing
in this case mentions that" is more impressive to a police judge than one that
always produces a paragraph. That state should look deliberate, not like an
error. Give it as much design attention as the answer state.
When you are finished, stop and tell me what changed and how to check it on
localhost. Do not commit until I reply COMMIT.
```

> **Commit:** `HER-T06: copilot states including a real I-dont-know`

---

> ## 🛑 CHECKPOINT W14 — stop and check
>
> **Must be true:** the full 5-minute demo runs start to finish with no
> intervention except his clicks.

---

> ## ⬆️ END OF BLOCK 7 — push now
>
> ```bash
> git push origin main
> ```

---

# 10. Not for Antigravity — the human tasks

An agent will produce something plausible and wrong here, and you won't notice
until the demo. Running solo, nobody else will catch it either.

### Before step 5 — the four planted answers

Decide these yourself, on paper, before you send the ground-truth prompt. It's
the one step in the build with a human prerequisite and no fallback.

1. **Proxy kingpin** — which name, and who his 2–3 lieutenants are
2. **Alias pair** — the two names and the IMEI they share
3. **Alibi contradiction** — which witness says they were where, and which tower
   ping says otherwise
4. **Cross-case hit** — which phone or IMEI appears in both cases

Paste them into the prompt where it says *"I will give you the four planted
answers."*

### Judgment calls the agent cannot make

- **Read every generated FIR yourself.** One that says "the suspect engaged in
  criminal activity" reads as a toy on a projector. It must say who, when,
  where, which section, which phone.
- **Tune the kingpin by hand at step 26.** He must be unremarkable on call
  volume and first on structural centrality. If he isn't, regenerate.
- **Judge whether the proposals are *useful*, not just well-formed.** A cited
  but obvious link is worse than no link.
- **Ask the copilot ten questions a detective would actually ask** and read the
  answers properly.
- **Decide whether the graph is readable or a hairball.** That's an eye, not a
  test.
- **Break your own ingest lock by hand**, three ways, after the tests pass.

### The clock

- **W6 / W11 / W14** — stop building, run the checkpoint on the demo laptop.
  Timebox 15 minutes. Write down what broke before fixing anything.
- **W12** — GO/NO-GO on the model. One question: has the orchestrator returned a
  schema-valid AnalysisResult with resolvable citations, once, on real data? No
  means take the fallback immediately.
- **W13** — feature freeze. From here: bug fixes, empty states, polish, reset
  script, deck. Nothing new.

### The last three hours

- `make reset` working and timed
- The 5-minute demo script written down — exact click sequence, opening line,
  closing line, the sentence you say while each thing loads
- **Rehearse 5 times.** Demo laptop, on battery. On Ollama the demo is fully
  offline, but confirm `warmup()` runs at app start or your first call on stage
  is a 40-second cold load.
- Deck via `populate_slides.py`. Everything cut goes on Future Scope as a
  decision with a reason.

### Sleep

Nobody else is building. The project stops when you stop — so plan when you go
down and what state `main` is in before you do. Ideally the four-that-cannot-slip
are working and pushed, so a bad night costs polish, not the demo.
