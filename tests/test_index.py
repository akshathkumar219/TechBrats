"""
Tests for brain/index/build.py (HER-T01).

Validates:
1. Parsing entity notes matching data/TEMPLATE_FIR.md and CASE_MODEL.md note formats.
2. CaseIndexEntry schema compatibility (id, type, role, names, identifiers, existing_links, key_facts, mtime).
3. Resilient parsing: malformed notes are skipped with loud warnings without crashing the build.
4. _Case_Index.md generation with valid YAML frontmatter, correct sections, and compact formatting.
5. FastAPI endpoint POST /api/index/rebuild using TestClient.
6. Line and token efficiency for 80-note cases (strictly under 300 lines).
"""

import logging
import sys
from pathlib import Path

# Ensure repo root is in sys.path for direct pytest invocation
REPO_ROOT = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

import pytest
import yaml
from fastapi import FastAPI
from fastapi.testclient import TestClient

from brain.schemas import CaseIndexEntry
from brain.index.build import (
    parse_entity_note,
    walk_case_notes,
    generate_case_index_content,
    build_case_index,
    router,
)


@pytest.fixture
def mock_case_dir(tmp_path: Path) -> Path:
    """Create a mock case directory structure with config."""
    case_dir = tmp_path / "Case_01_Sonipat_Arms"
    case_dir.mkdir(parents=True, exist_ok=True)

    # Folders
    for folder in [
        "01_People",
        "02_Identifiers",
        "03_Vehicles",
        "04_Locations",
        "05_Organisations",
        "06_Events",
    ]:
        (case_dir / folder).mkdir(parents=True, exist_ok=True)

    # Config
    config_file = case_dir / "Case_Config.yaml"
    config_file.write_text("case: Case_01_Sonipat_Arms\nprovider: ollama\n", encoding="utf-8")
    return case_dir


def test_parse_template_fir_note(mock_case_dir: Path):
    """Test parsing a note matching data/TEMPLATE_FIR.md exactly."""
    template_path = Path("data/TEMPLATE_FIR.md")
    assert template_path.exists(), "data/TEMPLATE_FIR.md must exist"

    note_file = mock_case_dir / "06_Events" / "FIR_0142_2026.md"
    note_file.write_text(template_path.read_text(encoding="utf-8"), encoding="utf-8")

    entry = parse_entity_note(note_file, mock_case_dir)
    assert entry is not None
    assert isinstance(entry, CaseIndexEntry)

    # Verify fields
    assert entry.id == "fir_0142_2026"
    assert entry.type == "event"
    assert entry.role == "fir"
    assert entry.file_path == "06_Events/FIR_0142_2026.md"

    # Verify identifiers parsed
    assert "9812345678" in entry.identifiers
    assert "9896011223" in entry.identifiers
    assert "HR-26-AB-1234" in entry.identifiers

    # Verify existing links parsed from ## Links
    assert "Vikram Singh" in entry.existing_links
    assert "Rehan Khan" in entry.existing_links
    assert "Balwinder Singh" in entry.existing_links
    assert "PS Kharkhoda" in entry.existing_links

    # Verify 3-5 salient facts extracted
    assert 3 <= len(entry.key_facts) <= 5
    # Verify mtime
    assert entry.mtime > 0


