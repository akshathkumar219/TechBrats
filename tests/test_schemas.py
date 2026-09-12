import pytest
import pydantic
from brain.schemas import (
    Doc,
    Citation,
    Link,
    Proposal,
    FileUpdateProposal,
    AnalysisResult,
    Entity,
    CaseIndexEntry,
    CaseSummary,
    CopilotResponse,
    IntegrityResponse,
    CrossCaseResponse,
)
from brain.mocks import (
    MOCK_DOCS,
    MOCK_CASES,
    MOCK_PROPOSALS,
    MOCK_FILES_TO_UPDATE,
    MOCK_ANALYSIS_RESULT,
    MOCK_COPILOT_RESPONSE,
    MOCK_INTEGRITY,
    MOCK_CROSSCASE,
)


def test_citation_strictly_enforced():
    """Law 1 & Law 3: Citation must require source_doc_id and locator."""
    # Valid construction
    c = Citation(source_doc_id="DOC_FIR_0142", locator="p:3 l:11")
    assert c.source_doc_id == "DOC_FIR_0142"
    assert c.locator == "p:3 l:11"

    # Missing source_doc_id
    with pytest.raises(pydantic.ValidationError) as exc:
        Citation(locator="p:3 l:11")
    assert "source_doc_id" in str(exc.value)

    # Missing locator
    with pytest.raises(pydantic.ValidationError) as exc:
        Citation(source_doc_id="DOC_FIR_0142")
    assert "locator" in str(exc.value)


def test_link_requires_citation():
    """CRITICAL INVARIANT: Link cannot be constructed without a Citation."""
    valid_citation = Citation(source_doc_id="DOC_CDR_9812345678", locator="row:48219")
    link = Link(
        source="Vikram Singh",
        target="Rehan Khan",
        reason="14 calls over 3 days before the seizure",
        citation=valid_citation,
    )
    assert link.citation.source_doc_id == "DOC_CDR_9812345678"
    assert link.citation.locator == "row:48219"

    # Link without citation must raise ValidationError
    with pytest.raises(pydantic.ValidationError) as exc:
        Link(
            source="Vikram Singh",
            target="Rehan Khan",
            reason="Unproven connection",
        )
    assert "citation" in str(exc.value)


def test_proposal_requires_citation():
    """CRITICAL INVARIANT: Proposal cannot be constructed without a Citation."""
    valid_citation = Citation(source_doc_id="DOC_FIR_0142", locator="p:2 l:9")
    prop = Proposal(
        id="prop_0001",
        claim="Vikram Singh linked to Rehan Khan",
        reason="14 calls logged across 72 hours",
        citation=valid_citation,
        confidence=0.94,
    )
    assert prop.citation.locator == "p:2 l:9"

    # Proposal without citation must raise ValidationError
    with pytest.raises(pydantic.ValidationError) as exc:
        Proposal(
            id="prop_0002",
            claim="Unverified lead",
            reason="No proof",
            confidence=0.5,
        )
    assert "citation" in str(exc.value)


def test_analysis_result_structure():
    """AnalysisResult must contain new_connections, files_to_update, and summary."""
    assert len(MOCK_ANALYSIS_RESULT.new_connections) == 5
    assert len(MOCK_ANALYSIS_RESULT.files_to_update) == 2
    assert "Vikram Singh" in MOCK_ANALYSIS_RESULT.summary
    assert MOCK_ANALYSIS_RESULT.case_id == "Case_01_Sonipat_Arms"

    for prop in MOCK_ANALYSIS_RESULT.new_connections:
        assert isinstance(prop, Proposal)
        assert prop.citation.source_doc_id
        assert prop.citation.locator
        assert prop.confidence > 0.8


def test_doc_and_case_mocks():
    """Doc and CaseSummary mock objects validate properly."""
    assert len(MOCK_CASES) >= 2
    assert MOCK_CASES[0].id == "Case_01_Sonipat_Arms"

    fir = MOCK_DOCS["DOC_FIR_0142"]
    assert fir.id == "DOC_FIR_0142"
    assert fir.type == "FIR"
    assert fir.locked is True
    assert len(fir.sha256) == 64


def test_copilot_response_citations():
    """Copilot response must include surviving citations."""
    assert len(MOCK_COPILOT_RESPONSE.citations) >= 2
    for cit in MOCK_COPILOT_RESPONSE.citations:
        assert cit.source_doc_id
        assert cit.locator
    assert len(MOCK_COPILOT_RESPONSE.notes_retrieved) >= 2


def test_crosscase_hits():
    """CrossCaseResponse contains deterministic hits."""
    assert len(MOCK_CROSSCASE.hits) >= 1
    assert "Case_01_Sonipat_Arms" in MOCK_CROSSCASE.hits[0].cases
    assert "Case_02_Rohtak_Hijack" in MOCK_CROSSCASE.hits[0].cases
