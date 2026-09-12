"""
brain/crosscase.py — Cross-case identifier hits scanner and linker (SHO-T05).

Scans 02_Identifiers/ across case folders in the vault.
The same phone number (MSISDN), IMEI, bank account, or vehicle registration
appearing in more than one case is a HIT.

THE SIX LAWS APPLIED:
- Law 1: Evidence is immutable (00_Raw_Inputs/ protected by brain.guard.assert_writable).
- Law 2: The map is deterministic; the AI only proposes (deterministic exact match only).
- Law 3: Every link carries its reason and resolvable citation (DOC_CASE_MATCH).
- Law 6: Identity is resolved conservatively (hard signals only, exact match on normalised values).
"""

from datetime import datetime, timezone
import logging
from pathlib import Path
import re
from typing import Any, Optional, Union
import yaml

from fastapi import APIRouter, Body, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field

from brain.guard import assert_writable
from brain.linker import find_note_file, write_link
from brain.schemas import (
    AnalysisResult,
    Citation,
    CrossCaseHit,
    CrossCaseResponse,
    FileUpdateProposal,
    Proposal,
)
from brain.vault import get_vaults_root

logger = logging.getLogger("brain.crosscase")


# ---------------------------------------------------------------------------
# Deterministic Normalization Routines
# ---------------------------------------------------------------------------

def normalize_phone(val: Any) -> Optional[str]:
    """
    Normalizes an Indian mobile phone number (MSISDN).
    Rule: strip '+91', leading '0', spaces, dashes -> 10-digit Indian mobile number.
    Returns canonical 10-digit string if valid, else None.
    """
    if val is None:
        return None
    raw = str(val).strip()
    if not raw:
        return None

    # Strip spaces, dashes, parentheses, dots
    cleaned = re.sub(r"[\s\-\(\)\.]+", "", raw)

    # Strip +91 or leading 91 (if 12 digits total)
    if cleaned.startswith("+91"):
        cleaned = cleaned[3:]
    elif cleaned.startswith("91") and len(cleaned) == 12:
        cleaned = cleaned[2:]

    # Strip leading 0 (if 11 digits total)
    if cleaned.startswith("0") and len(cleaned) == 11:
        cleaned = cleaned[1:]

    # Check for canonical 10 digits
    if re.fullmatch(r"\d{10}", cleaned):
        return cleaned
    return None


def normalize_imei(val: Any) -> Optional[str]:
    """
    Normalizes a handset IMEI.
    Rule: strip spaces, dashes -> 15-digit digits.
    Returns canonical 15-digit string if valid, else None.
    """
    if val is None:
        return None
    raw = str(val).strip()
    if not raw:
        return None

    cleaned = re.sub(r"[\s\-\.]+", "", raw)
    if re.fullmatch(r"\d{15}", cleaned):
        return cleaned
    return None


def normalize_vehicle_account_handle(val: Any) -> str:
    """
    Normalizes vehicle registration, account number, or handle.
    Rule: strip whitespace and uppercase.
    """
    if val is None:
        return ""
    raw = str(val).strip()
    return "".join(raw.split()).upper()


def normalize_identifier(val: Any, hint_type: Optional[str] = None) -> tuple[str, str]:
    """
    Normalizes an identifier value and determines its hit_type.
    Returns (normalized_value, hit_type).
    """
    if val is None:
        return ("", "identifier")
    raw = str(val).strip()
    if not raw:
        return ("", "identifier")

    # Strip internal ident_ prefix if present
    if raw.lower().startswith("ident_"):
        raw = raw[6:]

    clean_hint = hint_type.lower().strip() if hint_type else None
    if clean_hint in ("identifier", "misc"):
        clean_hint = None

    # 1. Phone / MSISDN hint
    if clean_hint in ("phone", "msisdn"):
        norm_p = normalize_phone(raw)
        if norm_p:
            return (norm_p, "phone")

    # 2. IMEI hint
    if clean_hint in ("imei",):
        norm_i = normalize_imei(raw)
        if norm_i:
            return (norm_i, "imei")

    # 3. Vehicle reg hint
    if clean_hint in ("vehicle_reg", "vehicle"):
        return (normalize_vehicle_account_handle(raw), "vehicle_reg")

    # 4. Bank account hint
    if clean_hint in ("account", "bank_account"):
        return (normalize_vehicle_account_handle(raw), "account")

    # 5. Social handle hint
    if clean_hint in ("handle", "social"):
        return (normalize_vehicle_account_handle(raw), "handle")

    # If no hint or hint did not directly match: infer deterministically
    norm_p = normalize_phone(raw)
    if norm_p:
        return (norm_p, "phone")

    norm_i = normalize_imei(raw)
    if norm_i:
        return (norm_i, "imei")

    norm_veh = normalize_vehicle_account_handle(raw)
    if re.match(r"^[A-Z]{2}[0-9A-Z\-]+$", norm_veh) and any(c.isdigit() for c in norm_veh) and ("-" in norm_veh or len(norm_veh) in (9, 10)):
        return (norm_veh, "vehicle_reg")

    return (norm_veh, clean_hint or "identifier")


