"""
tests/test_vault.py — Comprehensive tests for case vault creation, opening, discovery, and API.
"""

import sys
from pathlib import Path

# Ensure root repository is in sys.path
repo_root = Path(__file__).resolve().parent.parent
if str(repo_root) not in sys.path:
    sys.path.insert(0, str(repo_root))

from datetime import datetime
import shutil
import pytest
import yaml
from fastapi import FastAPI
from fastapi.testclient import TestClient

from brain.vault import (
    create_case,
    open_case,
    list_cases,
    router,
    set_default_vaults_root,
    REQUIRED_CASE_DIRS,
    RAW_INPUT_SUBDIRS,
    CONFIG_FILE_NAME,
    INDEX_FILE_NAME,
    REQUIRED_CONFIG_KEYS,
)


@pytest.fixture
def api_client():
    """Create a FastAPI TestClient mounted with the vault router."""
    app = FastAPI(title="Vault Test App")
    app.include_router(router)
    return TestClient(app)


def test_create_case_full_hierarchy(tmp_path):
    """Test that create_case writes the exact directory and file structure from CASE_MODEL.md §3."""
    case_name = "Case_01_Sonipat_Arms"
    case_meta = create_case(tmp_path, case_name)

    case_dir = tmp_path / case_name
    assert case_dir.is_dir()

    # Verify all 8 required top-level directories
    for req_dir in REQUIRED_CASE_DIRS:
        assert (case_dir / req_dir).is_dir(), f"Missing top-level directory: {req_dir}"

    # Verify all 5 raw input subdirectories
    for raw_sub in RAW_INPUT_SUBDIRS:
        assert (case_dir / "00_Raw_Inputs" / raw_sub).is_dir(), f"Missing raw input subfolder: {raw_sub}"

    # Verify files exist
    assert (case_dir / CONFIG_FILE_NAME).is_file(), "Case_Config.yaml was not created"
    assert (case_dir / INDEX_FILE_NAME).is_file(), "_Case_Index.md was not created"

    # Verify _Case_Index.md content has valid frontmatter
    index_content = (case_dir / INDEX_FILE_NAME).read_text(encoding="utf-8")
    assert index_content.startswith("---")
    assert f"case: {case_name}" in index_content
    assert "entries: 0" in index_content

    # Check returned metadata
    assert case_meta["case_id"] == case_name
    assert case_meta["case_name"] == case_name
    assert case_meta["model_provider"] == "ollama"
    assert case_meta["model_name"] == "llama3"


def test_create_case_direct_case_path(tmp_path):
    """Test create_case when passed the direct case directory path."""
    target_dir = tmp_path / "Direct_Case"
    case_meta = create_case(target_dir, "Direct_Case")

    assert target_dir.is_dir()
    assert (target_dir / CONFIG_FILE_NAME).exists()
    assert case_meta["path"] == str(target_dir.resolve())


def test_case_config_keys_and_content(tmp_path):
    """Test that Case_Config.yaml contains all exact required keys and respects options."""
    vaults_root = tmp_path / "vaults"
    custom_thresholds = {"phonetic": 0.92, "temporal_window_hours": 72}

    case_meta = create_case(
        vaults_root,
        case_name="Special Arms Operation",
        case_id="Case_09_Special_Ops",
        model_provider="gemini",
        model_name="gemini-2.5-flash",
        resolution_thresholds=custom_thresholds,
        tool_version="0.1.0",
    )

    case_dir = vaults_root / "Case_09_Special_Ops"
    config_file = case_dir / CONFIG_FILE_NAME
    assert config_file.exists()

    with open(config_file, "r", encoding="utf-8") as f:
        config_data = yaml.safe_load(f)

    # Verify exact keys
    for req_key in REQUIRED_CONFIG_KEYS:
        assert req_key in config_data, f"Missing key in Case_Config.yaml: {req_key}"

    assert config_data["case_id"] == "Case_09_Special_Ops"
    assert config_data["case_name"] == "Special Arms Operation"
    assert config_data["model_provider"] == "gemini"
    assert config_data["model_name"] == "gemini-2.5-flash"
    assert config_data["resolution_thresholds"] == custom_thresholds
    assert config_data["tool_version"] == "0.1.0"

    # Verify created is an ISO timestamp
    created_str = str(config_data["created"])
    # Parsing should not raise
    datetime.fromisoformat(created_str.replace("Z", "+00:00"))


