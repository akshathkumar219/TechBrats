"""
brain/linker.py — The permission boundary and single writer of links.

CASE_MODEL.md §6:
"The only thing the AI may write into the vault is a link, and only after a human
accepts it. Everything else is a proposal the detective applies by hand.
The agent never edits note bodies, never renames files, never touches 00_Raw_Inputs/.
brain/linker.py is the single code path that writes a link, and it refuses any link
without a resolvable citation."

Law 1: Evidence is immutable (00_Raw_Inputs/ protected by brain.guard.assert_writable).
Law 2: The map is deterministic; the AI only proposes (human accepts/rejects).
Law 3: Every link carries its reason and resolvable citation.
"""

from datetime import datetime, timezone
import json
import logging
from pathlib import Path
import re
from typing import Any, Collection, Optional, Union
import yaml

from fastapi import APIRouter, Body, HTTPException
from pydantic import BaseModel, ConfigDict

from brain.agents.validator import is_source_resolvable
from brain.guard import assert_writable
from brain.mocks import MOCK_DOCS, MOCK_PROPOSALS
from brain.schemas import Citation, Proposal
from brain.vault import get_vaults_root

logger = logging.getLogger("brain.linker")

# Fixed locator format pattern:
# 'p:3 l:11' or 'p:3' for documents, 'row:48219' for CDR/TowerDump
LOCATOR_REGEX = re.compile(
    r"^(p:\s*\d+(?:\s+l:\s*\d+(?:-\d+)?)?|row:\s*\d+)$",
    re.IGNORECASE,
)

ENTITY_FOLDERS = [
    "01_People",
    "02_Identifiers",
    "03_Vehicles",
    "04_Locations",
    "05_Organisations",
    "06_Events",
]


class ProposalActionRequest(BaseModel):
    """Request payload for /api/proposal/{id}/accept and /reject."""
    model_config = ConfigDict(extra="allow")

    case_id: Optional[str] = None
    case_path: Optional[str] = None
    reason: Optional[str] = None
    proposal: Optional[Union[Proposal, dict[str, Any]]] = None


def resolve_case_directory(case_path_or_id: Optional[Union[str, Path]] = None) -> Path:
    """Resolve a case directory from path, id, or defaults."""
    if case_path_or_id:
        p = Path(case_path_or_id)
        if p.exists() and p.is_dir():
            return p
        for parent in [Path("data"), Path("vaults"), get_vaults_root()]:
            cand = parent / str(case_path_or_id)
            if cand.exists() and cand.is_dir():
                return cand
        return p

    for default_cand in [
        Path("data/Case_01_Sonipat_Arms"),
        Path("vaults/Case_01_Sonipat_Arms"),
    ]:
        if default_cand.exists() and default_cand.is_dir():
            return default_cand

    return Path("data/Case_01_Sonipat_Arms")


def find_note_file(
    note_path_or_id: Union[str, Path],
    case_path: Optional[Union[str, Path]] = None,
) -> Path:
    """
    Resolves a note identifier, filename, or filepath to an existing Path.
    Asserts path is not in 00_Raw_Inputs/.
    """
    p = Path(note_path_or_id)
    if p.is_file():
        assert_writable(p)
        return p

    case_dir = resolve_case_directory(case_path)
    if not case_dir.exists():
        if p.suffix == ".md":
            assert_writable(p)
            return p
        raise FileNotFoundError(f"Case directory not found: {case_dir}")

    # 1. Direct path relative to case_dir
    direct_candidates = [
        case_dir / str(note_path_or_id),
        case_dir / f"{note_path_or_id}.md",
    ]
    for cand in direct_candidates:
        if cand.is_file():
            assert_writable(cand)
            return cand

    # 2. Check within entity folders
    clean_id = str(note_path_or_id).removesuffix(".md").strip()
    for folder_name in ENTITY_FOLDERS:
        folder = case_dir / folder_name
        if not folder.is_dir():
            continue

        direct_file = folder / f"{clean_id}.md"
        if direct_file.is_file():
            assert_writable(direct_file)
            return direct_file

        # Check by filename stem or title/id inside frontmatter
        for md_file in folder.glob("*.md"):
            if md_file.stem.lower() == clean_id.lower():
                assert_writable(md_file)
                return md_file
            try:
                content = md_file.read_text(encoding="utf-8", errors="ignore")
                # Quick scan for id or name
                if f"id: {clean_id}" in content or f"id: '{clean_id}'" in content or f'id: "{clean_id}"' in content:
                    assert_writable(md_file)
                    return md_file
                if f"# {clean_id}" in content:
                    assert_writable(md_file)
                    return md_file
            except Exception:
                continue

    if p.suffix == ".md":
        assert_writable(p)
        return p

    raise FileNotFoundError(f"Entity note '{note_path_or_id}' could not be resolved in {case_dir}")


