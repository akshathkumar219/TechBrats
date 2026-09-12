"""
tests/test_integrity.py — Tests for Evidence Integrity Verification (Law 1, Block 4 SHO-T03).

Covers:
1. Verified case: all hashes match sidecars -> returns status="verified", failures=[].
2. Contaminated case: modify 1 byte in a file -> returns status="contaminated" with failure details.
3. Missing sidecar detection -> returns status="contaminated", failure reason="missing_sidecar".
4. Invalid / empty sidecar detection.
5. Multiple evidentiary files in nested subfolders of 00_Raw_Inputs/.
6. Clean empty case -> returns status="verified", total_documents=0.
7. FastAPI endpoint /api/case/integrity via TestClient:
   - with case_path parameter
   - with case_id parameter
   - contaminated case response
   - 404 on nonexistent case
8. Schema compatibility with brain.schemas.IntegrityResponse.
"""

from datetime import datetime
import hashlib
import os
from pathlib import Path
import shutil
import sys

# Ensure repository root is in sys.path
repo_root = Path(__file__).resolve().parent.parent
if str(repo_root) not in sys.path:
    sys.path.insert(0, str(repo_root))

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from brain.integrity import (
    IntegrityFailure,
    IntegrityResponse,
    compute_file_sha256,
    router as integrity_router,
    verify_case_integrity,
)
from brain.schemas import IntegrityResponse as BaseIntegrityResponse
from brain.vault import create_case, set_default_vaults_root


@pytest.fixture
def test_vault_env(tmp_path):
    """
    Creates a valid test case vault with standard directory structure.
    Ensures all directories/files are set back to 0777 on teardown so tmp_path cleans up cleanly.
    """
    vaults_dir = tmp_path / "vaults"
    vaults_dir.mkdir(parents=True, exist_ok=True)
    set_default_vaults_root(vaults_dir)

    case_meta = create_case(vaults_dir, "Case_01_Sonipat_Arms")
    case_path = Path(case_meta["path"])

    yield case_path, vaults_dir

    # Teardown: unlock all read-only files and folders
    for p in case_path.rglob("*"):
        try:
            os.chmod(p, 0o777)
        except Exception:
            pass
    try:
        os.chmod(case_path, 0o777)
    except Exception:
        pass


def helper_add_evidence(case_path: Path, subfolder: str, filename: str, content: bytes) -> tuple[Path, Path, str]:
    """Helper to add an evidentiary file and its .sha256 sidecar into 00_Raw_Inputs/<subfolder>/."""
    dest_dir = case_path / "00_Raw_Inputs" / subfolder
    dest_dir.mkdir(parents=True, exist_ok=True)

    file_path = dest_dir / filename
    sidecar_path = dest_dir / f"{filename}.sha256"

    # Unlock directory if locked
    try:
        os.chmod(dest_dir, 0o777)
    except Exception:
        pass

    file_path.write_bytes(content)
    file_sha256 = hashlib.sha256(content).hexdigest()
    sidecar_path.write_text(f"{file_sha256}  {filename}\n", encoding="utf-8")

    # Emulate Law 1 lock
    os.chmod(file_path, 0o444)
    os.chmod(sidecar_path, 0o444)

    return file_path, sidecar_path, file_sha256


# -------------------------------------------------------------------------
# Unit Tests for verify_case_integrity
# -------------------------------------------------------------------------

def test_verified_case(test_vault_env):
    """Test verified case: all hashes match sidecars -> returns status='verified'."""
    case_path, _ = test_vault_env

    # Ingest 3 evidentiary files across different subdirectories
    helper_add_evidence(
        case_path,
        "FIR",
        "FIR_0142_Kharkhoda.pdf",
        b"FIRST INFORMATION REPORT 0142/2026 Kharkhoda Police Station",
    )
    helper_add_evidence(
        case_path,
        "CDR",
        "CDR_9812345678.csv",
        b"Calling Party,Called Party,Timestamp\n9812345678,9896011223,2026-02-14\n",
    )
    helper_add_evidence(
        case_path,
        "TowerDump",
        "TowerDump_HR_SNP_0147.csv",
        b"Cell_ID,Azimuth,Timestamp\nHR-SNP-0147,120,2026-02-14 21:14:00\n",
    )

    result = verify_case_integrity(case_path)

    assert isinstance(result, BaseIntegrityResponse)
    assert isinstance(result, IntegrityResponse)
    assert result.status == "verified"
    assert len(result.failures) == 0
    assert result.total_documents == 3
    assert result.document_count == 3
    assert result.verified_at is not None
    # Validate ISO timestamp parses
    datetime.fromisoformat(result.verified_at)


