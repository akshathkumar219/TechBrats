"""
tests/test_ingest.py — Tests for evidentiary ingest pipeline (Law 1).

Covers:
1. Document classification (FIR, CDR, TowerDump, Statement, FieldLog, Misc).
2. End-to-end ingest pipeline on FIR, CDR, TowerDump, Statement.
3. Verification of SHA-256 calculation and .sha256 sidecar file format/matching.
4. Verification of chmod 0444 and registration with brain.guard.
5. Law 1 Bypass Verification:
   - Direct append via open(path, 'a')
   - Replace via os.rename
   - Overwrite via shutil.copy
   - Guard-level assert_writable and safe_write
6. Prevention of re-ingest overwriting existing evidence.
7. FastAPI endpoint /api/ingest (both UploadFile and JSON payloads).
"""

import hashlib
import os
import shutil
import sys
from pathlib import Path

# Ensure root repository is in sys.path
repo_root = Path(__file__).resolve().parent.parent
if str(repo_root) not in sys.path:
    sys.path.insert(0, str(repo_root))

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from brain.guard import assert_writable, is_path_locked, safe_write
from brain.ingest import (
    GuardViolationError,
    calculate_sha256,
    classify_document,
    ingest_file,
    router as ingest_router,
)
from brain.schemas import Doc
from brain.vault import create_case


@pytest.fixture
def clean_case_env(tmp_path):
    """
    Creates a valid case structure for testing and ensures all files
    and directories are set back to 0777 on teardown so tmp_path cleans up cleanly.
    """
    vaults_dir = tmp_path / "vaults"
    vaults_dir.mkdir(parents=True, exist_ok=True)
    case_meta = create_case(vaults_dir, "Case_01_Sonipat_Arms")
    case_path = Path(case_meta["path"])

    yield case_path

    # Teardown: unlock any read-only files/directories so pytest can delete tmp_path
    for p in case_path.rglob("*"):
        try:
            os.chmod(p, 0o777)
        except Exception:
            pass
    try:
        os.chmod(case_path, 0o777)
    except Exception:
        pass


@pytest.fixture
def sample_fir_content() -> bytes:
    return (
        b"FIRST INFORMATION REPORT (Under Section 154 CrPC / BNSS)\n"
        b"Police Station: PS Kharkhoda, District: Sonipat\n"
        b"FIR No: 0142/2026, Date: 14/02/2026\n"
        b"Sections: BNS 111, BNS 308(4), Arms Act 25, 27\n"
        b"Complainant: SI Rajesh Kumar\n"
        b"Accused: Vikram Singh, Rehan Khan, Balwinder Singh\n"
        b"Details: Seizure of 4 country-made .32 pistols at naka checkpoint.\n"
    )


@pytest.fixture
def sample_cdr_content() -> bytes:
    return (
        b"Calling Party,Called Party,Call Date Time,Duration(s),Call Type,IMEI,IMSI,First CGI,TAC\n"
        b"9812345678,9896011223,10/02/2026 14:22:15,120,MOC,869123456789012,404450112233441,HR-SNP-0089,1204\n"
        b"9896011223,9812345678,11/02/2026 18:05:40,45,MOC,861234059123456,404450123456789,HR-SNP-0147,1204\n"
    )


@pytest.fixture
def sample_tower_dump_content() -> bytes:
    return (
        b"Cell_ID,Azimuth,Latitude,Longitude,Timestamp,IMSI,IMEI\n"
        b"HR-SNP-0147,120,28.9931,77.0152,12/02/2026 21:14:00,404450112233441,869123456789012\n"
        b"HR-SNP-0147,120,28.9931,77.0152,12/02/2026 21:16:00,404450123456789,861234059123456\n"
    )


@pytest.fixture
def sample_statement_content() -> bytes:
    return (
        b"Statement of Witness Ramesh Chander s/o Shri Devi Dayal\n"
        b"Recorded under Section 161 CrPC / Section 180 BNSS\n"
        b"Case: FIR No. 0142/2026 PS Kharkhoda\n"
        b"Investigating Officer: SI Rajesh Kumar\n"
        b"Statement: I saw Vikram Singh driving the white Scorpio vehicle near bypass...\n"
    )


def test_classify_document(
    sample_fir_content, sample_cdr_content, sample_tower_dump_content, sample_statement_content
):
    """Test classification for all supported evidentiary document types."""
    assert classify_document("FIR_0142.txt", sample_fir_content) == "FIR"
    assert classify_document("calls_data.csv", sample_cdr_content) == "CDR"
    assert classify_document("tower_records.csv", sample_tower_dump_content) == "TowerDump"
    assert classify_document("witness_note.txt", sample_statement_content) == "Statement"

    field_log_content = b"General Diary (GD) Entry No. 42, PS Rai. Daily patrol log and duty roster."
    assert classify_document("daily_report.txt", field_log_content) == "FieldLog"

    misc_content = b"Receipt #9981 - Hardware tools purchase at Sonipat market."
    assert classify_document("receipt.txt", misc_content) == "Misc"