# ---------------------------------------------------------------------------
# Case Discovery and Note Parsing
# ---------------------------------------------------------------------------

def discover_cases(root: Union[Path, str]) -> list[Path]:
    """
    Discovers valid case directories located in or at `root`.
    A case directory must be a directory containing a 02_Identifiers subdirectory.
    """
    p = Path(root)
    if not p.exists():
        return []

    # If root itself is a single case directory with 02_Identifiers
    if p.is_dir() and (p / "02_Identifiers").is_dir():
        # Check if it has subdirectories that are cases themselves
        sub_cases = [
            sub for sub in p.iterdir()
            if sub.is_dir() and not sub.name.startswith(".") and (sub / "02_Identifiers").is_dir()
        ]
        if not sub_cases:
            return [p]
        return sorted(sub_cases)

    if not p.is_dir():
        return []

    cases: list[Path] = []
    for sub in p.iterdir():
        if sub.is_dir() and not sub.name.startswith(".") and (sub / "02_Identifiers").is_dir():
            cases.append(sub)

    return sorted(cases)


def get_case_name(case_dir: Path) -> str:
    """Extracts canonical case identifier from Case_Config.yaml or folder name."""
    cfg_path = case_dir / "Case_Config.yaml"
    if cfg_path.is_file():
        try:
            with open(cfg_path, "r", encoding="utf-8") as f:
                cfg = yaml.safe_load(f)
                if isinstance(cfg, dict):
                    if "case_id" in cfg and cfg["case_id"]:
                        return str(cfg["case_id"])
                    if "case_name" in cfg and cfg["case_name"]:
                        return str(cfg["case_name"])
        except Exception:
            pass
    return case_dir.name


def extract_identifiers_from_note(note_path: Path) -> list[tuple[str, str]]:
    """
    Extracts (normalized_key, hit_type) pairs from an identifier markdown note.
    Inspects frontmatter keys (identifiers, names, value, id, sub_type, type) and filename stem.
    """
    try:
        content = note_path.read_text(encoding="utf-8", errors="replace")
    except Exception as e:
        logger.warning(f"Failed to read note {note_path}: {e}")
        return []

    fm: dict[str, Any] = {}
    if content.startswith("---"):
        parts = content.split("---", 2)
        if len(parts) >= 3:
            try:
                parsed = yaml.safe_load(parts[1])
                if isinstance(parsed, dict):
                    fm = parsed
            except Exception as e:
                logger.warning(f"Failed to parse frontmatter in {note_path}: {e}")

    hint_type = fm.get("sub_type") or fm.get("type")

    # Collect raw values to inspect
    raw_candidates: list[Any] = []

    # 1. identifiers field
    fm_idents = fm.get("identifiers")
    if isinstance(fm_idents, list):
        raw_candidates.extend(fm_idents)
    elif fm_idents is not None:
        raw_candidates.append(fm_idents)

    # 2. value field
    if fm.get("value") is not None:
        raw_candidates.append(fm["value"])

    # 3. names field
    fm_names = fm.get("names")
    if isinstance(fm_names, list):
        raw_candidates.extend(fm_names)
    elif fm_names is not None:
        raw_candidates.append(fm_names)

    # 4. filename stem (very reliable in SyndicateBrain)
    raw_candidates.append(note_path.stem)

    # 5. id field
    if fm.get("id") is not None:
        raw_id = str(fm["id"]).strip()
        if raw_id.lower().startswith("ident_"):
            raw_candidates.append(raw_id[6:])
        else:
            raw_candidates.append(raw_id)

    results: set[tuple[str, str]] = set()
    for cand in raw_candidates:
        norm_key, h_type = normalize_identifier(cand, hint_type=hint_type)
        if norm_key:
            results.add((norm_key, h_type))

    return sorted(list(results))


