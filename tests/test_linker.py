"""
tests/test_linker.py — Test suite for brain.linker (Law 1, Law 2, Law 3).

Verifies:
1. Link writing into entity notes with correct ## Links format.
2. Symmetric link writing (reciprocal link in target note).
3. Refusal on missing, empty, or invalid citation / locator format.
4. Refusal on any write attempt to 00_Raw_Inputs/ via brain.guard.assert_writable.
5. Proposal acceptance writing link with <!-- ai:<id> accepted --> marker.
6. Proposal rejection logging to 07_AI_Synthesis/decisions.jsonl and is_proposal_rejected.
7. FastAPI router endpoints POST /api/proposal/{id}/accept and /reject via TestClient.
"""

import json
from pathlib import Path
import sys
import pytest
from fastapi import FastAPI
from starlette.testclient import TestClient

# Ensure root repository is in sys.path
repo_root = Path(__file__).resolve().parent.parent
if str(repo_root) not in sys.path:
    sys.path.insert(0, str(repo_root))

from brain.guard import lock_path
from brain.linker import (
    accept_proposal,
    find_note_file,
    is_proposal_rejected,
    log_decision,
    reject_proposal,
    router,
    write_link,
)
from brain.schemas import Citation, Proposal


@pytest.fixture
def mock_case_dir(tmp_path):
    """Set up an isolated case directory structure matching CASE_MODEL.md §3."""
    case_dir = tmp_path / "Case_01_Sonipat_Arms"
    case_dir.mkdir(parents=True)

    # Subdirectories
    (case_dir / "00_Raw_Inputs" / "FIR").mkdir(parents=True)
    (case_dir / "00_Raw_Inputs" / "CDR").mkdir(parents=True)
    (case_dir / "01_People").mkdir(parents=True)
    (case_dir / "02_Identifiers").mkdir(parents=True)
    (case_dir / "07_AI_Synthesis").mkdir(parents=True)

    # Evidentiary files in 00_Raw_Inputs/
    fir_file = case_dir / "00_Raw_Inputs" / "FIR" / "FIR_0142_2026_Kharkhoda.pdf"
    fir_file.write_bytes(b"%PDF-1.4 Mock FIR")
    lock_path(fir_file)

    cdr_file = case_dir / "00_Raw_Inputs" / "CDR" / "CDR_9812345678_Jan-Feb2026.csv"
    cdr_file.write_text("header\nrow1\n", encoding="utf-8")
    lock_path(cdr_file)

    # Entity note 1: Vikram Singh
    vikram_content = """---
id: person_0031
type: person
names: [Vikram Singh, Vicky Kharkhoda]
case: Case_01_Sonipat_Arms
---

# Vikram Singh

Proxy kingpin of the Sonipat syndicate. ^[DOC_FIR_0142 p:1 l:18]

## Links
- [[9812345678]] — primary mobile number ^[DOC_FIR_0142 p:2 l:15]
"""
    vikram_note = case_dir / "01_People" / "Vikram Singh.md"
    vikram_note.write_text(vikram_content, encoding="utf-8")

    # Entity note 2: Rehan Khan (without ## Links initially)
    rehan_content = """---
id: person_0042
type: person
names: [Rehan Khan]
case: Case_01_Sonipat_Arms
---

# Rehan Khan

Logistics lieutenant for the syndicate. ^[DOC_FIR_0142 p:2 l:4]
"""
    rehan_note = case_dir / "01_People" / "Rehan Khan.md"
    rehan_note.write_text(rehan_content, encoding="utf-8")

    return case_dir, vikram_note, rehan_note


