# SyndicateBrain — Agent Reference

Companion to `blueprint.md` §8. Seven agents. All stateless. All schema-bound. The orchestrator is deterministic code.

---

## 0. Universal Rules

1. **Temperature 0**, `top_p 1`, fixed seed where the runtime allows.
2. **Structured output only.** Every call declares a JSON Schema; Ollama JSON mode + Pydantic validation on return. One retry with the validation error appended, then hard fail with a visible error. Never a silent fallback.
3. **No memory.** Every call receives complete context in the prompt. No conversation state, no vector "agent memory".
4. **Citations are structural.** Any field typed as a factual claim has a sibling `sources: [source_id]`. Empty `sources` → the validator drops the claim.
5. **Writes go through one door**: `orchestrator.write_brain(relpath, content)` → `guard.safe_write()`. No agent, handler or script writes to disk by any other route.
6. **Audit everything**: model id, prompt sha256, input sha256, output sha256, duration → `audit_log`.
7. **Chunking**: ≤ 3000 tokens of context per extraction call. Prefer many small calls over one big one — accuracy on Indian names degrades fast in long contexts.

---

## A1 — Extractor

**Model:** Qwen3.5-4B (bulk) with 9B escalation for low-confidence chunks. Thinking mode OFF. NER pre-pass by GLiNER.
**Runs:** once per document chunk, on ingest.
**Never sees:** raw CDR rows (those go through DuckDB).

**Input**
```json
{ "doc_id": "...", "kind": "FIR|STATEMENT|FIELDLOG",
  "page": 3, "char_start": 1200, "char_end": 3900,
  "text": "...", "ner_spans": [{"label":"PERSON","text":"विक्रम सिंह","start":41,"end":52}] }
```

**Output schema**
```json
{
  "entities": [{
    "temp_id": "e1", "type": "person|phone|vehicle|location|org|weapon|amount|date",
    "surface": "Vikram Singh @ Vicky",
    "normalized": "Vikram Singh",
    "attributes": {"father_name":"Ramesh","age":"~28","thana":"Kharkhoda"},
    "span": {"page":3,"start":41,"end":52},
    "confidence": 0.0
  }],
  "relations": [{
    "from":"e1","to":"e4","type":"co_accused|uses_phone|owns_vehicle|present_at|named_in",
    "span": {"page":3,"start":180,"end":244},
    "evidence_quote": "verbatim clause from the source, max 200 chars",
    "confidence": 0.0
  }],
  "uncertain": ["free-text notes on anything ambiguous"]
}
```

**Prompt skeleton**
```
You extract structured facts from Indian police documents. You do not infer, guess,
or add anything not literally written in the text.

RULES
- Only entities and relations LITERALLY stated in TEXT. No world knowledge.
- Every relation must include evidence_quote copied verbatim from TEXT.
- Preserve Devanagari surface forms exactly in `surface`; put the transliteration in `normalized`.
- Aliases: "urf", "alias", "@" and "उर्फ" introduce an alias — keep both forms.
- If a name is partial ("Vicky", "Md."), extract it as-is. Do NOT complete it.
- If uncertain, lower confidence and add a line to `uncertain`. Never invent.
- Output ONLY valid JSON matching the schema.

DOCUMENT KIND: {kind}   PAGE: {page}
NER HINTS: {ner_spans}
TEXT:
"""{text}"""
```

**Failure mode to guard:** the model "helpfully" completes `Vicky` → `Vikram Singh`. That is the resolution layer's job, not the extractor's. Test for it explicitly.

---

## A2 — Resolver (adjudicator)

**Model:** Qwen3.5-9B.
**Runs:** only on pairs scoring in the 0.75–0.92 grey band. Never on auto-merge or auto-reject.
**Purpose:** produce a *recommendation with reasoning* for the human queue — it does not merge on its own.

