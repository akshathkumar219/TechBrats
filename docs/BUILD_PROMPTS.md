# BUILD_PROMPTS.md — the build, in the order it happens

Every prompt in this project, **in the sequence they get sent**, with who sends
each one. Read top to bottom and you are reading the day.

**How to use this file.** Work down the file. When you reach a prompt with your
name on it, create your branch, copy the PREAMBLE (§1), paste it at the top of a
new Antigravity session, then paste your prompt under it. One prompt = one
branch = one PR.

**Antigravity runs git, but only on your word.** It creates the branch itself at
the start. Then it builds, stops, and waits. You check the thing on localhost
(`make dev`), read the diff (`git diff main --stat`, and look hard at anything
outside your own paths). Only when you reply **SHIP IT** does it commit, push and
open the PR. It never touches `main` — Akshath merges, as always.

**The one rule that keeps six agents from colliding:** your Antigravity session
works on **your steps only**. Never tell it to "work through the file" — it will
cheerfully build someone else's track into your branch. One step, one branch, one
PR, then you come back for the next one.

**What this file assumes — read `docs/CASE_MODEL.md` before anything else.**

- **The vault is the database.** Entities are markdown notes, links are
  wiki-links inside them, the graph parses the vault. No SQLite, no graph store.
- **One folder per case**, with numbered subfolders (`00_Raw_Inputs/` …
  `07_AI_Synthesis/`) and a `_Case_Index.md` memory file.
- **The AI may only write links, and only after a human accepts them.**
  Everything else is a proposal the detective applies by hand.
- **`web/src/` already exists and works** — tokens, three-pane shell, tree, CM6
  editor, live preview, wiki-links, backlinks, search. Nobody rebuilds it.

**This supersedes** `blueprint.md` §3 and `docs/architecture.md` wherever they
describe the retired graph-store design. The earlier planning docs — `prompts.md`,
`roadmap.md`, `hackathon-plan.md`, `agents.md`, `model-bakeoff.md`,
`antigravity-build-spec.md` — have been removed from the repo. They described a
design we no longer build.

---

## 0. The four messages — every task, every person

Replace everything in `<ANGLE BRACKETS>`. Same four messages for all six of you,
every single task.

### Message 1 — set up and branch

Send this once per task, at the very start of a new Antigravity session.

```
Set up git for me in this repo (github.com/akshathkumar219/TechBrats):

git config user.name "<YOUR NAME>"
git config user.email "<YOUR GITHUB EMAIL>"

Then get me onto a fresh branch off the latest main:

git checkout main
git pull origin main
git checkout -b <YOURNAME>/<TASK-ID>-<two words>

Show me `git status` and `git branch --show-current` when you are done.
Do not run any other git command.
```

Branch name is lowercase, e.g. `harleen/T03-graph-seam`, `shourya/T02-ingest`.
It's printed next to every step in this file — use that one, don't invent one.

### Message 2 — scope it to one step

```
Read docs/CASE_MODEL.md in full, then docs/tasks/<YOURNAME>.md, then find
step ▸ <N> in docs/BUILD_PROMPTS.md — the one labelled <YOURNAME> · <TASK-ID>.

Work on THAT STEP ONLY. Do not read ahead, do not start any other step, and do
not touch any file outside the ownership list for <YOURNAME> in §2 of that file,
even if another step looks unfinished or broken.

Confirm you have read all three, tell me in one line what you understand the
task to be, and wait. Do not start until I say GO.
```

It answers. If what it says back is wrong, correct it in plain English before
you let it start — that costs ten seconds and saves an hour.

### Message 3 — the preamble, then the step

Paste §1 of this file, then the step's own prompt underneath it, then `GO`.

The preamble is not optional and not a formality. It is where the agent learns
which paths you own, the six laws, the permission boundary, and that it does not
commit until you say so. Skip it and it will guess, confidently, on all four.

### Message 4 — ship it

Only after **you** have checked it: `make dev`, click the thing, confirm it does
what the step said.

```
git status

Show me that output and stop. Do not add anything yet.
```

Look at the list. One question: **is every file in it mine?** If something
isn't, say *"that file isn't mine, don't add it"* and it will drop it.

Then:

```
SHIP IT

git add <the paths I own>
git commit -m "<the commit message printed under the step>"
git push -u origin <my branch>
gh pr create --fill
```

