"""
Deterministic Citation Validator (Law 4: Nothing is asserted without a citation).

This module contains zero model dependencies. It parses generated output, drops
every sentence lacking a resolvable ^[source_id], and returns only what survives
along with the list of dropped sentences.

This is Law 4 in code and operates deterministically across all agent outputs.
"""

import re
from dataclasses import dataclass, field
from typing import Collection, Optional, Union
from brain.schemas import Citation, Proposal, AnalysisResult


CITATION_REGEX = re.compile(r"\^\[\s*([^\s\]]+)(?:\s+([^\]]+))?\s*\]")


@dataclass
class CitationRef:
    raw: str
    source_id: str
    locator: Optional[str] = None


@dataclass
class ValidationResult:
    surviving_text: str
    surviving_sentences: list[str] = field(default_factory=list)
    dropped_sentences: list[str] = field(default_factory=list)
    citations: list[CitationRef] = field(default_factory=list)
    is_valid: bool = True

    @property
    def dropped_count(self) -> int:
        return len(self.dropped_sentences)


def extract_citations(text: str) -> list[CitationRef]:
    """Extract all ^[source_id locator] citations from text."""
    matches = []
    for m in CITATION_REGEX.finditer(text):
        source_id = m.group(1).strip()
        locator = m.group(2).strip() if m.group(2) else None
        matches.append(CitationRef(raw=m.group(0), source_id=source_id, locator=locator))
    return matches


def is_source_resolvable(source_id: str, valid_sources: Optional[Collection[str]] = None) -> bool:
    """
    Check if a source_id is resolvable.
    If valid_sources is provided, source_id must exist in valid_sources (with or without DOC_ prefix).
    If valid_sources is None, any non-empty source_id is considered resolvable.
    """
    if not source_id:
        return False
    if valid_sources is None:
        return True

    # Direct match
    if source_id in valid_sources:
        return True

    # Normalized match (e.g. FIR_0142 vs DOC_FIR_0142)
    normalized_with_doc = f"DOC_{source_id}" if not source_id.startswith("DOC_") else source_id
    if normalized_with_doc in valid_sources:
        return True

    normalized_without_doc = source_id.removeprefix("DOC_")
    if normalized_without_doc in valid_sources:
        return True

    return False


def split_into_sentences(text: str) -> list[str]:
    """
    Tokenize text into distinct sentences while keeping attached citations
    (both preceding and succeeding sentence terminal punctuation) attached to
    the correct sentence.
    """
    if not text or not text.strip():
        return []

    sentence_pattern = re.compile(
        r"([^\n.!?]+(?:[.!?]+(?:\s*\^\[[^\]]+\])*|\^\[[^\]]+\]))(?=\s+|$)",
        re.MULTILINE
    )

    sentences: list[str] = []
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue

        # If line starts with a list marker (e.g. - or * or 1.), preserve bullet structure if single item
        matches = [m.group(1).strip() for m in sentence_pattern.finditer(line)]
        if matches:
            sentences.extend(matches)
        else:
            sentences.append(line)

    return sentences


def validate_text(
    text: str,
    valid_sources: Optional[Collection[str]] = None,
) -> ValidationResult:
    """
    Validate arbitrary text against Law 4:
    - Splits text into individual sentences.
    - Inspects each sentence for resolvable ^[source_id] citations.
    - Drops any sentence lacking a resolvable citation.
    - Returns surviving text, surviving list, and dropped list.
    """
    sentences = split_into_sentences(text)
    surviving: list[str] = []
    dropped: list[str] = []
    all_citations: list[CitationRef] = []

    for sentence in sentences:
        citations = extract_citations(sentence)
        resolvable = [c for c in citations if is_source_resolvable(c.source_id, valid_sources)]

        if resolvable:
            surviving.append(sentence)
            all_citations.extend(resolvable)
        else:
            dropped.append(sentence)

    surviving_text = " ".join(surviving) if surviving else ""
    is_valid = len(dropped) == 0

    return ValidationResult(
        surviving_text=surviving_text,
        surviving_sentences=surviving,
        dropped_sentences=dropped,
        citations=all_citations,
        is_valid=is_valid,
    )


def validate_proposal(
    proposal: Proposal,
    valid_sources: Optional[Collection[str]] = None,
) -> bool:
    """
    Validate a single Proposal against Law 3 & 4:
    A proposal must have a non-null citation with a resolvable source_doc_id.
    """
    if not proposal.citation:
        return False
    if not proposal.citation.source_doc_id or not proposal.citation.locator:
        return False
    return is_source_resolvable(proposal.citation.source_doc_id, valid_sources)


def validate_proposals(
    proposals: list[Proposal],
    valid_sources: Optional[Collection[str]] = None,
) -> tuple[list[Proposal], list[Proposal]]:
    """
    Filter a list of Proposals into (surviving, dropped).
    """
    surviving: list[Proposal] = []
    dropped: list[Proposal] = []

    for p in proposals:
        if validate_proposal(p, valid_sources):
            surviving.append(p)
        else:
            dropped.append(p)

    return surviving, dropped


def validate_analysis_result(
    result: AnalysisResult,
    valid_sources: Optional[Collection[str]] = None,
) -> AnalysisResult:
    """
    Validate an entire AnalysisResult:
    - Filters new_connections (proposals)
    - Validates and sanitizes the summary text
    - Updates dropped_proposals_count
    """
    surviving_props, dropped_props = validate_proposals(result.new_connections, valid_sources)

    summary_val = validate_text(result.summary, valid_sources)
    sanitized_summary = summary_val.surviving_text if summary_val.surviving_text else result.summary

    return AnalysisResult(
        case_id=result.case_id,
        summary=sanitized_summary,
        new_connections=surviving_props,
        files_to_update=result.files_to_update,
        dropped_proposals_count=result.dropped_proposals_count + len(dropped_props) + summary_val.dropped_count,
        analyzed_at=result.analyzed_at,
    )


if __name__ == "__main__":
    sample_input = """Vikram Singh coordinated arms consignment with Rehan Khan. ^[DOC_CDR_9812345678 row:48219]
This sentence is completely uncited and must be dropped by the validator.
Balwinder Singh procured munitions documented in Kharkhoda seizure FIR 0142/2026. ^[DOC_FIR_0142 p:3 l:14]
Another uncited claim about suspect operations here."""

    print("=== LAW 4 CITATION VALIDATOR DEMONSTRATION ===\n")
    print("INPUT TEXT:")
    print(sample_input)
    print("\n--- RUNNING VALIDATOR ---")

    result = validate_text(sample_input)

    print(f"\nSURVIVING SENTENCES ({len(result.surviving_sentences)}):")
    for s in result.surviving_sentences:
        print(f"  [✓ SURVIVED] {s}")

    print(f"\nDROPPED SENTENCES ({len(result.dropped_sentences)}):")
    for d in result.dropped_sentences:
        print(f"  [✗ DROPPED]  {d}")

    print(f"\nSURVIVING COMBINED TEXT:\n{result.surviving_text}")
