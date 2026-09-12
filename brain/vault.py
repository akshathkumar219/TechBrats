"""
brain/vault.py — Case vault structure, configuration, and discovery.

THE SIX LAWS:
1. Evidence is immutable (00_Raw_Inputs/ files hashed, locked, verified).
2. The map is deterministic; the AI only proposes (record-derived vs AI-proposed).
3. Every link carries its reason and citation.
4. Nothing is asserted without a citation.
5. The case is temporal (notes and links carry timestamps/dates).
6. Identity is resolved conservatively.

Case Vault Folder Structure (CASE_MODEL.md §3):
  Case_01_Sonipat_Arms/
    00_Raw_Inputs/          locked on ingest — hashed, chmod 0444, read-only
      FIR/
      CDR/
      TowerDump/
      Statement/
      FieldLog/
    01_People/              role: accused | witness | complainant | victim | officer
    02_Identifiers/         type: phone | imei | account | vehicle_reg | handle | email
    03_Vehicles/
    04_Locations/
    05_Organisations/
    06_Events/
    07_AI_Synthesis/        agent output only — never mixed with human notes
    _Case_Index.md          the memory file
    Case_Config.yaml
"""

import datetime as dt
from datetime import datetime, timezone
import os
from pathlib import Path
from typing import Any, Optional, Union
import yaml

from fastapi import APIRouter, Query


# Top-level required case directories
REQUIRED_CASE_DIRS: list[str] = [
    "00_Raw_Inputs",
    "01_People",
    "02_Identifiers",
    "03_Vehicles",
    "04_Locations",
    "05_Organisations",
    "06_Events",
    "07_AI_Synthesis",
]

# Required subdirectories under 00_Raw_Inputs/
RAW_INPUT_SUBDIRS: list[str] = [
    "FIR",
    "CDR",
    "TowerDump",
    "Statement",
    "FieldLog",
]

CONFIG_FILE_NAME: str = "Case_Config.yaml"
INDEX_FILE_NAME: str = "_Case_Index.md"

REQUIRED_CONFIG_KEYS: set[str] = {
    "case_id",
    "case_name",
    "created",
    "model_provider",
    "model_name",
    "resolution_thresholds",
    "tool_version",
}

DEFAULT_VAULTS_ROOT: Path = Path("vaults")


def get_vaults_root() -> Path:
    """Retrieve the current default root directory for case vaults."""
    env_root = os.getenv("VAULTS_ROOT")
    if env_root:
        return Path(env_root)
    return DEFAULT_VAULTS_ROOT


def set_default_vaults_root(root: Union[Path, str]) -> None:
    """Set the process-level default root directory for case vaults."""
    global DEFAULT_VAULTS_ROOT
    DEFAULT_VAULTS_ROOT = Path(root)


def count_entities(case_dir: Path) -> int:
    """Count entity markdown notes across 01_People through 06_Events."""
    entity_dirs = [
        "01_People",
        "02_Identifiers",
        "03_Vehicles",
        "04_Locations",
        "05_Organisations",
        "06_Events",
    ]
    count = 0
    for ed in entity_dirs:
        folder = case_dir / ed
        if folder.is_dir():
            count += sum(1 for f in folder.glob("*.md"))
    return count


def count_documents(case_dir: Path) -> int:
    """Count evidentiary files in 00_Raw_Inputs/ excluding .sha256 sidecars."""
    raw_dir = case_dir / "00_Raw_Inputs"
    if not raw_dir.is_dir():
        return 0
    return sum(
        1 for f in raw_dir.rglob("*")
        if f.is_file() and not f.name.endswith(".sha256") and not f.name.startswith(".")
    )