def test_ingest_fir(clean_case_env, sample_fir_content, tmp_path):
    """Test ingest on FIR document: destination, sidecar, sha256, Doc schema."""
    case_path = clean_case_env
    source_file = tmp_path / "FIR_0142_Kharkhoda.txt"
    source_file.write_bytes(sample_fir_content)

    doc = ingest_file(source_file, case_path)

    assert isinstance(doc, Doc)
    assert doc.type == "FIR"
    assert doc.filename == "FIR_0142_Kharkhoda.txt"
    assert doc.locked is True
    assert doc.bytes == len(sample_fir_content)
    assert doc.sha256 == hashlib.sha256(sample_fir_content).hexdigest()

    expected_path = case_path / "00_Raw_Inputs" / "FIR" / "FIR_0142_Kharkhoda.txt"
    assert expected_path.exists()
    assert expected_path.read_bytes() == sample_fir_content

    # Sidecar verification
    sidecar_path = case_path / "00_Raw_Inputs" / "FIR" / "FIR_0142_Kharkhoda.txt.sha256"
    assert sidecar_path.exists()
    sidecar_text = sidecar_path.read_text(encoding="utf-8")
    assert doc.sha256 in sidecar_text
    assert "FIR_0142_Kharkhoda.txt" in sidecar_text


def test_ingest_cdr(clean_case_env, sample_cdr_content, tmp_path):
    """Test ingest on CDR document."""
    case_path = clean_case_env
    source_file = tmp_path / "Airtel_CDR_Feb2026.csv"
    source_file.write_bytes(sample_cdr_content)

    doc = ingest_file(source_file, case_path)

    assert doc.type == "CDR"
    assert doc.filename == "Airtel_CDR_Feb2026.csv"
    expected_path = case_path / "00_Raw_Inputs" / "CDR" / "Airtel_CDR_Feb2026.csv"
    assert expected_path.exists()

    sidecar_path = case_path / "00_Raw_Inputs" / "CDR" / "Airtel_CDR_Feb2026.csv.sha256"
    assert sidecar_path.exists()
    assert doc.sha256 in sidecar_path.read_text()


def test_ingest_tower_dump(clean_case_env, sample_tower_dump_content, tmp_path):
    """Test ingest on TowerDump document."""
    case_path = clean_case_env
    source_file = tmp_path / "TowerDump_Sector14.csv"
    source_file.write_bytes(sample_tower_dump_content)

    doc = ingest_file(source_file, case_path)

    assert doc.type == "TowerDump"
    assert doc.filename == "TowerDump_Sector14.csv"
    expected_path = case_path / "00_Raw_Inputs" / "TowerDump" / "TowerDump_Sector14.csv"
    assert expected_path.exists()


def test_ingest_statement(clean_case_env, sample_statement_content, tmp_path):
    """Test ingest on Statement document."""
    case_path = clean_case_env
    source_file = tmp_path / "Statement_Ramesh_Chander.txt"
    source_file.write_bytes(sample_statement_content)

    doc = ingest_file(source_file, case_path)

    assert doc.type == "Statement"
    assert doc.filename == "Statement_Ramesh_Chander.txt"
    expected_path = case_path / "00_Raw_Inputs" / "Statement" / "Statement_Ramesh_Chander.txt"
    assert expected_path.exists()


def test_sidecar_and_sha256_verification(clean_case_env, sample_fir_content, tmp_path):
    """Verify SHA-256 before move strictly matches the sidecar and copied file bytes."""
    case_path = clean_case_env
    source_file = tmp_path / "FIR_Seizure.txt"
    source_file.write_bytes(sample_fir_content)

    original_sha = calculate_sha256(sample_fir_content)
    doc = ingest_file(source_file, case_path)

    assert doc.sha256 == original_sha

    copied_file = case_path / "00_Raw_Inputs" / "FIR" / "FIR_Seizure.txt"
    sidecar_file = case_path / "00_Raw_Inputs" / "FIR" / "FIR_Seizure.txt.sha256"

    sidecar_content = sidecar_file.read_text(encoding="utf-8").strip()
    stored_hash = sidecar_content.split()[0]
    assert stored_hash == original_sha
    assert calculate_sha256(copied_file.read_bytes()) == original_sha


def test_chmod_0444_and_guard_registration(clean_case_env, sample_fir_content, tmp_path):
    """Verify chmod 0444 is applied on copied file and path is registered with guard.py."""
    case_path = clean_case_env
    source_file = tmp_path / "FIR_Strict_Lock.txt"
    source_file.write_bytes(sample_fir_content)

    doc = ingest_file(source_file, case_path)
    copied_file = case_path / "00_Raw_Inputs" / "FIR" / "FIR_Strict_Lock.txt"

    # Filesystem permission check: 0444
    stat = os.stat(copied_file)
    mode = oct(stat.st_mode & 0o777)
    assert mode == "0o444", f"Expected file mode 0o444, got {mode}"

    # Guard registration check
    assert is_path_locked(copied_file) is True
    assert doc.locked is True


