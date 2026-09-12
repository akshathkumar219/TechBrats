"""
tests/test_crosscase.py — Tests for cross-case identifier hits scanner, linker, and router (SHO-T05).

Verifies:
1. Scanning against data/Case_01_Sonipat_Arms and data/Case_02_Rohtak_Hijack.
2. Planted identifier 9896011223 (Rehan Khan) is detected as a cross-case hit between both cases.
3. Secondary identifier 869123456789012 (burner handset) is detected as a cross-case hit between both cases.
4. Normalization prevents false misses (+91 98960 11223 vs 9896011223, dashed IMEIs, etc.).
5. Deterministic exact-match behavior (no false positives, zero LLM, Law 6 conservative resolution).
6. Law 1 (00_Raw_Inputs immutability) and Law 3 (valid citation locator) enforcement.
7. Augmenting AnalysisResult with cross-case proposals, file update suggestions, and summary.
8. FastAPI endpoints GET /api/crosscase/hits and POST /api/crosscase/apply via TestClient.
"""

import sys
from pathlib import Path

# Ensure root repository is in sys.path
repo_root = Path(__file__).resolve().parent.parent
if str(repo_root) not in sys.path:
    sys.path.insert(0, str(repo_root))

import pytest
import shutil
from starlette.testclient import TestClient
from fastapi import FastAPI

from brain.crosscase import (
    apply_cross_case_links,
    augment_analysis_result,
    discover_cases,
    normalize_identifier,
    normalize_imei,
    normalize_phone,
    normalize_vehicle_account_handle,
    router,
    scan_cross_case_hits,
)
from brain.guard import assert_writable
from brain.schemas import AnalysisResult, CrossCaseHit, CrossCaseResponse


# ---------------------------------------------------------------------------
# Test Scanning Against Ground Truth Cases (data/)
# ---------------------------------------------------------------------------

def test_scan_cross_case_hits_against_data_cases():
    """
    Scans data/Case_01_Sonipat_Arms and data/Case_02_Rohtak_Hijack.
    Verifies planted identifier 9896011223 and secondary identifier 869123456789012
    are detected as deterministic cross-case hits.
    """
    c1 = Path("data/Case_01_Sonipat_Arms")
    c2 = Path("data/Case_02_Rohtak_Hijack")
    assert c1.is_dir()
    assert c2.is_dir()

    response = scan_cross_case_hits(cases=[c1, c2])
    assert isinstance(response, CrossCaseResponse)

    hits_by_id = {h.identifier: h for h in response.hits}

    # 1. Primary Identifier: Mobile MSISDN 9896011223 (Rehan Khan)
    assert "9896011223" in hits_by_id
    hit_phone = hits_by_id["9896011223"]
    assert hit_phone.hit_type == "phone"
    assert set(hit_phone.cases) == {"Case_01_Sonipat_Arms", "Case_02_Rohtak_Hijack"}
    assert len(hit_phone.notes) == 2
    assert any("Case_01_Sonipat_Arms" in n and "9896011223.md" in n for n in hit_phone.notes)
    assert any("Case_02_Rohtak_Hijack" in n and "9896011223.md" in n for n in hit_phone.notes)

    # 2. Secondary Identifier: Handset IMEI 869123456789012 (Burner Handset)
    assert "869123456789012" in hits_by_id
    hit_imei = hits_by_id["869123456789012"]
    assert hit_imei.hit_type == "imei"
    assert set(hit_imei.cases) == {"Case_01_Sonipat_Arms", "Case_02_Rohtak_Hijack"}
    assert len(hit_imei.notes) == 2
    assert any("Case_01_Sonipat_Arms" in n and "869123456789012.md" in n for n in hit_imei.notes)
    assert any("Case_02_Rohtak_Hijack" in n and "869123456789012.md" in n for n in hit_imei.notes)

    # Invariant: exactly 2 bridging hits between Case 1 and Case 2
    assert len(response.hits) == 2


