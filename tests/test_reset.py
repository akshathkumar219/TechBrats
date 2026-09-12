"""
tests/test_reset.py — Tests for Demo State Reset (AKS-T07).

Verifies:
1. Resetting demo case in a temporary test directory.
2. Files are correctly copied from pristine data/.
3. 00_Raw_Inputs/ files are locked with chmod 0444 and registered.
4. _Case_Index.md is rebuilt with entries.
5. --cached flag prepares pre-computed model responses in 07_AI_Synthesis/.
6. Execution completes well under 20 seconds (< 5 seconds).
7. Safety validation strictly refuses wiping anything outside designated vaults dir.
8. Idempotency (multiple runs in succession succeed identically).
9. Dry-run mode does not touch disk.
10. CLI execution via subprocess with arguments.
"""

from __future__ import annotations

import json
import os
import stat
import subprocess
import sys
import time
from pathlib import Path

import pytest

# Ensure repository root is in sys.path
REPO_ROOT = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from scripts.reset import (
    copy_pristine_case,
    lock_raw_inputs,
    reset_case,
    setup_cached_responses,
    unlock_path_recursive,
    validate_safety,
    wipe_demo_case,
)


@pytest.fixture
def temp_vaults_env(tmp_path):
    """
    Creates a temporary vaults directory and ensures cleanup safely unlocks
    any chmod 0444 / 0555 files and directories on teardown.
    """
    vaults_dir = tmp_path / "vaults"
    vaults_dir.mkdir(parents=True, exist_ok=True)

    yield vaults_dir

    # Teardown: unlock so pytest can remove tmp_path
    unlock_path_recursive(tmp_path)


def test_reset_in_temp_directory(temp_vaults_env):
    """Verify demo case reset restores files, locks 00_Raw_Inputs/, and rebuilds index."""
    result = reset_case(
        case_name="Case_01_Sonipat_Arms",
        target_dir=temp_vaults_env,
        source_dir=REPO_ROOT / "data",
        cached=False,
    )

    assert result["status"] == "success"
    assert result["case_name"] == "Case_01_Sonipat_Arms"
    assert result["index_entries"] > 0
    assert result["locked_files"] > 0

    case_path = temp_vaults_env / "Case_01_Sonipat_Arms"
    assert case_path.is_dir()
    assert (case_path / "Case_Config.yaml").is_file()
    assert (case_path / "01_People").is_dir()
    assert (case_path / "02_Identifiers").is_dir()
    assert (case_path / "07_AI_Synthesis").is_dir()

    # Verify index rebuilt with entries
    index_path = case_path / "_Case_Index.md"
    assert index_path.is_file()
    index_content = index_path.read_text(encoding="utf-8")
    assert "entries:" in index_content
    assert "## People" in index_content
    assert "Vikram Singh" in index_content

    # Verify 00_Raw_Inputs/ files are chmod 0444 (read-only)
    raw_dir = case_path / "00_Raw_Inputs"
    assert raw_dir.is_dir()
    raw_files = [f for f in raw_dir.rglob("*") if f.is_file()]
    assert len(raw_files) > 0

    for f in raw_files:
        mode = oct(f.stat().st_mode & 0o777)
        assert mode == "0o444", f"Expected 0o444 for {f}, got {mode}"
        # Direct write attempt must fail
        with pytest.raises(PermissionError):
            with open(f, "a", encoding="utf-8") as fh:
                fh.write("illegal append")


def test_reset_cached_mode(temp_vaults_env):
    """Verify --cached prepares pre-computed model responses in 07_AI_Synthesis/."""
    result = reset_case(
        case_name="Case_01_Sonipat_Arms",
        target_dir=temp_vaults_env,
        source_dir=REPO_ROOT / "data",
        cached=True,
    )

    assert result["cached"] is True
    synth_dir = temp_vaults_env / "Case_01_Sonipat_Arms" / "07_AI_Synthesis"
    assert synth_dir.is_dir()

    # Check cache ready marker
    cache_ready_file = synth_dir / ".cache_ready"
    assert cache_ready_file.is_file()
    cache_meta = json.loads(cache_ready_file.read_text(encoding="utf-8"))
    assert cache_meta["status"] == "ready"
    assert cache_meta["proposals_count"] > 0

    # Check analysis_result.json fixture
    analysis_file = synth_dir / "analysis_result.json"
    assert analysis_file.is_file()
    analysis_data = json.loads(analysis_file.read_text(encoding="utf-8"))
    assert "new_connections" in analysis_data
    assert len(analysis_data["new_connections"]) > 0

    # Check proposals.json fixture
    proposals_file = synth_dir / "proposals.json"
    assert proposals_file.is_file()
    proposals_data = json.loads(proposals_file.read_text(encoding="utf-8"))
    assert isinstance(proposals_data, list)
    assert len(proposals_data) > 0

    # Check copilot_response.json fixture
    copilot_file = synth_dir / "copilot_response.json"
    assert copilot_file.is_file()
    copilot_data = json.loads(copilot_file.read_text(encoding="utf-8"))
    assert "answer" in copilot_data
    assert "citations" in copilot_data