def test_parse_person_note(mock_case_dir: Path):
    """Test parsing a person note matching CASE_MODEL.md §4 format."""
    person_note = """---
id: person_0031
type: person
role: accused
names: [Vikram Singh, "विक्रम सिंह", V. Singh]
identifiers: [9812345678, 869123456789012]
case: Case_01_Sonipat_Arms
gang: Sonipat Arms Ring
created: 2026-02-14
updated: 2026-02-19
---

# Vikram Singh

Named as accused in FIR 0142/2026, Kharkhoda. ^[FIR_0142 p:2 l:9]

## Links
- [[9812345678]] — registered to him ^[FIR_0142 p:2 l:11]
- [[Rehan Khan]] — 14 calls over 3 days before the seizure ^[CDR_9812345678 row:48219] <!-- ai:prop_0007 accepted -->
"""
    note_file = mock_case_dir / "01_People" / "Vikram Singh.md"
    note_file.write_text(person_note, encoding="utf-8")

    entry = parse_entity_note(note_file, mock_case_dir)
    assert entry is not None
    assert entry.id == "person_0031"
    assert entry.type == "person"
    assert entry.role == "accused"
    assert "Vikram Singh" in entry.names
    assert "विक्रम सिंह" in entry.names
    assert "9812345678" in entry.identifiers
    assert "869123456789012" in entry.identifiers
    assert "9812345678" in entry.existing_links
    assert "Rehan Khan" in entry.existing_links
    assert 3 <= len(entry.key_facts) <= 5
    assert entry.mtime > 0


def test_malformed_notes_skipped_gracefully(mock_case_dir: Path, caplog: pytest.LogCaptureFixture):
    """
    Robust parsing requirement:
    If a note's frontmatter is malformed, log the filename loudly with a warning and skip it.
    Never crash the build on one bad note.
    """
    # 1. Valid note
    valid_note = """---
id: person_0001
type: person
role: witness
names: [Sandeep Malik]
identifiers: []
case: Case_01_Sonipat_Arms
---
# Sandeep Malik
Witness to vehicle movement near Kharkhoda bypass.
"""
    (mock_case_dir / "01_People" / "valid_person.md").write_text(valid_note, encoding="utf-8")

    # 2. No frontmatter delimiters
    (mock_case_dir / "01_People" / "no_delims.md").write_text(
        "# Just a heading\nNo yaml here.",
        encoding="utf-8",
    )

    # 3. Unclosed frontmatter
    (mock_case_dir / "01_People" / "unclosed.md").write_text(
        "---\nid: bad_01\ntype: person\nNo closing delimiter",
        encoding="utf-8",
    )

    # 4. Broken YAML syntax
    (mock_case_dir / "01_People" / "syntax_error.md").write_text(
        "---\nid: [broken: yaml: {\n---\nBody",
        encoding="utf-8",
    )

    # 5. Missing id
    (mock_case_dir / "01_People" / "missing_id.md").write_text(
        "---\ntype: person\nnames: [Unknown]\n---\nBody",
        encoding="utf-8",
    )

    # 6. Frontmatter is a list, not a mapping
    (mock_case_dir / "01_People" / "list_frontmatter.md").write_text(
        "---\n- item1\n- item2\n---\nBody",
        encoding="utf-8",
    )

    # Walk notes should not crash and should log warnings loudly
    with caplog.at_level(logging.WARNING):
        entries = walk_case_notes(mock_case_dir)

    # Only the valid note was parsed
    assert len(entries) == 1
    assert entries[0].id == "person_0001"

    # Confirm warnings were logged for malformed notes
    warning_text = caplog.text
    assert "no_delims.md" in warning_text
    assert "unclosed.md" in warning_text
    assert "syntax_error.md" in warning_text
    assert "missing_id.md" in warning_text
    assert "list_frontmatter.md" in warning_text


