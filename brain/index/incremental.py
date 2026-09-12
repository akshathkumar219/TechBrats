"""
Incremental Case Index Refresh for SyndicateBrain (SIH26189).

Provides staleness detection and incremental index refresh per CASE_MODEL.md §5.
When notes are modified, added, or deleted, _Case_Index.md is refreshed without a
slow full rebuild:
- Only modified notes (disk st_mtime > stored index mtime) are re-read and parsed.
- New notes are parsed and added to the appropriate section.
- Deleted notes are dropped from the index.
- Unmodified notes are preserved byte-for-byte without re-reading or re-parsing.
- Performance: target < 200ms for an 80-note case.
"""

from __future__ import annotations

import logging
import os
import re
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional, Union

import yaml
from fastapi import APIRouter, Body, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field

from brain.schemas import CaseIndexEntry
from brain.index.build import (
    ENTITY_FOLDERS,
    build_case_index,
    format_entry_summary,
    get_entry_section,
    parse_entity_note,
    router,
)

logger = logging.getLogger("syndicatebrain.index.incremental")


@dataclass
class StoredIndexEntry:
    """Represents an entry parsed directly from _Case_Index.md."""

    entry_id: str
    display_name: str
    role_or_type: str
    file_path: str
    mtime: float
    section: str
    lines: list[str]


def parse_case_index_content(
    content: str,
) -> tuple[dict[str, Any], list[StoredIndexEntry]]:
    """
    Parse existing _Case_Index.md content into frontmatter and StoredIndexEntry records.
    Extracts stored mtime and exact lines for each entry so unmodified entries can
    be preserved byte-for-byte.
    """
    lines = content.splitlines()
    if not lines or lines[0].strip() != "---":
        return {}, []

    closing_idx = -1
    for i in range(1, len(lines)):
        if lines[i].strip() in ("---", "..."):
            closing_idx = i
            break

    if closing_idx == -1:
        return {}, []

    fm_text = "\n".join(lines[1:closing_idx])
    try:
        frontmatter = yaml.safe_load(fm_text) or {}
        if not isinstance(frontmatter, dict):
            frontmatter = {}
    except Exception:
        frontmatter = {}

    entries: list[StoredIndexEntry] = []
    current_section = "Other"
    current_entry: Optional[StoredIndexEntry] = None

    body_lines = lines[closing_idx + 1 :]
    for line in body_lines:
        stripped = line.strip()
        if stripped.startswith("## "):
            if current_entry:
                entries.append(current_entry)
                current_entry = None
            current_section = stripped[3:].strip()
            continue

        if line.startswith("- "):
            if current_entry:
                entries.append(current_entry)
                current_entry = None

            # Pattern: - <id> · <display_name> · <role_or_type> · <file_path> · mtime:<mtime_str>
            m = re.match(
                r"^-\s+(.*?)\s+·\s+(.*?)\s+·\s+(.*?)\s+·\s+(.*?)\s+·\s+mtime:([0-9]+(?:\.[0-9]+)?)\s*$",
                line,
            )
            if m:
                eid, dname, rtype, fpath, mtime_str = m.groups()
                mtime_val = float(mtime_str)
                current_entry = StoredIndexEntry(
                    entry_id=eid.strip(),
                    display_name=dname.strip(),
                    role_or_type=rtype.strip(),
                    file_path=fpath.strip().replace("\\", "/"),
                    mtime=mtime_val,
                    section=current_section,
                    lines=[line],
                )
            else:
                # Fallback splitting on middle dot
                parts = [p.strip() for p in line.split("·")]
                if len(parts) >= 5 and parts[0].startswith("- "):
                    eid = parts[0][2:].strip()
                    dname = parts[1]
                    rtype = parts[2]
                    fpath = " · ".join(parts[3:-1]).strip().replace("\\", "/")
                    mtime_part = parts[-1]
                    mtime_match = re.search(r"mtime:([0-9]+(?:\.[0-9]+)?)", mtime_part)
                    mtime_val = float(mtime_match.group(1)) if mtime_match else 0.0
                    current_entry = StoredIndexEntry(
                        entry_id=eid,
                        display_name=dname,
                        role_or_type=rtype,
                        file_path=fpath,
                        mtime=mtime_val,
                        section=current_section,
                        lines=[line],
                    )
            continue

        # If we have a current entry, collect summary / detail line(s)
        if current_entry and stripped:
            current_entry.lines.append(line)

    if current_entry:
        entries.append(current_entry)

    return frontmatter, entries