def count_links(case_dir: Path) -> int:
    """Count wiki-links defined in entity notes."""
    entity_dirs = [
        "01_People",
        "02_Identifiers",
        "03_Vehicles",
        "04_Locations",
        "05_Organisations",
        "06_Events",
    ]
    total_links = 0
    for ed in entity_dirs:
        folder = case_dir / ed
        if folder.is_dir():
            for note in folder.glob("*.md"):
                try:
                    for line in note.read_text(encoding="utf-8").splitlines():
                        if line.strip().startswith("- [["):
                            total_links += 1
                except Exception:
                    pass
    return total_links


def _resolve_case_dir(vault_path: Union[Path, str], case_name: str, case_id: Optional[str] = None) -> Path:
    """Determine the destination case directory from vault_path and case_name."""
    p = Path(vault_path)
    folder_slug = case_id or case_name.strip().replace(" ", "_")

    if p.name == case_name or p.name == folder_slug or p.name.replace(" ", "_") == folder_slug:
        return p
    if (p / CONFIG_FILE_NAME).exists() or (p / "00_Raw_Inputs").exists():
        return p
    return p / folder_slug


def create_case(
    vault_path: Union[Path, str],
    case_name: str,
    case_id: Optional[str] = None,
    model_provider: str = "ollama",
    model_name: Optional[str] = None,
    resolution_thresholds: Optional[dict[str, Any]] = None,
    tool_version: str = "0.1.0",
) -> dict[str, Any]:
    """
    Writes the exact case folder structure from CASE_MODEL.md §3:
    00_Raw_Inputs/ (with subdirectories FIR/, CDR/, TowerDump/, Statement/, FieldLog/)
    01_People/
    02_Identifiers/
    03_Vehicles/
    04_Locations/
    05_Organisations/
    06_Events/
    07_AI_Synthesis/
    _Case_Index.md (empty/minimal initial memory file)
    Case_Config.yaml
    """
    if model_provider not in ("ollama", "gemini"):
        raise ValueError(f"Invalid model_provider '{model_provider}'. Must be 'ollama' or 'gemini'.")

    resolved_case_id = case_id or case_name.strip().replace(" ", "_")
    resolved_model_name = model_name or ("llama3" if model_provider == "ollama" else "gemini-2.5-flash")
    resolved_thresholds = resolution_thresholds or {
        "phonetic": 0.85,
        "temporal_window_hours": 48,
    }

    case_dir = _resolve_case_dir(vault_path, case_name, resolved_case_id)
    case_dir.mkdir(parents=True, exist_ok=True)

    # Create top-level directories
    for dir_name in REQUIRED_CASE_DIRS:
        (case_dir / dir_name).mkdir(parents=True, exist_ok=True)

    # Create 00_Raw_Inputs subdirectories
    raw_dir = case_dir / "00_Raw_Inputs"
    for sub in RAW_INPUT_SUBDIRS:
        (raw_dir / sub).mkdir(parents=True, exist_ok=True)

    # Generate timestamp
    created_ts = datetime.now(timezone.utc).isoformat()

    # Create minimal _Case_Index.md if not already existing
    index_path = case_dir / INDEX_FILE_NAME
    if not index_path.exists():
        index_content = (
            f"---\n"
            f"case: {resolved_case_id}\n"
            f"built: '{created_ts}'\n"
            f"entries: 0\n"
            f"---\n"
        )
        index_path.write_text(index_content, encoding="utf-8")

    # Write Case_Config.yaml
    config_path = case_dir / CONFIG_FILE_NAME
    config_data: dict[str, Any] = {
        "case_id": resolved_case_id,
        "case_name": case_name,
        "created": created_ts,
        "model_provider": model_provider,
        "model_name": resolved_model_name,
        "resolution_thresholds": resolved_thresholds,
        "tool_version": tool_version,
    }

    with open(config_path, "w", encoding="utf-8") as f:
        yaml.safe_dump(config_data, f, sort_keys=False, default_flow_style=False)

    return open_case(case_dir)


