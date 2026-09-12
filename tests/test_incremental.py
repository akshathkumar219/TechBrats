"""
Tests for brain/index/incremental.py (HER-T02).

Validates:
1. Incremental Index Refresh with Staleness Detection:
   - Comparing disk st_mtime against stored index mtime.
   - Exactly 1 modified note gets re-read and its entry updated.
   - Unmodified notes are preserved byte-for-byte without re-reading or re-parsing.
2. Adding a new note dynamically inserts a new index entry.
3. Deleting a note drops its entry from the index.
4. Preserves frontmatter case, built timestamp, and entry counts.
5. Benchmark: 80-note case refresh must complete in under 200ms.
6. FastAPI endpoint POST /api/index/refresh works via body and query params.
"""

import logging
import os
import sys
import time
from pathlib import Path
from unittest.mock import patch

# Ensure repo root is in sys.path
REPO_ROOT = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

import pytest
import yaml
from fastapi import FastAPI
from fastapi.testclient import TestClient

import brain.index.incremental
from brain.schemas import CaseIndexEntry
from brain.index.build import build_case_index, router
from brain.index.incremental import (
    refresh_case_index,
    parse_case_index_content,
    StoredIndexEntry,
)


@pytest.fixture
def mock_case_dir(tmp_path: Path) -> Path:
    """Create a mock case directory structure with config."""
    case_dir = tmp_path / "Case_01_Sonipat_Arms"
    case_dir.mkdir(parents=True, exist_ok=True)

    for folder in [
        "01_People",
        "02_Identifiers",
        "03_Vehicles",
        "04_Locations",
        "05_Organisations",
        "06_Events",
    ]:
        (case_dir / folder).mkdir(parents=True, exist_ok=True)

    config_file = case_dir / "Case_Config.yaml"
    config_file.write_text("case: Case_01_Sonipat_Arms\nprovider: ollama\n", encoding="utf-8")
    return case_dir


@pytest.fixture
def populated_case(mock_case_dir: Path) -> Path:
    """Populate a case directory with 4 representative notes."""
    # 1. Person
    (mock_case_dir / "01_People" / "Vikram Singh.md").write_text(
        """---
id: person_0031
type: person
role: accused
names: [Vikram Singh]
identifiers: [9812345678]
case: Case_01_Sonipat_Arms
gang: Sonipat Arms Ring
---
# Vikram Singh
Named accused in FIR 0142/2026, Kharkhoda.
## Links
- [[9812345678]] — registered to him ^[FIR_0142 p:2 l:11]
""",
        encoding="utf-8",
    )

    # 2. Identifier
    (mock_case_dir / "02_Identifiers" / "9812345678.md").write_text(
        """---
id: ident_0001
type: identifier
role: phone
names: [9812345678]
identifiers: [9812345678]
case: Case_01_Sonipat_Arms
---
# 9812345678
Airtel prepaid SIM registered in Kharkhoda. Active Nov 2025 to Feb 2026.
## Links
- [[Vikram Singh]] — user of handset ^[FIR_0142 p:2 l:15]
""",
        encoding="utf-8",
    )

    # 3. Vehicle
    (mock_case_dir / "03_Vehicles" / "HR-26-AB-1234.md").write_text(
        """---
id: veh_0001
type: vehicle
role: transport
names: [HR-26-AB-1234]
identifiers: [HR-26-AB-1234]
case: Case_01_Sonipat_Arms
---
# HR-26-AB-1234
White Mahindra Scorpio used for transit of illicit arms from Rohtak.
## Links
- [[Vikram Singh]] — driver at time of interception ^[FIR_0142 p:1 l:22]
""",
        encoding="utf-8",
    )

    # 4. Event
    (mock_case_dir / "06_Events" / "FIR_0142_2026.md").write_text(
        """---
id: fir_0142_2026
type: event
role: fir
names: ["FIR 0142/2026 — PS Kharkhoda"]
identifiers: ["9812345678"]
case: Case_01_Sonipat_Arms
---
# FIR 0142/2026 — PS Kharkhoda
Intercepted Scorpio carrying 4 country-made .32 pistols at Kharkhoda bypass.
## Links
- [[Vikram Singh]] — named accused apprehended ^[FIR_0142 p:1 l:18]
""",
        encoding="utf-8",
    )

    # Build initial index
    build_case_index(mock_case_dir)
    return mock_case_dir