Then post `<TASK-ID> PR up` in the group chat and **start your next task
immediately** — a fresh session, message 1 again. Don't sit waiting for the
merge.

### If something goes wrong

Talk to it in plain English — it knows the commands. *"You're on main, get off
it."* *"That PR has a conflict, pull main into my branch first."* *"Undo the
last commit but keep my changes."*

Two it must never do, no matter what it suggests: `git reset --hard` and
`git checkout .` Both silently delete uncommitted work. If it proposes either,
say no and tell Akshath.

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

MY FILES. I own exactly these paths:
  <<< PASTE YOUR OWN LIST FROM §2 HERE >>>
Do not create, edit, rename or delete anything outside that list. If a change is
needed elsewhere, stop and tell me which file and why. I will ask its owner.

RULES
- No hex codes, font sizes or spacing values. Every value is a var(--token) from
  web/src/index.css. If the token doesn't exist, ask Harleen; don't invent one.
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

GIT — YOU MAY RUN IT, WITHIN THESE LIMITS

At the START, run exactly this and nothing else:
  git checkout main
  git pull origin main
  git checkout -b <the branch name I gave you>

While working: do not commit. Build the thing, then STOP and tell me what
changed and exactly how to check it on localhost.

When I reply with the words SHIP IT, and only then:
  git status                    <- show me the output BEFORE you add anything
  git add <only the paths I own>
  git commit -m "<the exact message I give you>"
  git push -u origin <branch>
  gh pr create --fill

NEVER, under any circumstance:
- commit, push or merge to main
- git push --force
- git reset --hard, git checkout ., git clean, git stash drop
- git add a path outside my ownership list
- resolve a merge conflict on your own — stop and tell me
If a git command errors, STOP and show me the error verbatim. Do not run a
different command to work around it.
```

---

## 2. Your own line

| Person | Owns exactly | Prompt order |
| :--- | :--- | :--- |
| **Akshath** | `brain/schemas.py` `brain/mocks.py` `brain/main.py` `brain/guard.py` `brain/llm/` `brain/agents/` `brain/orchestrator.py` `brain/linker.py` `Makefile` `CLAUDE.md` `README.md` | T01 → T02 → T03 → T04 → T05 → T06 → T07 |
| **Harleen** | `web/src/index.css` `web/src/components/` `web/src/editor/` `web/src/lib/` `web/src/state/` `web/src/fs/` `web/src/proposals/` `web/public/` | ~~T01~~ → ~~T02~~ → **T03 (start here)** → T04 → T05 → T06 → T07 |
| **Hermaine** | `brain/index/` `brain/retrieval/` `web/src/copilot/` | T01 → T02 → T03 → T04 → T05 → T06 |
| **AKTA** | `web/src/graph/` `web/src/inspector/` | T01 → T02 → T03 → T04 → T05 |
| **Shourya** | `brain/vault.py` `brain/ingest/` `brain/cdr/` `brain/crosscase.py` | T01 → T02 → T03 → T04 → T05 |
| **Mehul** | `data/` `web/src/changed/` `web/src/states/` | T01 → T02 → T03 → [verify] → T04 → T05 |

**Never edit a file you don't own.** Need a change in someone else's file? Turn
your chair and ask them.

> **Already on `main`, do not rebuild:** AKS-T01, AKS-T02, HAR-T01, HAR-T02.
> Harleen starts at step ▸ 11 (HAR-T03) — read the merged `web/src/index.css`
> and the case tree before building on them. Akshath starts at step ▸ 5.

---

# BLOCK 1 · W0–W2 — setup and the contract

Only Akshath and Harleen write code here. Everyone else does the W0 setup in
§10 and reads their task file plus `CASE_MODEL.md`. Your first prompt is Block 2.

---

### ▸ 1. AKSHATH · AKS-T01 · `akshath/T01-contract` 🔴 blocks all five

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
Create your branch from main first, exactly as the preamble says, then build.
When you are finished, stop and tell me what changed and how to check it on
localhost. Do not commit or push until I reply SHIP IT.
```

> **Commit:** `AKS-T01: schemas frozen, mocks serving, FastAPI wired`

---

### ▸ 2. HARLEEN · HAR-T01 · `harleen/T01-fonts`