def test_scan_default_fallback_to_data():
    """
    Calling scan_cross_case_hits() with no arguments falls back to data/
    if vaults/ has fewer than 2 cases.
    """
    response = scan_cross_case_hits()
    assert isinstance(response, CrossCaseResponse)
    hits_by_id = {h.identifier: h for h in response.hits}
    assert "9896011223" in hits_by_id
    assert "869123456789012" in hits_by_id


# ---------------------------------------------------------------------------
# Normalization Unit Tests
# ---------------------------------------------------------------------------

def test_phone_normalization():
    """
    Verifies Indian MSISDN normalization rules:
    - Strip +91, leading 0, spaces, dashes -> 10-digit Indian mobile number.
    """
    assert normalize_phone("+91 98960 11223") == "9896011223"
    assert normalize_phone("+91-9896011223") == "9896011223"
    assert normalize_phone("+919896011223") == "9896011223"
    assert normalize_phone("098960 11223") == "9896011223"
    assert normalize_phone("09896011223") == "9896011223"
    assert normalize_phone("9896011223") == "9896011223"
    assert normalize_phone("+91 (989) 601-1223") == "9896011223"

    # Non-matching or invalid lengths
    assert normalize_phone("12345") is None
    assert normalize_phone("989601122345") is None
    assert normalize_phone("not-a-number") is None
    assert normalize_phone(None) is None


def test_imei_normalization():
    """
    Verifies IMEI normalization rules:
    - Strip spaces, dashes -> 15-digit string.
    """
    assert normalize_imei("869123456789012") == "869123456789012"
    assert normalize_imei("8691 2345 6789 012") == "869123456789012"
    assert normalize_imei("8691-2345-6789-012") == "869123456789012"
    assert normalize_imei(" 869123456789012 ") == "869123456789012"

    # Invalid lengths
    assert normalize_imei("86912345678901") is None
    assert normalize_imei("8691234567890123") is None
    assert normalize_imei("not_an_imei") is None
    assert normalize_imei(None) is None


def test_vehicle_account_handle_normalization():
    """
    Verifies vehicle registration, account, and handle normalization rules:
    - Strip whitespace and uppercase.
    """
    assert normalize_vehicle_account_handle("HR-10-AB-4412") == "HR-10-AB-4412"
    assert normalize_vehicle_account_handle("  hr-10-ab-4412  ") == "HR-10-AB-4412"
    assert normalize_vehicle_account_handle("HR 10 AB 4412") == "HR10AB4412"
    assert normalize_vehicle_account_handle("sbi_acct_987654") == "SBI_ACCT_987654"
    assert normalize_vehicle_account_handle("  @telegram_handle  ") == "@TELEGRAM_HANDLE"


def test_normalize_identifier_with_and_without_hints():
    """Verifies normalize_identifier helper behaves accurately under various hints."""
    # With explicit hint
    assert normalize_identifier("+91 98960 11223", hint_type="phone") == ("9896011223", "phone")
    assert normalize_identifier("8691-2345-6789-012", hint_type="imei") == ("869123456789012", "imei")
    assert normalize_identifier("hr-10-ab-4412", hint_type="vehicle_reg") == ("HR-10-AB-4412", "vehicle_reg")
    assert normalize_identifier("sbi1234", hint_type="account") == ("SBI1234", "account")
    assert normalize_identifier("@tg_lead", hint_type="handle") == ("@TG_LEAD", "handle")

    # Inferred without hint
    assert normalize_identifier("+91 98960 11223") == ("9896011223", "phone")
    assert normalize_identifier("869123456789012") == ("869123456789012", "imei")
    assert normalize_identifier("HR-10-AB-4412") == ("HR-10-AB-4412", "vehicle_reg")


# ---------------------------------------------------------------------------
# False Misses and False Positives (Law 6 Determinism)
# ---------------------------------------------------------------------------