def test_contaminated_case_single_byte(test_vault_env):
    """Test contaminated case: modify 1 byte in a file -> returns status='contaminated' with failure details."""
    case_path, _ = test_vault_env

    original_content = b"GENUINE EVIDENCE BYTES: Balwinder Singh arms seizure log"
    file_path, sidecar_path, original_hash = helper_add_evidence(
        case_path,
        "FieldLog",
        "FieldLog_2026-02-13.pdf",
        original_content,
    )

    # Tamper 1 byte: unlock file, modify 1 byte, relock
    os.chmod(file_path.parent, 0o777)
    os.chmod(file_path, 0o666)
    tampered_content = original_content[:-1] + b"\xff"
    file_path.write_bytes(tampered_content)
    tampered_hash = hashlib.sha256(tampered_content).hexdigest()
    os.chmod(file_path, 0o444)

    result = verify_case_integrity(case_path)

    assert result.status == "contaminated"
    assert len(result.failures) == 1
    assert result.total_documents == 1
    assert result.document_count == 1

    failure = result.failures[0]
    # Check attributes and dictionary-like access
    assert failure.filename == "FieldLog_2026-02-13.pdf"
    assert failure["filename"] == "FieldLog_2026-02-13.pdf"
    assert failure.expected_hash == original_hash
    assert failure["expected_hash"] == original_hash
    assert failure.actual_hash == tampered_hash
    assert failure["actual_hash"] == tampered_hash
    assert failure.expected_hash != failure.actual_hash
    assert failure.reason == "hash_mismatch"
    assert failure.timestamp is not None
    datetime.fromisoformat(failure.timestamp)


def test_missing_sidecar_detection(test_vault_env):
    """Test missing sidecar detection: evidentiary file exists without .sha256 sidecar."""
    case_path, _ = test_vault_env

    dest_dir = case_path / "00_Raw_Inputs" / "Statement"
    dest_dir.mkdir(parents=True, exist_ok=True)
    evidence_file = dest_dir / "Statement_Ramesh_Chander.pdf"
    content = b"Statement of Ramesh Chander u/s 161 CrPC"
    evidence_file.write_bytes(content)
    expected_actual_hash = hashlib.sha256(content).hexdigest()

    # Intentionally do not write Statement_Ramesh_Chander.pdf.sha256
    result = verify_case_integrity(case_path)

    assert result.status == "contaminated"
    assert len(result.failures) == 1
    assert result.total_documents == 1

    failure = result.failures[0]
    assert failure.filename == "Statement_Ramesh_Chander.pdf"
    assert failure.expected_hash is None
    assert failure.actual_hash == expected_actual_hash
    assert failure.reason == "missing_sidecar"
    assert "missing sidecar" in str(failure)


def test_invalid_or_empty_sidecar_detection(test_vault_env):
    """Test sidecar with 0 bytes or corrupted non-hex content."""
    case_path, _ = test_vault_env

    dest_dir = case_path / "00_Raw_Inputs" / "FIR"
    dest_dir.mkdir(parents=True, exist_ok=True)
    evidence_file = dest_dir / "FIR_Empty_Sidecar.pdf"
    evidence_file.write_bytes(b"Sample FIR content")

    sidecar = dest_dir / "FIR_Empty_Sidecar.pdf.sha256"
    sidecar.write_text("", encoding="utf-8")  # empty sidecar

    result = verify_case_integrity(case_path)

    assert result.status == "contaminated"
    assert len(result.failures) == 1
    failure = result.failures[0]
    assert failure.filename == "FIR_Empty_Sidecar.pdf"
    assert failure.reason == "invalid_sidecar"


def test_clean_empty_case(test_vault_env):
    """Test that a case vault with no evidence files returns verified with count 0."""
    case_path, _ = test_vault_env

    result = verify_case_integrity(case_path)

    assert result.status == "verified"
    assert len(result.failures) == 0
    assert result.total_documents == 0
    assert result.document_count == 0
    assert result.verified_at is not None


