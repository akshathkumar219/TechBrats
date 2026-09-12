"""
brain/integrity.py — Evidence Integrity Verification (Law 1, Block 4 SHO-T03).

Law 1: Evidence is immutable.
Every file in 00_Raw_Inputs/ was classified, hashed, copied, locked (chmod 0444),
and registered with brain.guard on ingest.

This module provides deterministic verification of evidentiary files in 00_Raw_Inputs/
against their .sha256 sidecars.
"""

from datetime import datetime, timezone
import hashlib
import os
from pathlib import Path
from typing import Any, Optional, Union

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field

from brain.schemas import IntegrityResponse as BaseIntegrityResponse


class IntegrityFailure(BaseModel):
    """Details of an evidentiary integrity failure."""
    model_config = ConfigDict(extra="allow")

    filename: str
    expected_hash: Optional[str] = None
    actual_hash: Optional[str] = None
    timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    reason: str = "hash_mismatch"  # hash_mismatch | missing_sidecar | invalid_sidecar | unreadable_file
    file_path: Optional[str] = None

    def __getitem__(self, item: str) -> Any:
        return getattr(self, item)

    def get(self, item: str, default: Any = None) -> Any:
        return getattr(self, item, default)

    def __contains__(self, item: str) -> bool:
        return hasattr(self, item)

    def __str__(self) -> str:
        if self.reason == "missing_sidecar":
            return f"[{self.timestamp}] {self.filename}: missing sidecar .sha256"
        return (
            f"[{self.timestamp}] {self.filename}: {self.reason} "
            f"(expected={self.expected_hash}, actual={self.actual_hash})"
        )


# Export IntegrityFailure into brain.schemas module dynamically if not present
import brain.schemas

if not hasattr(brain.schemas, "IntegrityFailure"):
    setattr(brain.schemas, "IntegrityFailure", IntegrityFailure)


class IntegrityResponse(BaseIntegrityResponse):
    """
    Evidence verification response for case vault.
    Inherits from brain.schemas.IntegrityResponse with full backwards-compatibility.
    """
    model_config = ConfigDict(extra="allow")

    status: str = "verified"  # "verified" | "contaminated"
    failures: list[Any] = Field(default_factory=list)
    total_documents: int = 0
    document_count: int = 0
    verified_at: Optional[str] = None


def compute_file_sha256(file_path: Union[Path, str]) -> str:
    """Recomputes SHA-256 hash of a file on disk in chunks."""
    hasher = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            hasher.update(chunk)
    return hasher.hexdigest().lower()


def parse_sidecar_hash(sidecar_path: Path) -> Optional[str]:
    """
    Parses a .sha256 sidecar file and returns the 64-character lowercase hex hash.
    Supports standard sha256sum output format ('<hash>  <filename>') or raw hex string.
    """
    try:
        content = sidecar_path.read_text(encoding="utf-8", errors="replace").strip()
        if not content:
            return None
        token = content.split()[0].strip().lower()
        if len(token) == 64 and all(c in "0123456789abcdef" for c in token):
            return token
        return None
    except Exception:
        return None


def resolve_case_dir(case_dir: Union[Path, str]) -> Path:
    """
    Resolves a case directory from Path, relative string, or case_id identifier.
    """
    p = Path(case_dir)
    if p.exists() and p.is_dir():
        return p.resolve()

    # Try resolving via vaults root
    try:
        from brain.vault import get_vaults_root
        vaults_root = get_vaults_root()
        candidate = (vaults_root / case_dir).resolve()
        if candidate.exists() and candidate.is_dir():
            return candidate

        if vaults_root.exists() and vaults_root.is_dir():
            for child in vaults_root.iterdir():
                if child.is_dir() and not child.name.startswith("."):
                    if child.name == str(case_dir):
                        return child.resolve()
                    cfg = child / "Case_Config.yaml"
                    if cfg.exists():
                        try:
                            import yaml
                            with open(cfg, "r", encoding="utf-8") as f:
                                data = yaml.safe_load(f)
                            if data and (
                                data.get("case_id") == str(case_dir)
                                or data.get("case_name") == str(case_dir)
                            ):
                                return child.resolve()
                        except Exception:
                            pass
    except Exception:
        pass

    # Try default 'vaults' folder
    default_vaults = Path("vaults")
    if default_vaults.exists() and default_vaults.is_dir():
        candidate = (default_vaults / case_dir).resolve()
        if candidate.exists() and candidate.is_dir():
            return candidate
        for child in default_vaults.iterdir():
            if child.is_dir() and child.name == str(case_dir):
                return child.resolve()

    # Last resort: "data/" — the demo case vault lives here rather than under
    # a configured vaults root. brain.orchestrator.resolve_case_dir checks the
    # same location; keep both resolvers in agreement.
    default_data = Path("data")
    if default_data.exists() and default_data.is_dir():
        candidate = (default_data / case_dir).resolve()
        if candidate.exists() and candidate.is_dir():
            return candidate
        for child in default_data.iterdir():
            if child.is_dir() and child.name == str(case_dir):
                return child.resolve()

    return p.resolve()