def test_build_case_index_file_generation(mock_case_dir: Path):
    """Verify _Case_Index.md is generated with valid YAML frontmatter and expected sections."""
    # Write notes across multiple entity folders
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

    index_path, entries = build_case_index(mock_case_dir)
    assert index_path.exists()
    assert index_path.name == "_Case_Index.md"
    assert len(entries) == 4

    content = index_path.read_text(encoding="utf-8")

    # Verify YAML frontmatter
    assert content.startswith("---\n")
    parts = content.split("---\n", 2)
    assert len(parts) >= 3
    fm = yaml.safe_load(parts[1])
    assert fm["case"] == "Case_01_Sonipat_Arms"
    assert fm["entries"] == 4
    assert "built" in fm

    # Verify sections present
    assert "## People" in content
    assert "## Identifiers" in content
    assert "## Vehicles" in content
    assert "## Events" in content

    # Verify line format: - <id> · <display_name> · <role> · <rel_path> · mtime:<mtime>
    assert "- person_0031 · Vikram Singh · accused · 01_People/Vikram Singh.md · mtime:" in content
    assert "- ident_0001 · 9812345678 · phone · 02_Identifiers/9812345678.md · mtime:" in content
    assert "- veh_0001 · HR-26-AB-1234 · transport · 03_Vehicles/HR-26-AB-1234.md · mtime:" in content
    assert "- fir_0142_2026 · FIR 0142/2026 — PS Kharkhoda · fir · 06_Events/FIR_0142_2026.md · mtime:" in content

    # Verify summary lines start with 2 spaces
    for line in content.splitlines():
        if line.startswith("- "):
            continue
        if "Phones:" in line or "Identifiers:" in line or "Links:" in line:
            assert line.startswith("  ")


def test_rebuild_endpoint_testclient(mock_case_dir: Path):
    """Test POST /api/index/rebuild using TestClient."""
    # Write one note
    (mock_case_dir / "01_People" / "Vikram Singh.md").write_text(
        """---
id: person_0031
type: person
role: accused
names: [Vikram Singh]
identifiers: [9812345678]
case: Case_01_Sonipat_Arms
---
# Vikram Singh
Named accused in FIR 0142/2026.
""",
        encoding="utf-8",
    )

    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)

    # 1. Success via JSON body case_path
    resp = client.post("/api/index/rebuild", json={"case_path": str(mock_case_dir)})
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["entries"] == 1
    assert data["case_id"] == "Case_01_Sonipat_Arms"
    assert data["index_path"].endswith("_Case_Index.md")
    assert Path(data["index_path"]).exists()

    # 2. Success via Query parameter case_path
    resp = client.post(f"/api/index/rebuild?case_path={mock_case_dir}")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"

    # 3. 404 on nonexistent case_id
    resp = client.post("/api/index/rebuild", json={"case_id": "Nonexistent_Case_Folder_9999"})
    assert resp.status_code == 404
    assert "not found" in resp.json()["detail"]


def test_index_compactness_and_token_efficiency(mock_case_dir: Path):
    """
    Benchmark line and token efficiency on an 80-note case.
    Requirement: Must stay compact (target under 300 lines for an 80-note case)
    so it fits whole in LLM context.
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
Investigative entity record for operation node {i} active in Sonipat district.
## Links
- [[entity_{(i+1)%total_notes:04d}]] — co-offender contact ^[DOC_FIR p:1 l:{i+1}]
- [[entity_{(i+2)%total_notes:04d}]] — vehicle association ^[DOC_CDR row:{1000+i}]
"""
        note_path = mock_case_dir / folder_name / f"note_{i:04d}.md"
        note_path.write_text(note_text, encoding="utf-8")

    index_path, entries = build_case_index(mock_case_dir)
    assert len(entries) == 80

    index_text = index_path.read_text(encoding="utf-8")
    lines = index_text.splitlines()
    line_count = len(lines)
    char_count = len(index_text)
    word_count = len(index_text.split())
    # Standard LLM heuristic: ~4 chars per token or ~1.3 tokens per word
    est_tokens = max(char_count // 4, int(word_count * 1.3))

    print(f"\n[BENCHMARK] 80-note case index:")
    print(f"  Line count: {line_count} (target < 300)")
    print(f"  Character count: {char_count}")
    print(f"  Estimated tokens: {est_tokens}")

    # Strict requirement: under 300 lines for 80 notes
    assert line_count < 300, f"Expected under 300 lines, got {line_count}"
    # With 2 lines per entry + headers, 80 notes should be ~170-190 lines
    assert line_count <= 200

    # Token footprint should easily fit in any small context window (< 5000 tokens)
    assert est_tokens < 5000