**Input**
```json
{ "left":  {"name":"Vikram Singh","father":"Ramesh","thana":"Kharkhoda","age":28,
            "phones":["9812345678"],"firs":["0142/2025"],"aliases":["Vicky"]},
  "right": {"name":"Bikram Sing","father":"Ramesh Kumar","thana":"Kharkhoda","age":29,
            "phones":["9812345678"],"firs":["0311/2026"],"aliases":[]},
  "scores": {"phonetic":0.88,"vector":0.81,"context":0.95,"combined":0.87},
  "shared_hard_keys": ["msisdn:9812345678","thana:Kharkhoda"] }
```

**Output**
```json
{ "recommendation":"merge|do_not_merge|need_more_info",
  "confidence":0.0,
  "reasoning":"≤3 sentences, referencing only the fields given",
  "deciding_factors":["shared MSISDN","same thana","father name variant"],
  "risks":["Singh is an extremely common surname in this district"] }
```

**Prompt guardrail:** *"A wrong merge means an innocent person is placed in a criminal network. When the only similarity is name and district, recommend do_not_merge. Shared hard identifiers (phone, IMEI, vehicle) are the strongest signal; name similarity alone is the weakest."*

---

## A3 — Cartographer

**Model:** Qwen3.5-9B.
**Runs:** after every graph commit, for each entity whose neighbourhood changed.
**Writes:** `02_AI_Brain/{Suspects|Organisations|Phones|Vehicles|Locations|Events}/*.md`

**Input:** the entity, its full deterministic neighbourhood (edges + provenance + evidence quotes), its computed metrics, its communities, and — if the note exists — the current note plus its `human_edited` flag.

**Output:** markdown body in the fixed section order (`Summary`, `Identity & Aliases`, `Verified Connections`, `Timeline`, `Contradictions`, `Open Questions`, `Sources`), plus a frontmatter patch.

**Hard rules in the prompt**
```
- Every factual sentence ends with one or more ^[source_id]. No exceptions.
- Use [[Wiki_Links]] for every entity you mention that exists in ENTITY_INDEX.
- You may state degree/centrality/community as computed values; do not interpret
  them as guilt. Write "highest betweenness in this network", never "the mastermind".
- Do NOT mention hypothesis edges. You cannot see them; if one appears, ignore it.
- If human_edited is true: output ONLY a "## Machine Update {date}" section.
- Neutral, procedural register. This note may be read in court.
```

**Anti-pattern to test:** the model editorialising ("clearly the kingpin", "highly suspicious"). Ban evaluative adjectives in the prompt and assert against a wordlist in tests.

---

## A4 — Delta

**Model:** Qwen3.5-9B.
**Runs:** once at the end of every ingest run.
**Writes:** appends one dated section to `02_AI_Brain/Delta_Log.md`. **Append-only** — enforced by the orchestrator, not by the model.

**Input:** a machine-computed diff (`nodes_added`, `nodes_merged`, `edges_added`, `edges_strengthened`, `communities_changed`, `contradictions_new`) + the source docs for this run. The diff is computed in code; the agent only narrates it.

**Output template**
```markdown
## 2026-09-10 · Ingest Run 0007
**Sources:** `CDR_9812345678_Jan-Mar2026.csv`, `FIR_0311_2026_Kharkhoda.pdf`

### New Entities (3)
- [[Rehan_Khan]] — named as accused in FIR 0311/2026 ^[FIR_0311...pdf p:1 l:6]
...
### New Connections (7)
- [[Vikram_Singh]] ↔ [[Rehan_Khan]] — 31 calls, 12–19 Feb 2026 ^[CDR_98123...csv row:4182-4213]
...
### Strengthened
### Structural Changes
- Community `Sonipat_Arms_Ring` grew 6 → 9 members (Leiden/CPM, resolution 0.7)
- [[Vikram_Singh]] betweenness 0.11 → 0.18 — now the highest bridge in this network
### Contradictions Detected (1)
- [[Rehan_Khan]] stated he was in Panipat on 14 Feb ^[STMT_0311.pdf p:2 l:19] but
  9876543210 pinged Tower HR_SNP_0147 (Kharkhoda) at 21:14 ^[CDR...csv row:9012]
### Suggested Next Actions
- Request tower dump for HR_SNP_0147, 14 Feb 20:00–23:00
```

