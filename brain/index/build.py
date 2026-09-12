"""
Case index builder for SyndicateBrain (SIH26189).

Walks a case vault (01_People/, 02_Identifiers/, 03_Vehicles/, 04_Locations/,
05_Organisations/, 06_Events/), parses entity notes into CaseIndexEntry records,
and maintains _Case_Index.md per CASE_MODEL.md §5.
"""

from __future__ import annotations

import logging
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional, Union

import yaml
from fastapi import APIRouter, Body, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field

from brain.schemas import CaseIndexEntry

logger = logging.getLogger("syndicatebrain.index")

ENTITY_FOLDERS = [
    "01_People",
    "02_Identifiers",
    "03_Vehicles",
    "04_Locations",
    "05_Organisations",
    "06_Events",
]

FOLDER_SECTION_MAP = {
    "01_People": "People",
    "02_Identifiers": "Identifiers",
    "03_Vehicles": "Vehicles",
    "04_Locations": "Locations",
    "05_Organisations": "Organisations",
    "06_Events": "Events",
    "People": "People",
    "Identifiers": "Identifiers",
    "Vehicles": "Vehicles",
    "Locations": "Locations",
    "Organisations": "Organisations",
    "Events": "Events",
    "Suspects": "People",
    "Phones": "Identifiers",
}

DEFAULT_TYPE_BY_FOLDER = {
    "01_People": "person",
    "02_Identifiers": "identifier",
    "03_Vehicles": "vehicle",
    "04_Locations": "location",
    "05_Organisations": "organisation",
    "06_Events": "event",
    "People": "person",
    "Identifiers": "identifier",
    "Vehicles": "vehicle",
    "Locations": "location",
    "Organisations": "organisation",
    "Events": "event",
    "Suspects": "person",
    "Phones": "identifier",
}


def extract_key_facts(
    body_text: str,
    frontmatter: dict[str, Any],
    existing_links: list[str],
) -> list[str]:
    """
    Extract 3-5 salient facts from note body and frontmatter attributes.
    Preserves Hindi / English sentences, FIR metadata, and verified link reasons.
    """
    facts: list[str] = []

    # Separate body text before ## Links, ## Sources, or ## Verified Connections
    main_body = body_text
    links_section_match = re.search(
        r"\n##\s+(Links|Sources|Verified Connections)\b",
        body_text,
        re.IGNORECASE,
    )
    if links_section_match:
        main_body = body_text[: links_section_match.start()]

    # If there is a ## Summary section, prioritize its content
    summary_match = re.search(
        r"##\s+Summary\s*\n(.*?)(?=\n##|\Z)",
        body_text,
        re.DOTALL | re.IGNORECASE,
    )
    candidate_text = summary_match.group(1) if summary_match else main_body

    # Clean citations ^[...], HTML comments <!--...-->, and blockquotes
    cleaned = re.sub(r"\^\[[^\]]*\]", "", candidate_text)
    cleaned = re.sub(r"<!--.*?-->", "", cleaned, flags=re.DOTALL)

    lines: list[str] = []
    for line in cleaned.splitlines():
        line = line.strip()
        # Skip headers, blank lines, blockquotes, table rows
        if not line or line.startswith("#") or line.startswith(">") or line.startswith("|"):
            continue
        if line.startswith(("- ", "* ", "+ ")):
            line = line[2:].strip()
        lines.append(line)

    cleaned_block = " ".join(lines)
    # Strip markdown bold, italics, backticks
    cleaned_block = re.sub(r"[*_`]", "", cleaned_block)

    # Protect abbreviations from prematurely splitting sentences
    clean_abbr = re.sub(
        r"\b(No|s/o|r/o|Sh|Mr|Mrs|Dr|vs|i\.e|e\.g)\.\s*",
        r"\1_DOT_ ",
        cleaned_block,
        flags=re.IGNORECASE,
    )

    # Split into sentences (supporting both Western punctuation and Hindi purna viram ।)
    raw_sentences = [
        s.replace("_DOT_", ".").strip()
        for s in re.split(r"(?<=[.!?।])\s+", clean_abbr)
        if len(s.strip()) > 10
    ]

    for s in raw_sentences:
        if s not in facts:
            facts.append(s)
        if len(facts) >= 5:
            break

    # If fewer than 3 facts, extract from frontmatter metadata
    if len(facts) < 3:
        if "fir_number" in frontmatter and "police_station" in frontmatter:
            facts.append(
                f"FIR {frontmatter.get('fir_number')} registered at {frontmatter.get('police_station')}."
            )
        if "sections" in frontmatter and isinstance(frontmatter["sections"], list):
            facts.append(f"Sections applied: {', '.join(str(s) for s in frontmatter['sections'])}.")
        if "thana" in frontmatter:
            facts.append(f"Thana jurisdiction: {frontmatter['thana']}.")
        if "risk_flags" in frontmatter and isinstance(frontmatter["risk_flags"], list):
            facts.append(f"Risk flags: {', '.join(str(r) for r in frontmatter['risk_flags'])}.")
        if "date" in frontmatter:
            facts.append(f"Date of incident/record: {frontmatter['date']}.")

    # If still fewer than 3 facts, extract from link reasons in ## Links
    if len(facts) < 3:
        link_lines = re.findall(
            r"-\s*\[\[([^\]]+)\]\]\s*[—–-]\s*([^\^<\n]+)",
            body_text,
        )
        for target, reason in link_lines:
            target_clean = target.strip()
            reason_clean = reason.strip()
            if reason_clean:
                fact_str = f"Linked to {target_clean}: {reason_clean}"
                if fact_str not in facts:
                    facts.append(fact_str)
            if len(facts) >= 5:
                break

    # Cap to 5 facts max
    return facts[:5]