def test_normalization_prevents_false_misses(tmp_path):
    """
    Creates two mock cases with differently-formatted representations of the same
    underlying phone and IMEI. Verifies normalization groups them together.
    """
    case_a = tmp_path / "Case_Alpha"
    case_b = tmp_path / "Case_Beta"
    (case_a / "02_Identifiers").mkdir(parents=True)
    (case_b / "02_Identifiers").mkdir(parents=True)

    # Case Alpha has phone formatted with +91 and spaces, and IMEI with spaces
    (case_a / "02_Identifiers" / "phone.md").write_text(
        "---\n"
        "id: ident_phone_a\n"
        "type: identifier\n"
        "sub_type: phone\n"
        "identifiers: ['+91 98960 11223']\n"
        "case: Case_Alpha\n"
        "---\n"
        "# Phone Alpha\n"
    )
    (case_a / "02_Identifiers" / "imei.md").write_text(
        "---\n"
        "id: ident_imei_a\n"
        "type: identifier\n"
        "sub_type: imei\n"
        "identifiers: ['8691 2345 6789 012']\n"
        "case: Case_Alpha\n"
        "---\n"
        "# IMEI Alpha\n"
    )

    # Case Beta has phone formatted with leading 0 and dashes, and raw IMEI
    (case_b / "02_Identifiers" / "phone.md").write_text(
        "---\n"
        "id: ident_phone_b\n"
        "type: identifier\n"
        "sub_type: phone\n"
        "identifiers: ['098960-11223']\n"
        "case: Case_Beta\n"
        "---\n"
        "# Phone Beta\n"
    )
    (case_b / "02_Identifiers" / "imei.md").write_text(
        "---\n"
        "id: ident_imei_b\n"
        "type: identifier\n"
        "sub_type: imei\n"
        "identifiers: ['869123456789012']\n"
        "case: Case_Beta\n"
        "---\n"
        "# IMEI Beta\n"
    )

    resp = scan_cross_case_hits(vaults_root=tmp_path)
    hits_by_id = {h.identifier: h for h in resp.hits}

    assert "9896011223" in hits_by_id
    assert set(hits_by_id["9896011223"].cases) == {"Case_Alpha", "Case_Beta"}
    assert hits_by_id["9896011223"].hit_type == "phone"

    assert "869123456789012" in hits_by_id
    assert set(hits_by_id["869123456789012"].cases) == {"Case_Alpha", "Case_Beta"}
    assert hits_by_id["869123456789012"].hit_type == "imei"


def test_deterministic_exact_match_no_false_positives(tmp_path):
    """
    Law 6 Invariant: Conservative Resolution.
    Verifies that slightly different identifiers (1 digit off) or single-case identifiers
    NEVER produce false positive hits.
    """
    case_a = tmp_path / "Case_A"
    case_b = tmp_path / "Case_B"
    (case_a / "02_Identifiers").mkdir(parents=True)
    (case_b / "02_Identifiers").mkdir(parents=True)

    # Phone differing by one digit
    (case_a / "02_Identifiers" / "9896011223.md").write_text(
        "---\n"
        "identifiers: ['9896011223']\n"
        "sub_type: phone\n"
        "---\n"
    )
    (case_b / "02_Identifiers" / "9896011224.md").write_text(
        "---\n"
        "identifiers: ['9896011224']\n"
        "sub_type: phone\n"
        "---\n"
    )

    # IMEI differing by one digit
    (case_a / "02_Identifiers" / "869123456789012.md").write_text(
        "---\n"
        "identifiers: ['869123456789012']\n"
        "sub_type: imei\n"
        "---\n"
    )
    (case_b / "02_Identifiers" / "869123456789013.md").write_text(
        "---\n"
        "identifiers: ['869123456789013']\n"
        "sub_type: imei\n"
        "---\n"
    )

    # Also verify non-bridging number from data/Case_02_Rohtak_Hijack (9812233445)
    (case_b / "02_Identifiers" / "9812233445.md").write_text(
        "---\n"
        "identifiers: ['9812233445']\n"
        "sub_type: phone\n"
        "---\n"
    )

    resp = scan_cross_case_hits(vaults_root=tmp_path)
    assert len(resp.hits) == 0, "No hits should be found when identifiers differ or are unshared"


# ---------------------------------------------------------------------------
# Link Writing, Idempotency, and Law 1 / Law 3 Invariants
# ---------------------------------------------------------------------------