def extract_entry_blocks(index_text: str) -> dict[str, str]:
    """
    Extract mapping of file_path -> exact entry block (line1 + line2) from _Case_Index.md.
    Used to verify byte-for-byte preservation of unmodified entries.
    """
    entries: dict[str, str] = {}
    current_path = None
    current_lines = []

    for line in index_text.splitlines():
        if line.startswith("- "):
            if current_path and current_lines:
                entries[current_path] = "\n".join(current_lines)
            parts = [p.strip() for p in line.split("·")]
            if len(parts) >= 5:
                current_path = " · ".join(parts[3:-1]).strip().replace("\\", "/")
                current_lines = [line]
            else:
                current_path = None
                current_lines = []
        elif current_path and line.strip() and not line.startswith("## "):
            current_lines.append(line)
        elif line.startswith("## ") and current_path:
            if current_lines:
                entries[current_path] = "\n".join(current_lines)
            current_path = None
            current_lines = []

    if current_path and current_lines:
        entries[current_path] = "\n".join(current_lines)

    return entries


def test_modify_single_note_byte_for_byte_preservation(populated_case: Path):
    """
    Core requirement test:
    - Build initial index for a case with multiple notes.
    - Modify exactly 1 note (touch mtime and add a line).
    - Call refresh_case_index.
    - Assert: exactly that 1 entry changed its mtime/content, all other entries remained identical byte-for-byte.
    - Assert: unmodified files were NOT re-read or re-parsed.
    """
    index_path = populated_case / "_Case_Index.md"
    assert index_path.exists()

    content_before = index_path.read_text(encoding="utf-8")
    entries_before = extract_entry_blocks(content_before)
    assert len(entries_before) == 4
    assert "01_People/Vikram Singh.md" in entries_before
    assert "02_Identifiers/9812345678.md" in entries_before
    assert "03_Vehicles/HR-26-AB-1234.md" in entries_before
    assert "06_Events/FIR_0142_2026.md" in entries_before

    # Modify exactly 1 note: Vikram Singh.md
    target_note = populated_case / "01_People" / "Vikram Singh.md"
    current_st = target_note.stat()
    new_mtime = current_st.st_mtime + 10.0

    original_text = target_note.read_text(encoding="utf-8")
    updated_text = original_text + "\nArrested on 2026-02-20 during search in Sector 14.\n"
    target_note.write_text(updated_text, encoding="utf-8")
    os.utime(target_note, (new_mtime, new_mtime))

    # Spy on parse_entity_note to confirm unmodified notes are NOT parsed
    with patch("brain.index.incremental.parse_entity_note", wraps=brain.index.incremental.parse_entity_note) as spy_parse:
        res = refresh_case_index(populated_case)

        # Assert: exactly 1 file modified
        assert res["status"] == "ok"
        assert res["modified"] == ["01_People/Vikram Singh.md"]
        assert res["added"] == []
        assert res["deleted"] == []
        assert len(res["unmodified"]) == 3
        assert "02_Identifiers/9812345678.md" in res["unmodified"]
        assert "03_Vehicles/HR-26-AB-1234.md" in res["unmodified"]
        assert "06_Events/FIR_0142_2026.md" in res["unmodified"]

        # CRITICAL: parse_entity_note called EXACTLY 1 time, for the 1 modified file
        assert spy_parse.call_count == 1
        called_path = Path(spy_parse.call_args[0][0])
        assert called_path.name == "Vikram Singh.md"

    # Read refreshed index
    content_after = index_path.read_text(encoding="utf-8")
    entries_after = extract_entry_blocks(content_after)
    assert len(entries_after) == 4

    # 1. The modified entry changed its mtime and/or content
    assert entries_after["01_People/Vikram Singh.md"] != entries_before["01_People/Vikram Singh.md"]
    assert f"mtime:{int(new_mtime)}" in entries_after["01_People/Vikram Singh.md"] or f"mtime:{new_mtime:.2f}" in entries_after["01_People/Vikram Singh.md"]

    # 2. ALL OTHER entries remained IDENTICAL BYTE-FOR-BYTE
    for unchanged_path in [
        "02_Identifiers/9812345678.md",
        "03_Vehicles/HR-26-AB-1234.md",
        "06_Events/FIR_0142_2026.md",
    ]:
        assert entries_after[unchanged_path] == entries_before[unchanged_path], (
            f"Expected byte-for-byte equality for {unchanged_path}\n"
            f"Before: {entries_before[unchanged_path]!r}\n"
            f"After:  {entries_after[unchanged_path]!r}"
        )