def parse_entity_note(
    file_path: Union[str, Path],
    case_dir: Union[str, Path],
) -> Optional[CaseIndexEntry]:
    """
    Parse a single entity note into a CaseIndexEntry.
    Robust against malformed frontmatter: logs warning loudly and returns None.
    """
    path = Path(file_path)
    base_dir = Path(case_dir)

    try:
        rel_path = path.relative_to(base_dir).as_posix()
    except ValueError:
        rel_path = path.name

    try:
        content = path.read_text(encoding="utf-8")
    except Exception as exc:
        logger.warning(
            "[INDEX BUILD WARNING] Could not read note '%s': %s",
            rel_path,
            exc,
        )
        return None

    lines = content.splitlines()
    if not lines or lines[0].strip() != "---":
        logger.warning(
            "[INDEX BUILD WARNING] Skipping '%s': missing opening '---' YAML delimiter",
            rel_path,
        )
        return None

    closing_idx = -1
    for i in range(1, len(lines)):
        if lines[i].strip() in ("---", "..."):
            closing_idx = i
            break

    if closing_idx == -1:
        logger.warning(
            "[INDEX BUILD WARNING] Skipping '%s': frontmatter '---' delimiter never closed",
            rel_path,
        )
        return None

    frontmatter_text = "\n".join(lines[1:closing_idx])
    body_text = "\n".join(lines[closing_idx + 1:])

    try:
        fm = yaml.safe_load(frontmatter_text)
    except Exception as exc:
        logger.warning(
            "[INDEX BUILD WARNING] Skipping '%s': invalid YAML in frontmatter (%s)",
            rel_path,
            exc,
        )
        return None

    if not isinstance(fm, dict):
        logger.warning(
            "[INDEX BUILD WARNING] Skipping '%s': frontmatter is not a mapping/dictionary",
            rel_path,
        )
        return None

    note_id = fm.get("id") or fm.get("entity_id")
    if not note_id:
        logger.warning(
            "[INDEX BUILD WARNING] Skipping '%s': missing required 'id' in frontmatter",
            rel_path,
        )
        return None
    note_id = str(note_id).strip()

    parent_folder = path.parent.name
    default_type = DEFAULT_TYPE_BY_FOLDER.get(parent_folder, "entity")
    note_type = str(fm.get("type") or default_type).strip()

    raw_role = fm.get("role") or fm.get("sub_type") or fm.get("status")
    note_role = str(raw_role).strip() if raw_role else None

    # Parse names
    names: list[str] = []
    raw_names = fm.get("names")
    if isinstance(raw_names, list):
        for item in raw_names:
            if item is not None and str(item).strip():
                s = str(item).strip()
                if s not in names:
                    names.append(s)
    elif isinstance(raw_names, (str, int, float)):
        s = str(raw_names).strip()
        if s:
            names.append(s)

    for key in ("canonical_name", "name"):
        val = fm.get(key)
        if val and str(val).strip():
            s = str(val).strip()
            if s not in names:
                names.insert(0, s)

    # Fallback name if absent
    if not names:
        h1_match = re.search(r"^#\s+(.+)$", body_text, re.MULTILINE)
        if h1_match:
            names.append(h1_match.group(1).strip())
        else:
            names.append(path.stem)

    # Parse identifiers
    identifiers: list[str] = []
    raw_ids = fm.get("identifiers")
    if isinstance(raw_ids, list):
        for item in raw_ids:
            if item is not None and str(item).strip():
                s = str(item).strip()
                if s not in identifiers:
                    identifiers.append(s)
    elif isinstance(raw_ids, (str, int, float)):
        s = str(raw_ids).strip()
        if s:
            identifiers.append(s)

    # For identifier notes, use filename stem if no explicit identifiers
    if not identifiers and note_type in ("identifier", "phone", "imei", "account", "vehicle_reg"):
        identifiers.append(path.stem)

    # Parse existing links
    links_match = re.search(
        r"##\s+Links\s*\n(.*?)(?=\n##|\Z)",
        body_text,
        re.DOTALL | re.IGNORECASE,
    )
    links_block = links_match.group(1) if links_match else body_text
    raw_links = re.findall(r"\[\[(.*?)\]\]", links_block)
    existing_links: list[str] = []
    for lk in raw_links:
        cleaned_lk = lk.strip()
        if cleaned_lk and cleaned_lk not in existing_links:
            existing_links.append(cleaned_lk)

    key_facts = extract_key_facts(body_text, fm, existing_links)

    try:
        mtime = float(path.stat().st_mtime)
    except Exception:
        mtime = 0.0

    return CaseIndexEntry(
        id=note_id,
        type=note_type,
        role=note_role,
        file_path=rel_path,
        names=names,
        identifiers=identifiers,
        existing_links=existing_links,
        key_facts=key_facts,
        mtime=mtime,
        properties={
            k: v
            for k, v in fm.items()
            if k not in ("id", "type", "role", "names", "identifiers")
        },
    )


