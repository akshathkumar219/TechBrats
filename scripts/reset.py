#!/usr/bin/env python3
"""
scripts/reset.py — SyndicateBrain (SIH26189) Demo State Reset.

Wipes the demo case vault, re-ingests pristine synthetic case data from data/,
re-locks 00_Raw_Inputs/ (chmod 0444, registered with brain.guard), and rebuilds
the index via brain.index.build.build_case_index. Returns to slide-one state
in under 20 seconds.

Options:
  --case <name>        Case folder name (default: Case_01_Sonipat_Arms)
  --target-dir <dir>   Target case directory (default: data — this is what the
                        live app actually resolves and serves; see BUG #3 note
                        on validate_safety() for why this changed from "vaults")
  --source-dir <dir>   Source pristine template directory (default: data/_pristine)
  --cached             Prepares cached model proposals/responses in 07_AI_Synthesis/
  --dry-run            Simulate operations without touching disk
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import shutil
import stat
import sys
import time
from pathlib import Path
from typing import Any, Union

# Ensure repository root is in sys.path
REPO_ROOT = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from brain.guard import lock_path, register_locked_path
from brain.index.build import build_case_index
from brain.mocks import MOCK_ANALYSIS_RESULT, MOCK_COPILOT_RESPONSE, MOCK_PROPOSALS

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("syndicatebrain.reset")


def validate_safety(
    target_dir: Union[str, Path],
    case_name: str,
) -> tuple[Path, Path]:
    """
    Safety checks to guarantee reset NEVER wipes anything outside the designated
    case-vault target directory, and never touches the pristine template or the
    repo's code/docs/tests.

    Rules:
    1. case_name cannot be empty, '.', '..', or contain path separators ('/', '\\').
    2. target_dir must resolve to a valid path distinct from repo root, root '/', or user home.
    3. case_path must be strictly directly inside target_dir.
    4. case_path cannot be repo root, user home, system root, or inside code/doc/test dirs.
    5. case_path can never be, or be inside, the pristine template directory
       (data/_pristine/) — that is the read-only donor reset copies FROM, and
       must never be a wipe target.
    6. case_path can never be `data/` itself (the bare data directory) — only
       a named case folder directly under it may be reset.

    NOTE on architecture (BUG #3 fix, SIH26189):
    Earlier, this defaulted to target_dir="vaults", but the live app
    (brain/orchestrator.py::resolve_case_dir, brain/integrity.py::resolve_case_dir)
    actually resolves and serves the case from data/Case_01_Sonipat_Arms directly.
    `vaults/` create_case/open_case machinery (brain/vault.py, SHO-T01) was never
    adopted as the live path. So `data/Case_01_Sonipat_Arms` is, today, both the
    thing every endpoint reads/writes AND (historically) the "pristine" donor
    reset copied from — those two roles can't share one path without reset
    wiping its own source. The fix: keep a separate pristine snapshot at
    data/_pristine/<case_name>/ as the read-only template, and make reset's
    default target_dir="data" / source_dir="data/_pristine" so `make reset`
    actually resets the same directory the live app serves. `data` is no
    longer blanket-protected (a named case folder under it is precisely what
    we now intend to reset) but the bare `data` directory and the pristine
    template subtree remain protected, alongside brain/web/docs/scripts/tests/.git.
    """
    if not case_name or not case_name.strip():
        raise ValueError("Safety check failed: Case name cannot be empty.")

    clean_case = case_name.strip()
    if "/" in clean_case or "\\" in clean_case or clean_case in (".", ".."):
        raise ValueError(f"Safety check failed: Invalid case name '{case_name}'. Path traversal prohibited.")

    target_dir_path = Path(target_dir).resolve()
    case_path = (target_dir_path / clean_case).resolve()

    # Disallow wiping system root, user home, or repo root
    forbidden_roots = {Path("/").resolve(), Path.home().resolve(), REPO_ROOT.resolve()}
    if target_dir_path in forbidden_roots:
        raise ValueError(f"Safety check failed: Target directory '{target_dir}' is a protected root path.")
    if case_path in forbidden_roots:
        raise ValueError(f"Safety check failed: Case path '{case_path}' is a protected root path.")

    # Must be strictly a direct child of target_dir_path
    if case_path.parent != target_dir_path:
        raise ValueError(
            f"Safety check failed: Case path '{case_path}' must be directly under '{target_dir_path}'."
        )

    # Forbid targeting within code/doc/test directories of the repo (full subtree protection)
    protected_subdirs = ["brain", "web", "docs", "scripts", "tests", ".git"]
    for protected in protected_subdirs:
        prot_path = (REPO_ROOT / protected).resolve()
        if prot_path == case_path or prot_path in case_path.parents:
            raise ValueError(
                f"Safety check failed: Refusing to wipe protected repository path '{case_path}'."
            )

    # The bare `data/` directory itself may never be the wipe target (only a
    # named case folder directly under it may be).
    data_path = (REPO_ROOT / "data").resolve()
    if case_path == data_path:
        raise ValueError(
            f"Safety check failed: Refusing to wipe protected repository path '{case_path}'."
        )

    # The pristine template subtree is the read-only donor reset copies FROM —
    # it must never itself be a wipe target, however target_dir is configured.
    pristine_path = (REPO_ROOT / "data" / "_pristine").resolve()
    if case_path == pristine_path or pristine_path in case_path.parents or case_path in pristine_path.parents:
        raise ValueError(
            f"Safety check failed: Refusing to wipe protected pristine template path '{case_path}'."
        )

    return target_dir_path, case_path


def unlock_path_recursive(path: Path) -> None:
    """
    Recursively restores write permissions on all files and directories within a path
    so that read-only 00_Raw_Inputs (chmod 0444/0555) can be wiped cleanly.
    """
    if not path.exists():
        return

    for root, dirs, files in os.walk(path, topdown=False):
        for fname in files:
            fpath = Path(root) / fname
            try:
                os.chmod(fpath, stat.S_IRUSR | stat.S_IWUSR | stat.S_IRGRP | stat.S_IROTH)
            except Exception:
                pass
        for dname in dirs:
            dpath = Path(root) / dname
            try:
                os.chmod(dpath, stat.S_IRWXU | stat.S_IRGRP | stat.S_IXGRP | stat.S_IROTH | stat.S_IXOTH)
            except Exception:
                pass

    try:
        os.chmod(path, stat.S_IRWXU | stat.S_IRGRP | stat.S_IXGRP | stat.S_IROTH | stat.S_IXOTH)
    except Exception:
        pass


def wipe_demo_case(case_path: Path, dry_run: bool = False) -> None:
    """Safely and cleanly wipes any existing demo case directory."""
    if not case_path.exists():
        return

    if dry_run:
        logger.info("[dry-run] Would wipe existing vault: %s", case_path)
        return

    logger.info("Wiping existing case vault: %s", case_path)
    unlock_path_recursive(case_path)
    shutil.rmtree(case_path)


def copy_pristine_case(
    source_case_path: Path,
    target_case_path: Path,
    dry_run: bool = False,
) -> None:
    """Copies the pristine synthetic case data from data/ into target vault."""
    if not source_case_path.exists() or not source_case_path.is_dir():
        raise FileNotFoundError(f"Source case directory does not exist: {source_case_path}")

    if dry_run:
        logger.info("[dry-run] Would copy %s -> %s", source_case_path, target_case_path)
        return

    logger.info("Copying pristine case: %s -> %s", source_case_path, target_case_path)
    target_case_path.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(source_case_path, target_case_path)

    # Ensure 07_AI_Synthesis directory exists
    synth_dir = target_case_path / "07_AI_Synthesis"
    synth_dir.mkdir(parents=True, exist_ok=True)


def lock_raw_inputs(case_path: Path, dry_run: bool = False) -> int:
    """
    Locks 00_Raw_Inputs/ evidentiary files with chmod 0444 and registers them with brain.guard.
    Directory entries are set to chmod 0555 to prevent additions/renames (Law 1).
    Returns count of locked files.
    """
    raw_dir = case_path / "00_Raw_Inputs"
    if not raw_dir.exists():
        return 0

    if dry_run:
        logger.info("[dry-run] Would lock evidentiary files in %s", raw_dir)
        return 0

    locked_count = 0
    # Walk all contents bottom-up to lock files first, then directories
    for root, dirs, files in os.walk(raw_dir, topdown=False):
        for fname in files:
            fpath = Path(root) / fname
            try:
                os.chmod(fpath, 0o444)
                register_locked_path(fpath)
                locked_count += 1
            except Exception as e:
                logger.warning("Could not set chmod 0444 on %s: %s", fpath, e)

        for dname in dirs:
            dpath = Path(root) / dname
            try:
                os.chmod(dpath, 0o555)
                register_locked_path(dpath)
            except Exception as e:
                logger.warning("Could not set chmod 0555 on %s: %s", dpath, e)

    try:
        os.chmod(raw_dir, 0o555)
        register_locked_path(raw_dir)
    except Exception as e:
        logger.warning("Could not set chmod 0555 on %s: %s", raw_dir, e)

    logger.info("Locked %d files in 00_Raw_Inputs/ (chmod 0444)", locked_count)
    return locked_count


def setup_cached_responses(
    case_path: Path,
    source_case_path: Path,
    dry_run: bool = False,
) -> dict[str, Any]:
    """
    Prepares pre-computed / cached model responses in 07_AI_Synthesis/ so a model
    that stalls or degrades mid-demo doesn't kill the presentation.
    """
    synth_dir = case_path / "07_AI_Synthesis"

    if dry_run:
        logger.info("[dry-run] Would write cached responses to %s", synth_dir)
        return {"status": "dry-run", "cached": True}

    synth_dir.mkdir(parents=True, exist_ok=True)

    # 1. If source case has any fixtures in 07_AI_Synthesis, copy them
    source_synth = source_case_path / "07_AI_Synthesis"
    if source_synth.is_dir():
        for item in source_synth.iterdir():
            dest = synth_dir / item.name
            if item.is_file():
                shutil.copy2(item, dest)
            elif item.is_dir():
                shutil.copytree(item, dest, dirs_exist_ok=True)

    # 2. Pre-computed analysis result fixture
    analysis_file = synth_dir / "analysis_result.json"
    analysis_data = MOCK_ANALYSIS_RESULT.model_dump(mode="json")
    analysis_file.write_text(json.dumps(analysis_data, indent=2), encoding="utf-8")

    # 3. Pre-computed proposal fixtures
    proposals_file = synth_dir / "proposals.json"
    proposals_data = [p.model_dump(mode="json") for p in MOCK_PROPOSALS]
    proposals_file.write_text(json.dumps(proposals_data, indent=2), encoding="utf-8")

    # 4. Pre-computed copilot response fixture
    copilot_file = synth_dir / "copilot_response.json"
    copilot_data = MOCK_COPILOT_RESPONSE.model_dump(mode="json")
    copilot_file.write_text(json.dumps(copilot_data, indent=2), encoding="utf-8")

    # 5. Cache ready indicator marker
    marker_file = synth_dir / ".cache_ready"
    marker_content = {
        "status": "ready",
        "case": case_path.name,
        "proposals_count": len(MOCK_PROPOSALS),
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    marker_file.write_text(json.dumps(marker_content, indent=2), encoding="utf-8")

    logger.info("Pre-computed model cache prepared in %s", synth_dir)
    return marker_content


def reset_case(
    case_name: str = "Case_01_Sonipat_Arms",
    target_dir: Union[str, Path] = "data",
    source_dir: Union[str, Path] = "data/_pristine",
    cached: bool = False,
    dry_run: bool = False,
) -> dict[str, Any]:
    """
    Main reset function:
    1. Performs safety validation.
    2. Wipes the demo case vault.
    3. Re-ingests / copies pristine synthetic case.
    4. Re-locks 00_Raw_Inputs/ (chmod 0444).
    5. Rebuilds case index via brain.index.build.build_case_index.
    6. Sets up cached fixtures if --cached is passed.
    7. Returns timing and status report.
    """
    start_time = time.perf_counter()

    # Safety check
    target_dir_path, target_case_path = validate_safety(target_dir, case_name)
    source_dir_path = Path(source_dir).resolve()
    source_case_path = (source_dir_path / case_name).resolve()

    # Self-wipe guard: source and target can never be the same directory, or
    # wipe_demo_case would delete the pristine data before copy_pristine_case
    # ever reads it. (This is what stops source_dir="data" / target_dir="data"
    # from destroying the donor case.)
    if source_case_path == target_case_path:
        raise ValueError(
            "Safety check failed: source_case_path and target_case_path are identical "
            f"('{source_case_path}'). Reset would wipe its own pristine source. "
            "source_dir and target_dir must resolve to different directories."
        )

    # Wipe existing
    wipe_demo_case(target_case_path, dry_run=dry_run)

    # Copy pristine
    copy_pristine_case(source_case_path, target_case_path, dry_run=dry_run)

    # Lock raw inputs
    locked_count = lock_raw_inputs(target_case_path, dry_run=dry_run)

    # Rebuild index
    entries_count = 0
    index_file_path: Union[Path, None] = None
    if not dry_run:
        index_file_path, entries = build_case_index(target_case_path, case_id=case_name)
        entries_count = len(entries)
    else:
        logger.info("[dry-run] Would rebuild index with brain.index.build.build_case_index")

    # Cached responses
    cache_info = None
    if cached:
        cache_info = setup_cached_responses(target_case_path, source_case_path, dry_run=dry_run)

    elapsed_seconds = time.perf_counter() - start_time

    report = {
        "status": "success",
        "case_name": case_name,
        "target_path": str(target_case_path),
        "source_path": str(source_case_path),
        "locked_files": locked_count,
        "index_entries": entries_count,
        "index_path": str(index_file_path) if index_file_path else None,
        "cached": cached,
        "cache_info": cache_info,
        "dry_run": dry_run,
        "elapsed_seconds": round(elapsed_seconds, 4),
    }

    return report


def main() -> int:
    parser = argparse.ArgumentParser(
        description="SyndicateBrain (SIH26189) demo case reset utility."
    )
    parser.add_argument(
        "--case",
        default="Case_01_Sonipat_Arms",
        help="Case folder name (default: Case_01_Sonipat_Arms)",
    )
    parser.add_argument(
        "--target-dir",
        default="data",
        help="Target case directory (default: data — the directory the live app actually serves)",
    )
    parser.add_argument(
        "--source-dir",
        default="data/_pristine",
        help="Source pristine template directory (default: data/_pristine)",
    )
    parser.add_argument(
        "--cached",
        action="store_true",
        help="Prepare pre-computed / cached model responses in 07_AI_Synthesis/",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Simulate operations without modifying filesystem",
    )

    args = parser.parse_args()

    try:
        result = reset_case(
            case_name=args.case,
            target_dir=args.target_dir,
            source_dir=args.source_dir,
            cached=args.cached,
            dry_run=args.dry_run,
        )
    except Exception as err:
        print(f"\n[ERROR] Reset failed: {err}", file=sys.stderr)
        return 1

    elapsed = result["elapsed_seconds"]
    print("\n" + "=" * 60)
    print("  SyndicateBrain (SIH26189) — Demo Case Reset")
    print("=" * 60)
    print(f"Case:             {result['case_name']}")
    print(f"Target Vault:     {result['target_path']}")
    print(f"Raw Inputs Lock:  {result['locked_files']} files locked (chmod 0444)")
    print(f"Case Index:       {result['index_entries']} entries rebuilt in _Case_Index.md")
    print(f"Cached Responses: {'YES (07_AI_Synthesis ready)' if result['cached'] else 'NO (pristine demo state)'}")
    print(f"Dry Run:          {result['dry_run']}")
    print(f"Execution Time:   {elapsed:.2f}s (< 20.0s requirement)")
    print("=" * 60)

    if elapsed > 20.0:
        print(f"[WARNING] Reset took {elapsed:.2f}s, exceeding 20s target!", file=sys.stderr)

    return 0


if __name__ == "__main__":
    sys.exit(main())