> Send at the same time as prompt 1. You are not blocked on Akshath.

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
Create your branch from main first, exactly as the preamble says, then build.
When you are finished, stop and tell me what changed and how to check it on
localhost. Do not commit or push until I reply SHIP IT.
```

> **Commit:** `HAR-T01: self-hosted fonts and token audit`

---

### ▸ 3. AKSHATH · AKS-T02 · `akshath/T02-guard` 🔴 blocks Shourya

```
Read docs/CASE_MODEL.md §2 Law 1.

brain/guard.py, about 40 lines:
- assert_writable(path) — raises on any path under 00_Raw_Inputs/
- safe_write(path, bytes) — calls assert_writable first
- a registry of locked paths that Shourya's ingest registers into

Then tests/test_guard.py with four bypass attempts that must ALL raise:
  direct open(path,'w') · os.rename onto a locked path · shutil.copy onto a
  locked path · symlink escape (a symlink outside the inbox pointing into it)

No force parameter. No skip_validation flag. No internal path that bypasses it.
Run pytest and show me all four passing.
Create your branch from main first, exactly as the preamble says, then build.
When you are finished, stop and tell me what changed and how to check it on
localhost. Do not commit or push until I reply SHIP IT.
```

> **Commit:** `AKS-T02: guard refuses writes to raw inputs`

---

### ▸ 4. HARLEEN · HAR-T02 · `harleen/T02-case-tree`

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

Create your branch from main first, exactly as the preamble says, then build.
When you are finished, stop and tell me what changed and how to check it on
localhost. Do not commit or push until I reply SHIP IT.
```

> **Commit:** `HAR-T02: case-folder tree with role badges`

---

> ## 🚪 GATE W2 — Akshath says out loud: *"schemas are frozen, mocks are merged, guard is in, everyone go."*
>
> If anyone is still waiting at W2:30, that is the only thing wrong with this
> project and Akshath fixes it before anything else.

---

# BLOCK 2 · W2–W3 — everyone starts

---

### ▸ 5. AKSHATH · AKS-T03 · `akshath/T03-ground-truth` 🔴 blocks Mehul

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
Create your branch from main first, exactly as the preamble says, then build.
When you are finished, stop and tell me what changed and how to check it on
localhost. Do not commit or push until I reply SHIP IT.
```

> **Commit:** `AKS-T03: ground truth planted, note and CDR templates written`

---

### ▸ 6. SHOURYA · SHO-T01 · `shourya/T01-vault`

> Agree the `Case_Config.yaml` key names with Hermaine and Akshath **before**
> you send this.

```
Read docs/CASE_MODEL.md §3 and docs/tasks/SHOURYA.md "W2-4".

NOTE: the file tree is read by the browser off disk. Do not build a tree
endpoint.

brain/vault.py:
- create_case(vault_path, case_name) writes the EXACT structure from
  CASE_MODEL.md §3 — 00_Raw_Inputs/ through 07_AI_Synthesis/, plus
  Case_Config.yaml and an empty _Case_Index.md. Exact, because Harleen's tree,
  AKTA's parser and Hermaine's index all assume these paths.
- open_case(path) validates the structure, returns metadata
- Case_Config.yaml: case id, case name, created, model provider
  (gemini | ollama), model name, resolution thresholds, tool version
- GET /api/cases returns the case list

Hermaine and Akshath both read keys from this file. Use exactly the key names I
give you and list them back to me when you're done.
Also add vaults/ to .gitignore.
Create your branch from main first, exactly as the preamble says, then build.
When you are finished, stop and tell me what changed and how to check it on
localhost. Do not commit or push until I reply SHIP IT.
```

> **Commit:** `SHO-T01: case create and open, config keys frozen`

---

### ▸ 7. HERMAINE · HER-T01 · `hermaine/T01-index` 🔴 the copilot's foundation

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

Build it against Akshath's TEMPLATE_FIR.md format. If a note doesn't parse, log
the filename loudly and skip it — never guess at malformed frontmatter.
Create your branch from main first, exactly as the preamble says, then build.
When you are finished, stop and tell me what changed and how to check it on
localhost. Do not commit or push until I reply SHIP IT.
```

> **Commit:** `HER-T01: case index builds from vault`

---