def test_write_link_format_and_clean_creation(mock_case_dir):
    """Test writing a link into an entity note and verify ## Links format and note body preservation."""
    case_dir, _, rehan_note = mock_case_dir

    cit = Citation(source_doc_id="DOC_FIR_0142", locator="p:2 l:4")

    # Rehan Khan initially has no ## Links section
    initial_text = rehan_note.read_text(encoding="utf-8")
    assert "## Links" not in initial_text

    result = write_link(
        note_path_or_id=rehan_note,
        target="Vikram Singh",
        reason="logistics lieutenant traveling alongside during arrest",
        citation=cit,
        symmetric=False,
        case_path=case_dir,
    )

    assert result["status"] == "success"
    updated_text = rehan_note.read_text(encoding="utf-8")

    # Note body outside ## Links must be 100% preserved
    assert "Logistics lieutenant for the syndicate. ^[DOC_FIR_0142 p:2 l:4]" in updated_text

    # Verify ## Links section cleanly created at end
    expected_line = "- [[Vikram Singh]] — logistics lieutenant traveling alongside during arrest ^[DOC_FIR_0142 p:2 l:4]"
    assert "## Links\n" in updated_text
    assert expected_line in updated_text


def test_write_link_idempotency(mock_case_dir):
    """Verify appending a link is idempotent and does not produce duplicate link lines."""
    case_dir, vikram_note, _ = mock_case_dir

    cit = Citation(source_doc_id="DOC_CDR_9812345678", locator="row:48219")
    target = "Rehan Khan"
    reason = "14 calls logged over 3 days before seizure"

    # First write
    write_link(
        note_path_or_id=vikram_note,
        target=target,
        reason=reason,
        citation=cit,
        symmetric=False,
        case_path=case_dir,
    )
    content_after_first = vikram_note.read_text(encoding="utf-8")

    expected_line = "- [[Rehan Khan]] — 14 calls logged over 3 days before seizure ^[DOC_CDR_9812345678 row:48219]"
    assert content_after_first.count(expected_line) == 1

    # Second write with identical link
    write_link(
        note_path_or_id=vikram_note,
        target=target,
        reason=reason,
        citation=cit,
        symmetric=False,
        case_path=case_dir,
    )
    content_after_second = vikram_note.read_text(encoding="utf-8")

    # Must still appear exactly once
    assert content_after_second.count(expected_line) == 1
    assert content_after_first == content_after_second


def test_symmetric_writing(mock_case_dir):
    """Test symmetric writing: verify both source and target notes contain reciprocal links."""
    case_dir, vikram_note, rehan_note = mock_case_dir

    cit = Citation(source_doc_id="DOC_FIR_0142", locator="p:2 l:4")
    reason = "Accompanied each other during vehicle interception"

    write_link(
        note_path_or_id=vikram_note,
        target="Rehan Khan",
        reason=reason,
        citation=cit,
        symmetric=True,
        case_path=case_dir,
    )

    vikram_content = vikram_note.read_text(encoding="utf-8")
    rehan_content = rehan_note.read_text(encoding="utf-8")

    # Vikram Singh note links to Rehan Khan
    assert "- [[Rehan Khan]] — Accompanied each other during vehicle interception ^[DOC_FIR_0142 p:2 l:4]" in vikram_content

    # Rehan Khan note reciprocally links to Vikram Singh with identical citation and reason
    assert "- [[Vikram Singh]] — Accompanied each other during vehicle interception ^[DOC_FIR_0142 p:2 l:4]" in rehan_content


def test_refusal_missing_or_invalid_citation(mock_case_dir):
    """Refuses any link without a resolvable citation (Law 3). Raises ValueError."""
    case_dir, vikram_note, _ = mock_case_dir

    # 1. Missing citation (None)
    with pytest.raises(ValueError, match="Citation is strictly required"):
        write_link(vikram_note, "Rehan Khan", "reason", citation=None, case_path=case_dir)

    # 2. Empty string citation
    with pytest.raises(ValueError, match="Citation is strictly required"):
        write_link(vikram_note, "Rehan Khan", "reason", citation="", case_path=case_dir)

    # 3. Missing source_doc_id
    with pytest.raises(ValueError, match="missing source_doc_id"):
        write_link(
            vikram_note,
            "Rehan Khan",
            "reason",
            citation={"source_doc_id": "", "locator": "p:2 l:4"},
            case_path=case_dir,
        )

    # 4. Missing locator
    with pytest.raises(ValueError, match="missing locator"):
        write_link(
            vikram_note,
            "Rehan Khan",
            "reason",
            citation={"source_doc_id": "DOC_FIR_0142", "locator": ""},
            case_path=case_dir,
        )

    # 5. Invalid locator format (e.g. "chapter 2", not p:X l:Y or row:X)
    with pytest.raises(ValueError, match="Invalid locator format"):
        write_link(
            vikram_note,
            "Rehan Khan",
            "reason",
            citation={"source_doc_id": "DOC_FIR_0142", "locator": "chapter:2"},
            case_path=case_dir,
        )

    # 6. Unresolvable source document when valid_sources provided
    with pytest.raises(ValueError, match="not resolvable against case evidence"):
        write_link(
            vikram_note,
            "Rehan Khan",
            "reason",
            citation=Citation(source_doc_id="DOC_UNKNOWN_FICTIONAL", locator="p:1 l:1"),
            case_path=case_dir,
            valid_sources={"DOC_FIR_0142", "DOC_CDR_9812345678"},
        )