def open_case(path: Union[Path, str]) -> dict[str, Any]:
    """
    Validates the case structure, checks that all required directories and Case_Config.yaml exist,
    parses Case_Config.yaml, and returns case metadata.
    Raises FileNotFoundError or ValueError if invalid.
    """
    case_dir = Path(path)
    if not case_dir.exists():
        raise FileNotFoundError(f"Case directory does not exist: {path}")
    if not case_dir.is_dir():
        raise ValueError(f"Case path is not a directory: {path}")

    # Check top-level required directories
    for d_name in REQUIRED_CASE_DIRS:
        d_path = case_dir / d_name
        if not d_path.exists():
            raise ValueError(f"Missing required case directory: {d_name}")
        if not d_path.is_dir():
            raise ValueError(f"Required path is not a directory: {d_name}")

    # Check 00_Raw_Inputs subdirectories
    raw_dir = case_dir / "00_Raw_Inputs"
    for sub in RAW_INPUT_SUBDIRS:
        sub_path = raw_dir / sub
        if not sub_path.exists():
            raise ValueError(f"Missing required raw input subdirectory: 00_Raw_Inputs/{sub}")
        if not sub_path.is_dir():
            raise ValueError(f"Required raw input path is not a directory: 00_Raw_Inputs/{sub}")

    # Check Case_Config.yaml
    config_path = case_dir / CONFIG_FILE_NAME
    if not config_path.exists():
        raise FileNotFoundError(f"Missing required case configuration file: {CONFIG_FILE_NAME}")
    if not config_path.is_file():
        raise ValueError(f"Case configuration path is not a file: {CONFIG_FILE_NAME}")

    try:
        with open(config_path, "r", encoding="utf-8") as f:
            config = yaml.safe_load(f)
    except Exception as e:
        raise ValueError(f"Failed to parse {CONFIG_FILE_NAME}: {e}")

    if not isinstance(config, dict):
        raise ValueError(f"{CONFIG_FILE_NAME} must be a valid YAML mapping.")

    # Validate required keys
    missing_keys = REQUIRED_CONFIG_KEYS - set(config.keys())
    if missing_keys:
        raise ValueError(f"{CONFIG_FILE_NAME} missing required keys: {sorted(missing_keys)}")

    # Check _Case_Index.md
    index_path = case_dir / INDEX_FILE_NAME
    if not index_path.exists():
        raise ValueError(f"Missing required case index file: {INDEX_FILE_NAME}")

    # Normalize created timestamp to string
    created_val = config.get("created")
    if isinstance(created_val, (dt.date, dt.datetime)):
        created_str = created_val.isoformat()
    else:
        created_str = str(created_val)

    metadata: dict[str, Any] = {
        "case_id": str(config["case_id"]),
        "case_name": str(config["case_name"]),
        "id": str(config["case_id"]),
        "name": str(config["case_name"]),
        "path": str(case_dir.resolve()),
        "created": created_str,
        "model_provider": str(config["model_provider"]),
        "model_name": str(config["model_name"]),
        "resolution_thresholds": config["resolution_thresholds"],
        "tool_version": str(config["tool_version"]),
        "entity_count": count_entities(case_dir),
        "document_count": count_documents(case_dir),
        "link_count": count_links(case_dir),
    }

    # Retain any extra keys present in Case_Config.yaml
    for k, v in config.items():
        if k not in metadata:
            metadata[k] = v

    return metadata


def list_cases(vaults_root: Union[Path, str]) -> list[dict[str, Any]]:
    """
    Discovers and returns all valid cases inside vaults_root.
    """
    root = Path(vaults_root)
    if not root.exists():
        return []

    # If root itself is a valid case directory
    if (root / CONFIG_FILE_NAME).exists():
        try:
            return [open_case(root)]
        except (ValueError, FileNotFoundError):
            return []

    if not root.is_dir():
        return []

    cases: list[dict[str, Any]] = []
    for item in sorted(root.iterdir()):
        if item.is_dir() and not item.name.startswith("."):
            try:
                cases.append(open_case(item))
            except (ValueError, FileNotFoundError):
                continue

    cases.sort(key=lambda c: str(c.get("case_name", "")))
    return cases


