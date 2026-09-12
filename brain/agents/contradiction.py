"""
brain/agents/contradiction.py — Contradiction Detector Agent (Law 2, 3, 4).

Detects evidentiary conflicts, especially alibi contradictions where suspect statements
conflict with physical cell tower pings, CDR records, or other witness depositions.
Every contradiction proposal carries:
- claim: the conflicting assertion
- reason: detailed breakdown of why the claim is refuted by physical evidence
- source_file: physical evidence file
- locator: exact row or page/line
- confidence: high confidence (0.90 - 0.99)
- citation: Citation object
"""

from typing import Any, Optional
from pydantic import BaseModel, Field
from brain.schemas import Citation, Proposal


CONTRADICTION_DETECTOR_SYSTEM_PROMPT = """You are an Indian Police technical investigation expert specializing in alibi verification and physical contradiction analysis.
Your job is to compare depositions/statements with physical records (Tower Dumps, CDRs, Toll Plaza logs) to detect physical impossibilities and false alibis.

LAWS:
1. Physical records refute subjective claims.
2. Cite the exact locator of the contradicting physical record (e.g. ^[DOC_TD_HR_SNP_0147 row:1204]).
3. Provide high confidence when timestamp and cell tower physically rule out stated location.
"""


class ContradictionOutput(BaseModel):
    contradictions: list[Proposal] = Field(default_factory=list)


def build_contradiction_prompt(
    statements_text: str,
    physical_evidence_text: str,
) -> str:
    return f"""Analyze the following suspect statements against physical tower dumps and CDR logs:

=== SUSPECT STATEMENTS ===
{statements_text}

=== PHYSICAL EVIDENCE (TOWER DUMPS & CDR) ===
{physical_evidence_text}

Detect any contradictions between statements and physical logs.
For each contradiction, formulate a Proposal where:
- 'claim': State the contradiction clearly (e.g. false alibi refuted by cell ping).
- 'reason': Contrast stated location/time with physical tower ping.
- 'citation': Reference the physical evidence doc ID and row locator.
- 'confidence': 0.95 to 0.99.
"""