### ▸ 8. AKTA · AKT-T01 · `akta/T01-parser`

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
Create your branch from main first, exactly as the preamble says, then build.
When you are finished, stop and tell me what changed and how to check it on
localhost. Do not commit or push until I reply SHIP IT.
```

> **Commit:** `AKT-T01: vault parses into nodes and edges`

---

### ▸ 9. MEHUL · MEH-T01 · `mehul/T01-roster`

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
Create your branch from main first, exactly as the preamble says, then build.
When you are finished, stop and tell me what changed and how to check it on
localhost. Do not commit or push until I reply SHIP IT.
```

> **Commit:** `MEH-T01: entity roster and gang structure`

---

# BLOCK 3 · W3–W6 — toward the first checkpoint

---

### ▸ 10. AKSHATH · AKS-T04 · `akshath/T04-llm` 🔴 blocks your own orchestrator

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
Create your branch from main first, exactly as the preamble says, then build.
When you are finished, stop and tell me what changed and how to check it on
localhost. Do not commit or push until I reply SHIP IT.
```

> **Commit:** `AKS-T04: citation validator and provider-agnostic model client`

---

### ▸ 11. HARLEEN · HAR-T03 · `harleen/T03-graph-seam` 🔴 talk to AKTA first

```
Read design-system.md §2. TALK TO AKTA BEFORE STARTING — this is the one
integration seam in my track.

The centre pane must toggle between the markdown editor and AKTA's graph canvas
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
Create your branch from main first, exactly as the preamble says, then build.
When you are finished, stop and tell me what changed and how to check it on
localhost. Do not commit or push until I reply SHIP IT.
```

> **Commit:** `HAR-T03: graph pane toggle without remount`

---

### ▸ 12. AKTA · AKT-T02 · `akta/T02-engine`

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
- Mount into Harleen's stable container ONCE. Never remount.

Create your branch from main first, exactly as the preamble says, then build.
When you are finished, stop and tell me what changed and how to check it on
localhost. Do not commit or push until I reply SHIP IT.
```

> **Commit:** `AKT-T02: cytoscape engine renders the vault at budget`

---

### ▸ 13. SHOURYA · SHO-T02 · `shourya/T02-ingest` 🔴 the demo's opening beat

```
Read docs/tasks/SHOURYA.md "W4-8" and CASE_MODEL.md §2 Law 1. Akshath's
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
Create your branch from main first, exactly as the preamble says, then build.
When you are finished, stop and tell me what changed and how to check it on
localhost. Do not commit or push until I reply SHIP IT.
```

> **Commit:** `SHO-T02: ingest classifies, hashes, locks, records`

---

### ▸ 14. MEHUL · MEH-T02 · `mehul/T02-narratives`

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
the main case. That's Shourya's cross-case demo.
Create your branch from main first, exactly as the preamble says, then build.
When you are finished, stop and tell me what changed and how to check it on
localhost. Do not commit or push until I reply SHIP IT.
```

> **Commit:** `MEH-T02: eight FIRs, three statements, second case`

---

### ▸ 15. HERMAINE · HER-T02 · `hermaine/T02-incremental`

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
Create your branch from main first, exactly as the preamble says, then build.
When you are finished, stop and tell me what changed and how to check it on
localhost. Do not commit or push until I reply SHIP IT.
```

> **Commit:** `HER-T02: incremental index refresh with staleness detection`

---

> ## 🛑 CHECKPOINT W6 — Akshath stops the room
>
> **Must be true:** a case folder renders in the tree with role badges, the graph
> toggle swaps panes without remounting, and the index builds from real notes.
> Ugly is fine.

---

# BLOCK 4 · W6–W10 — the agent layer and the copilot

---

### ▸ 16. AKSHATH · AKS-T05 · `akshath/T05-orchestrator` 🏆 the product

```
Read docs/CASE_MODEL.md §6 in full and docs/tasks/AKSHATH.md "W6-10".

brain/orchestrator.py:
1. Loads _Case_Index.md (Hermaine's format — read it, don't rebuild it)
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

Verify: run it on Mehul's case data and show me the full AnalysisResult JSON,
plus how many proposals the validator dropped.
Create your branch from main first, exactly as the preamble says, then build.
When you are finished, stop and tell me what changed and how to check it on
localhost. Do not commit or push until I reply SHIP IT.
```

> **Commit:** `AKS-T05: orchestrator returns validated proposals`

---

### ▸ 17. HERMAINE · HER-T03 · `hermaine/T03-retrieval` 🔴 the core of your track

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
Use Akshath's brain/llm/client.py — do not write your own model call.
Every sentence goes through his validator before it returns.