def test_apply_cross_case_links_idempotent_and_citations(tmp_path):
    """
    Tests apply_cross_case_links writes proper cross-case links into identifier notes
    with DOC_CASE_MATCH citations (Law 3) and is idempotent.
    """
    case_1 = tmp_path / "Case_01_Sonipat_Arms"
    case_2 = tmp_path / "Case_02_Rohtak_Hijack"
    (case_1 / "02_Identifiers").mkdir(parents=True)
    (case_2 / "02_Identifiers").mkdir(parents=True)

    note1 = case_1 / "02_Identifiers" / "9896011223.md"
    note1.write_text(
        "---\n"
        "id: ident_9896011223\n"
        "case: Case_01_Sonipat_Arms\n"
        "sub_type: phone\n"
        "---\n\n"
        "# 9896011223\n\n"
        "Initial description.\n\n"
        "## Links\n"
        "- [[Rehan Khan]] — associated entity ^[DOC_FIR_0142 p:2 l:17]\n"
    )

    note2 = case_2 / "02_Identifiers" / "9896011223.md"
    note2.write_text(
        "---\n"
        "id: ident_9896011223\n"
        "case: Case_02_Rohtak_Hijack\n"
        "sub_type: phone\n"
        "---\n\n"
        "# 9896011223\n\n"
        "Secondary case description.\n"
    )

    hit = CrossCaseHit(
        identifier="9896011223",
        cases=["Case_01_Sonipat_Arms", "Case_02_Rohtak_Hijack"],
        notes=[str(note1), str(note2)],
        hit_type="phone",
    )

    # First write
    results = apply_cross_case_links(hit=hit, vaults_root=tmp_path)
    assert len(results) == 2

    c1_content = note1.read_text(encoding="utf-8")
    c2_content = note2.read_text(encoding="utf-8")

    expected_link_c1 = "- [[Case_02_Rohtak_Hijack]] — cross-case identifier hit ^[DOC_CASE_MATCH row:1]"
    expected_link_c2 = "- [[Case_01_Sonipat_Arms]] — cross-case identifier hit ^[DOC_CASE_MATCH row:1]"

    assert expected_link_c1 in c1_content
    assert expected_link_c2 in c2_content
    # Pre-existing link in note1 must be preserved
    assert "- [[Rehan Khan]] — associated entity ^[DOC_FIR_0142 p:2 l:17]" in c1_content

    # Second write: verify IDEMPOTENCY (no duplicate link lines)
    apply_cross_case_links(hit=hit, vaults_root=tmp_path)
    c1_content_again = note1.read_text(encoding="utf-8")
    c2_content_again = note2.read_text(encoding="utf-8")

    assert c1_content_again.count(expected_link_c1) == 1
    assert c2_content_again.count(expected_link_c2) == 1


def test_apply_cross_case_links_refuses_raw_inputs_guard(tmp_path):
    """
    Law 1 Violation: Attempting to write links into 00_Raw_Inputs/ must be refused.
    """
    case_1 = tmp_path / "Case_01_Sonipat_Arms"
    raw_dir = case_1 / "00_Raw_Inputs" / "CDR"
    raw_dir.mkdir(parents=True)
    raw_file = raw_dir / "9896011223.md"
    raw_file.write_text("raw cdr contents")

    hit = CrossCaseHit(
        identifier="9896011223",
        cases=["Case_01_Sonipat_Arms", "Case_02_Rohtak_Hijack"],
        notes=[str(raw_file)],
        hit_type="phone",
    )

    with pytest.raises(PermissionError, match="Evidence in 00_Raw_Inputs/ is immutable"):
        apply_cross_case_links(hit=hit, vaults_root=tmp_path)


# ---------------------------------------------------------------------------
# Augment AnalysisResult Tests
# ---------------------------------------------------------------------------

