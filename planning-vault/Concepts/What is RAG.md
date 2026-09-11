# What is RAG — and are we using it?

## The problem it solves

An LLM only knows what was in its training data. It has never seen your case file. Ask it "who does Vikram Singh call most?" and it will either say it doesn't know, or — worse — invent a plausible answer.

**RAG = Retrieval-Augmented Generation.** Three steps:

1. **Retrieve** — go find the relevant bits of *your* data
2. **Augment** — paste those bits into the prompt
3. **Generate** — the model answers using only what you pasted

That's it. There is no magic. RAG is "look it up first, then answer" — the model is a writer, not a knower.

## Why not just paste the whole case file?

Context limits, and accuracy. 25,000 CDR rows plus 8 FIRs is far too much, and even where it fits, models get measurably worse at finding a specific fact in a huge context. Retrieval is what keeps the prompt small and on-topic.

## Ordinary RAG vs what we're doing

**Ordinary RAG** chops documents into chunks, embeds them as vectors, and at question time finds the chunks most similar to the question. Good for "what does this document say about X". Bad at relationships — "who connects these two groups" is not answerable by text similarity, because the answer isn't written down in any single chunk. It's a property of the structure.

**Graph-RAG** — what we use — retrieves from the graph *and* the documents:

```
Question: "Who connects the Sonipat group to the Panipat group?"
   │
   ├─ Entity linking → finds the two Org nodes
   ├─ GRAPH retrieval → 2-hop subgraph between them, filtered to the
   │                    active timeline window, ~120 edges max,
   │                    each carrying its provenance
   ├─ DOCUMENT retrieval → FTS5 + vector search, but ONLY over documents
   │                    referenced by that subgraph. ~12 chunks max.
   ├─ Assemble → edge list + chunks, each with a stable source_id
   ├─ Model answers, citing source_ids
   └─ CODE VALIDATOR strips any sentence without a resolvable citation
```

The graph half is what makes structural questions answerable at all. The document half is what lets it quote the FIR narrative.

## The part that's actually ours

Standard RAG says "here's some context, please don't make things up." That's a request, and models sometimes ignore requests.

Our validator is code that runs *after* the model:

1. Split the answer into sentences
2. Drop any factual sentence lacking a `^[source_id]`
3. Verify each cited id actually exists in the retrieved context (models do invent citations)
4. If more than 40% was dropped, throw the whole answer away and return *"The case file does not contain enough evidence to answer that."*

That converts "we asked it nicely" into "it structurally cannot ship an uncited claim." **This is the thing to say to a judge.**

## So: yes, we use RAG

Specifically Graph-RAG, in exactly one place — the **Copilot** (Agent A6).

Note what does **not** use RAG: extraction, entity resolution, the graph, centrality, Leiden, and the certificate. Those are deterministic code. RAG is only how the question-answering panel finds what to read.

## Jargon decoder

| Term | Plain meaning |
| :--- | :--- |
| **Embedding** | A list of ~384 numbers representing a piece of text's meaning. Similar meanings → similar numbers. |
| **Vector search** | Find the text whose numbers are closest to the question's numbers. |
| **Chunk** | A slice of a document, a few hundred words, kept with its page and character offsets. |
| **FTS5** | SQLite's keyword search. Fast, exact, catches names that embeddings miss. |
| **Hybrid retrieval** | Using both keyword and vector search and merging results. We do this. |
| **Context window** | How much text fits in one prompt. |
| **Grounding** | Making the model answer from supplied text rather than memory. |