def walk_case_notes(case_dir: Union[str, Path]) -> list[CaseIndexEntry]:
    """
    Walk a case folder across the 6 entity subfolders:
    01_People/, 02_Identifiers/, 03_Vehicles/, 04_Locations/, 05_Organisations/, 06_Events/.
    Returns a sorted list of valid CaseIndexEntry records.
    """
    base = Path(case_dir)
    entries: list[CaseIndexEntry] = []

    subfolders: list[Path] = []
    for f in ENTITY_FOLDERS:
        candidate = base / f
        if candidate.exists() and candidate.is_dir():
            subfolders.append(candidate)

    # Check non-numbered fallback names if prefixed folders were not found
    for alias in [
        "People",
        "Identifiers",
        "Vehicles",
        "Locations",
        "Organisations",
        "Events",
        "Suspects",
    ]:
        candidate = base / alias
        if candidate.exists() and candidate.is_dir() and candidate not in subfolders:
            subfolders.append(candidate)

    for folder in subfolders:
        md_files = sorted(f for f in folder.rglob("*.md") if not f.name.startswith("."))
        for file_path in md_files:
            entry = parse_entity_note(file_path, base)
            if entry is not None:
                entries.append(entry)

    # Sort entries deterministically by file_path
    entries.sort(key=lambda e: e.file_path)
    return entries


def format_entry_summary(
    entry: CaseIndexEntry,
    raw_frontmatter: Optional[dict[str, Any]] = None,
) -> str:
    """
    Build the second line of each index entry:
    <summary of facts, identifiers, link count, gang>
    """
    fm = (
        raw_frontmatter
        or (
            entry.properties
            if hasattr(entry, "properties") and isinstance(entry.properties, dict)
            else {}
        )
    )
    parts: list[str] = []

    # 1. Fact summary
    if entry.key_facts:
        fact = entry.key_facts[0].strip()
        fact = re.sub(r"\s+", " ", fact)
        if len(fact) > 130:
            fact = fact[:127].rsplit(" ", 1)[0] + "..."
        if fact and not fact.endswith("."):
            fact += "."
        parts.append(fact)

    # 2. Identifiers / Phones
    if entry.identifiers:
        sample = entry.identifiers[:3]
        sample_str = ", ".join(sample)
        all_numeric = all(
            re.sub(r"[\s\-+()]", "", i).isdigit() and len(re.sub(r"[\s\-+()]", "", i)) >= 7
            for i in sample
        )
        if all_numeric:
            parts.append(f"Phones: {sample_str}.")
        else:
            parts.append(f"Identifiers: {sample_str}.")

    # 3. Links count
    parts.append(f"Links: {len(entry.existing_links)}.")

    # 4. Gang / Community
    gang = fm.get("gang") or fm.get("organisation") or fm.get("organization")
    if not gang and isinstance(fm.get("communities"), list) and fm["communities"]:
        gang = str(fm["communities"][0]).replace("_", " ")
    if gang:
        parts.append(f"Gang: {gang}.")

    summary_text = " ".join(parts) if parts else "No details recorded."
    return f"  {summary_text}"


def get_entry_section(entry: CaseIndexEntry) -> str:
    """Determine the index section heading for an entry."""
    p = entry.file_path
    for folder_name, section_name in FOLDER_SECTION_MAP.items():
        if p.startswith(folder_name + "/") or p.startswith(folder_name + "\\"):
            return section_name

    # Fallback to type
    t = (entry.type or "").lower()
    if t in ("person", "suspect", "accused", "witness", "complainant", "officer"):
        return "People"
    if t in ("identifier", "phone", "imei", "account", "vehicle_reg", "handle", "email"):
        return "Identifiers"
    if t in ("vehicle", "car", "truck"):
        return "Vehicles"
    if t in ("location", "place", "address", "tower"):
        return "Locations"
    if t in ("organisation", "organization", "gang", "firm"):
        return "Organisations"
    if t in ("event", "fir", "incident", "seizure"):
        return "Events"
    return "Other"