def test_add_new_note(populated_case: Path):
    """Test adding a new note -> entry dynamically added."""
    index_path = populated_case / "_Case_Index.md"
    content_before = index_path.read_text(encoding="utf-8")
    entries_before = extract_entry_blocks(content_before)
    assert len(entries_before) == 4

    # Add a new person note
    new_note = populated_case / "01_People" / "Rehan Khan.md"
    new_note.write_text(
        """---
id: person_0032
type: person
role: accused
names: [Rehan Khan]
identifiers: [9896011223]
case: Case_01_Sonipat_Arms
---
# Rehan Khan
Associate of Vikram Singh. Procured prepaid SIM from Rohtak distributor.
## Links
- [[Vikram Singh]] — co-accused in arms transit ^[FIR_0142 p:2 l:24]
""",
        encoding="utf-8",
    )

    res = refresh_case_index(populated_case)
    assert res["status"] == "ok"
    assert res["added"] == ["01_People/Rehan Khan.md"]
    assert res["modified"] == []
    assert res["deleted"] == []
    assert res["entries"] == 5
    assert len(res["unmodified"]) == 4

    content_after = index_path.read_text(encoding="utf-8")
    assert "person_0032 · Rehan Khan · accused · 01_People/Rehan Khan.md" in content_after
    assert "entries: 5" in content_after

    # Verify all previous entries were preserved
    entries_after = extract_entry_blocks(content_after)
    assert len(entries_after) == 5
    for p, text in entries_before.items():
        assert entries_after[p] == text


def test_delete_note(populated_case: Path):
    """Test deleting a note -> entry removed from index."""
    index_path = populated_case / "_Case_Index.md"
    content_before = index_path.read_text(encoding="utf-8")
    entries_before = extract_entry_blocks(content_before)
    assert len(entries_before) == 4

    # Delete vehicle note
    vehicle_note = populated_case / "03_Vehicles" / "HR-26-AB-1234.md"
    assert vehicle_note.exists()
    vehicle_note.unlink()

    res = refresh_case_index(populated_case)
    assert res["status"] == "ok"
    assert res["deleted"] == ["03_Vehicles/HR-26-AB-1234.md"]
    assert res["modified"] == []
    assert res["added"] == []
    assert res["entries"] == 3
    assert len(res["unmodified"]) == 3

    content_after = index_path.read_text(encoding="utf-8")
    assert "HR-26-AB-1234.md" not in content_after
    assert "entries: 3" in content_after

    # Other 3 entries are preserved byte-for-byte
    entries_after = extract_entry_blocks(content_after)
    assert len(entries_after) == 3
    assert "03_Vehicles/HR-26-AB-1234.md" not in entries_after
    for p in ["01_People/Vikram Singh.md", "02_Identifiers/9812345678.md", "06_Events/FIR_0142_2026.md"]:
        assert entries_after[p] == entries_before[p]


def test_noop_refresh_no_modifications(populated_case: Path):
    """Test calling refresh when no notes were touched: 0 notes re-read."""
    index_path = populated_case / "_Case_Index.md"
    content_before = index_path.read_text(encoding="utf-8")
    entries_before = extract_entry_blocks(content_before)

    with patch("brain.index.incremental.parse_entity_note", wraps=brain.index.incremental.parse_entity_note) as spy_parse:
        res = refresh_case_index(populated_case)
        assert res["status"] == "ok"
        assert res["modified"] == []
        assert res["added"] == []
        assert res["deleted"] == []
        assert len(res["unmodified"]) == 4
        # ZERO file parses occurred
        assert spy_parse.call_count == 0

    content_after = index_path.read_text(encoding="utf-8")
    entries_after = extract_entry_blocks(content_after)
    for p, text in entries_before.items():
        assert entries_after[p] == text