Verify: ask three questions against Mehul's case, show me the answers and which
notes were retrieved for each.
Create your branch from main first, exactly as the preamble says, then build.
When you are finished, stop and tell me what changed and how to check it on
localhost. Do not commit or push until I reply SHIP IT.
```

> **Commit:** `HER-T03: two-tier retrieval with surviving citations`

---

### ▸ 18. HARLEEN · HAR-T04 · `harleen/T04-raw-inputs`

```
Read docs/CASE_MODEL.md §2 Law 1 and §3, and design-system.md §7 for copy tone.

1. A drop zone on 00_Raw_Inputs/ that calls Shourya's POST /api/ingest. Show
   the classify → hash → lock steps as they happen, not a spinner.
2. Locked files render with a lock glyph and a muted row. Showing the guarantee
   before anyone clicks is a demo beat.
3. A write attempt on a locked file surfaces the refusal as a toast, not a
   silent failure. Factual tone, never editorialising.
4. THE ANALYSE CASE BUTTON. Prominent, one per case, calls
   POST /api/case/analyse. The loading state names which agent is currently
   running — on stage, visible work reads as capability.

Create your branch from main first, exactly as the preamble says, then build.
When you are finished, stop and tell me what changed and how to check it on
localhost. Do not commit or push until I reply SHIP IT.
```

> **Commit:** `HAR-T04: ingest drop zone, locked files, analyse button`

---

### ▸ 19. MEHUL · MEH-T03 · `mehul/T03-cdr-generator`

> Ask Shourya for his exact Airtel header names first. Don't guess.

```
Read docs/tasks/MEHUL.md "W6-10" and data/GROUND_TRUTH.md.

data/generate_cdr.py — a SCRIPT, not a hand-made CSV. I'll need to regenerate
with more noise when the graph turns out to be a hairball at W10.

~25,000 rows: a_party, b_party, timestamp, duration_s, imei, cell_id. Headers
matching Shourya's Airtel profile EXACTLY. Timestamps DD/MM/YYYY HH:MM:SS over
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
Create your branch from main first, exactly as the preamble says, then build.
When you are finished, stop and tell me what changed and how to check it on
localhost. Do not commit or push until I reply SHIP IT.
```

> **Commit:** `MEH-T03: CDR generator with planted structure`

---

### ▸ 20. AKTA · AKT-T03 · `akta/T03-edge-classes` 🔴 what makes the AI honest

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

Create your branch from main first, exactly as the preamble says, then build.
When you are finished, stop and tell me what changed and how to check it on
localhost. Do not commit or push until I reply SHIP IT.
```

> **Commit:** `AKT-T03: record-derived vs AI-proposed edges, leads toggle`

---

### ▸ 21. SHOURYA · SHO-T03 · `shourya/T03-integrity`

```
On open_case, re-hash every file in 00_Raw_Inputs/ and compare to its sidecar.

GET /api/case/integrity → {"status": "verified" | "contaminated",
"failures": [...]}

Harleen's status bar renders this: green "Evidence verified · 14 documents" vs
red "⚠ 1 document modified since ingest." Match brain/mocks.py byte-for-byte,
then delete the mock, then tell her the shape.
Create your branch from main first, exactly as the preamble says, then build.
When you are finished, stop and tell me what changed and how to check it on
localhost. Do not commit or push until I reply SHIP IT.
```

> **Commit:** `SHO-T03: integrity verification on case open`

---

# BLOCK 5 · W10–W11 — the loop closes

---

### ▸ 22. AKSHATH · AKS-T06 · `akshath/T06-linker` 🔴 the permission boundary

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
Create your branch from main first, exactly as the preamble says, then build.
When you are finished, stop and tell me what changed and how to check it on
localhost. Do not commit or push until I reply SHIP IT.
```

> **Commit:** `AKS-T06: linker is the only writer of links`

---

### ▸ 23. SHOURYA · SHO-T04 · `shourya/T04-cdr`

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
  CASE_MODEL.md §4 format with citations. Write links through Akshath's
  brain/linker.py — never write to a ## Links section directly.

POST /api/cdr/load
Create your branch from main first, exactly as the preamble says, then build.
When you are finished, stop and tell me what changed and how to check it on
localhost. Do not commit or push until I reply SHIP IT.
```

> **Commit:** `SHO-T04: CDR parses to DuckDB and materialises notes`