def test_reset_execution_time_under_five_seconds(temp_vaults_env):
    """Verify reset executes well under 20 seconds (specifically < 5.0 seconds)."""
    t0 = time.perf_counter()
    result = reset_case(
        case_name="Case_01_Sonipat_Arms",
        target_dir=temp_vaults_env,
        source_dir=REPO_ROOT / "data",
        cached=True,
    )
    total_elapsed = time.perf_counter() - t0

    assert result["elapsed_seconds"] < 5.0, f"Reset took {result['elapsed_seconds']}s (expected < 5.0s)"
    assert total_elapsed < 5.0, f"Total wall-clock elapsed {total_elapsed}s (expected < 5.0s)"
    assert result["elapsed_seconds"] < 20.0


def test_safety_refuses_outside_target_vaults(temp_vaults_env):
    """Verify safety checks strictly prevent path traversal or wiping outside vaults."""
    # 1. Path traversal in case name
    with pytest.raises(ValueError, match="Path traversal prohibited|Invalid case name"):
        validate_safety(temp_vaults_env, "../outside_case")

    with pytest.raises(ValueError, match="Path traversal prohibited|Invalid case name"):
        validate_safety(temp_vaults_env, "..")

    with pytest.raises(ValueError, match="Path traversal prohibited|Invalid case name"):
        validate_safety(temp_vaults_env, "foo/bar")

    # 2. Empty case name
    with pytest.raises(ValueError, match="Case name cannot be empty"):
        validate_safety(temp_vaults_env, "")

    # 3. Protected system/root targets
    with pytest.raises(ValueError, match="protected root path"):
        validate_safety("/", "Case_01_Sonipat_Arms")

    with pytest.raises(ValueError, match="protected root path"):
        validate_safety(str(REPO_ROOT), "Case_01_Sonipat_Arms")

    # 4. Protected repo subdirectories
    with pytest.raises(ValueError, match="Refusing to wipe protected repository path"):
        validate_safety(REPO_ROOT / "data", "Case_01_Sonipat_Arms")


def test_reset_idempotent(temp_vaults_env):
    """Verify reset can run repeatedly (e.g. 5 times in a row) with identical results."""
    first_report = None
    for run in range(5):
        report = reset_case(
            case_name="Case_01_Sonipat_Arms",
            target_dir=temp_vaults_env,
            source_dir=REPO_ROOT / "data",
            cached=False,
        )
        assert report["status"] == "success"
        if first_report is None:
            first_report = report
        else:
            assert report["index_entries"] == first_report["index_entries"]
            assert report["locked_files"] == first_report["locked_files"]

    case_path = temp_vaults_env / "Case_01_Sonipat_Arms"
    assert (case_path / "_Case_Index.md").exists()


def test_reset_dry_run(temp_vaults_env):
    """Verify dry-run mode simulates without altering the filesystem."""
    target_case = temp_vaults_env / "Case_01_Sonipat_Arms"
    assert not target_case.exists()

    report = reset_case(
        case_name="Case_01_Sonipat_Arms",
        target_dir=temp_vaults_env,
        source_dir=REPO_ROOT / "data",
        dry_run=True,
    )

    assert report["dry_run"] is True
    # Case directory should NOT have been created
    assert not target_case.exists()


def test_cli_execution(temp_vaults_env):
    """Verify CLI execution of scripts/reset.py via subprocess."""
    cmd = [
        sys.executable,
        str(REPO_ROOT / "scripts" / "reset.py"),
        "--target-dir",
        str(temp_vaults_env),
        "--cached",
    ]

    proc = subprocess.run(cmd, capture_output=True, text=True, check=False)
    assert proc.returncode == 0
    assert "Demo Case Reset" in proc.stdout
    assert "Execution Time:" in proc.stdout
    assert "< 20.0s requirement" in proc.stdout

    # Test CLI failure on unsafe arguments
    unsafe_cmd = [
        sys.executable,
        str(REPO_ROOT / "scripts" / "reset.py"),
        "--case",
        "../unsafe_traversal",
    ]
    unsafe_proc = subprocess.run(unsafe_cmd, capture_output=True, text=True, check=False)
    assert unsafe_proc.returncode != 0
    assert "Reset failed: Safety check failed" in unsafe_proc.stderr