def test_benchmark_80_notes_refresh_under_200ms(mock_case_dir: Path):
    """
    Performance benchmark requirement:
    - Execute refresh on 80-note case fixture.
    - Assert execution time < 200ms.
    """
    folders = [
        ("01_People", "person", "accused"),
        ("02_Identifiers", "identifier", "phone"),
        ("03_Vehicles", "vehicle", "transit"),
        ("04_Locations", "location", "hideout"),
        ("05_Organisations", "organisation", "gang"),
        ("06_Events", "event", "fir"),
    ]

    total_notes = 80
    for i in range(total_notes):
        folder_name, entity_type, role = folders[i % len(folders)]
        note_id = f"entity_{i:04d}"
        note_text = f"""---
id: {note_id}
type: {entity_type}
role: {role}
names: [Entity {i}]
identifiers: [98123400{i:02d}]
case: Case_01_Sonipat_Arms
---
# Entity {i}
Investigative entity record for node {i} active in Sonipat district.
## Links
- [[entity_{(i+1)%total_notes:04d}]] — co-offender contact ^[DOC_FIR p:1 l:{i+1}]
- [[entity_{(i+2)%total_notes:04d}]] — vehicle association ^[DOC_CDR row:{1000+i}]
"""
        note_path = mock_case_dir / folder_name / f"note_{i:04d}.md"
        note_path.write_text(note_text, encoding="utf-8")

    # Initial build
    build_case_index(mock_case_dir)

    # Modify exactly 1 note
    mod_target = mock_case_dir / "01_People" / "note_0000.md"
    new_mtime = mod_target.stat().st_mtime + 5.0
    mod_text = mod_target.read_text(encoding="utf-8") + "\nAdditional intelligence added.\n"
    mod_target.write_text(mod_text, encoding="utf-8")
    os.utime(mod_target, (new_mtime, new_mtime))

    # Benchmark refresh
    t0 = time.perf_counter()
    res = refresh_case_index(mock_case_dir)
    t1 = time.perf_counter()

    elapsed_ms = (t1 - t0) * 1000

    print(f"\n[BENCHMARK] 80-note case incremental refresh:")
    print(f"  Execution time: {elapsed_ms:.2f}ms (target < 200ms)")
    print(f"  Modified: {len(res['modified'])}")
    print(f"  Unmodified: {len(res['unmodified'])}")
    print(f"  Reported elapsed_ms: {res['elapsed_ms']}ms")

    assert res["status"] == "ok"
    assert res["entries"] == 80
    assert len(res["modified"]) == 1
    assert len(res["unmodified"]) == 79
    assert elapsed_ms < 200.0, f"Refresh took {elapsed_ms:.2f}ms, expected < 200ms"

    # Also verify zero-change refresh benchmark on 80 notes
    t0_noop = time.perf_counter()
    res_noop = refresh_case_index(mock_case_dir)
    t1_noop = time.perf_counter()
    noop_elapsed_ms = (t1_noop - t0_noop) * 1000

    print(f"[BENCHMARK] 80-note case noop refresh: {noop_elapsed_ms:.2f}ms (target < 200ms)")
    assert res_noop["modified"] == []
    assert len(res_noop["unmodified"]) == 80
    assert noop_elapsed_ms < 200.0


def test_fastapi_refresh_endpoint(populated_case: Path):
    """Test POST /api/index/refresh endpoint via TestClient."""
    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)

    # 1. Modify 1 note
    target = populated_case / "02_Identifiers" / "9812345678.md"
    new_mtime = target.stat().st_mtime + 5.0
    target.write_text(
        target.read_text(encoding="utf-8") + "\nNote updated via detective edit.\n",
        encoding="utf-8",
    )
    os.utime(target, (new_mtime, new_mtime))

    # 2. Call endpoint with JSON body
    resp = client.post("/api/index/refresh", json={"case_path": str(populated_case)})
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["entries"] == 4
    assert data["case_id"] == "Case_01_Sonipat_Arms"
    assert "02_Identifiers/9812345678.md" in data["modified"]
    assert len(data["unmodified"]) == 3
    assert data["index_path"].endswith("_Case_Index.md")

    # 3. Call endpoint with query params
    resp = client.post(f"/api/index/refresh?case_path={populated_case}")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"

    # 4. Nonexistent case 404
    resp = client.post("/api/index/refresh", json={"case_id": "Nonexistent_Case_12345"})
    assert resp.status_code == 404
    assert "not found" in resp.json()["detail"]


def test_missing_index_fallback(mock_case_dir: Path):
    """If _Case_Index.md does not exist, refresh gracefully triggers full build."""
    (mock_case_dir / "01_People" / "Vikram Singh.md").write_text(
        """---
id: person_0031
type: person
role: accused
names: [Vikram Singh]
case: Case_01_Sonipat_Arms
---
# Vikram Singh
Body text.
""",
        encoding="utf-8",
    )

    index_path = mock_case_dir / "_Case_Index.md"
    if index_path.exists():
        index_path.unlink()

    res = refresh_case_index(mock_case_dir)
    assert res["status"] == "ok"
    assert res["entries"] == 1
    assert "01_People/Vikram Singh.md" in res["added"]
    assert index_path.exists()