# ---------------------------------------------------------------------------
# Main Cross-Case Scanner
# ---------------------------------------------------------------------------

def scan_cross_case_hits(
    vaults_root: Optional[Union[Path, str]] = None,
    cases: Optional[list[Union[Path, str]]] = None,
) -> CrossCaseResponse:
    """
    Scans 02_Identifiers/ across every discovered case.
    Detects any normalized identifier appearing in >= 2 distinct cases.
    Returns CrossCaseResponse(hits=[...]).
    """
    # 1. Resolve case directories
    case_dirs: list[Path] = []

    if cases is not None:
        for c in cases:
            cp = Path(c)
            if cp.is_dir():
                case_dirs.append(cp)
    else:
        root = Path(vaults_root) if vaults_root is not None else get_vaults_root()
        case_dirs = discover_cases(root)

        # Fallback to data/ if vaults/ has fewer than 2 cases
        if len(case_dirs) < 2 and (vaults_root is None or Path(vaults_root) == Path("vaults") or Path(vaults_root) == get_vaults_root()):
            data_cases = discover_cases(Path("data"))
            if len(data_cases) >= 2:
                case_dirs = data_cases

    if len(case_dirs) < 2:
        logger.info(f"Fewer than 2 cases found ({len(case_dirs)}); no cross-case hits possible.")
        return CrossCaseResponse(hits=[])

    # 2. Extract and group identifiers
    grouped: dict[str, dict[str, Any]] = {}

    for c_dir in case_dirs:
        c_name = get_case_name(c_dir)
        ident_dir = c_dir / "02_Identifiers"
        if not ident_dir.is_dir():
            continue

        for note_file in sorted(ident_dir.glob("*.md")):
            id_pairs = extract_identifiers_from_note(note_file)
            for norm_id, hit_type in id_pairs:
                if not norm_id:
                    continue

                if norm_id not in grouped:
                    grouped[norm_id] = {
                        "identifier": norm_id,
                        "hit_type": hit_type,
                        "cases": set(),
                        "notes": set(),
                    }

                grouped[norm_id]["cases"].add(c_name)
                grouped[norm_id]["notes"].add(str(note_file))
                # If hit_type is more specific than 'identifier', update it
                if hit_type != "identifier":
                    grouped[norm_id]["hit_type"] = hit_type

    # 3. Filter to identifiers in >= 2 distinct cases
    hits: list[CrossCaseHit] = []
    for norm_id, data in grouped.items():
        distinct_cases = sorted(list(data["cases"]))
        if len(distinct_cases) >= 2:
            hits.append(
                CrossCaseHit(
                    identifier=norm_id,
                    cases=distinct_cases,
                    notes=sorted(list(data["notes"])),
                    hit_type=data["hit_type"],
                )
            )

    # Deterministic sort: hit_type, then identifier
    hits.sort(key=lambda h: (h.hit_type, h.identifier))
    return CrossCaseResponse(hits=hits)


# ---------------------------------------------------------------------------
# Cross-Case Link Writer
# ---------------------------------------------------------------------------