def generate_case_index_content(
    case_id: str,
    entries: list[CaseIndexEntry],
    built_timestamp: Optional[str] = None,
) -> str:
    """
    Generate markdown content for _Case_Index.md adhering to CASE_MODEL.md §5.
    Frontmatter:
    ---
    case: <case_id>
    built: <ISO timestamp>
    entries: <count>
    ---
    Followed by sections: ## People, ## Identifiers, etc.
    """
    ts = built_timestamp or datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    lines = [
        "---",
        f"case: {case_id}",
        f"built: {ts}",
        f"entries: {len(entries)}",
        "---",
    ]

    canonical_sections = [
        "People",
        "Identifiers",
        "Vehicles",
        "Locations",
        "Organisations",
        "Events",
    ]

    grouped: dict[str, list[CaseIndexEntry]] = {}
    for entry in entries:
        sec = get_entry_section(entry)
        grouped.setdefault(sec, []).append(entry)

    # Determine sections to print: canonical sections first, then any others
    ordered_sections = [s for s in canonical_sections if s in grouped]
    extra_sections = sorted(s for s in grouped if s not in canonical_sections)
    ordered_sections.extend(extra_sections)

    for sec in ordered_sections:
        sec_entries = grouped[sec]
        lines.append("")
        lines.append(f"## {sec}")
        for entry in sec_entries:
            display_name = entry.names[0] if entry.names else Path(entry.file_path).stem
            # Clean middle dot in display name or role to maintain line format
            display_name = display_name.replace("·", "-").strip()
            role_or_type = (entry.role or entry.type or "entity").replace("·", "-").strip()

            if entry.mtime.is_integer():
                mtime_str = str(int(entry.mtime))
            else:
                mtime_str = f"{entry.mtime:.2f}"

            line1 = f"- {entry.id} · {display_name} · {role_or_type} · {entry.file_path} · mtime:{mtime_str}"
            line2 = format_entry_summary(entry)
            lines.append(line1)
            lines.append(line2)

    lines.append("")
    return "\n".join(lines)


def build_case_index(
    case_dir: Union[str, Path],
    case_id: Optional[str] = None,
) -> tuple[Path, list[CaseIndexEntry]]:
    """
    Rebuilds _Case_Index.md in the given case directory.
    Returns (Path to _Case_Index.md, list of CaseIndexEntry records).
    """
    case_path = Path(case_dir).resolve()
    if not case_path.exists() or not case_path.is_dir():
        raise FileNotFoundError(f"Case directory does not exist: {case_path}")

    cid = case_id
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

    entries = walk_case_notes(case_path)
    content = generate_case_index_content(case_id=cid, entries=entries)

    index_path = case_path / "_Case_Index.md"
    index_path.write_text(content, encoding="utf-8")
    logger.info("Built case index: %s with %d entries", index_path, len(entries))
    return index_path, entries


# FastAPI Router
router = APIRouter(tags=["index"])


class RebuildIndexRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    case_id: Optional[str] = None
    case_path: Optional[str] = None
    case: Optional[str] = None


class RebuildIndexResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    status: str = "ok"
    entries: int
    case_id: str
    index_path: str


@router.post("/api/index/rebuild", response_model=RebuildIndexResponse)
def rebuild_index_endpoint(
    req: Optional[RebuildIndexRequest] = Body(None),
    case_id: Optional[str] = Query(None),
    case_path: Optional[str] = Query(None),
):
    """
    Full rebuild of _Case_Index.md from case vault notes.
    Accepts case_path or case_id via JSON body or query parameters.
    """
    target_case_id = (req.case_id if req else None) or (req.case if req else None) or case_id
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

    # If neither provided, check defaults
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
        index_file, entries = build_case_index(resolved_path, case_id=target_case_id)
        return RebuildIndexResponse(
            status="ok",
            entries=len(entries),
            case_id=target_case_id or resolved_path.name,
            index_path=str(index_file),
        )
    except Exception as exc:
        logger.error("Failed to rebuild index: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


if __name__ == "__main__":
    import sys

    target = sys.argv[1] if len(sys.argv) > 1 else "Case_01_Sonipat_Arms"
    idx_p, ens = build_case_index(target)
    text = idx_p.read_text(encoding="utf-8")
    line_count = len(text.splitlines())
    token_est = len(text) // 4
    print(f"Index built: {idx_p}")
    print(f"Entries: {len(ens)}")
    print(f"Lines: {line_count}")
    print(f"Estimated tokens: {token_est}")
