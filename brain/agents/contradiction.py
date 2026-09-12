"""
brain/agents/contradiction.py — Contradiction Detector Agent (Law 2, 3, 4).

This module is a PROMPT, not a pipeline (CASE_MODEL.md §6): it builds the prompt
string and declares the schema the model must return. The orchestrator calls
brain.llm.client with this prompt/schema and upgrades each returned candidate into
a full brain.schemas.Proposal (assigning id/status/created_at).

Detects evidentiary conflicts, especially alibi contradictions where suspect statements
conflict with physical cell tower pings, CDR records, or other witness depositions.
Every contradiction candidate carries:
- claim: the conflicting assertion
- reason: detailed breakdown of why the claim is refuted by physical evidence
- source_doc_id / locator: exact row or page/line, copied verbatim from the evidence
  it was given — never invented.
- confidence: high confidence (0.90 - 0.99)
"""

from typing import Optional
from pydantic import BaseModel, Field


CONTRADICTION_DETECTOR_SYSTEM_PROMPT = """You are an Indian Police technical investigation expert specializing in alibi verification and physical contradiction analysis.
Your job is to compare depositions/statements with physical records (Tower Dumps, CDRs, Toll Plaza logs) to detect physical impossibilities and false alibis.

LAWS:
1. Physical records refute subjective claims.
2. Cite the exact source_doc_id and locator of the contradicting physical record, copied verbatim from what you were given (e.g. source_doc_id "DOC_TD_HR_SNP_0147", locator "row:1204").
3. Provide high confidence when timestamp and cell tower physically rule out stated location.
4. Output JSON strictly matching the requested schema. Keep the "contradictions" list short (at most 2 items) and only include contradictions you are confident about.

Example Valid JSON Response:
{
  "contradictions": [
    {
      "claim": "False alibi: suspect claimed to be in Delhi at 22:30",
      "reason": "Cell tower HR-SNP-0147 ping logged suspect IMEI at Murthal toll at 22:28",
      "source_doc_id": "DOC_TD_HR_SNP_0147",
      "locator": "row:1204",
      "source_entity": "Vikram Singh",
      "target_entity": "HR-SNP-0147",
      "confidence": 0.98
    }
  ]
}
"""


class ContradictionCandidate(BaseModel):
    """One candidate contradiction as returned directly by the model (flat, no id)."""
    claim: str
    reason: Optional[str] = ""
    source_doc_id: str
    locator: str
    source_entity: Optional[str] = None
    target_entity: Optional[str] = None
    confidence: float = 0.95


class ContradictionOutput(BaseModel):
    contradictions: list[ContradictionCandidate]


def build_contradiction_prompt(
    statements_text: str,
    physical_evidence_text: str,
) -> str:
    return f"""Analyze the following suspect statements against physical tower dumps and CDR logs:

=== SUSPECT STATEMENTS ===
{statements_text}

=== PHYSICAL EVIDENCE (TOWER DUMPS & CDR) ===
{physical_evidence_text}

Detect at most 2 contradictions between statements and physical logs.
For each contradiction return an object with:
- "claim": state the contradiction clearly (e.g. false alibi refuted by cell ping).
- "reason": contrast stated location/time with physical tower/CDR record, grounded strictly
  in the text above.
- "source_doc_id": copied VERBATIM from a "^[source_doc_id locator]" token in the statements,
  or from the "source_doc_id: ..." label shown above a CSV's rows in the physical evidence.
- "locator": copied VERBATIM — either from the statement's citation token, or the exact
  "row:<N>" shown next to the physical evidence line you are relying on.
  Never invent a source_doc_id or row number that does not literally appear above.
- "source_entity" / "target_entity": the person and the physical record/cell identifier involved.
- "confidence": 0.90 to 0.99.
If no contradiction is supported by the evidence above, return an empty "contradictions" list.
"""