# FastAPI Router definition
from fastapi import APIRouter, Body, HTTPException, Query
from pydantic import BaseModel, ConfigDict


class NoteWriteRequest(BaseModel):
    model_config = ConfigDict(extra="allow")
    path: str
    content: str
    case_id: Optional[str] = None


class NoteCreateRequest(BaseModel):
    model_config = ConfigDict(extra="allow")
    path: str
    content: Optional[str] = ""
    case_id: Optional[str] = None


def resolve_case_file(
    rel_or_abs_path: Union[str, Path],
    case_id: Optional[str] = None,
) -> tuple[Path, Path]:
    """
    Resolves a case file path.
    Returns (case_dir, absolute_file_path).
    """
    raw_p = Path(rel_or_abs_path)

    clean_cid: Optional[str] = str(case_id) if (case_id and isinstance(case_id, str)) else None

    # 1. Try finding case directory if explicitly specified
    case_dir: Optional[Path] = None
    if clean_cid:
        for root in [Path("vaults"), Path("data"), get_vaults_root()]:
            cand = root / clean_cid
            if cand.is_dir():
                case_dir = cand
                break

    # 2. If path starts with a case folder name, peel it off
    if case_dir is None and len(raw_p.parts) > 1:
        first = raw_p.parts[0]
        for root in [Path("vaults"), Path("data"), get_vaults_root()]:
            cand = root / first
            if cand.is_dir():
                case_dir = cand
                raw_p = Path(*raw_p.parts[1:])
                break

    # 3. Default fallback to Case_01_Sonipat_Arms in vaults/ or data/
    if case_dir is None:
        for root in [Path("vaults"), Path("data"), get_vaults_root()]:
            cand = root / "Case_01_Sonipat_Arms"
            if cand.is_dir():
                case_dir = cand
                break

    if case_dir is None:
        case_dir = Path("vaults/Case_01_Sonipat_Arms")

    # If raw_p still has the case_dir name as leading component, strip it
    if len(raw_p.parts) > 0 and raw_p.parts[0] == case_dir.name:
        raw_p = Path(*raw_p.parts[1:])

    resolved_case_dir = case_dir.resolve()
    full_path = (resolved_case_dir / raw_p).resolve()
    return resolved_case_dir, full_path


router = APIRouter(tags=["vault"])


@router.get("/api/cases")
def get_cases(
    vaults_root: Optional[str] = Query(None, description="Optional path to vaults root directory")
) -> list[dict[str, Any]]:
    """List available cases discovered in the vaults root."""
    root = Path(vaults_root) if (vaults_root and isinstance(vaults_root, str)) else get_vaults_root()
    return list_cases(root)


@router.get("/api/vault/tree")
def get_vault_tree(
    case_id: Optional[str] = Query(None, description="Case identifier or name"),
) -> list[dict[str, Any]]:
    """
    Returns list of all files in the case vault with metadata.
    Enables frontend to load real vault structure without requiring browser directory picker.
    """
    cid = case_id if (case_id and isinstance(case_id, str)) else None
    case_dir, _ = resolve_case_file("dummy", case_id=cid)
    if not case_dir.exists() or not case_dir.is_dir():
        # Fallback to data directory
        for root in [Path("data"), Path("vaults")]:
            cand = root / (cid or "Case_01_Sonipat_Arms")
            if cand.is_dir():
                case_dir = cand
                break

    files_meta: list[dict[str, Any]] = []
    if not case_dir.exists() or not case_dir.is_dir():
        return files_meta

    for p in sorted(case_dir.rglob("*")):
        if p.is_file() and not p.name.startswith(".") and not p.name.endswith(".sha256"):
            rel_path = str(p.relative_to(case_dir))
            is_locked = "00_Raw_Inputs" in p.parts
            role = None
            if rel_path.startswith("01_People"):
                stem = p.stem.lower()
                if "vikram" in stem or "rehan" in stem or "sandeep" in stem or "balwinder" in stem:
                    role = "accused"
                elif "chander" in stem or "witness" in stem or "rohit" in stem:
                    role = "witness"
                elif "rajesh" in stem or "ramphal" in stem or "si " in stem or "inspector" in stem:
                    role = "officer"
                elif "suresh" in stem:
                    role = "complainant"

            files_meta.append({
                "path": rel_path,
                "name": p.name,
                "size": p.stat().st_size,
                "is_locked": is_locked,
                "mtime": p.stat().st_mtime,
                "role": role,
                "type": "file",
            })

    return files_meta


