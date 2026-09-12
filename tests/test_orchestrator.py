"""
tests/test_orchestrator.py — Tests for Case Analysis Orchestrator (Block 4 AKS-T05).

Verifies:
1. Loading and slicing of _Case_Index.md across entity categories.
2. Specialist agents generate proposals with required claim, reason, source_file, locator, confidence.
3. Law 4 citation validation: uncited proposals are dropped and counted in dropped_proposals_count.
4. Schema conformance: returns a complete AnalysisResult matching brain.schemas.
5. FastAPI POST /api/case/analyse endpoint returns HTTP 200 with valid JSON.
"""

from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from brain.main import app
from brain.orchestrator import (
    analyse_case,
    load_case_index_slices,
    resolve_case_dir,
    run_fan_out_analysis,
)
from brain.schemas import AnalysisResult, Proposal


@pytest.fixture
def case_path():
    p = Path("data/Case_01_Sonipat_Arms")
    assert p.exists() and p.is_dir()
    return p


def test_resolve_case_dir(case_path):
    resolved = resolve_case_dir(str(case_path))
    assert resolved.exists()
    assert resolved.name == "Case_01_Sonipat_Arms"


def test_load_case_index_slices(case_path):
    slices = load_case_index_slices(case_path)
    assert isinstance(slices, dict)
    assert "People" in slices
    assert "Identifiers" in slices
    # Should contain indexed notes
    assert len(slices["People"]) > 0


def test_orchestrator_returns_validated_proposals(case_path):
    result = analyse_case(case_path=str(case_path))
    assert isinstance(result, AnalysisResult)
    assert result.case_id == "Case_01_Sonipat_Arms"
    assert len(result.new_connections) >= 5
    assert len(result.files_to_update) >= 2
    assert result.summary

    # Law 4 Verification: Every single surviving proposal MUST have a valid citation
    for prop in result.new_connections:
        assert isinstance(prop, Proposal)
        assert prop.citation is not None
        assert prop.citation.source_doc_id
        assert prop.citation.locator
        assert prop.confidence >= 0.70
        assert prop.claim
        assert prop.reason

    # Verify dropped proposals were tracked and counted
    assert result.dropped_proposals_count >= 1


def test_api_case_analyse_endpoint():
    client = TestClient(app)
    response = client.post("/api/case/analyse", json={"case_id": "Case_01_Sonipat_Arms"})
    assert response.status_code == 200
    data = response.json()
    assert data["case_id"] == "Case_01_Sonipat_Arms"
    assert len(data["new_connections"]) >= 5
    assert len(data["files_to_update"]) >= 2
    assert "dropped_proposals_count" in data
    assert data["dropped_proposals_count"] >= 1