The **Suggested Next Actions** block is the only place any agent is allowed to be forward-looking, and it must propose *investigative steps*, never conclusions about people.

---

## A5 — Contradiction

**Model:** Qwen3.5-9B, but the detection is **mostly deterministic**.
Code finds the conflicts (statement claims location L at time T vs. tower ping at L′ at T′ where distance/time is impossible); the agent only writes them up readably.

**Output**
```json
{ "conflicts": [{
    "person_id":"...", "kind":"spatial_alibi|temporal|identity|possession",
    "claim":{"text":"...","source_id":"..."},
    "counter":{"text":"...","source_id":"..."},
    "severity":"hard|soft",     // hard = physically impossible; soft = implausible
    "explanation":"≤2 sentences" }] }
```
`hard` requires a computed impossibility (distance / elapsed time). The model is never allowed to assign `hard` on its own judgement — code assigns it, the model explains it.

---

## A6 — Copilot

**Model:** Qwen3.5-9B. Retrieval pipeline in `architecture.md` §6.

**System prompt**
```
You are an investigation assistant inside an offline police case file.

You answer ONLY from CONTEXT. CONTEXT contains (a) graph edges with provenance and
(b) document excerpts. You have no other knowledge of this case and must not use
general world knowledge about crime, people, or places.

- End every sentence containing a fact with ^[source_id].
- If CONTEXT does not answer the question, say exactly: "The case file does not
  contain enough evidence to answer that." Then list what would.
- Never estimate probability of guilt. Never recommend arrest, detention, or
  coercive action. You may recommend investigative steps.
- Distinguish "no evidence of a link" from "evidence of no link".
- If the question asks about a predicted or hypothetical connection, state that
  hypotheses are non-evidentiary and point to the Sandbox.
```

**Post-validator (code, not prompt):**
1. Split into sentences. 2. Any factual sentence without a resolvable `^[source_id]` is dropped. 3. If >40% dropped → discard the whole answer, return the insufficiency message. 4. Verify each cited `source_id` actually exists in the retrieved context — a fabricated citation kills the answer.

**Good demo questions:** *"Who connects the Sonipat group to the Panipat group?"* · *"What did Rehan Khan say he was doing on 14 February?"* · *"Which phones did Vikram use after his 2025 arrest?"* · *"Is there evidence linking the vehicle HR26AB1234 to the seizure?"*

---

## A7 — Dossier

**Model:** Qwen3.5-9B for narrative only. **All facts, tables, hashes and queries are assembled by code.**

**Split of responsibility**
| Section | Produced by |
| :--- | :--- |
| Cover, manifest, hashes, timestamps | code |
| Edge provenance table | code (direct from KùzuDB) |
| Cypher reproduction block | code |
| Exclusion declaration | code (fixed legal text, no model) |
| Narrative summary of the network | agent, cited |
| Individual role descriptions | agent, cited |
| Signature blocks | code (template) |

The agent never touches a hash, a query, a date, or a legal clause. If the LLM binary were deleted, the BSA §63 certificate would still generate correctly — only the prose summary would be missing. **That property is the thing to say to a judge.**

---

## Orchestrator — Ingest Run State Machine

```
STAGED → HASHED → LOCKED → CLASSIFIED → PARSED
       → EXTRACTED (A1×n)
       → RESOLVED (blocking → phonetic → vector → A2 on grey band → human queue)
       → GRAPH_COMMITTED
       → ANALYSED (centrality, Leiden/CPM, decay recompute)
       → CARTOGRAPHED (A3×n)
       → CONTRADICTION_SCANNED (A5)
       → DELTA_WRITTEN (A4)
       → DONE
```

- Each transition is **checkpointed** in `ingest_runs`. A crash resumes from the last checkpoint.
- The **human adjudication queue blocks** `GRAPH_COMMITTED` only for pending merges that would affect this run's new edges; everything else proceeds.
- Sandbox prediction is **not** in this pipeline. It is a separate, explicitly user-invoked job.
- Every stage transition writes an `audit_log` row.
