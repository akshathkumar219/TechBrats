# CASE_MODEL.md — the architecture of record

**This file supersedes `blueprint.md` §3 and `docs/architecture.md` wherever they
disagree.** Those documents describe the earlier design (SQLite graph store,
provenance writer, BSA §63 certificate). That design is retired. The Six Laws in
`blueprint.md` §2 still hold — they are restated below in the form they now take.

---

## 1. What the product is

An offline-capable investigation workbench for police. A detective keeps a case
as a folder of markdown notes. They drop raw evidence into `00_Raw_Inputs/`,
press **Analyse case**, and an agent layer reads the case and returns three
things:

1. **New Connections** — proposed links between entities, each with its reason
   and source line
2. **Files to Update** — notes the agent believes are out of date, and what to
   add. *It does not edit them.*
3. **Summary** — what changed in the case since the last run

A copilot in the right rail answers questions about the case from its own notes,
with a citation chip on every claim. A button swaps the centre pane to a graph
view of the same vault.

**The vault is the database.** There is no separate graph store. Entities are
markdown files; links are wiki-links inside them; the graph view parses the
vault. This caps us at a few hundred entities per case, which is far beyond the
demo and an honest Future Scope line.

---

## 2. The Six Laws, in the form they now take

1. **Evidence is immutable.** Files in `00_Raw_Inputs/` are SHA-256 hashed at
   ingest, `chmod 0444`, and registered with `brain/guard.py`. No code path
   modifies them.
2. **The map is deterministic; the AI only proposes.** Record-derived links
   (parsed from a CDR row, an FIR line) and AI-proposed links are different
   classes, stored differently, rendered differently, and an AI-proposed link
   only becomes real when a human accepts it.
3. **Every link carries its reason.** A link without a source file and locator is
   a claim, not a finding. It does not get written.
4. **Nothing is asserted without a citation.** Copilot answers and agent
   summaries carry a source chip per claim. An uncited sentence is dropped
   before the user ever sees it.
5. **The case is temporal.** Notes and links carry dates. Recent contact matters
   more than a two-year-old co-offence.
6. **Identity is resolved conservatively.** Two names merge only on a hard
   signal — shared identifier, shared FIR role — never on name similarity alone.

---

## 3. Folder structure

One folder per case, at the vault root. Numbered prefixes keep sort order
identical on every laptop.

```
Case_01_Sonipat_Arms/
  00_Raw_Inputs/          locked on ingest — hashed, chmod 0444, read-only
  01_People/              role: accused | witness | complainant | victim | officer
  02_Identifiers/         type: phone | imei | account | vehicle_reg | handle | email
  03_Vehicles/
  04_Locations/
  05_Organisations/
  06_Events/
  07_AI_Synthesis/        agent output only — never mixed with human notes
  _Case_Index.md          the memory file (see §5)
  Case_Config.yaml
```

`01_People/` is **People**, not Suspects. A case contains witnesses,
complainants and victims, and a person's role changes as the case develops — so
role is frontmatter, not a folder. The product reports what the record says; it
does not label people.

`02_Identifiers/` holds every linking key in one place — phone numbers, IMEIs,
bank accounts, vehicle registrations, social handles. One folder means the
cross-case scanner has exactly one place to look.

---

## 4. Note format

Every entity note is markdown with YAML frontmatter.

```markdown
---
id: person_0031
type: person
role: accused
names: [Vikram Singh, "विक्रम सिंह", V. Singh]
identifiers: [9812345678, 869123456789012]
case: Case_01_Sonipat_Arms
created: 2026-02-14
updated: 2026-02-19
---

# Vikram Singh

Named as accused in FIR 0142/2026, Kharkhoda. ^[FIR_0142 p:2 l:9]

## Links
- [[9812345678]] — registered to him ^[FIR_0142 p:2 l:11]
- [[Rehan Khan]] — 14 calls over 3 days before the seizure ^[CDR_9812345678 row:48219] <!-- ai:prop_0007 accepted -->
```

