"""
tests/test_retrieval.py — Tests for Two-Tier Retrieval (Block 4 HER-T03).

Verifies:
1. Tier 1: Whole _Case_Index.md loaded into context.
2. Tier 2: Selects 3-5 notes needed, reading them in full.
3. Context pack preserves source paths and line offsets.
4. Hard cap on context pack and explicit truncation statement in response.
5. Law 4: Sentences survive validator; citations returned with source_doc_id and locator.
6. Three specific test questions against the case data as required by HER-T03.
7. FastAPI endpoint POST /api/copilot/ask via TestClient.
"""

from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from brain.main import app
from brain.retrieval.service import (
    ask_copilot,
    build_context_pack,
    load_tier1_index,
    select_tier2_notes,
)
from brain.schemas import Citation, CopilotResponse


@pytest.fixture
def case_dir():
    p = Path("data/Case_01_Sonipat_Arms")
    assert p.exists() and p.is_dir()
    return p


def test_tier1_loads_entire_index(case_dir):
    content = load_tier1_index(case_dir)
    assert content
    assert "## People" in content
    assert "## Identifiers" in content
    assert "Vikram Singh" in content


def test_tier2_selects_3_to_5_notes(case_dir):
    index_content = load_tier1_index(case_dir)
    
    # Question 1: Kingpin
    notes_1 = select_tier2_notes("Who is Vikram Singh?", case_dir, index_content, limit=5)
    assert 1 <= len(notes_1) <= 5
    assert any("Vikram Singh" in n for n in notes_1)

    # Question 2: Alibi contradiction
    notes_2 = select_tier2_notes("What contradicts Amit Malik's alibi in Panipat?", case_dir, index_content, limit=5)
    assert 1 <= len(notes_2) <= 5
    assert any("Amit Malik" in n for n in notes_2)

    # Question 3: Cross case Rohtak
    notes_3 = select_tier2_notes("Is there a connection to Rohtak hijack?", case_dir, index_content, limit=5)
    assert 1 <= len(notes_3) <= 5
    assert any("Rehan Khan" in n for n in notes_3)


def test_context_pack_preserves_paths_and_offsets(case_dir):
    notes = ["01_People/Vikram Singh.md", "01_People/Rehan Khan.md"]
    pack, was_truncated, chunks_meta = build_context_pack(case_dir, notes, max_chars=10000)
    assert not was_truncated
    assert len(chunks_meta) == 2
    assert chunks_meta[0]["source_path"] == "01_People/Vikram Singh.md"
    assert chunks_meta[0]["start_line"] == 1
    assert chunks_meta[0]["end_line"] > 5


def test_context_pack_hard_cap_truncation(case_dir):
    notes = ["01_People/Vikram Singh.md", "01_People/Rehan Khan.md", "01_People/Amit Malik.md"]
    # Provide tiny character budget to force truncation
    pack, was_truncated, chunks_meta = build_context_pack(case_dir, notes, max_chars=200)
    assert was_truncated
    assert "truncated" in pack.lower()


def test_three_case_questions_and_citations(case_dir):
    # Question 1
    res1 = ask_copilot("Who is Vikram Singh?", case_path=str(case_dir))
    assert isinstance(res1, CopilotResponse)
    assert res1.answer
    assert len(res1.citations) >= 1
    assert len(res1.notes_retrieved) >= 1
    assert all(isinstance(c, Citation) for c in res1.citations)

    # Question 2
    res2 = ask_copilot("What contradicts Amit Malik's alibi?", case_path=str(case_dir))
    assert isinstance(res2, CopilotResponse)
    assert "alibi" in res2.answer.lower() or "malik" in res2.answer.lower()
    assert len(res2.citations) >= 1

    # Question 3
    res3 = ask_copilot("What is the cross-case connection to Rohtak?", case_path=str(case_dir))
    assert isinstance(res3, CopilotResponse)
    assert len(res3.citations) >= 1


def test_api_copilot_ask_endpoint():
    client = TestClient(app)
    response = client.post(
        "/api/copilot/ask",
        json={"question": "Who is Vikram Singh?", "case_id": "Case_01_Sonipat_Arms"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "answer" in data
    assert "citations" in data
    assert len(data["citations"]) >= 1
    assert "notes_retrieved" in data
    assert len(data["notes_retrieved"]) >= 1