---

### ▸ 24. HERMAINE · HER-T04 · `hermaine/T04-copilot-panel`

```
Read docs/tasks/HERMAINE.md "W10-13".

web/src/copilot/ — right-rail panel, mounts into Harleen's panel host.

- Message list, input at the bottom. Match the existing shell exactly — no new
  visual language, no new component library.
- Stream the answer if the provider supports it. On a projector, text appearing
  reads as thinking; a three-second blank panel reads as broken.
- Show which notes were retrieved for this answer, collapsed by default. Judges
  like seeing the working.
- Zero hex codes. Every colour a var(--token) from web/src/index.css.

Create your branch from main first, exactly as the preamble says, then build.
When you are finished, stop and tell me what changed and how to check it on
localhost. Do not commit or push until I reply SHIP IT.
```

> **Commit:** `HER-T04: copilot panel with streaming answers`

---

### ▸ 25. HARLEEN · HAR-T05 · `harleen/T05-proposals` 🏆 the most important UI in the build

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

Accept calls POST /api/proposal/{id}/accept — Akshath's linker writes the link.
Reject calls /reject. The card animates out either way.

FILES TO UPDATE — read-only suggestions. NO accept button. NO edit button. Text
saying what to add and where. The AI does not edit note bodies and this UI must
make that obvious at a glance.

SUMMARY — plain prose, with citation chips.

Also: a count of AI-added links somewhere visible in the shell, with a way to
see them all listed.

Build against brain/mocks.py until Akshath's real endpoint lands.
Create your branch from main first, exactly as the preamble says, then build.
When you are finished, stop and tell me what changed and how to check it on
localhost. Do not commit or push until I reply SHIP IT.
```

> **Commit:** `HAR-T05: proposal panel with accept and reject`

---

### ▸ 26. MEHUL · verification pass — **no prompt, by hand** 🔴 your most valuable hour

Sit with three people in turn:

- **Shourya** — does your data parse clean through his CDR loader? Fix
  mismatches on *your* side.
- **Akshath** — run Analyse case on your data. Does the orchestrator find the
  planted connections? Does the contradiction surface? If not, it's a data
  problem and only you can fix it.
- **AKTA** — look at the graph with your full dataset. Readable or hairball? If
  hairball, tell her whether to cut entity count or tighten the default filter.

---

> ## 🛑 CHECKPOINT W11 — Akshath stops the room
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

# BLOCK 6 · W11–W13 — to the freeze

---

### ▸ 27. MEHUL · MEH-T04 · `mehul/T04-what-changed`

```
web/src/changed/ — a self-contained React panel. Own file, one endpoint, nobody
depends on it.

After an Analyse run, show the diff at a glance:
  3 new connections proposed · 2 files to update · 1 contradiction found ·
  1 cross-case hit

Each row clickable, jumping to the relevant card in Harleen's proposal panel.
Use her exposed functions — do not edit her files.

This is the natural landing screen after pressing the button. It must read from
across a room. Styling from Harleen's tokens, no hex codes.
Create your branch from main first, exactly as the preamble says, then build.
When you are finished, stop and tell me what changed and how to check it on
localhost. Do not commit or push until I reply SHIP IT.
```

> **Commit:** `MEH-T04: what changed summary view`

---

### ▸ 28. AKTA · AKT-T04 · `akta/T04-inspector`

```
Read design-system.md §5 and docs/tasks/AKTA.md "W12-15".

web/src/inspector/ — right-rail panel, mounts into Harleen's panel host, opens
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
Create your branch from main first, exactly as the preamble says, then build.
When you are finished, stop and tell me what changed and how to check it on
localhost. Do not commit or push until I reply SHIP IT.
```

> **Commit:** `AKT-T04: edge inspector shows the raw source`

---

### ▸ 29. HARLEEN · HAR-T06 · `harleen/T06-open-file-at` 🔴 blocks AKTA and Hermaine

> **Ship at W12.** Both of them need it and neither has hours at W15. Agree the
> signature with both before you send this.

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
Create your branch from main first, exactly as the preamble says, then build.
When you are finished, stop and tell me what changed and how to check it on
localhost. Do not commit or push until I reply SHIP IT.
```

> **Commit:** `HAR-T06: openFileAt and right-rail panel host`

---

### ▸ 30. HERMAINE · HER-T05 · `hermaine/T05-citation-chips`