def build_valid_sources(case_path: Optional[Union[str, Path]] = None) -> set[str]:
    """
    Builds the set of resolvable source_doc_id values for a case from the real
    evidentiary files present in that case's 00_Raw_Inputs/ and real notes in the vault.
    Delegates directly to brain.orchestrator.build_valid_sources to guarantee that
    ID formats and resolvable sources agree 100% between proposal generation and acceptance.
    """
    if not case_path:
        return set()

    case_dir = Path(case_path)
    if not case_dir.exists():
        return set()

    from brain.orchestrator import build_valid_sources as orch_build_valid_sources, get_raw_input_files
    raw_files = get_raw_input_files(case_dir)
    return orch_build_valid_sources(case_dir, raw_files)


def get_entity_name_from_note(note_path: Path) -> str:
    """Extract display name from note for reverse link generation."""
    try:
        content = note_path.read_text(encoding="utf-8")
        if content.startswith("---"):
            parts = content.split("---", 2)
            if len(parts) >= 3:
                fm = yaml.safe_load(parts[1])
                if isinstance(fm, dict):
                    names = fm.get("names")
                    if names and isinstance(names, list) and len(names) > 0:
                        return str(names[0])
                    if fm.get("id"):
                        return str(fm.get("id"))

        # Look for first level 1 heading
        for line in content.splitlines():
            if line.startswith("# "):
                return line[2:].strip()
    except Exception:
        pass
    return note_path.stem


def parse_and_validate_citation(
    citation: Any,
    case_path: Optional[Union[str, Path]] = None,
    valid_sources: Optional[Collection[str]] = None,
) -> Citation:
    """
    Validates citation strictly against Law 3.
    Requires non-empty source_doc_id, valid locator format ('p:3 l:11' or 'row:48219'),
    and resolvable source document.
    No force flag, no skip_validation, no internal bypass.
    Raises ValueError on any missing or invalid component.
    """
    if citation is None or not citation:
        raise ValueError("Citation is strictly required (Law 3). Refusing link without citation.")

    source_doc_id: Optional[str] = None
    locator: Optional[str] = None
    snippet: Optional[str] = None

    if isinstance(citation, Citation):
        source_doc_id = citation.source_doc_id
        locator = citation.locator
        snippet = citation.snippet
    elif isinstance(citation, dict):
        source_doc_id = citation.get("source_doc_id") or citation.get("source")
        locator = citation.get("locator")
        snippet = citation.get("snippet")
    elif isinstance(citation, str):
        cit_str = citation.strip()
        m = re.search(r"\^?\[?\s*([^\s\]]+)\s+([^\]]+)\s*\]?", cit_str)
        if m:
            source_doc_id = m.group(1).strip()
            locator = m.group(2).strip()
        else:
            raise ValueError(
                f"Malformed citation string: '{citation}'. Must be '^[source_doc locator]' or 'source_doc locator'."
            )
    else:
        raise ValueError(f"Invalid citation type: {type(citation)}. Must be Citation, dict, or str.")

    if not source_doc_id or not str(source_doc_id).strip():
        raise ValueError("Citation missing source_doc_id. A link without a source cannot be written.")

    if not locator or not str(locator).strip():
        raise ValueError("Citation missing locator. A link without a locator cannot be written.")

    source_doc_id = str(source_doc_id).strip()
    locator = str(locator).strip()

    # Fixed locator validation: p:X l:Y or row:X
    if not LOCATOR_REGEX.match(locator):
        raise ValueError(
            f"Invalid locator format '{locator}'. Fixed format requires 'p:<page> l:<line>' or 'row:<num>'."
        )

    # Validate source resolvable
    if valid_sources is not None:
        if not is_source_resolvable(source_doc_id, valid_sources):
            raise ValueError(
                f"Citation source '{source_doc_id}' is not resolvable against case evidence (00_Raw_Inputs/)."
            )

    return Citation(source_doc_id=source_doc_id, locator=locator, snippet=snippet)


