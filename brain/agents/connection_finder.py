"""
brain/agents/connection_finder.py — Connection Finder Agent (Law 2, 3, 4).

Proposes links between entities grounded strictly in evidentiary documents.
Every proposal carries:
- claim: what is asserted
- reason: evidentiary justification
- source_file: file path in 00_Raw_Inputs/
- locator: fixed format ('p:3 l:11' for docs, 'row:48219' for CDR)
- confidence: model reported confidence (0.0 - 1.0)
- citation: Citation object with source_doc_id and locator
"""

from typing import Any, Optional
from pydantic import BaseModel, Field
from brain.schemas import Citation, Proposal


CONNECTION_FINDER_SYSTEM_PROMPT = """You are an elite Indian Police criminal intelligence analyst on the SyndicateBrain workbench.
Your duty is to identify evidentiary connections between criminal syndicate entities based strictly on case records (FIRs, CDRs, Statements).

LAWS OF INVESTIGATION:
1. The map is deterministic; the AI only proposes.
2. Every link MUST carry a source file and locator citation (e.g. ^[DOC_CDR_9812345678 row:48219] or ^[DOC_FIR_0142 p:2 l:9]).
3. Nothing is asserted without a citation. Uncited claims are rejected.
4. Output JSON strictly matching the requested schema.
"""


class ConnectionFinderOutput(BaseModel):
    proposals: list[Proposal] = Field(default_factory=list)


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
Identify new connections between suspects, lieutenants, vehicles, and identifiers.
For every proposed connection:
- 'claim': Concise assertion of relationship.
- 'reason': Specific explanation referencing call frequency, timestamps, or co-occurrence.
- 'citation': source_doc_id and locator ('row:...' or 'p:... l:...').
- 'source_entity': Source entity name/ID.
- 'target_entity': Target entity name/ID.
- 'confidence': 0.70 to 0.99.
"""
    return prompt