def test_refusal_raw_inputs_guard(mock_case_dir):
    """Law 1 Violation: Cannot write to any path under 00_Raw_Inputs/."""
    case_dir, _, _ = mock_case_dir
    raw_file = case_dir / "00_Raw_Inputs" / "FIR" / "FIR_0142_2026_Kharkhoda.pdf"

    cit = Citation(source_doc_id="DOC_FIR_0142", locator="p:1 l:1")

    with pytest.raises(PermissionError, match="00_Raw_Inputs"):
        write_link(
            note_path_or_id=raw_file,
            target="Vikram Singh",
            reason="tamper attempt",
            citation=cit,
            case_path=case_dir,
        )


def test_accept_proposal_writes_ai_marker(mock_case_dir):
    """Test accepting a proposal writes link with <!-- ai:<id> accepted --> marker and logs decision."""
    case_dir, vikram_note, rehan_note = mock_case_dir

    prop = Proposal(
        id="prop_0077",
        claim="Vikram Singh coordinated weapons delivery with Rehan Khan",
        reason="Repeated calls logged prior to arrest",
        source_entity="Vikram Singh",
        target_entity="Rehan Khan",
        citation=Citation(
            source_doc_id="DOC_CDR_9812345678",
            locator="row:48219",
        ),
        confidence=0.92,
        status="proposed",
    )

    res = accept_proposal(proposal_id="prop_0077", case_path=case_dir, proposal=prop)
    assert res["status"] == "accepted"
    assert res["proposal_id"] == "prop_0077"

    # Verify Vikram note has link with trailing marker
    vikram_content = vikram_note.read_text(encoding="utf-8")
    expected_marker = "<!-- ai:prop_0077 accepted -->"
    assert expected_marker in vikram_content
    assert f"- [[Rehan Khan]] — Repeated calls logged prior to arrest ^[DOC_CDR_9812345678 row:48219] {expected_marker}" in vikram_content

    # Verify reciprocal note in Rehan Khan has the same AI marker
    rehan_content = rehan_note.read_text(encoding="utf-8")
    assert f"- [[Vikram Singh]] — Repeated calls logged prior to arrest ^[DOC_CDR_9812345678 row:48219] {expected_marker}" in rehan_content

    # Verify decisions.jsonl has accepted record
    decisions_file = case_dir / "07_AI_Synthesis" / "decisions.jsonl"
    assert decisions_file.is_file()
    lines = decisions_file.read_text(encoding="utf-8").strip().splitlines()
    assert len(lines) == 1
    record = json.loads(lines[0])
    assert record["proposal_id"] == "prop_0077"
    assert record["decision"] == "accepted"
    assert "timestamp" in record