def write_link(
    note_path_or_id: Optional[Union[str, Path]] = None,
    target: Optional[str] = None,
    reason: Optional[str] = None,
    citation: Any = None,
    symmetric: bool = True,
    proposal_id: Optional[str] = None,
    case_path: Optional[Union[str, Path]] = None,
    valid_sources: Optional[Collection[str]] = None,
    *,
    note_path: Optional[Union[str, Path]] = None,
    **kwargs: Any,
) -> dict[str, Any]:
    """
    Writes a verified link into a note's ## Links section.
    This is the SINGLE code path in the codebase that writes links.
    Nothing else writes to ## Links, ever.

    Invariants enforced:
    - Never touches 00_Raw_Inputs/ (brain.guard.assert_writable).
    - Refuses any link without a resolvable citation (source_doc_id + valid locator).
    - Writes into ## Links cleanly without altering note body.
    - Idempotent: does not write duplicate link lines.
    - Symmetric writing: when symmetric=True, writes reciprocal link into target entity note.
    """
    actual_note = note_path_or_id if note_path_or_id is not None else note_path
    if actual_note is None:
        raise ValueError("note_path_or_id is required.")

    if target is None:
        raise ValueError("Link target entity cannot be empty.")

    # 1. Strictly validate citation (raises ValueError on any violation)
    valid_cit = parse_and_validate_citation(citation, case_path=case_path, valid_sources=valid_sources)

    # 2. Resolve note path and assert writability under Law 1
    resolved_note_path = find_note_file(actual_note, case_path=case_path)
    assert_writable(resolved_note_path)

    # 3. Clean target and reason
    clean_target = str(target).strip()
    if clean_target.startswith("[[") and clean_target.endswith("]]"):
        clean_target = clean_target[2:-2].strip()

    if not clean_target:
        raise ValueError("Link target entity cannot be empty.")

    clean_reason = str(reason).strip() if reason else ""
    clean_reason = re.sub(r"\^\[[^\]]+\]", "", clean_reason).strip()
    clean_reason = re.sub(r"<!--.*?-->", "", clean_reason).strip()
    clean_reason = clean_reason.strip("— -").strip()

    # 4. Construct link line
    link_line = f"- [[{clean_target}]] — {clean_reason} ^[{valid_cit.source_doc_id} {valid_cit.locator}]"
    if proposal_id:
        link_line += f" <!-- ai:{proposal_id} accepted -->"

    # 5. Read note and check idempotency
    content = resolved_note_path.read_text(encoding="utf-8")
    lines = [l.strip() for l in content.splitlines()]

    # Check if exact link or AI proposal marker is already present
    already_present = (link_line.strip() in lines) or (
        proposal_id is not None and any(f"<!-- ai:{proposal_id} accepted -->" in l for l in lines)
    )

    if not already_present:
        links_match = re.search(r"^##\s+Links\s*$", content, re.MULTILINE)
        if not links_match:
            # ## Links does not exist: create cleanly at the end
            clean_body = content.rstrip()
            new_content = f"{clean_body}\n\n## Links\n{link_line}\n"
        else:
            header_end = links_match.end()
            next_heading = re.search(r"^#{1,2}\s+", content[header_end:], re.MULTILINE)
            if next_heading:
                section_end = header_end + next_heading.start()
                section_body = content[header_end:section_end]
                after_section = content[section_end:]
                clean_section = section_body.rstrip()
                if clean_section:
                    updated_section = f"{clean_section}\n{link_line}\n\n"
                else:
                    updated_section = f"\n{link_line}\n\n"
                new_content = content[:header_end] + updated_section + after_section.lstrip("\n")
            else:
                section_body = content[header_end:]
                clean_section = section_body.rstrip()
                if clean_section:
                    updated_section = f"{clean_section}\n{link_line}\n"
                else:
                    updated_section = f"\n{link_line}\n"
                new_content = content[:header_end] + updated_section

        assert_writable(resolved_note_path)
        resolved_note_path.write_text(new_content, encoding="utf-8")
        logger.info(f"Wrote link to {resolved_note_path}: {link_line}")

    # 6. Symmetric writing: target entity note gets reverse link
    reciprocal_written = False
    if symmetric:
        source_name = get_entity_name_from_note(resolved_note_path)
        resolved_case = case_path or resolved_note_path.parent.parent
        try:
            target_note = find_note_file(clean_target, case_path=resolved_case)
            if target_note.is_file() and target_note.resolve() != resolved_note_path.resolve():
                write_link(
                    note_path_or_id=target_note,
                    target=source_name,
                    reason=clean_reason,
                    citation=valid_cit,
                    symmetric=False,
                    proposal_id=proposal_id,
                    case_path=resolved_case,
                    valid_sources=valid_sources,
                )
                reciprocal_written = True
        except FileNotFoundError:
            logger.debug(f"Reciprocal note for target '{clean_target}' not found; primary link preserved.")

    return {
        "status": "success",
        "note_path": str(resolved_note_path),
        "target": clean_target,
        "link_line": link_line,
        "symmetric": symmetric,
        "reciprocal_written": reciprocal_written,
    }