def test_law_1_bypass_verification(clean_case_env, sample_fir_content, tmp_path):
    """
    Law 1 Bypass Verification:
    After ingest, attempt:
    1. append a byte with open(path, 'a')
    2. os.rename onto the path
    3. shutil.copy onto the path
    Assert ALL THREE FAIL with PermissionError or GuardViolationError.
    Also verify assert_writable and safe_write refuse.
    """
    case_path = clean_case_env
    source_file = tmp_path / "FIR_Law1_Test.txt"
    source_file.write_bytes(sample_fir_content)

    ingest_file(source_file, case_path)
    locked_path = case_path / "00_Raw_Inputs" / "FIR" / "FIR_Law1_Test.txt"

    # Bypass Attempt 1: open(path, 'a')
    with pytest.raises((PermissionError, GuardViolationError)):
        with open(locked_path, "a") as f:
            f.write("tampered byte payload")

    # Bypass Attempt 2: os.rename onto the path
    attacker_file = tmp_path / "malicious_rename.txt"
    attacker_file.write_bytes(b"attacker payload via rename")
    with pytest.raises((PermissionError, GuardViolationError)):
        os.rename(str(attacker_file), str(locked_path))

    # Bypass Attempt 3: shutil.copy onto the path
    attacker_copy = tmp_path / "malicious_copy.txt"
    attacker_copy.write_bytes(b"attacker payload via copy")
    with pytest.raises((PermissionError, GuardViolationError)):
        shutil.copy(str(attacker_copy), str(locked_path))

    # Guard-level assertion checks
    with pytest.raises(PermissionError):
        assert_writable(locked_path)

    with pytest.raises(PermissionError):
        safe_write(locked_path, b"guard bypass payload")


def test_reingest_overwrite_prevention(clean_case_env, sample_fir_content, tmp_path):
    """Verify that ingesting a file with the same name fails to protect immutability."""
    case_path = clean_case_env
    source_file = tmp_path / "FIR_Duplicate.txt"
    source_file.write_bytes(sample_fir_content)

    # First ingest succeeds
    ingest_file(source_file, case_path)

    # Second ingest of same name must raise GuardViolationError
    with pytest.raises((PermissionError, GuardViolationError)):
        ingest_file(source_file, case_path)


def test_fastapi_endpoint_multipart(clean_case_env, sample_fir_content):
    """Test POST /api/ingest via multipart file upload."""
    app = FastAPI()
    app.include_router(ingest_router)
    client = TestClient(app)

    case_path = str(clean_case_env)
    response = client.post(
        "/api/ingest",
        files={"file": ("FIR_Uploaded.txt", sample_fir_content, "text/plain")},
        data={"case_path": case_path},
    )

    assert response.status_code == 200, response.text
    data = response.json()
    assert data["filename"] == "FIR_Uploaded.txt"
    assert data["type"] == "FIR"
    assert data["locked"] is True
    assert data["bytes"] == len(sample_fir_content)
    assert data["sha256"] == hashlib.sha256(sample_fir_content).hexdigest()

    saved_file = clean_case_env / "00_Raw_Inputs" / "FIR" / "FIR_Uploaded.txt"
    assert saved_file.exists()
    assert oct(os.stat(saved_file).st_mode & 0o777) == "0o444"


def test_fastapi_endpoint_json_source_path(clean_case_env, sample_cdr_content, tmp_path):
    """Test POST /api/ingest via JSON body with source_path and case_path."""
    app = FastAPI()
    app.include_router(ingest_router)
    client = TestClient(app)

    source_file = tmp_path / "CDR_Json.csv"
    source_file.write_bytes(sample_cdr_content)

    case_path = str(clean_case_env)
    response = client.post(
        "/api/ingest",
        json={"source_path": str(source_file), "case_path": case_path},
    )

    assert response.status_code == 200, response.text
    data = response.json()
    assert data["filename"] == "CDR_Json.csv"
    assert data["type"] == "CDR"
    assert data["locked"] is True
    assert data["bytes"] == len(sample_cdr_content)

    saved_file = clean_case_env / "00_Raw_Inputs" / "CDR" / "CDR_Json.csv"
    assert saved_file.exists()


def test_fastapi_endpoint_missing_parameters():
    """Test POST /api/ingest returns 400 when required inputs are missing."""
    app = FastAPI()
    app.include_router(ingest_router)
    client = TestClient(app)

    response = client.post("/api/ingest", json={})
    assert response.status_code == 400


def test_fastapi_endpoint_file_not_found(clean_case_env):
    """Test POST /api/ingest returns 404 when source_path does not exist."""
    app = FastAPI()
    app.include_router(ingest_router)
    client = TestClient(app)

    response = client.post(
        "/api/ingest",
        json={"source_path": "/non/existent/file.pdf", "case_path": str(clean_case_env)},
    )
    assert response.status_code == 404