def test_augment_analysis_result():
    """
    Tests augment_analysis_result surfaces cross-case hits in:
    1. new_connections (as Proposal)
    2. files_to_update (as FileUpdateProposal)
    3. summary
    4. cross_case_hits attribute
    """
    initial_summary = "Synthesized evidence indicates syndicate activity."
    result = AnalysisResult(
        case_id="Case_01_Sonipat_Arms",
        summary=initial_summary,
    )

    augmented = augment_analysis_result(
        analysis_result=result,
        case_id_or_path="Case_01_Sonipat_Arms",
        vaults_root=Path("data"),
    )

    assert hasattr(augmented, "cross_case_hits")
    assert len(augmented.cross_case_hits) == 2

    # Verify proposals created for each hit
    prop_ids = {p.id for p in augmented.new_connections}
    assert "prop_crosscase_9896011223" in prop_ids
    assert "prop_crosscase_869123456789012" in prop_ids

    phone_prop = next(p for p in augmented.new_connections if p.id == "prop_crosscase_9896011223")
    assert phone_prop.confidence == 1.0
    assert phone_prop.citation.source_doc_id == "DOC_CASE_MATCH"
    assert phone_prop.citation.locator == "row:1"
    assert "Case_02_Rohtak_Hijack" in phone_prop.claim or "Case_02_Rohtak_Hijack" in phone_prop.reason

    # Verify files to update contains suggestion for 02_Identifiers
    update_files = [f.file_path for f in augmented.files_to_update]
    assert any("9896011223.md" in f for f in update_files)
    assert any("869123456789012.md" in f for f in update_files)

    # Verify summary updated
    assert initial_summary in augmented.summary
    assert "DOC_CASE_MATCH" in augmented.summary
    assert "9896011223" in augmented.summary


# ---------------------------------------------------------------------------
# FastAPI Endpoints via Starlette TestClient
# ---------------------------------------------------------------------------

def test_fastapi_get_crosscase_hits():
    """
    Tests GET /api/crosscase/hits endpoint returns 200 and matches Ground Truth §4.
    """
    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)

    response = client.get("/api/crosscase/hits")
    assert response.status_code == 200
    data = response.json()

    assert "hits" in data
    assert len(data["hits"]) == 2

    hits = {h["identifier"]: h for h in data["hits"]}
    assert "9896011223" in hits
    assert hits["9896011223"]["hit_type"] == "phone"
    assert set(hits["9896011223"]["cases"]) == {"Case_01_Sonipat_Arms", "Case_02_Rohtak_Hijack"}

    assert "869123456789012" in hits
    assert hits["869123456789012"]["hit_type"] == "imei"
    assert set(hits["869123456789012"]["cases"]) == {"Case_01_Sonipat_Arms", "Case_02_Rohtak_Hijack"}


def test_fastapi_post_apply_crosscase_links(tmp_path):
    """
    Tests POST /api/crosscase/apply writes note links and returns confirmation.
    """
    # Create mock cases in tmp_path
    c1 = tmp_path / "Case_01_Sonipat_Arms"
    c2 = tmp_path / "Case_02_Rohtak_Hijack"
    shutil.copytree("data/Case_01_Sonipat_Arms/02_Identifiers", c1 / "02_Identifiers")
    shutil.copytree("data/Case_02_Rohtak_Hijack/02_Identifiers", c2 / "02_Identifiers")

    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)

    # 1. Query hits for tmp_path
    resp_hits = client.get(f"/api/crosscase/hits?vaults_root={tmp_path}")
    assert resp_hits.status_code == 200
    hit = next(h for h in resp_hits.json()["hits"] if h["identifier"] == "9896011223")

    # 2. Apply links
    payload = {"hit": hit, "vaults_root": str(tmp_path)}
    resp_apply = client.post("/api/crosscase/apply", json=payload)
    assert resp_apply.status_code == 200
    res_data = resp_apply.json()
    assert res_data["status"] == "success"
    assert res_data["identifier"] == "9896011223"
    assert res_data["links_written"] == 2

    # 3. Verify on disk
    note1 = c1 / "02_Identifiers" / "9896011223.md"
    assert "- [[Case_02_Rohtak_Hijack]] — cross-case identifier hit ^[DOC_CASE_MATCH row:1]" in note1.read_text(encoding="utf-8")