def test_invalid_model_provider_rejected(tmp_path):
    """Test that an unsupported model_provider raises a ValueError."""
    with pytest.raises(ValueError, match="Invalid model_provider"):
        create_case(tmp_path, "Invalid_Case", model_provider="anthropic")


def test_open_case_valid_with_entities_and_docs(tmp_path):
    """Test open_case returns full metadata including entity and document counts."""
    case_meta = create_case(tmp_path, "Case_01_Sonipat_Arms")
    case_dir = Path(case_meta["path"])

    # Plant an entity note with wiki-links
    person_note = case_dir / "01_People" / "Vikram Singh.md"
    person_note.write_text(
        "---\n"
        "id: person_0031\n"
        "type: person\n"
        "role: accused\n"
        "case: Case_01_Sonipat_Arms\n"
        "---\n\n"
        "# Vikram Singh\n\n"
        "## Links\n"
        "- [[9812345678]] — primary registered number ^[FIR_0142 p:2 l:11]\n"
        "- [[Rehan Khan]] — calls logged ^[CDR_9812345678 row:48219]\n",
        encoding="utf-8",
    )

    # Plant a raw document and sidecar
    fir_doc = case_dir / "00_Raw_Inputs" / "FIR" / "FIR_0142.pdf"
    fir_doc.write_bytes(b"%PDF mock FIR data")
    sidecar = case_dir / "00_Raw_Inputs" / "FIR" / "FIR_0142.pdf.sha256"
    sidecar.write_text("abc123sha256", encoding="utf-8")

    opened = open_case(case_dir)
    assert opened["case_id"] == "Case_01_Sonipat_Arms"
    assert opened["entity_count"] == 1
    assert opened["document_count"] == 1
    assert opened["link_count"] == 2
    assert opened["id"] == "Case_01_Sonipat_Arms"
    assert opened["name"] == "Case_01_Sonipat_Arms"


def test_open_case_missing_directory(tmp_path):
    """Test that open_case raises ValueError if a required directory is missing."""
    case_meta = create_case(tmp_path, "Case_Missing_Dir")
    case_dir = Path(case_meta["path"])

    # Remove 01_People
    shutil.rmtree(case_dir / "01_People")
    with pytest.raises(ValueError, match="Missing required case directory: 01_People"):
        open_case(case_dir)

    # Recreate 01_People and remove 00_Raw_Inputs/FIR
    (case_dir / "01_People").mkdir()
    shutil.rmtree(case_dir / "00_Raw_Inputs" / "FIR")
    with pytest.raises(ValueError, match="Missing required raw input subdirectory"):
        open_case(case_dir)


def test_open_case_missing_config(tmp_path):
    """Test that open_case raises FileNotFoundError if Case_Config.yaml is missing."""
    case_meta = create_case(tmp_path, "Case_Missing_Config")
    case_dir = Path(case_meta["path"])

    (case_dir / CONFIG_FILE_NAME).unlink()
    with pytest.raises(FileNotFoundError, match="Missing required case configuration file"):
        open_case(case_dir)


def test_open_case_missing_index(tmp_path):
    """Test that open_case raises ValueError if _Case_Index.md is missing."""
    case_meta = create_case(tmp_path, "Case_Missing_Index")
    case_dir = Path(case_meta["path"])

    (case_dir / INDEX_FILE_NAME).unlink()
    with pytest.raises(ValueError, match="Missing required case index file"):
        open_case(case_dir)


