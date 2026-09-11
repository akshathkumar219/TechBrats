# What is an "AI agent" — in our project

## The unglamorous truth

In SyndicateBrain, an agent is **one function that calls a language model with a fixed prompt and a required output shape.** That's all.

It is not a little autonomous being. It does not decide what to do next. It does not remember previous conversations. It has no goals.

```python
def cartographer(entity, neighbourhood, provenance):
    prompt = CARTOGRAPHER_PROMPT.format(...)
    raw = ollama(model, prompt, format="json", temperature=0, think=False)
    return CardSchema.model_validate_json(raw)   # fails loudly if wrong shape
```

That's an agent. We have seven of them, named A1–A7.

## What people usually mean by "AI agent"

Usually: an LLM in a loop that picks its own tools and decides its own next step. *We deliberately do not do that*, for one reason:

**A system that decides its own steps cannot be audited.** If a judge asks "how did this connection get into the chargesheet?", the answer has to be a query and a file row — not "the agent decided to look there."

## So what decides the steps?

A plain Python state machine. No model involved:

```
STAGED → HASHED → LOCKED → CLASSIFIED → PARSED
       → EXTRACTED     (A1 runs once per document chunk)
       → RESOLVED      (deterministic; A2 only on grey-band pairs)
       → GRAPH_COMMITTED
       → ANALYSED      (centrality, Leiden, decay — no model)
       → CARTOGRAPHED  (A3 per changed entity)
       → DELTA_WRITTEN (A4 once)
       → DONE
```

Every transition is checkpointed. A crash resumes from the last one. You can read this code and know exactly what will happen.

## The five rules every agent obeys

1. **Temperature 0, thinking mode off.** Same input → same output. Reasoning traces leak into JSON and break the validator.
2. **Stateless.** Every call gets its full context in the prompt. No hidden memory.
3. **Schema-validated output.** Pydantic. One retry with the error appended, then a loud failure. Never a silent fallback.
4. **Citations are structural.** Any factual field has a sibling `sources: [...]`. Empty → the validator drops the claim.
5. **One door to disk.** `guard.safe_write()`. An agent physically cannot write outside `02_AI_Brain/`.

## Division of labour — the pattern worth learning

Look at how A4 (Delta) works:

- **Code** computes the diff: which nodes are new, which edges appeared, which communities changed. This is a set operation, and it is always correct.
- **The model** turns that diff into readable English.

And A7 (Dossier):

- **Code** produces every hash, every table, every query, and the legal declaration.
- **The model** writes the narrative paragraphs.

> **The rule:** the model never produces a fact. It only phrases facts that code already established.
>
> Test of whether you got this right: *if you deleted the LLM entirely, would the certificate still generate correctly?* For us, yes — only the prose summary would be missing. That property is what makes this defensible.

## Our seven

| | Agent | Job | Ships in 24h? |
| :-- | :--- | :--- | :--- |
| A1 | Extractor | FIR text → entities + relations as JSON | if time |
| A2 | Resolver | Recommend merge/don't for ambiguous pairs | ✗ |
| A3 | Cartographer | Write the suspect cards | **✓ — build this one** |
| A4 | Delta | Narrate the ingest diff | ✓ |
| A5 | Contradiction | Explain code-detected conflicts | ✗ |
| A6 | Copilot | Cited Q&A over the case | if time |
| A7 | Dossier | Narrative for the prosecution PDF | ✗ |

## Jargon decoder

| Term | Plain meaning |
| :--- | :--- |
| **Prompt** | The text you send the model. |
| **System prompt** | Standing instructions that come before the user's question. |
| **Temperature** | Randomness. 0 = always pick the most likely next word. |
| **JSON mode** | Forcing output to be valid JSON instead of prose. |
| **Thinking mode** | The model reasons out loud before answering. Turn it OFF for extraction — the reasoning ends up in your JSON. |
| **Schema validation** | Checking the output has the right fields and types before using it. |
| **Orchestrator** | The thing that decides which agent runs when. Ours is plain code. |
| **Stateless** | No memory between calls. Every call starts fresh. |
| **Tool use / function calling** | Letting a model call code. **We don't use it** — it's the thing that makes systems unauditable. |
