"""
brain/agents/connection_finder.py — Connection Finder Agent (Law 2, 3, 4).

This module is a PROMPT, not a pipeline (CASE_MODEL.md §6): it builds the prompt
string and declares the schema the model must return. The orchestrator is the one
that calls brain.llm.client with this prompt/schema and upgrades each returned
candidate into a full brain.schemas.Proposal (assigning id/status/created_at).

Every proposal candidate carries:
- claim: what is asserted
- reason: evidentiary justification
- source_doc_id / locator: fixed citation format ('p:3 l:11' for docs, 'row:48219' for CDR),
  copied verbatim by the model from the evidence it was given — never invented.
- confidence: model reported confidence (0.0 - 1.0)

The schema below is deliberately flatter than brain.schemas.Proposal (no nested Citation
object, no id field) — small local models are far more reliable at filling out a flat
schema, and asking for an `id` it has no way to assign correctly only invites retries.
"""

from typing import Optional
from pydantic import BaseModel, Field


CONNECTION_FINDER_SYSTEM_PROMPT = """You are an elite Indian Police criminal intelligence analyst on the SyndicateBrain workbench.
Your duty is to identify evidentiary connections between criminal syndicate entities based strictly on case records (FIRs, CDRs, Statements).

LAWS OF INVESTIGATION:
1. The map is deterministic; the AI only proposes.
2. Every link MUST carry a source_doc_id and locator copied verbatim from the evidence you were given (e.g. source_doc_id "DOC_CDR_9812345678", locator "row:48219", or source_doc_id "DOC_FIR_0142", locator "p:2 l:9").
3. Nothing is asserted without a citation. Uncited claims are rejected.
4. Output JSON strictly matching the requested schema. Keep the "proposals" list short (at most 3 items) and only include connections you are confident about.

Example Valid JSON Response:
{
  "proposals": [
    {
      "claim": "Direct call coordination during Murthal toll incident",
      "reason": "14 incoming calls logged within 2 hours of incident",
      "source_doc_id": "DOC_FIR_0142",
      "locator": "p:2 l:9",
      "source_entity": "Vikram Singh",
      "target_entity": "Sandeep Kala",
      "confidence": 0.92
    }
  ]
}
"""


class ConnectionCandidate(BaseModel):
    """One candidate connection as returned directly by the model (flat, no id)."""
    claim: str
    reason: Optional[str] = ""
    source_doc_id: str
    locator: str
    source_entity: Optional[str] = None
    target_entity: Optional[str] = None
    confidence: float = 0.85


class ConnectionFinderOutput(BaseModel):
    proposals: list[ConnectionCandidate]


def build_connection_prompt(
    index_slice: str,
    raw_evidence_summary: str,
    focus_entity: Optional[str] = None,
) -> str:
    prompt = f"""Examine the following case index slice and evidentiary records:

=== CASE INDEX SLICE ===
{index_slice}

=== EVIDENCE / RAW INPUTS ===
{raw_evidence_summary}
"""
    if focus_entity:
        prompt += f"\nFocus your analysis specifically on connections involving entity: {focus_entity}.\n"

    prompt += """
Identify at most 3 new connections between suspects, lieutenants, vehicles, and identifiers
that are NOT already listed under an entity's existing '## Links' section above.
For every proposed connection return an object with:
- "claim": concise assertion of relationship.
- "reason": specific explanation referencing call frequency, timestamps, or co-occurrence,
  grounded strictly in the evidence text above.
- "source_doc_id": copied VERBATIM (e.g. "DOC_FIR_0142") from one of the
  "^[source_doc_id locator]" tokens appearing in the CASE INDEX SLICE or EVIDENCE above.
- "locator": copied VERBATIM from the same token (e.g. "p:2 l:9" or "row:1204").
  Never invent a source_doc_id or locator that does not literally appear above.
- "source_entity": source entity name.
- "target_entity": target entity name.
- "confidence": 0.70 to 0.99.
If no evidence-grounded connection can be found, return an empty "proposals" list rather
than inventing one.
"""
    return prompt
