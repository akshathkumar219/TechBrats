"""
tests/test_cdr.py — Test suite for Call Detail Record (CDR) ingestion, normalization,
DuckDB/sqlite3 engine, stable row:N indexing, note materialization, and API router.
"""

import sys
from pathlib import Path

# Ensure root repository is in sys.path
repo_root = Path(__file__).resolve().parent.parent
if str(repo_root) not in sys.path:
    sys.path.insert(0, str(repo_root))

import pytest
from starlette.testclient import TestClient
from fastapi import FastAPI
import yaml

from brain.schemas import Citation
from brain.cdr.loader import (
    CDRDatabase,
    get_profile,
    load_cdr,
    materialize_cdr_notes,
    normalize_phone,
    parse_cdr_timestamp,
)
from brain.cdr.router import router
from brain.linker import write_link


TEMPLATE_CDR_PATH = Path("data/TEMPLATE_CDR.csv")


def test_load_template_cdr():
    """Test loading data/TEMPLATE_CDR.csv into SQL engine."""
    assert TEMPLATE_CDR_PATH.exists(), f"{TEMPLATE_CDR_PATH} must exist"

    result = load_cdr(file_path=TEMPLATE_CDR_PATH, profile="airtel")

    assert result["rows_loaded"] == 11
    assert result["distinct_phones"] == 10
    assert result["profile"] == "airtel"

    db: CDRDatabase = result["database"]
    assert db.count() == 11

    # Verify first row data
    row1 = db.get_by_row_id(1)
    assert row1 is not None
    assert row1["row_id"] == 1
    assert row1["calling_party"] == "9812345678"
    assert row1["called_party"] == "9896011223"
    assert row1["call_date_time"] == "2026-02-10T14:22:15Z"
    assert row1["duration_s"] == 120
    assert row1["call_type"] == "MOC"
    assert row1["imei"] == "869123456789012"
    assert row1["imsi"] == "404450112233441"
    assert row1["first_cgi"] == "HR-SNP-0089"
    assert row1["tac"] == "1204"

    # Test SQL query capability
    moc_calls = db.query("SELECT count(*) as moc_count FROM cdr_records WHERE call_type = 'MOC'")
    assert moc_calls[0]["moc_count"] == 10

    mtc_calls = db.query("SELECT * FROM cdr_records WHERE call_type = 'MTC'")
    assert len(mtc_calls) == 1
    assert mtc_calls[0]["called_party"] == "9812700022"


def test_phone_normalization():
    """Test phone normalization across various input formats to canonical 10 digits."""
    test_cases = [
        ("+91 9812345678", "9812345678"),
        ("+919812345678", "9812345678"),
        ("09812345678", "9812345678"),
        ("98123-45678", "9812345678"),
        ("9812345678", "9812345678"),
        ("+91-98123-45678", "9812345678"),
        ("+91 (981) 234-5678", "9812345678"),
        ("(098123) 45678", "9812345678"),
        (" 9812345678 ", "9812345678"),
        ("919812345678", "9812345678"),
        ("00919812345678", "9812345678"),
    ]

    for raw_input, expected in test_cases:
        assert normalize_phone(raw_input) == expected, f"Failed normalizing '{raw_input}'"

    # Edge cases
    assert normalize_phone(None) == ""
    assert normalize_phone("") == ""


def test_timestamp_parsing_indian_order():
    """
    Test timestamp parsing with Indian DD/MM/YYYY order.
    10/02/2026 must be 10th February, NOT 2nd October!
    """
    ts1 = parse_cdr_timestamp("10/02/2026 14:22:15")
    assert ts1 == "2026-02-10T14:22:15Z"
    assert ts1.startswith("2026-02-10")

    ts2 = parse_cdr_timestamp("05/11/2025 09:30:00")
    assert ts2 == "2025-11-05T09:30:00Z"
    assert ts2.startswith("2025-11-05")

    ts3 = parse_cdr_timestamp("14/02/2026 12:40:18")
    assert ts3 == "2026-02-14T12:40:18Z"

    # Verify invalid timestamp raises ValueError
    with pytest.raises(ValueError):
        parse_cdr_timestamp("invalid_date")


