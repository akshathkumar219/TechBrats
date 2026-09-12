"""
brain/guard.py — Law 1: Evidence is immutable.

Files in 00_Raw_Inputs/ are hashed at ingest, chmod 0444, and registered here.
No code path modifies them. There is no force parameter, no skip_validation flag,
and no internal bypass path.
"""

import os
from pathlib import Path
from typing import Union

# Registry of locked paths registered by ingest
LOCKED_PATHS: set[str] = set()


def register_locked_path(path: Union[str, Path]) -> None:
    """Register a path into the immutable registry."""
    resolved = str(Path(path).resolve())
    LOCKED_PATHS.add(resolved)


def is_path_locked(path: Union[str, Path]) -> bool:
    """Check if a path or its target is under 00_Raw_Inputs or registered as locked."""
    p = Path(path)
    try:
        resolved = str(p.resolve())
    except Exception:
        resolved = str(p.absolute())

    # Check path components for 00_Raw_Inputs
    if "00_Raw_Inputs" in p.parts or "00_Raw_Inputs" in Path(resolved).parts:
        return True

    # Check registered locked paths
    for locked in LOCKED_PATHS:
        if resolved == locked or resolved.startswith(locked + os.sep):
            return True

    return False


def assert_writable(path: Union[str, Path]) -> None:
    """
    Assert that a path is writable.
    Raises PermissionError on any path under 00_Raw_Inputs/ or in LOCKED_PATHS.
    Symlinks pointing into locked paths are resolved and rejected.
    """
    if is_path_locked(path):
        raise PermissionError(
            f"Law 1 Violation: Cannot write to '{path}'. Evidence in 00_Raw_Inputs/ is immutable."
        )


def safe_write(path: Union[str, Path], data: Union[bytes, str]) -> int:
    """
    Write data to path only after asserting it is writable.
    """
    assert_writable(path)
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    if isinstance(data, str):
        return p.write_text(data, encoding="utf-8")
    return p.write_bytes(data)


def lock_path(path: Union[str, Path]) -> None:
    """
    Lock an evidentiary path: sets chmod 0444 (or 0555 if dir) and registers with guard.
    """
    p = Path(path)
    if p.exists():
        if p.is_dir():
            os.chmod(p, 0o555)
        else:
            os.chmod(p, 0o444)
    register_locked_path(p)
