import pytest
from brain.agents.validator import (
    validate_text,
    extract_citations,
    split_into_sentences,
    is_source_resolvable,
    validate_proposal,
    validate_analysis_result,
)
from brain.schemas import Proposal, Citation, AnalysisResult


def test_drop_uncited_sentences_from_handwritten_input():
    """Verify Law 4: drops every sentence lacking a resolvable ^[source_id]."""
    raw_input = """Vikram Singh coordinated arms consignment with Rehan Khan. ^[DOC_CDR_9812345678 row:48219]
This sentence has no citation and will be dropped.
Balwinder Singh procured munitions documented in Kharkhoda seizure FIR 0142/2026. ^[DOC_FIR_0142 p:3 l:14]
Another uncited sentence here."""

    result = validate_text(raw_input)

    assert len(result.surviving_sentences) == 2
    assert len(result.dropped_sentences) == 2
    assert "This sentence has no citation and will be dropped." in result.dropped_sentences
    assert "Another uncited sentence here." in result.dropped_sentences
    assert any("DOC_CDR_9812345678" in s for s in result.surviving_sentences)
    assert any("DOC_FIR_0142" in s for s in result.surviving_sentences)
    assert not result.is_valid


def test_all_cited_sentences_pass():
    input_text = """Sentence one is valid. ^[DOC_1 p:1]
Sentence two is also valid. ^[DOC_2 row:5]"""

    result = validate_text(input_text)
    assert len(result.surviving_sentences) == 2
    assert len(result.dropped_sentences) == 0
    assert result.is_valid


def test_unresolvable_citations_dropped():
    input_text = """Known doc is cited. ^[DOC_KNOWN p:1]
Unknown doc is cited. ^[DOC_UNKNOWN p:2]"""

    valid_docs = {"DOC_KNOWN"}
    result = validate_text(input_text, valid_sources=valid_docs)

    assert len(result.surviving_sentences) == 1
    assert "Known doc is cited." in result.surviving_sentences[0]
    assert len(result.dropped_sentences) == 1
    assert "Unknown doc is cited." in result.dropped_sentences[0]


def test_proposal_validation():
    valid_p = Proposal(
        id="prop_01",
        claim="Valid claim",
        reason="Has valid citation",
        source_entity="A",
        target_entity="B",
        citation=Citation(source_doc_id="DOC_FIR_0142", locator="p:2 l:5"),
        confidence=0.9,
    )
    assert validate_proposal(valid_p, valid_sources={"DOC_FIR_0142"}) is True
    assert validate_proposal(valid_p, valid_sources={"DOC_OTHER"}) is False