def apply_cross_case_links(
    hit: CrossCaseHit,
    vaults_root: Optional[Union[Path, str]] = None,
    citation: Optional[Any] = None,
) -> list[dict[str, Any]]:
    """
    Uses brain.linker.write_link to write a cross-case link into the identifier note
    in each case.
    Ensures Law 3 citation and Law 1 guard protection are strictly respected.
    """
    # Deterministic citation for cross-case matches
    cit = citation
    if cit is None:
        cit = Citation(
            source_doc_id="DOC_CASE_MATCH",
            locator="row:1",
            snippet=f"Cross-case identifier match across {', '.join(hit.cases)}",
        )

    results: list[dict[str, Any]] = []

    # Map each case to its note file path
    case_note_map: dict[str, Path] = {}

    # Check note paths already registered in hit
    for note_str in hit.notes:
        note_p = Path(note_str)
        if note_p.is_file():
            # Check Law 1 writability
            assert_writable(note_p)

            # Determine which case this note belongs to
            matched_case: Optional[str] = None
            for c_name in hit.cases:
                if c_name in note_p.parts:
                    matched_case = c_name
                    break
            if not matched_case:
                # Inspect frontmatter case
                try:
                    content = note_p.read_text(encoding="utf-8", errors="ignore")
                    if content.startswith("---"):
                        fm = yaml.safe_load(content.split("---", 2)[1])
                        if isinstance(fm, dict) and fm.get("case"):
                            matched_case = str(fm["case"])
                except Exception:
                    pass

            if matched_case:
                case_note_map[matched_case] = note_p

    # If some cases were not found from hit.notes, locate them in case folders
    for c_name in hit.cases:
        if c_name not in case_note_map:
            for root_cand in [
                Path(vaults_root) if vaults_root else None,
                Path("data"),
                Path("vaults"),
                get_vaults_root(),
            ]:
                if root_cand and root_cand.is_dir():
                    cand_case = root_cand / c_name
                    if cand_case.is_dir():
                        # Look for identifier note
                        direct_note = cand_case / "02_Identifiers" / f"{hit.identifier}.md"
                        if direct_note.is_file():
                            case_note_map[c_name] = direct_note
                            break
                        # Search by stem
                        for f in (cand_case / "02_Identifiers").glob("*.md"):
                            pairs = extract_identifiers_from_note(f)
                            if any(p[0] == hit.identifier for p in pairs):
                                case_note_map[c_name] = f
                                break

    # For each case, write links to all other matching cases
    for c_name, note_path in case_note_map.items():
        assert_writable(note_path)
        case_dir = note_path.parent.parent

        other_cases = [other for other in hit.cases if other != c_name]
        for other in other_cases:
            res = write_link(
                note_path_or_id=note_path,
                target=other,
                reason="cross-case identifier hit",
                citation=cit,
                symmetric=False,
                case_path=case_dir,
            )
            results.append({
                "case": c_name,
                "target_case": other,
                "note": str(note_path),
                "write_result": res,
            })

    return results


# ---------------------------------------------------------------------------
# Helper to Augment AnalysisResult
# ---------------------------------------------------------------------------