def test_mixed_valid_and_contaminated(test_vault_env):
    """Test case containing 2 valid files, 1 tampered file, and 1 missing sidecar."""
    case_path, _ = test_vault_env

    # 2 valid files
    helper_add_evidence(case_path, "FIR", "FIR_Good_1.pdf", b"Good FIR 1")
    helper_add_evidence(case_path, "CDR", "CDR_Good_2.csv", b"Good CDR 2")

    # 1 tampered file
    f3, _, f3_orig_hash = helper_add_evidence(case_path, "Statement", "Stmt_Tampered.pdf", b"Original Stmt")
    os.chmod(f3.parent, 0o777)
    os.chmod(f3, 0o666)
    f3.write_bytes(b"Tampered Stmt")
    os.chmod(f3, 0o444)

    # 1 file missing sidecar
    f4 = case_path / "00_Raw_Inputs" / "FieldLog" / "FieldLog_NoSidecar.pdf"
    f4.parent.mkdir(parents=True, exist_ok=True)
    f4.write_bytes(b"FieldLog without sidecar")

    result = verify_case_integrity(case_path)

    assert result.status == "contaminated"
    assert result.total_documents == 4
    assert result.document_count == 4
    assert len(result.failures) == 2

    failed_files = {f.filename: f for f in result.failures}
    assert "Stmt_Tampered.pdf" in failed_files
    assert failed_files["Stmt_Tampered.pdf"].reason == "hash_mismatch"
    assert failed_files["Stmt_Tampered.pdf"].expected_hash == f3_orig_hash

    assert "FieldLog_NoSidecar.pdf" in failed_files
    assert failed_files["FieldLog_NoSidecar.pdf"].reason == "missing_sidecar"


def test_nonexistent_case_raises_filenotfound(tmp_path):
    """Test that nonexistent case path raises FileNotFoundError."""
    nonexistent = tmp_path / "nonexistent_vault"
    with pytest.raises(FileNotFoundError):
        verify_case_integrity(nonexistent)


def test_compute_file_sha256_matches_hashlib(tmp_path):
    """Test compute_file_sha256 helper function."""
    dummy_file = tmp_path / "dummy.bin"
    test_bytes = b"SyndicateBrain Offline Evidence Verification Block 4"
    dummy_file.write_bytes(test_bytes)

    expected = hashlib.sha256(test_bytes).hexdigest().lower()
    computed = compute_file_sha256(dummy_file)
    assert computed == expected


# -------------------------------------------------------------------------
# Tests for FastAPI Endpoint via TestClient
# -------------------------------------------------------------------------

@pytest.fixture
def api_client():
    """FastAPI TestClient with integrity router mounted."""
    app = FastAPI(title="SyndicateBrain Test Integrity API")
    app.include_router(integrity_router)
    return TestClient(app)


def test_fastapi_endpoint_verified(api_client, test_vault_env):
    """Test GET /api/case/integrity with case_path parameter on verified case."""
    case_path, _ = test_vault_env
    helper_add_evidence(case_path, "FIR", "FIR_0142.pdf", b"FIR content verified")

    response = api_client.get(f"/api/case/integrity?case_path={case_path}")

    assert response.status_code == 200, response.text
    data = response.json()
    assert data["status"] == "verified"
    assert data["failures"] == []
    assert data["total_documents"] == 1
    assert data["document_count"] == 1
    assert "verified_at" in data


def test_fastapi_endpoint_contaminated(api_client, test_vault_env):
    """Test GET /api/case/integrity with case_path parameter on contaminated case."""
    case_path, _ = test_vault_env
    file_path, _, orig_hash = helper_add_evidence(case_path, "CDR", "CDR_9896011223.csv", b"Original CDR")

    # Contaminate
    os.chmod(file_path.parent, 0o777)
    os.chmod(file_path, 0o666)
    file_path.write_bytes(b"Contaminated CDR")
    os.chmod(file_path, 0o444)

    response = api_client.get(f"/api/case/integrity?case_path={case_path}")

    assert response.status_code == 200, response.text
    data = response.json()
    assert data["status"] == "contaminated"
    assert len(data["failures"]) == 1
    failure = data["failures"][0]
    assert failure["filename"] == "CDR_9896011223.csv"
    assert failure["expected_hash"] == orig_hash
    assert failure["actual_hash"] == hashlib.sha256(b"Contaminated CDR").hexdigest()
    assert failure["reason"] == "hash_mismatch"
    assert "timestamp" in failure


def test_fastapi_endpoint_case_id(api_client, test_vault_env):
    """Test GET /api/case/integrity using case_id query param."""
    case_path, vaults_dir = test_vault_env
    helper_add_evidence(case_path, "FIR", "FIR_Case_ID.pdf", b"Test content for case_id param")

    # Query with case_id
    response = api_client.get("/api/case/integrity?case_id=Case_01_Sonipat_Arms")

    assert response.status_code == 200, response.text
    data = response.json()
    assert data["status"] == "verified"
    assert data["total_documents"] == 1


def test_fastapi_endpoint_nonexistent(api_client, tmp_path):
    """Test GET /api/case/integrity with nonexistent case_path returns 404."""
    nonexistent = tmp_path / "does_not_exist"
    response = api_client.get(f"/api/case/integrity?case_path={nonexistent}")
    assert response.status_code == 404