@router.get("/api/vault/note")
def get_vault_note(
    path: str = Query(..., description="Note relative path"),
    case_id: Optional[str] = Query(None, description="Case ID"),
):
    """Reads and returns the note body and lock status."""
    cid = case_id if (case_id and isinstance(case_id, str)) else None
    case_dir, file_path = resolve_case_file(path, cid)
    if not file_path.exists() or not file_path.is_file():
        # Also check in data/ if not in vaults/
        alt_root = Path("data") if "vaults" in case_dir.parts else Path("vaults")
        alt_file = alt_root / case_dir.name / Path(path)
        if alt_file.exists() and alt_file.is_file():
            file_path = alt_file
            case_dir = alt_root / case_dir.name
        else:
            raise HTTPException(status_code=404, detail=f"Note not found: {path}")

    try:
        content = file_path.read_text(encoding="utf-8", errors="replace")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read note: {e}")

    is_locked = "00_Raw_Inputs" in file_path.parts
    return {
        "path": str(file_path.relative_to(case_dir)),
        "name": file_path.name,
        "content": content,
        "is_locked": is_locked,
        "mtime": file_path.stat().st_mtime,
    }


@router.post("/api/vault/note")
def post_vault_note(
    req: NoteWriteRequest,
):
    """
    Saves note content to disk using safe_write (Law 1 protected).
    Raises 403 HTTP PermissionError if target is in 00_Raw_Inputs/.
    """
    case_dir, file_path = resolve_case_file(req.path, req.case_id)

    from brain.guard import is_path_locked, safe_write
    if is_path_locked(file_path):
        raise HTTPException(
            status_code=403,
            detail=f"Law 1 Violation: Cannot write to '{file_path.name}'. Evidence in 00_Raw_Inputs/ is immutable.",
        )

    try:
        safe_write(file_path, req.content)
    except PermissionError as pe:
        raise HTTPException(status_code=403, detail=str(pe))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Write failed: {e}")

    # Rebuild index incrementally for markdown notes
    if file_path.suffix == ".md" and not file_path.name.startswith("_"):
        try:
            from brain.index.incremental import refresh_case_index
            refresh_case_index(case_dir)
        except Exception:
            pass

    return {
        "status": "saved",
        "path": str(file_path.relative_to(case_dir)),
        "mtime": file_path.stat().st_mtime,
    }


@router.post("/api/vault/create")
def post_vault_create(
    req: NoteCreateRequest,
):
    """Creates a new note file in the vault."""
    case_dir, file_path = resolve_case_file(req.path, req.case_id)

    from brain.guard import is_path_locked, safe_write
    if is_path_locked(file_path):
        raise HTTPException(
            status_code=403,
            detail="Law 1 Violation: Cannot create files under 00_Raw_Inputs/.",
        )

    try:
        safe_write(file_path, req.content or "")
    except PermissionError as pe:
        raise HTTPException(status_code=403, detail=str(pe))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Create failed: {e}")

    return {
        "status": "created",
        "path": str(file_path.relative_to(case_dir)),
        "name": file_path.name,
    }