def augment_analysis_result(
    analysis_result: AnalysisResult,
    case_id_or_path: Optional[Union[Path, str]] = None,
    vaults_root: Optional[Union[Path, str]] = None,
    cross_case_hits: Optional[list[CrossCaseHit]] = None,
) -> AnalysisResult:
    """
    Augments an AnalysisResult with cross-case identifier hits for the given case.
    Adds proposals to new_connections, suggested note updates to files_to_update,
    and references to the summary.
    """
    target_case = str(case_id_or_path or analysis_result.case_id).strip()
    if "/" in target_case or "\\" in target_case:
        target_case = Path(target_case).name

    all_hits = (
        cross_case_hits
        if cross_case_hits is not None
        else scan_cross_case_hits(vaults_root=vaults_root).hits
    )

    matching_hits = [
        h for h in all_hits
        if any(target_case.lower() in c.lower() or c.lower() in target_case.lower() for c in h.cases)
    ]

    if not matching_hits:
        return analysis_result

    # Attach cross_case_hits to analysis_result
    setattr(analysis_result, "cross_case_hits", matching_hits)

    for hit in matching_hits:
        other_cases = [
            c for c in hit.cases
            if not (target_case.lower() in c.lower() or c.lower() in target_case.lower())
        ]
        other_str = ", ".join(other_cases) if other_cases else "other cases"

        # 1. Add Proposal to new_connections
        prop_id = f"prop_crosscase_{hit.identifier}"
        if not any(p.id == prop_id for p in analysis_result.new_connections):
            analysis_result.new_connections.append(
                Proposal(
                    id=prop_id,
                    claim=f"Identifier {hit.identifier} matches across cases: {', '.join(hit.cases)}.",
                    reason=f"Deterministic cross-case {hit.hit_type} hit with {other_str}",
                    citation=Citation(
                        source_doc_id="DOC_CASE_MATCH",
                        locator="row:1",
                        snippet=f"Cross-case match: {hit.identifier} found in {', '.join(hit.cases)}",
                    ),
                    confidence=1.0,
                    source_entity=hit.identifier,
                    target_entity=other_cases[0] if other_cases else None,
                    status="proposed",
                )
            )

        # 2. Add FileUpdateProposal to files_to_update
        for note_str in hit.notes:
            note_p = Path(note_str)
            if target_case.lower() in str(note_p).lower():
                links = [
                    f"- [[{oc}]] — cross-case identifier hit ^[DOC_CASE_MATCH row:1]"
                    for oc in other_cases
                ]
                if not any(f.file_path == str(note_p) for f in analysis_result.files_to_update):
                    analysis_result.files_to_update.append(
                        FileUpdateProposal(
                            file_path=str(note_p),
                            note_id=hit.identifier,
                            suggested_additions=links,
                            reason=f"Deterministic cross-case {hit.hit_type} match with {other_str}",
                            citation=Citation(source_doc_id="DOC_CASE_MATCH", locator="row:1"),
                        )
                    )

    # 3. Update summary
    hit_summary = (
        f" Cross-case analysis identified {len(matching_hits)} shared identifier(s) "
        f"across cases ({', '.join(h.identifier for h in matching_hits)}). ^[DOC_CASE_MATCH row:1]"
    )
    if "DOC_CASE_MATCH" not in analysis_result.summary:
        analysis_result.summary = (analysis_result.summary.rstrip() + hit_summary).strip()

    return analysis_result


# Alias for backwards compatibility
augment_with_cross_case_hits = augment_analysis_result


# ---------------------------------------------------------------------------
# FastAPI Router
# ---------------------------------------------------------------------------

router = APIRouter(prefix="/api/crosscase", tags=["crosscase"])


class ApplyCrossCaseRequest(BaseModel):
    """Payload for POST /api/crosscase/apply."""
    model_config = ConfigDict(extra="allow")

    hit: Optional[CrossCaseHit] = None
    identifier: Optional[str] = None
    cases: list[str] = Field(default_factory=list)
    notes: list[str] = Field(default_factory=list)
    hit_type: str = "phone"
    vaults_root: Optional[str] = None


@router.get("/hits", response_model=CrossCaseResponse)
def get_crosscase_hits(
    vaults_root: Optional[str] = Query(None, description="Optional root directory to scan for case vaults"),
) -> CrossCaseResponse:
    """
    Deterministic scan for identifiers appearing across multiple cases.
    Falls back to data/ if vaults/ has fewer than 2 cases.
    """
    return scan_cross_case_hits(vaults_root=vaults_root)


@router.post("/apply")
def post_apply_crosscase_links(
    payload: Optional[ApplyCrossCaseRequest] = Body(None),
) -> dict[str, Any]:
    """
    Writes cross-case note links into identifier notes using brain.linker.write_link.
    """
    if payload is None:
        raise HTTPException(status_code=400, detail="Request body required.")

    hit = payload.hit
    if hit is None:
        if not payload.identifier:
            # If no specific identifier provided, apply all discovered hits
            discovered = scan_cross_case_hits(vaults_root=payload.vaults_root).hits
            all_results = []
            for h in discovered:
                all_results.extend(apply_cross_case_links(hit=h, vaults_root=payload.vaults_root))
            return {
                "status": "success",
                "hits_processed": len(discovered),
                "links_written": len(all_results),
                "results": all_results,
            }
        hit = CrossCaseHit(
            identifier=payload.identifier,
            cases=payload.cases,
            notes=payload.notes,
            hit_type=payload.hit_type,
        )

    try:
        results = apply_cross_case_links(hit=hit, vaults_root=payload.vaults_root)
        return {
            "status": "success",
            "identifier": hit.identifier,
            "links_written": len(results),
            "results": results,
        }
    except Exception as e:
        logger.error(f"Failed to apply cross-case links for {hit.identifier}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