def refresh_case_index(
    case_dir: Union[Path, str],
    case_id: Optional[str] = None,
) -> dict[str, Any]:
    """
    Incrementally refresh _Case_Index.md using staleness detection.

    Steps:
    a) Read existing _Case_Index.md frontmatter and parse existing entries with their stored mtimes.
    b) Scan files on disk across entity folders (01_People/ ... 06_Events/).
    c) Compare disk st_mtime against stored mtime:
       - If file is NEW: parse and add its entry.
       - If file was MODIFIED (disk mtime > stored mtime): re-read and update THAT ENTRY ALONE.
       - If file was DELETED: drop its entry.
       - Unmodified files are PRESERVED byte-for-byte without re-reading or re-parsing.
    d) Re-serialize _Case_Index.md with updated built timestamp and entries count.

    Returns dict with refresh statistics and elapsed time.
    """
    start_time = time.perf_counter()

    case_path = Path(case_dir).resolve()
    if not case_path.exists() or not case_path.is_dir():
        raise FileNotFoundError(f"Case directory does not exist: {case_path}")

    index_path = case_path / "_Case_Index.md"

    # Fallback to full build if _Case_Index.md does not exist
    if not index_path.exists():
        logger.info("Index does not exist for %s, running full build", case_path)
        index_file, built_entries = build_case_index(case_path, case_id=case_id)
        elapsed_ms = (time.perf_counter() - start_time) * 1000
        cid = case_id or case_path.name
        return {
            "status": "ok",
            "case_id": cid,
            "index_path": str(index_file),
            "entries": len(built_entries),
            "added": sorted(e.file_path for e in built_entries),
            "modified": [],
            "deleted": [],
            "unmodified": [],
            "added_count": len(built_entries),
            "modified_count": 0,
            "deleted_count": 0,
            "unmodified_count": 0,
            "elapsed_ms": round(elapsed_ms, 2),
        }

    # Step a: Read existing _Case_Index.md
    index_content = index_path.read_text(encoding="utf-8")
    frontmatter, stored_entries = parse_case_index_content(index_content)

    # If parsing existing index yielded nothing and content exists, fallback to full build
    if not stored_entries and index_content.strip():
        logger.warning(
            "Could not parse entries from %s, falling back to full build", index_path
        )
        index_file, built_entries = build_case_index(case_path, case_id=case_id)
        elapsed_ms = (time.perf_counter() - start_time) * 1000
        cid = case_id or case_path.name
        return {
            "status": "ok",
            "case_id": cid,
            "index_path": str(index_file),
            "entries": len(built_entries),
            "added": sorted(e.file_path for e in built_entries),
            "modified": [],
            "deleted": [],
            "unmodified": [],
            "added_count": len(built_entries),
            "modified_count": 0,
            "deleted_count": 0,
            "unmodified_count": 0,
            "elapsed_ms": round(elapsed_ms, 2),
        }

    # Resolve case_id
    cid = case_id or frontmatter.get("case")
    if not cid:
        cfg_path = case_path / "Case_Config.yaml"
        if cfg_path.exists():
            try:
                cfg = yaml.safe_load(cfg_path.read_text(encoding="utf-8"))
                if isinstance(cfg, dict):
                    cid = cfg.get("case") or cfg.get("case_id") or cfg.get("name")
            except Exception:
                pass
    if not cid:
        cid = case_path.name

    # Step b: Scan files on disk across entity folders
    subfolders: list[Path] = []
    for f in ENTITY_FOLDERS:
        candidate = case_path / f
        if candidate.exists() and candidate.is_dir():
            subfolders.append(candidate)

    for alias in [
        "People",
        "Identifiers",
        "Vehicles",
        "Locations",
        "Organisations",
        "Events",
        "Suspects",
    ]:
        candidate = case_path / alias
        if candidate.exists() and candidate.is_dir() and candidate not in subfolders:
            subfolders.append(candidate)

    disk_files: dict[str, tuple[Path, float]] = {}
    for folder in subfolders:
        for md_file in folder.rglob("*.md"):
            if md_file.name.startswith("."):
                continue
            try:
                st = md_file.stat()
                rel_path = md_file.relative_to(case_path).as_posix()
                disk_files[rel_path] = (md_file, float(st.st_mtime))
            except Exception as exc:
                logger.warning(
                    "[INDEX REFRESH WARNING] Could not stat note '%s': %s",
                    md_file,
                    exc,
                )

    # Step c: Staleness comparison
    stored_by_path = {e.file_path: e for e in stored_entries}
    disk_paths = set(disk_files.keys())
    stored_paths = set(stored_by_path.keys())

    deleted_paths = stored_paths - disk_paths
    new_paths = disk_paths - stored_paths
    common_paths = disk_paths & stored_paths

    added_paths: list[str] = []
    modified_paths: list[str] = []
    unmodified_paths: list[str] = []

    final_entries: list[StoredIndexEntry] = []

    # Process common (existing) files
    for path in sorted(common_paths):
        stored_entry = stored_by_path[path]
        file_path, disk_mtime = disk_files[path]

        # Stored mtime in markdown may have lost sub-millisecond precision (.2f),
        # so difference > 0.01 indicates actual file modification.
        is_modified = (disk_mtime - stored_entry.mtime) > 0.01

        if is_modified:
            # Re-read and re-parse THAT ENTRY ALONE
            parsed = parse_entity_note(file_path, case_path)
            if parsed is not None:
                display_name = (
                    parsed.names[0] if parsed.names else Path(parsed.file_path).stem
                )
                display_name = display_name.replace("·", "-").strip()
                role_or_type = (
                    parsed.role or parsed.type or "entity"
                ).replace("·", "-").strip()

                if parsed.mtime.is_integer():
                    mtime_str = str(int(parsed.mtime))
                else:
                    mtime_str = f"{parsed.mtime:.2f}"

                l1 = f"- {parsed.id} · {display_name} · {role_or_type} · {parsed.file_path} · mtime:{mtime_str}"
                l2 = format_entry_summary(parsed)
                sec = get_entry_section(parsed)
                final_entries.append(
                    StoredIndexEntry(
                        entry_id=parsed.id,
                        display_name=display_name,
                        role_or_type=role_or_type,
                        file_path=parsed.file_path,
                        mtime=parsed.mtime,
                        section=sec,
                        lines=[l1, l2],
                    )
                )
                modified_paths.append(path)
            else:
                # Failed to re-parse (e.g. malformed syntax during edit)
                # Gracefully retain previous entry
                final_entries.append(stored_entry)
                unmodified_paths.append(path)
        else:
            # UNMODIFIED: PRESERVED byte-for-byte without reading or parsing note
            final_entries.append(stored_entry)
            unmodified_paths.append(path)

    # Process new files
    for path in sorted(new_paths):
        file_path, disk_mtime = disk_files[path]
        parsed = parse_entity_note(file_path, case_path)
        if parsed is not None:
            display_name = (
                parsed.names[0] if parsed.names else Path(parsed.file_path).stem
            )
            display_name = display_name.replace("·", "-").strip()
            role_or_type = (
                parsed.role or parsed.type or "entity"
            ).replace("·", "-").strip()

            if parsed.mtime.is_integer():
                mtime_str = str(int(parsed.mtime))
            else:
                mtime_str = f"{parsed.mtime:.2f}"

            l1 = f"- {parsed.id} · {display_name} · {role_or_type} · {parsed.file_path} · mtime:{mtime_str}"
            l2 = format_entry_summary(parsed)
            sec = get_entry_section(parsed)
            final_entries.append(
                StoredIndexEntry(
                    entry_id=parsed.id,
                    display_name=display_name,
                    role_or_type=role_or_type,
                    file_path=parsed.file_path,
                    mtime=parsed.mtime,
                    section=sec,
                    lines=[l1, l2],
                )
            )
            added_paths.append(path)

    # Step d: Re-serialize _Case_Index.md
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    lines = [
        "---",
        f"case: {cid}",
        f"built: {ts}",
        f"entries: {len(final_entries)}",
    ]

    # Preserve any extra frontmatter keys
    for k, v in frontmatter.items():
        if k not in ("case", "built", "entries"):
            lines.append(f"{k}: {v}")
    lines.append("---")

    canonical_sections = [
        "People",
        "Identifiers",
        "Vehicles",
        "Locations",
        "Organisations",
        "Events",
    ]
    existing_sections = {e.section for e in final_entries}
    ordered_sections = [s for s in canonical_sections if s in existing_sections]
    extra_sections = sorted(s for s in existing_sections if s not in canonical_sections)
    ordered_sections.extend(extra_sections)

    for sec in ordered_sections:
        sec_entries = sorted(
            [e for e in final_entries if e.section == sec],
            key=lambda e: e.file_path,
        )
        lines.append("")
        lines.append(f"## {sec}")
        for entry in sec_entries:
            lines.extend(entry.lines)

    lines.append("")
    new_content = "\n".join(lines)
    index_path.write_text(new_content, encoding="utf-8")

    elapsed_ms = (time.perf_counter() - start_time) * 1000
    logger.info(
        "Refreshed case index %s in %.2fms (+%d, ~%d, -%d, =%d)",
        index_path,
        elapsed_ms,
        len(added_paths),
        len(modified_paths),
        len(deleted_paths),
        len(unmodified_paths),
    )

    return {
        "status": "ok",
        "case_id": cid,
        "index_path": str(index_path),
        "entries": len(final_entries),
        "added": sorted(added_paths),
        "modified": sorted(modified_paths),
        "deleted": sorted(deleted_paths),
        "unmodified": sorted(unmodified_paths),
        "added_count": len(added_paths),
        "modified_count": len(modified_paths),
        "deleted_count": len(deleted_paths),
        "unmodified_count": len(unmodified_paths),
        "elapsed_ms": round(elapsed_ms, 2),
    }