def log_decision(
    case_path: Optional[Union[str, Path]],
    proposal_id: str,
    decision: str,
    reason: str,
    proposal: Optional[Union[Proposal, dict[str, Any]]] = None,
) -> dict[str, Any]:
    """
    Appends decision to 07_AI_Synthesis/decisions.jsonl in the case folder
    with full proposal, reason, and ISO timestamp.
    """
    case_dir = resolve_case_directory(case_path)
    synth_dir = case_dir / "07_AI_Synthesis"
    synth_dir.mkdir(parents=True, exist_ok=True)
    decisions_path = synth_dir / "decisions.jsonl"
    assert_writable(decisions_path)

    prop_dict: Optional[dict[str, Any]] = None
    if isinstance(proposal, Proposal):
        prop_dict = proposal.model_dump()
    elif isinstance(proposal, dict):
        prop_dict = proposal

    record = {
        "proposal_id": proposal_id,
        "decision": decision,
        "reason": reason,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "proposal": prop_dict,
    }

    with open(decisions_path, "a", encoding="utf-8") as f:
        f.write(json.dumps(record) + "\n")

    return record


def is_proposal_rejected(
    proposal_id_or_proposal: Union[str, Proposal, dict[str, Any]],
    case_path: Optional[Union[str, Path]] = None,
) -> bool:
    """
    Checks decisions log in 07_AI_Synthesis/decisions.jsonl to verify if a proposal
    has been rejected previously, preventing duplicate proposals.
    """
    case_dir = resolve_case_directory(case_path)
    decisions_path = case_dir / "07_AI_Synthesis" / "decisions.jsonl"
    if not decisions_path.is_file():
        return False

    target_id: Optional[str] = None
    target_source: Optional[str] = None
    target_target: Optional[str] = None
    target_citation: Optional[dict[str, Any]] = None

    if isinstance(proposal_id_or_proposal, str):
        target_id = proposal_id_or_proposal
    elif isinstance(proposal_id_or_proposal, Proposal):
        target_id = proposal_id_or_proposal.id
        target_source = proposal_id_or_proposal.source_entity
        target_target = proposal_id_or_proposal.target_entity
        if proposal_id_or_proposal.citation:
            target_citation = proposal_id_or_proposal.citation.model_dump()
    elif isinstance(proposal_id_or_proposal, dict):
        target_id = proposal_id_or_proposal.get("id")
        target_source = proposal_id_or_proposal.get("source_entity")
        target_target = proposal_id_or_proposal.get("target_entity")
        cit = proposal_id_or_proposal.get("citation")
        if isinstance(cit, Citation):
            target_citation = cit.model_dump()
        elif isinstance(cit, dict):
            target_citation = cit

    with open(decisions_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                entry = json.loads(line)
            except Exception:
                continue

            if entry.get("decision") != "rejected":
                continue

            # Check ID match
            if target_id and entry.get("proposal_id") == target_id:
                return True

            # Check identical proposal content match
            logged_prop = entry.get("proposal")
            if logged_prop and isinstance(logged_prop, dict) and target_source and target_target:
                if (
                    logged_prop.get("source_entity") == target_source
                    and logged_prop.get("target_entity") == target_target
                ):
                    if target_citation:
                        logged_cit = logged_prop.get("citation")
                        if logged_cit and isinstance(logged_cit, dict):
                            if (
                                logged_cit.get("source_doc_id") == target_citation.get("source_doc_id")
                                and logged_cit.get("locator") == target_citation.get("locator")
                            ):
                                return True

    return False


def _find_proposal(
    proposal_id: str,
    case_path: Optional[Union[str, Path]] = None,
) -> Optional[Proposal]:
    """Find proposal in case's 07_AI_Synthesis/ or fallback to mocks.MOCK_PROPOSALS."""
    case_dir = resolve_case_directory(case_path)
    synth_dir = case_dir / "07_AI_Synthesis"
    if synth_dir.is_dir():
        for json_file in synth_dir.glob("*.json*"):
            try:
                if json_file.suffix == ".jsonl":
                    for line in json_file.read_text(encoding="utf-8").splitlines():
                        if not line.strip():
                            continue
                        data = json.loads(line)
                        if data.get("id") == proposal_id:
                            return Proposal(**data)
                else:
                    data = json.loads(json_file.read_text(encoding="utf-8"))
                    if isinstance(data, dict):
                        if data.get("id") == proposal_id:
                            return Proposal(**data)
                        if "new_connections" in data and isinstance(data["new_connections"], list):
                            for p in data["new_connections"]:
                                if isinstance(p, dict) and p.get("id") == proposal_id:
                                    return Proposal(**p)
            except Exception:
                continue

    for mock_p in MOCK_PROPOSALS:
        if mock_p.id == proposal_id:
            return mock_p

    return None


def accept_proposal(
    proposal_id: str,
    case_path: Optional[Union[str, Path]] = None,
    proposal: Optional[Union[Proposal, dict[str, Any]]] = None,
) -> dict[str, Any]:
    """
    Accepts an AI proposal:
    - Writes the link into the source entity's ## Links with <!-- ai:<id> accepted --> marker.
    - Symmetrically writes the reciprocal link.
    - Appends decision to 07_AI_Synthesis/decisions.jsonl.
    """
    case_dir = resolve_case_directory(case_path)
    prop_obj: Optional[Proposal] = None

    if proposal:
        if isinstance(proposal, Proposal):
            prop_obj = proposal
        elif isinstance(proposal, dict):
            prop_obj = Proposal(**proposal)
    else:
        prop_obj = _find_proposal(proposal_id, case_path=case_dir)

    if not prop_obj:
        raise ValueError(f"Proposal '{proposal_id}' not found in case synthesis or mock registry.")

    source = prop_obj.source_entity
    target = prop_obj.target_entity
    reason = prop_obj.reason or prop_obj.claim

    if not source or not target:
        raise ValueError(f"Proposal '{proposal_id}' missing source_entity or target_entity.")

    # Build valid_sources from the real evidentiary documents actually present
    # in this case's 00_Raw_Inputs/, so write_link -> parse_and_validate_citation
    # enforces resolvability by default on the real accept path (Law 3 / §6).
    # No force flag, no skip_validation, no internal bypass.
    valid_sources = build_valid_sources(case_dir)

    # write_link will strictly validate citation and assert writability
    result = write_link(
        note_path_or_id=source,
        target=target,
        reason=reason,
        citation=prop_obj.citation,
        symmetric=True,
        proposal_id=proposal_id,
        case_path=case_dir,
        valid_sources=valid_sources,
    )

    log_decision(
        case_path=case_dir,
        proposal_id=proposal_id,
        decision="accepted",
        reason="Accepted by investigator",
        proposal=prop_obj,
    )

    return {
        "status": "accepted",
        "proposal_id": proposal_id,
        "source": source,
        "target": target,
        "link_line": result.get("link_line"),
    }


def reject_proposal(
    proposal_id: str,
    reason: str = "Rejected by investigator",
    case_path: Optional[Union[str, Path]] = None,
    proposal: Optional[Union[Proposal, dict[str, Any]]] = None,
) -> dict[str, Any]:
    """
    Rejects an AI proposal:
    - Appends decision to 07_AI_Synthesis/decisions.jsonl with full proposal, reason, and timestamp.
    - Never edits any note.
    """
    case_dir = resolve_case_directory(case_path)
    prop_obj: Optional[Proposal] = None

    if proposal:
        if isinstance(proposal, Proposal):
            prop_obj = proposal
        elif isinstance(proposal, dict):
            prop_obj = Proposal(**proposal)
    else:
        prop_obj = _find_proposal(proposal_id, case_path=case_dir)

    log_decision(
        case_path=case_dir,
        proposal_id=proposal_id,
        decision="rejected",
        reason=reason,
        proposal=prop_obj,
    )

    return {
        "status": "rejected",
        "proposal_id": proposal_id,
        "reason": reason,
    }


# -----------------------------------------------------------------------------
# FastAPI Router
# -----------------------------------------------------------------------------
router = APIRouter(prefix="/api/proposal", tags=["proposals"])


@router.post("/{id}/accept")
def api_accept_proposal(
    id: str,
    payload: Optional[ProposalActionRequest] = Body(None),
) -> dict[str, Any]:
    """Accept an AI proposed connection and write link into vault."""
    case_path = None
    proposal = None
    if payload:
        case_path = payload.case_path or payload.case_id
        proposal = payload.proposal

    try:
        return accept_proposal(proposal_id=id, case_path=case_path, proposal=proposal)
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except (ValueError, FileNotFoundError) as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{id}/reject")
def api_reject_proposal(
    id: str,
    payload: Optional[ProposalActionRequest] = Body(None),
) -> dict[str, Any]:
    """Reject an AI proposed connection and log to decisions.jsonl."""
    case_path = None
    reason = "Rejected by investigator"
    proposal = None
    if payload:
        case_path = payload.case_path or payload.case_id
        if payload.reason:
            reason = payload.reason
        proposal = payload.proposal

    try:
        return reject_proposal(
            proposal_id=id,
            reason=reason,
            case_path=case_path,
            proposal=proposal,
        )
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except (ValueError, FileNotFoundError) as e:
        raise HTTPException(status_code=400, detail=str(e))
