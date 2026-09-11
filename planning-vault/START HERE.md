# SyndicateBrain — Planning Vault

Open **`SyndicateBrain — App Map.canvas`** first. That's the whole system on one canvas.

## What's in here

| | |
| :--- | :--- |
| `SyndicateBrain — App Map.canvas` | The entire app: ingest → pipeline → vault → UI pages → agents → exports. Colour-coded by the six Laws. Read left to right. |
| `Concepts/What is RAG.md` | Plain-English explanation + whether we use it (yes, one specific kind, one place) |
| `Concepts/What is an AI Agent.md` | What our agents actually are, and what we deliberately don't do |
| `Sample Case/` | A worked example of what the app **outputs** — suspect cards, an org, an event, a tower, a phone, a hypothesis, and a Delta Log |

## How to use the Sample Case

These notes are hand-written to show the team **exactly what A3 Cartographer must produce.** Look at:

- Every factual sentence ends with `^[source file locator]`
- Every entity mention is a `[[wiki-link]]`
- Frontmatter is machine-readable — that's what the graph reads back
- The language never editorialises. It says *"highest betweenness centrality (0.183)"*, never *"the kingpin"*
- `Hypotheses/H-0031` carries a NON-EVIDENTIARY banner and says plainly that exporting it will be refused

When you build the Cartographer prompt, these are the target output. When you build the fixtures, these are what "correct" looks like.

## Canvas colours

🟡 the six Laws · 🔴 evidence tier + what's cut · 🟠 the Python pipeline · 🟢 the vault + what ships · 🔵 UI pages · 🟣 exports + sandbox · 💗 agents

## Open in Obsidian

Obsidian → Open folder as vault → select `planning-vault`. Canvas is built in; nothing to install.