def test_open_case_corrupted_config(tmp_path):
    """Test that open_case raises ValueError when Case_Config.yaml is corrupted or missing required keys."""
    case_meta = create_case(tmp_path, "Case_Corrupt_Config")
    case_dir = Path(case_meta["path"])

    # Invalid YAML
    config_file = case_dir / CONFIG_FILE_NAME
    config_file.write_text("invalid: yaml: content: [unclosed", encoding="utf-8")
    with pytest.raises(ValueError, match="Failed to parse"):
        open_case(case_dir)

    # Missing a required key (e.g. 'tool_version')
    partial_config = {
        "case_id": "Case_01",
        "case_name": "Test",
        "created": "2026-02-14T00:00:00",
        "model_provider": "ollama",
        "model_name": "llama3",
        "resolution_thresholds": {},
    }
    with open(config_file, "w", encoding="utf-8") as f:
        yaml.safe_dump(partial_config, f)

    with pytest.raises(ValueError, match="missing required keys"):
        open_case(case_dir)


def test_open_case_nonexistent_path(tmp_path):
    """Test that open_case raises FileNotFoundError on non-existent path."""
    with pytest.raises(FileNotFoundError):
        open_case(tmp_path / "nonexistent_vault_folder")


def test_list_cases_discovery(tmp_path):
    """Test list_cases discovers all valid cases in a vaults directory and ignores invalid folders."""
    vaults_root = tmp_path / "vaults"
    vaults_root.mkdir()

    # Discovering empty root
    assert list_cases(vaults_root) == []

    # Non-existent root returns empty list
    assert list_cases(tmp_path / "does_not_exist") == []

    # Create two valid cases
    create_case(vaults_root, "Case_01_Sonipat_Arms")
    create_case(vaults_root, "Case_02_Rohtak_Hijack")

    # Create a non-case folder
    junk_folder = vaults_root / "junk_data"
    junk_folder.mkdir()
    (junk_folder / "notes.txt").write_text("not a case", encoding="utf-8")

    cases = list_cases(vaults_root)
    assert len(cases) == 2
    case_ids = [c["case_id"] for c in cases]
    assert "Case_01_Sonipat_Arms" in case_ids
    assert "Case_02_Rohtak_Hijack" in case_ids

    # Calling list_cases on a single case folder directly
    direct_single = list_cases(vaults_root / "Case_01_Sonipat_Arms")
    assert len(direct_single) == 1
    assert direct_single[0]["case_id"] == "Case_01_Sonipat_Arms"


def test_api_get_cases_endpoint(tmp_path, api_client, monkeypatch):
    """Test the GET /api/cases FastAPI endpoint using TestClient."""
    vaults_root = tmp_path / "api_vaults"
    vaults_root.mkdir()

    create_case(vaults_root, "Case_01_Sonipat_Arms")
    create_case(vaults_root, "Case_02_Rohtak_Hijack")

    # 1. Test via query parameter
    res = api_client.get(f"/api/cases?vaults_root={vaults_root}")
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 2
    names = [c["case_name"] for c in data]
    assert "Case_01_Sonipat_Arms" in names
    assert "Case_02_Rohtak_Hijack" in names

    # 2. Test via VAULTS_ROOT environment variable
    monkeypatch.setenv("VAULTS_ROOT", str(vaults_root))
    res_env = api_client.get("/api/cases")
    assert res_env.status_code == 200
    data_env = res_env.json()
    assert len(data_env) == 2

    # 3. Test via set_default_vaults_root
    alt_root = tmp_path / "alt_vaults"
    alt_root.mkdir()
    create_case(alt_root, "Case_03_Panipat_Narcotics")
    monkeypatch.delenv("VAULTS_ROOT", raising=False)
    set_default_vaults_root(alt_root)

    res_alt = api_client.get("/api/cases")
    assert res_alt.status_code == 200
    data_alt = res_alt.json()
    assert len(data_alt) == 1
    assert data_alt[0]["case_name"] == "Case_03_Panipat_Narcotics"