**Rules:**

- A link lives in the `## Links` section, one per line, with a dash.
- Every link carries a citation in `^[source_doc locator]` form.
- `locator` format is fixed: `p:3 l:11` for documents, `row:48219` for CDR.
  Never change this after W2 — three people parse it.
- An AI-written link carries a trailing HTML comment `<!-- ai:<proposal_id>
  accepted -->`. Human-written links carry nothing. This is how we show exactly
  what the AI touched and revert it as a set.

---

## 5. `_Case_Index.md` — the memory file

One per case. Rebuilt incrementally, never from scratch during a session.

```markdown
---
case: Case_01_Sonipat_Arms
built: 2026-02-19T14:02:00
entries: 87
---

## People
- person_0031 · Vikram Singh · accused · 01_People/Vikram Singh.md · mtime:1771... 
  Named accused FIR 0142. Phones: 9812345678. Links: 4. Gang: Sonipat Arms Ring.
```

**What it is for.** The copilot loads the whole index into context on every
question — it's small. From the index it decides which 3–5 full notes it
actually needs, and reads only those. We never scan a thousand files, and the
model always has the shape of the case even when it is reading two documents.

**Staleness is the failure mode.** Every entry stores its source file's mtime.
On copilot open, compare each entry's stored mtime against the file on disk; any
file that is newer gets re-read and that single entry rebuilt. One file, not the
whole index. A full rebuild stays available as an explicit action.

---

## 6. The agent layer

`brain/orchestrator.py` runs on **Analyse case**. It:

1. Loads `_Case_Index.md`
2. Fans out to per-folder reader agents (People, Events, Locations, Identifiers,
   Organisations) with the relevant slice of the index plus the new raw input
3. Collects proposals, runs them through the citation validator
4. Returns one `AnalysisResult`: `new_connections[]`, `files_to_update[]`,
   `summary`

Specialist agents, all prompts rather than systems:

- **Connection finder** — proposes links with a reason and a citation
- **Contradiction detector** — a statement that conflicts with a tower ping or
  another statement
- **Cross-case hit** — deterministic, not AI: an identifier in this case that
  also appears in another case folder

### The permission boundary — the one rule

> **The only thing the AI may write into the vault is a link, and only after a
> human accepts it.**

Everything else is a proposal the detective applies by hand. The agent never
edits note bodies, never renames files, never touches `00_Raw_Inputs/`.
`brain/linker.py` is the single code path that writes a link, and it refuses any
link without a resolvable citation.

### Proposals

Every proposal a human sees carries: what it claims, why, the source file and
locator, and a confidence the model reported. The detective clicks **Accept** or
**Reject**. Accepted links are written by `linker.py` and marked. Rejected ones
are logged to `07_AI_Synthesis/decisions.jsonl` and never re-proposed identically.

---

## 7. The model

`brain/llm/client.py` is a **provider interface**, not a Gemini client. Two
implementations behind it: Gemini Flash (default, for build speed) and Ollama
(local). Switching is one line in `Case_Config.yaml`.

This is not neatness for its own sake. The pitch is an offline police
workstation; "it runs fully local for deployment, we're on Flash for iteration
speed" is a true sentence that survives the obvious question. Keep the local
path working.

Model calls are JSON mode, temperature 0, Pydantic-validated, exactly one retry.
Every generated sentence carries `^[source_id]` or the validator drops it.

---

## 8. What is deliberately not built

SQLite graph store · provenance writer service · BSA §63 certificate ·
three-stage phonetic entity resolution · Leiden/CPM communities · GNN hypothesis
sandbox · OCR extraction · adjudication queue · multi-case federation beyond
identifier hits · Electron packaging (demo in Chrome kiosk).

Each of these goes on the SIH Future Scope slide as a decision with a reason,
which is a stronger artefact than a half-built feature.