# Request and Response schemas for FastAPI router
class RefreshIndexRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    case_id: Optional[str] = None
    case_path: Optional[str] = None
    case: Optional[str] = None


class RefreshIndexResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    status: str = "ok"
    entries: int
    case_id: str
    index_path: str
    added: list[str] = Field(default_factory=list)
    modified: list[str] = Field(default_factory=list)
    deleted: list[str] = Field(default_factory=list)
    unmodified: list[str] = Field(default_factory=list)
    added_count: int = 0
    modified_count: int = 0
    deleted_count: int = 0
    unmodified_count: int = 0
    elapsed_ms: Optional[float] = None


@router.post("/api/index/refresh", response_model=RefreshIndexResponse)
def refresh_index_endpoint(
    req: Optional[RefreshIndexRequest] = Body(None),
    case_id: Optional[str] = Query(None),
    case_path: Optional[str] = Query(None),
):
    """
    Incremental refresh of _Case_Index.md.
    Staleness detection compares file mtime against stored index mtime.
    Only modified/new notes are parsed; deleted notes are removed.
    Unmodified notes are preserved byte-for-byte without re-reading.
    """
    target_case_id = (
        (req.case_id if req else None) or (req.case if req else None) or case_id
    )
    target_case_path = (req.case_path if req else None) or case_path

    resolved_path: Optional[Path] = None

    if target_case_path:
        p = Path(target_case_path).resolve()
        if p.exists() and p.is_dir():
            resolved_path = p

    if not resolved_path and target_case_id:
        candidates = [
            Path(target_case_id).resolve(),
            (Path("vaults") / target_case_id).resolve(),
            (Path("cases") / target_case_id).resolve(),
            (Path("data") / target_case_id).resolve(),
        ]
        for c in candidates:
            if c.exists() and c.is_dir():
                resolved_path = c
                break

    # Default fallback locations
    if not resolved_path and not target_case_id and not target_case_path:
        for def_p in [
            Path("vaults/Case_01_Sonipat_Arms").resolve(),
            Path("Case_01_Sonipat_Arms").resolve(),
        ]:
            if def_p.exists() and def_p.is_dir():
                resolved_path = def_p
                target_case_id = resolved_path.name
                break

    if not resolved_path:
        raise HTTPException(
            status_code=404,
            detail=f"Case directory not found: case_id='{target_case_id}', case_path='{target_case_path}'",
        )

    try:
        res = refresh_case_index(resolved_path, case_id=target_case_id)
        return RefreshIndexResponse(**res)
    except Exception as exc:
        logger.error("Failed to refresh index: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))