```
Every claim in a copilot answer carries an inline chip: source file + locator.

Clicking a chip calls Harleen's openFileAt(path, line, span) — opens the note,
scrolls, highlights the span.

An uncited sentence is DROPPED BEFORE RENDER. Use Akshath's
brain/agents/validator.py; do not write your own.

Verify: ask a question whose answer spans two notes, and click through both
chips to the right lines.
Create your branch from main first, exactly as the preamble says, then build.
When you are finished, stop and tell me what changed and how to check it on
localhost. Do not commit or push until I reply SHIP IT.
```

> **Commit:** `HER-T05: citation chips click through to source`

---

> ## ⏰ W12 — GO/NO-GO. Akshath decides, on the clock.
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

> ## 🔴 W13 — FEATURE FREEZE. Akshath enforces it.
>
> No new features from anyone, including him. Permitted from here: bug fixes,
> empty states, error states, visual polish, the reset script, the deck.
>
> Every team that loses a hackathon loses it by adding a feature at W14 that
> breaks the demo at W15:30.

---

# BLOCK 7 · W13–W16 — polish, cross-case, rehearsal

---

### ▸ 31. MEHUL · MEH-T05 · `mehul/T05-ui-states`

> First in the block — Harleen, AKTA and Hermaine all import these.

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

Export from one index. Tell the other three the moment they're available.
Create your branch from main first, exactly as the preamble says, then build.
When you are finished, stop and tell me what changed and how to check it on
localhost. Do not commit or push until I reply SHIP IT.
```

> **Commit:** `MEH-T05: shared empty, loading and error states`

---

### ▸ 32. SHOURYA · SHO-T05 · `shourya/T05-crosscase` 🔴 the feature nobody else has

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
identifier's own note (written through Akshath's linker).

Verify against Mehul's second case — the planted identifier must be the hit.
Create your branch from main first, exactly as the preamble says, then build.
When you are finished, stop and tell me what changed and how to check it on
localhost. Do not commit or push until I reply SHIP IT.
```

> **Commit:** `SHO-T05: cross-case identifier hits`

---

### ▸ 33. AKSHATH · AKS-T07 · `akshath/T07-reset`

```
`make reset` at repo root: wipes the demo case, re-ingests the synthetic case
from data/, rebuilds the index, returns to slide-one state in under 20 seconds.
Time it and show me.

Idempotent. Never touches anything outside the demo vault path.

Also a --cached flag that serves recorded responses for the exact demo path, so
a model that stalls or degrades mid-demo doesn't kill the run.
Create your branch from main first, exactly as the preamble says, then build.
When you are finished, stop and tell me what changed and how to check it on
localhost. Do not commit or push until I reply SHIP IT.
```

> **Commit:** `AKS-T07: make reset restores demo state`

---

### ▸ 34. HARLEEN · HAR-T07 · `harleen/T07-polish`

```
Read design-system.md §7. Use Mehul's components from web/src/states/ — do not
write your own.

No new features:
- Empty states for every pane: no case open, empty folder, no proposals yet, no
  search results, nothing selected
- Loading skeletons, not spinners
- Visible focus ring and hover state on every interactive element
- Copy tone: "Named as accused in 3 FIRs", never "High risk individual"

Then walk the entire UI at 1920x1080 and LIST every misalignment you find before
fixing any of them. Show me the list first.
Create your branch from main first, exactly as the preamble says, then build.
When you are finished, stop and tell me what changed and how to check it on
localhost. Do not commit or push until I reply SHIP IT.
```

> **Commit:** `HAR-T07: empty states, skeletons, focus rings`

---

### ▸ 35. AKTA · AKT-T05 · `akta/T05-focus-states`

```
- Focus mode: F on a selected node dims everything more than one hop away.
  Escape clears.
- Clicking the locator in the inspector calls Harleen's openFileAt(path, line,
  span). Do not reach into her files — call her exported function.
- States, using Mehul's shared components: no case open · case has no links yet ·
  loading skeleton · parse error, naming the file that broke it.

"Here is the connection. Here is the exact line in the original FIR it came
from." That click-through is the most persuasive fifteen seconds in the project
— make sure it never fails.
Create your branch from main first, exactly as the preamble says, then build.
When you are finished, stop and tell me what changed and how to check it on
localhost. Do not commit or push until I reply SHIP IT.
```