def find_evidentiary_files(raw_inputs_dir: Path) -> list[Path]:
    """
    Walks raw_inputs_dir and returns all evidentiary files,
    excluding .sha256 sidecars and hidden files/directories.
    """
    evidentiary_files: list[Path] = []
    for root, dirs, files in os.walk(raw_inputs_dir):
        # Exclude hidden directories in-place
        dirs[:] = [d for d in dirs if not d.startswith(".")]
        for f_name in files:
            if f_name.startswith("."):
                continue
            if f_name.endswith(".sha256"):
                continue
            file_path = Path(root) / f_name
            evidentiary_files.append(file_path)

    evidentiary_files.sort(key=lambda p: str(p.relative_to(raw_inputs_dir)))
    return evidentiary_files


def verify_case_integrity(case_dir: Union[Path, str]) -> IntegrityResponse:
    """
    Walks 00_Raw_Inputs/ in the case vault.
    For every evidentiary file (excluding .sha256 sidecars and hidden files):
      - Checks for existing .sha256 sidecar. If missing, reports as a failure.
      - Re-computes SHA-256 hash of the file bytes on disk.
      - Compares against sidecar hash.
      - If mismatch: records failure with filename, expected_hash, actual_hash, and timestamp.

    Returns IntegrityResponse:
      - status: "verified" (if all match) or "contaminated" (if any failure).
      - failures: list of failure details.
      - total_documents: count of verified documents.
      - verified_at: ISO timestamp.
    """
    case_path = resolve_case_dir(case_dir)
    if not case_path.exists():
        raise FileNotFoundError(f"Case directory does not exist: {case_dir}")
    if not case_path.is_dir():
        raise ValueError(f"Case path is not a directory: {case_dir}")

    if case_path.name == "00_Raw_Inputs" and case_path.is_dir():
        raw_inputs_dir = case_path
    else:
        raw_inputs_dir = case_path / "00_Raw_Inputs"

    if not raw_inputs_dir.exists() or not raw_inputs_dir.is_dir():
        raise FileNotFoundError(f"Missing '00_Raw_Inputs' directory in case vault: {case_path}")

    evidentiary_files = find_evidentiary_files(raw_inputs_dir)
    failures: list[IntegrityFailure] = []

    for file_path in evidentiary_files:
        now_ts = datetime.now(timezone.utc).isoformat()

        # Locate sidecar: primary is <file>.sha256, secondary is with_suffix(".sha256")
        sidecar_path = file_path.parent / f"{file_path.name}.sha256"
        if not sidecar_path.exists():
            alt_sidecar = file_path.with_suffix(".sha256")
            if alt_sidecar.exists():
                sidecar_path = alt_sidecar

        if not sidecar_path.exists():
            # Sidecar missing
            actual = None
            try:
                actual = compute_file_sha256(file_path)
            except Exception:
                pass
            failures.append(
                IntegrityFailure(
                    filename=file_path.name,
                    expected_hash=None,
                    actual_hash=actual,
                    timestamp=now_ts,
                    reason="missing_sidecar",
                    file_path=str(file_path),
                )
            )
            continue

        # Sidecar exists -> extract expected hash
        expected_hash = parse_sidecar_hash(sidecar_path)
        if not expected_hash:
            actual = None
            try:
                actual = compute_file_sha256(file_path)
            except Exception:
                pass
            failures.append(
                IntegrityFailure(
                    filename=file_path.name,
                    expected_hash=None,
                    actual_hash=actual,
                    timestamp=now_ts,
                    reason="invalid_sidecar",
                    file_path=str(file_path),
                )
            )
            continue

        # Recompute SHA-256 of file on disk
        try:
            actual_hash = compute_file_sha256(file_path)
        except Exception as e:
            failures.append(
                IntegrityFailure(
                    filename=file_path.name,
                    expected_hash=expected_hash,
                    actual_hash=None,
                    timestamp=now_ts,
                    reason=f"unreadable_file: {e}",
                    file_path=str(file_path),
                )
            )
            continue

        # Compare hashes
        if actual_hash.lower() != expected_hash.lower():
            failures.append(
                IntegrityFailure(
                    filename=file_path.name,
                    expected_hash=expected_hash,
                    actual_hash=actual_hash,
                    timestamp=now_ts,
                    reason="hash_mismatch",
                    file_path=str(file_path),
                )
            )

    status = "contaminated" if failures else "verified"
    total_docs = len(evidentiary_files)
    verified_at = datetime.now(timezone.utc).isoformat()

    return IntegrityResponse(
        status=status,
        failures=failures,
        total_documents=total_docs,
        document_count=total_docs,
        verified_at=verified_at,
    )


# FastAPI Router definition
router = APIRouter(tags=["integrity"])


@router.get("/api/case/integrity", response_model=IntegrityResponse)
def get_case_integrity(
    case_path: Optional[str] = Query(None, description="Path to case vault directory"),
    case_id: Optional[str] = Query(None, description="Case ID"),
) -> IntegrityResponse:
    """
    Verify evidence integrity across 00_Raw_Inputs/ against SHA-256 sidecars.
    Accepts case_path or case_id via query parameters.
    """
    target = case_path or case_id
    if not target:
        try:
            from brain.vault import get_vaults_root, list_cases
            cases = list_cases(get_vaults_root())
            if cases:
                target = cases[0].get("path")
        except Exception:
            pass

    if not target:
        raise HTTPException(
            status_code=400,
            detail="No case specified via 'case_path' or 'case_id', and no default cases found.",
        )

    try:
        return verify_case_integrity(target)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