def test_row_stability():
    """Test row stability: loading twice produces identical row:N locators."""
    res1 = load_cdr(file_path=TEMPLATE_CDR_PATH, profile="airtel")
    res2 = load_cdr(file_path=TEMPLATE_CDR_PATH, profile="airtel")

    db1: CDRDatabase = res1["database"]
    db2: CDRDatabase = res2["database"]

    records1 = db1.get_records()
    records2 = db2.get_records()

    assert len(records1) == len(records2) == 11

    for r1, r2 in zip(records1, records2):
        assert r1["row_id"] == r2["row_id"]
        # Stable locator verification
        loc1 = f"row:{r1['row_id']}"
        loc2 = f"row:{r2['row_id']}"
        assert loc1 == loc2

        assert r1["calling_party"] == r2["calling_party"]
        assert r1["called_party"] == r2["called_party"]
        assert r1["call_date_time"] == r2["call_date_time"]
        assert r1["duration_s"] == r2["duration_s"]


def test_note_materialization_and_linker(tmp_path: Path):
    """
    Test materialising notes in 02_Identifiers/ and 06_Events/,
    and verifying links created via brain.linker.write_link.
    """
    case_dir = tmp_path / "Case_Test_CDR"
    case_dir.mkdir(parents=True)

    result = load_cdr(
        file_path=TEMPLATE_CDR_PATH,
        case_path=case_dir,
        profile="airtel",
        doc_id="DOC_CDR_TEMPLATE",
    )

    identifiers_dir = case_dir / "02_Identifiers"
    events_dir = case_dir / "06_Events"

    assert identifiers_dir.exists()
    assert events_dir.exists()

    # Check that 02_Identifiers/ has notes for phones
    phone1_note = identifiers_dir / "9812345678.md"
    assert phone1_note.exists()

    content = phone1_note.read_text(encoding="utf-8")
    assert "---" in content
    # Parse frontmatter
    parts = content.split("---", 2)
    fm = yaml.safe_load(parts[1])
    assert fm["id"] == "ident_9812345678"
    assert fm["type"] == "identifier"
    assert fm["identifier_type"] == "phone"
    assert fm["value"] == "9812345678"
    assert fm["case"] == "Case_Test_CDR"
    assert "created" in fm
    assert "updated" in fm

    # Check Links section created via linker.write_link
    assert "## Links" in content
    assert "- [[9896011223]] —" in content
    assert "^[DOC_CDR_TEMPLATE row:1]" in content

    # Check 06_Events note created for call cluster
    cluster_note = events_dir / "Call_Cluster_9812345678_9896011223.md"
    assert cluster_note.exists()

    cluster_content = cluster_note.read_text(encoding="utf-8")
    cluster_parts = cluster_content.split("---", 2)
    cluster_fm = yaml.safe_load(cluster_parts[1])
    assert cluster_fm["type"] == "event"
    assert cluster_fm["sub_type"] == "call_cluster"
    assert cluster_fm["call_count"] == 4
    assert "9812345678" in cluster_fm["parties"]
    assert "9896011223" in cluster_fm["parties"]

    assert "## Links" in cluster_content
    assert "- [[9812345678]]" in cluster_content
    assert "- [[9896011223]]" in cluster_content
    assert "^[DOC_CDR_TEMPLATE row:1]" in cluster_content

    # Check linker.write_link behavior: refuses link without valid citation
    with pytest.raises(ValueError):
        write_link(
            phone1_note,
            "UnknownTarget",
            "invalid link",
            Citation(source_doc_id="", locator=""),
        )


def test_post_cdr_load_endpoint(tmp_path: Path):
    """Test endpoint POST /api/cdr/load via starlette TestClient."""
    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)

    case_dir = tmp_path / "Case_API_Test"
    case_dir.mkdir(parents=True)

    payload = {
        "case_path": str(case_dir),
        "file_path": str(TEMPLATE_CDR_PATH),
        "profile": "airtel",
    }

    response = client.post("/api/cdr/load", json=payload)
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"

    data = response.json()
    assert data["rows_loaded"] == 11
    assert data["distinct_phones"] == 10
    assert data["materialized_notes_count"] >= 11
    assert "date_range" in data
    assert data["date_range"]["start"] == "2026-02-10T14:22:15Z"
    assert data["date_range"]["end"] == "2026-02-14T12:40:18Z"
    assert data["profile"] == "airtel"

    # Test error handling on missing file
    err_resp = client.post("/api/cdr/load", json={"file_path": "non_existent_file.csv"})
    assert err_resp.status_code == 404