> **Commit:** `AKT-T05: focus mode, click-through, graph states`

---

### ▸ 36. HERMAINE · HER-T06 · `hermaine/T06-states`

```
States for the copilot, using Mehul's shared components:
- No case open
- Thinking
- Provider unreachable — say which provider and that the local one is available
- NO ANSWER FOUND

Make "I don't know" a real, well-designed answer. A copilot that says "nothing
in this case mentions that" is more impressive to a police judge than one that
always produces a paragraph. That state should look deliberate, not like an
error. Give it as much design attention as the answer state.
Create your branch from main first, exactly as the preamble says, then build.
When you are finished, stop and tell me what changed and how to check it on
localhost. Do not commit or push until I reply SHIP IT.
```

> **Commit:** `HER-T06: copilot states including a real I-dont-know`

---

> ## 🛑 CHECKPOINT W14 — Akshath stops the room
>
> **Must be true:** the full 5-minute demo runs start to finish with no
> intervention except his clicks.

---

# 10. Not for Antigravity — the human tasks

An agent will produce something plausible and wrong here, and you won't notice
until the demo.

### Everyone, at W0 — before prompt 1

- Clone, `npm install` in `web/`, `pip install -r requirements.txt`
- If using Ollama locally: `ollama pull` both models. Slow — start it first.
- **Read `docs/CASE_MODEL.md`.** All of it. It's the contract between all six of
  you.
- Read `docs/tasks/GITHUB_RULES.md` §2 and §4, confirm in the group chat
- Confirm `make dev` runs on your laptop. If one person's environment is broken,
  the whole team stops.

### Akshath, throughout

- **Before prompt 5: pick the four planted answers yourself.** Who the proxy
  kingpin is, which two names are the alias pair, which statement contradicts
  which tower ping, which identifier bridges the two cases. Demo-design
  judgments; Antigravity writes the file around them.
- **Provider is Ollama** (`provider: ollama` in `Case_Config.yaml`). Everyone
  `ollama pull`s both models tonight — impossible at the venue. Keep a Gemini key
  in the config as the parachute if local quality doesn't hold by W10.
- **Review every PR before merging.** Only merger, 10-minute turnaround.
- **Announce the schema freeze out loud** when AKS-T01 merges.
- **Run W6 / W11 / W14 yourself, on the demo laptop.**
- **Call W12 on the clock. Enforce W13.**
- **Write the 5-minute demo script** — exact click sequence, opening line,
  closing line, the sentence you say while each thing loads.
- **Rehearse 5 times minimum**, demo laptop, on battery.

### Cross-person agreements — settle these at W2, in person

| What | Between | Why |
| :--- | :--- | :--- |
| Frontmatter keys + `^[source locator]` format | Akshath → everyone | Four people parse notes |
| `Case_Config.yaml` key names | Shourya ↔ Hermaine ↔ Akshath | Provider and thresholds read from it |
| `_Case_Index.md` entry shape | Hermaine ↔ Akshath | Orchestrator reads her index |
| `AnalysisResult` shape | Akshath ↔ Harleen ↔ Mehul | Proposal panel and What Changed render it |
| Centre-pane container contract | Harleen ↔ AKTA | Canvas must not remount |
| `openFileAt` signature | Harleen ↔ AKTA ↔ Hermaine | Ship W12; neither has hours at W15 |
| Airtel CDR header names | Shourya ↔ Mehul | Generator must match parser exactly |
| The magenta AI token | AKTA ↔ Harleen | Edge and badge must be the same token |

### Judgment calls no agent should make

- **Mehul:** read every generated FIR yourself. One that says "the suspect
  engaged in criminal activity" reads as a toy on a projector.
- **Mehul:** tune the kingpin by hand against real output at W11.
- **Akshath:** read the proposals the orchestrator produces and judge whether
  they're *useful*, not just well-formed. A cited but obvious link is worse than
  no link.
- **Hermaine:** ask the copilot ten questions a detective would actually ask and
  judge the answers. Nobody else will.
- **AKTA:** decide whether the graph is readable or a hairball. That's an eye.
- **Harleen:** the 1920×1080 alignment walk. List before fixing.
- **Shourya:** break your own ingest lock by hand, three ways, after the tests
  pass.

### Escalation

Behind? Say so **early**. Akshath can re-route at W10 and cannot at W15.
Telling the room early costs nothing; telling it late costs the demo.