def test_reject_proposal_appends_decisions_jsonl(mock_case_dir):
    """Test rejecting a proposal appends to 07_AI_Synthesis/decisions.jsonl and is_proposal_rejected checks it."""
    case_dir, vikram_note, _ = mock_case_dir

    prop = Proposal(
        id="prop_0088",
        claim="Spurious link proposal",
        reason="Speculative association with no physical evidence",
        source_entity="Vikram Singh",
        target_entity="Rehan Khan",
        citation=Citation(
            source_doc_id="DOC_FIR_0142",
            locator="p:3 l:10",
        ),
        confidence=0.45,
        status="proposed",
    )

    # Note content before rejection
    content_before = vikram_note.read_text(encoding="utf-8")

    res = reject_proposal(
        proposal_id="prop_0088",
        reason="Rejected by investigator — speculative",
        case_path=case_dir,
        proposal=prop,
    )

    assert res["status"] == "rejected"
    assert res["proposal_id"] == "prop_0088"

    # Notes are NEVER edited on rejection
    content_after = vikram_note.read_text(encoding="utf-8")
    assert content_before == content_after

    # Verify decisions.jsonl
    decisions_file = case_dir / "07_AI_Synthesis" / "decisions.jsonl"
    assert decisions_file.is_file()
    lines = decisions_file.read_text(encoding="utf-8").strip().splitlines()
    record = json.loads(lines[-1])
    assert record["proposal_id"] == "prop_0088"
    assert record["decision"] == "rejected"
    assert record["reason"] == "Rejected by investigator — speculative"
    assert record["proposal"]["id"] == "prop_0088"

    # Verify is_proposal_rejected detects this proposal
    assert is_proposal_rejected("prop_0088", case_path=case_dir) is True
    assert is_proposal_rejected(prop, case_path=case_dir) is True

    # Check that an unrejected proposal returns False
    assert is_proposal_rejected("prop_other_id", case_path=case_dir) is False


def test_fastapi_endpoints_accept_and_reject(mock_case_dir):
    """Test FastAPI endpoints POST /api/proposal/{id}/accept and /reject via starlette TestClient."""
    case_dir, vikram_note, _ = mock_case_dir

    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)

    prop = Proposal(
        id="prop_api_01",
        claim="API test proposed connection",
        reason="Test phone connection via tower ping",
        source_entity="Vikram Singh",
        target_entity="Rehan Khan",
        citation=Citation(
            source_doc_id="DOC_CDR_9812345678",
            locator="row:48219",
        ),
        confidence=0.88,
        status="proposed",
    )

    # 1. Test POST /api/proposal/{id}/accept
    accept_resp = client.post(
        "/api/proposal/prop_api_01/accept",
        json={"case_path": str(case_dir), "proposal": prop.model_dump()},
    )
    assert accept_resp.status_code == 200, accept_resp.text
    data = accept_resp.json()
    assert data["status"] == "accepted"
    assert data["proposal_id"] == "prop_api_01"

    # Check note updated with link and ai marker
    vikram_content = vikram_note.read_text(encoding="utf-8")
    assert "<!-- ai:prop_api_01 accepted -->" in vikram_content

    # 2. Test POST /api/proposal/{id}/reject
    reject_resp = client.post(
        "/api/proposal/prop_api_02/reject",
        json={
            "case_path": str(case_dir),
            "reason": "Not corroborated by CDR analysis",
            "proposal": {
                "id": "prop_api_02",
                "claim": "False lead",
                "reason": "Unsubstantiated",
                "source_entity": "Vikram Singh",
                "target_entity": "Rehan Khan",
                "citation": {"source_doc_id": "DOC_FIR_0142", "locator": "p:2 l:4"},
                "confidence": 0.3,
            },
        },
    )
    assert reject_resp.status_code == 200, reject_resp.text
    rej_data = reject_resp.json()
    assert rej_data["status"] == "rejected"
    assert rej_data["proposal_id"] == "prop_api_02"
    assert is_proposal_rejected("prop_api_02", case_path=case_dir) is True

    # 3. Test POST /api/proposal/{id}/accept refusal on invalid citation
    bad_prop = prop.model_dump()
    bad_prop["citation"]["locator"] = "invalid_format_xyz"
    bad_resp = client.post(
        "/api/proposal/prop_bad/accept",
        json={"case_path": str(case_dir), "proposal": bad_prop},
    )
    assert bad_resp.status_code == 400
    assert "Invalid locator format" in bad_resp.text
