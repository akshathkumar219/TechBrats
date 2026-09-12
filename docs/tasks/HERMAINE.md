# HERMAINE — Case Index + Copilot Retrieval

**Read `docs/CASE_MODEL.md` first**, especially §5 on the memory file.

**Track:** the second-hardest thing in the build, and the panel a judge spends
the most time looking at.
**Clock:** 16 working hours.
**You own exclusively:** `brain/index/`, `brain/retrieval/`, `web/src/copilot/`
**You depend on:** Akshath's `schemas.py` (W2). Nothing after that.
**Prompts:** HER-T01 → T06, in `docs/BUILD_PROMPTS.md`

---

## Why this track matters

Every team at this hackathon will bolt an LLM onto some documents. Two things
separate ours, and you own both.

**The index.** We do not re-read the case on every question. `_Case_Index.md` is
a compact summary of every entity in the case, always in context; the copilot
reads it, decides which three or four full notes it actually needs, and pulls
only those. "We don't scan a thousand files per question" is a much better
answer to a judge than "we send everything each time" — and it's the difference
between a demo and a system.

**The citation.** Every sentence the copilot emits carries a chip that opens the
source file at the source line. An answer without a citation does not ship. That
is Law 4, and it's what makes a detective able to trust the thing.

---

## Roadmap

### W2–5 · `brain/index/build.py` — the memory file 🔴

- [ ] Walk a case folder. For every entity note, parse frontmatter and body into
      one `CaseIndexEntry`: id, type, role, file path, names, identifiers,
      existing links, the 3–5 facts that matter, and **the file's mtime**.
- [ ] Write `_Case_Index.md` per `CASE_MODEL.md` §5 — markdown with YAML
      frontmatter, grouped by folder. It must stay small enough to sit in
      context whole. Target under 300 lines for an 80-note case; report the
      actual token count.
- [ ] `POST /api/index/rebuild` — the full rebuild, an explicit action.

### W5–7 · Incremental refresh and staleness

**This is the thing that will silently break the demo if you skip it.** A
detective edits a note by hand, the index still describes the old version, and
the copilot answers from a stale line.

- [ ] On copilot open, compare each entry's stored mtime against the file on
      disk. Any file newer than its entry gets re-read and **that entry alone**
      rebuilt. Never the whole index mid-session.
- [ ] A deleted file drops its entry. A new file gets one.
- [ ] Report refresh time. It runs on every copilot open, so it needs to be
      imperceptible — under 200ms for an 80-note case. Benchmark it.

### W7–10 · `brain/retrieval/` — two-tier retrieval 🔴 the core of your track

- [ ] Tier 1: the whole index into context, every question. It is small.
- [ ] Tier 2: from the index, select the 3–5 notes the question actually needs,
      read them in full, build the context pack.
- [ ] Hard cap the pack and say so when you truncate. A silently truncated
      context is an answer that's confidently missing half the case.
- [ ] Every retrieved chunk keeps its source path and line offsets — the chips
      in tier 3 are built from these, so they have to survive retrieval.
- [ ] `POST /api/copilot/ask` → answer plus a citation list.

### W10–13 · `web/src/copilot/` — the panel

- [ ] Right-rail panel, mounts into Harleen's panel host. Message list, input at
      the bottom, matching the existing shell exactly — no new visual language.
- [ ] Stream the answer if the provider supports it. On a projector, text
      appearing reads as thinking; a three-second blank panel reads as broken.
- [ ] Show which notes were retrieved for this answer, collapsed. Judges like
      seeing the working.
- [ ] Zero hex codes. Every colour a token from Harleen's `index.css`.

### W13–15 · Citation chips

- [ ] Every claim in an answer carries an inline chip: source file + locator.
- [ ] Clicking a chip calls Harleen's `openFileAt(path, line, span)` — opens the
      note, scrolls, highlights. Agree the signature with her at W12.
- [ ] **An uncited sentence is dropped before render.** Use Akshath's validator;
      don't write your own.

### W15–16 · States 🔴 after feature freeze

- [ ] No case open · thinking · no answer found · provider unreachable.
- [ ] **"I don't know" must be a real, well-designed answer.** A copilot that
      says *"nothing in this case mentions that"* is more impressive to a police
      judge than one that always produces a paragraph. Make that state look
      deliberate, not like an error.

---

## Do not build

A vector database · a second embedding model · chat history persistence across
sessions · multi-case retrieval (identifier hits are Shourya's and deterministic)
· any UI outside `web/src/copilot/`.

## The two that cannot slip

1. **The index refreshing incrementally and correctly.** Everything downstream
   is wrong if it's stale.
2. **Citations that click through to the right line.** An answer nobody can
   verify is the thing we're building against.
