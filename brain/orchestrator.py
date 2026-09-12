"""
brain/orchestrator.py — Case Analysis Orchestrator (Law 2, 3, 4, Block 4 AKS-T05).

Coordinates case analysis upon clicking 'Analyse case':
1. Loads _Case_Index.md from the case vault.
2. Fans out to per-folder reader agents (People, Events, Locations, Identifiers, Organisations)
   with the relevant slice of the index plus new raw inputs.
3. Runs specialist agents:
   - Connection Finder (brain.agents.connection_finder)
   - Contradiction Detector (brain.agents.contradiction)
4. Collects proposals and routes EVERY proposal and summary sentence through brain.agents.validator.
5. Drops any proposal or sentence lacking a valid, resolvable citation (Law 4).
6. Returns one schema-valid AnalysisResult: new_connections[], files_to_update[], summary.

Every specialist agent call goes through brain.llm.client.LLMClient.generate_structured() —
there is no hand-authored claim/citation text in this module. If a folder's slice is empty,
or a model call raises after its retry, that folder is skipped and analysis continues with
whatever the other folders and agents produced; Law 4 validation is what decides what survives.

Cache escape hatch (Block 5/7 fixtures): if 07_AI_Synthesis/.cache_ready exists (written by
`scripts/reset.py --cached`), a live-model failure — or SYNDICATEBRAIN_PREFER_CACHE=1 forcing
it outright — falls back to the pre-computed analysis_result.json instead of hard-failing.
"""

from datetime import datetime, timezone
import difflib
import json
import logging
import os
from pathlib import Path
import re
import time
from typing import Any, Optional, Union

from brain.agents.connection_finder import (
    CONNECTION_FINDER_SYSTEM_PROMPT,
    build_connection_prompt,
    ConnectionFinderOutput,
)
from brain.agents.contradiction import (
    CONTRADICTION_DETECTOR_SYSTEM_PROMPT,
    build_contradiction_prompt,
    ContradictionOutput,
)
from brain.agents.validator import (
    validate_analysis_result,
    validate_proposal,
    validate_proposals,
    validate_text,
)
from brain.llm.client import get_llm_client, LLMClient
from brain.schemas import (
    AnalysisResult,
    Citation,
    FileUpdateProposal,
    Proposal,
)
from pydantic import BaseModel, Field
from brain.vault import get_vaults_root, open_case

logger = logging.getLogger("brain.orchestrator")

# Wall-clock budget for the whole fan-out so a stalled local model degrades the
# result (fewer folders analysed) instead of hanging the demo indefinitely.
MAX_FAN_OUT_SECONDS = float(os.environ.get("SYNDICATEBRAIN_FAN_OUT_BUDGET", "150"))

# Cap on raw evidence / CSV excerpt sizes fed into any single prompt. Small local models
# (llama3 on CPU) get dramatically slower per extra KB of context, so these are kept tight.
MAX_EVIDENCE_PACK_CHARS = 2500
MAX_PHYSICAL_EVIDENCE_CHARS = 2000
MAX_CSV_ROWS_PER_FILE = 20
MAX_INDEX_SLICE_CHARS = 1200

CACHE_SUBDIR = "07_AI_Synthesis"


class SummaryOutput(BaseModel):
    """Schema for the model-generated case summary."""
    summary: str = Field(default="")


def resolve_case_dir(case_id_or_path: Optional[str] = None) -> Path:
    """Resolves case identifier or directory path to an existing Path."""
    if case_id_or_path:
        p = Path(case_id_or_path)
        if p.exists() and p.is_dir():
            return p
        # Check in vaults/ or data/
        for parent in [Path("data"), Path("vaults"), get_vaults_root()]:
            cand = parent / case_id_or_path
            if cand.exists() and cand.is_dir():
                return cand

    # Default fallback to primary demo case
    for default_cand in [
        Path("data/Case_01_Sonipat_Arms"),
        Path("vaults/Case_01_Sonipat_Arms"),
    ]:
        if default_cand.exists() and default_cand.is_dir():
            return default_cand

    raise FileNotFoundError(f"Case directory not found: {case_id_or_path}")


def load_case_index_slices(case_dir: Path) -> dict[str, str]:
    """
    Reads _Case_Index.md and slices entries by folder/section:
    'People', 'Identifiers', 'Vehicles', 'Locations', 'Organisations', 'Events'.
    """
    index_path = case_dir / "_Case_Index.md"
    if not index_path.exists():
        # Build if missing
        from brain.index.build import build_case_index
        build_case_index(case_dir)

    slices: dict[str, list[str]] = {
        "People": [],
        "Identifiers": [],
        "Vehicles": [],
        "Locations": [],
        "Organisations": [],
        "Events": [],
    }

    if not index_path.exists():
        return {k: "" for k in slices}

    content = index_path.read_text(encoding="utf-8", errors="replace")
    current_section: Optional[str] = None

    for line in content.splitlines():
        sec_match = re.match(r"^##\s+(\w+)", line)
        if sec_match:
            sec_name = sec_match.group(1)
            if sec_name in slices:
                current_section = sec_name
            else:
                current_section = None
            continue

        if current_section and line.strip():
            slices[current_section].append(line)

    return {k: "\n".join(v) for k, v in slices.items()}


def get_raw_input_files(case_dir: Path) -> list[Path]:
    """Returns list of all evidentiary files inside 00_Raw_Inputs/ (ignoring .sha256 sidecars)."""
    raw_dir = case_dir / "00_Raw_Inputs"
    if not raw_dir.exists():
        return []
    return [
        p for p in raw_dir.rglob("*")
        if p.is_file() and not p.name.endswith(".sha256") and not p.name.startswith(".")
    ]


# ---------------------------------------------------------------------------
# Grounding helpers: valid citation sources, evidence packs, CSV row excerpts.
# ---------------------------------------------------------------------------

_CITATION_TOKEN_RE = re.compile(r"\^\[\s*([^\s\]]+)")
_PHONE_OR_IMEI_RE = re.compile(r"(?<!\d)\d{10,15}(?!\d)")
_TOWER_ID_RE = re.compile(r"[A-Za-z]{2}-[A-Za-z0-9]+-\d+")


def _derive_csv_doc_id(f: Path) -> Optional[str]:
    """
    Derives the canonical DOC_<...> id for a CDR/TowerDump CSV from its filename,
    matching the short-id convention already used across this case's markdown notes
    (e.g. TowerDump_HR-SNP-0147_....csv -> DOC_TD_HR_SNP_0147; CDR_9812345678_....csv
    -> DOC_CDR_9812345678). Returns None if no confident convention applies.
    """
    if f.suffix.lower() != ".csv":
        return None
    upper_stem = f.stem.upper()
    if "CDR" in upper_stem:
        phone_match = _PHONE_OR_IMEI_RE.search(f.stem)
        if phone_match:
            return f"DOC_CDR_{phone_match.group(0)}"
    if "TOWER" in upper_stem or "TD" in upper_stem.split("_"):
        tower_match = _TOWER_ID_RE.search(f.stem)
        if tower_match:
            return f"DOC_TD_{tower_match.group(0).replace('-', '_')}"
    return None


def build_valid_sources(case_dir: Path, raw_files: list[Path]) -> set[str]:
    """
    Builds the set of resolvable citation source_doc_ids for this case by:
    1. Scanning every markdown note in the vault (raw inputs and entity notes alike)
       for citation tokens already embedded in real text (self-citations).
    2. Deriving ids for CDR / TowerDump CSVs from their filenames, since those files
       carry no embedded citations of their own (they are the physical record).
    Both forms (with and without the DOC_ prefix) are included; validator.py already
    normalizes across that prefix, but keeping both here avoids surprises.
    """
    valid_sources: set[str] = set()

    for md_path in case_dir.rglob("*.md"):
        try:
            text = md_path.read_text(encoding="utf-8", errors="replace")
        except Exception:
            continue
        for m in _CITATION_TOKEN_RE.finditer(text):
            token = m.group(1).strip()
            if token:
                valid_sources.add(token)
                valid_sources.add(token.removeprefix("DOC_"))
                valid_sources.add(f"DOC_{token.removeprefix('DOC_')}")

    for f in raw_files:
        stem = f.stem
        valid_sources.add(stem)
        valid_sources.add(f.name)
        valid_sources.add(f"DOC_{stem}")

        csv_doc_id = _derive_csv_doc_id(f)
        if csv_doc_id:
            valid_sources.add(csv_doc_id)
            valid_sources.add(csv_doc_id.removeprefix("DOC_"))

    return valid_sources


def _extract_known_identifiers(case_dir: Path) -> set[str]:
    """Collects phone/IMEI-like numeric identifiers from People + Identifiers notes."""
    known: set[str] = set()
    for sub in ("01_People", "02_Identifiers"):
        folder = case_dir / sub
        if not folder.exists():
            continue
        for p in folder.glob("*.md"):
            try:
                text = p.read_text(encoding="utf-8", errors="replace")
            except Exception:
                continue
            known.update(_PHONE_OR_IMEI_RE.findall(text))
    return known


def _build_evidence_pack(raw_files: list[Path], max_chars: int = MAX_EVIDENCE_PACK_CHARS) -> str:
    """Concatenates full text of markdown evidentiary docs (FIR/Statement/FieldLog), capped."""
    parts: list[str] = []
    total = 0
    for f in sorted(raw_files):
        if f.suffix.lower() != ".md":
            continue
        try:
            text = f.read_text(encoding="utf-8", errors="replace")
        except Exception:
            continue
        header = f"\n=== DOCUMENT: {f.name} ===\n"
        chunk = header + text
        if total + len(chunk) > max_chars:
            remaining = max(0, max_chars - total)
            parts.append(chunk[:remaining] + "\n[... truncated ...]")
            total = max_chars
            break
        parts.append(chunk)
        total += len(chunk)
    return "\n".join(parts)


def _extract_relevant_csv_rows(
    csv_path: Path,
    known_numbers: set[str],
    max_rows: int = MAX_CSV_ROWS_PER_FILE,
) -> list[str]:
    """
    Reads a CDR/TowerDump CSV and returns formatted 'row:<N> | <line>' strings for
    data rows that mention a known identifier. Row numbers are 1-based data-row
    indices (line 1 is the header, so file line L is row L-1) matching the
    `row:48219`-style locator convention already used across the case notes.
    """
    if not known_numbers or not csv_path.exists():
        return []
    matches: list[str] = []
    try:
        with csv_path.open("r", encoding="utf-8", errors="replace") as fh:
            for line_no, line in enumerate(fh, start=1):
                if line_no == 1:
                    continue  # header
                if any(num in line for num in known_numbers):
                    row_no = line_no - 1
                    matches.append(f"row:{row_no} | {line.strip()}")
                    if len(matches) >= max_rows:
                        break
    except Exception as e:
        logger.warning(f"Failed reading CSV {csv_path}: {e}")
    return matches


def _build_physical_evidence_text(
    raw_files: list[Path],
    known_numbers: set[str],
    max_chars: int = MAX_PHYSICAL_EVIDENCE_CHARS,
) -> str:
    """Builds a bounded, row-numbered excerpt of CDR + TowerDump CSVs relevant to known parties."""
    parts: list[str] = []
    total = 0
    for f in sorted(raw_files):
        if f.suffix.lower() != ".csv":
            continue
        rows = _extract_relevant_csv_rows(f, known_numbers)
        if not rows:
            continue
        doc_id = _derive_csv_doc_id(f) or f"DOC_{f.stem}"
        header = (
            f"\n=== CSV: {f.name} | source_doc_id: {doc_id} "
            f"(Calling Party,Called Party,Call Date Time,Duration(s),Call Type,IMEI,IMSI,First CGI,TAC) ===\n"
            f"(cite this record as ^[{doc_id} row:<N>] using the exact row number shown below)\n"
        )
        body = "\n".join(rows)
        chunk = header + body
        if total + len(chunk) > max_chars:
            remaining = max(0, max_chars - total)
            parts.append(chunk[:remaining] + "\n[... truncated ...]")
            break
        parts.append(chunk)
        total += len(chunk)
    return "\n".join(parts)


def _candidate_to_proposal(candidate: Any, index: int, prefix: str = "prop") -> Optional[Proposal]:
    """
    Upgrades a flat model-returned candidate (ConnectionCandidate / ContradictionCandidate —
    claim, reason, source_doc_id, locator, confidence, source_entity, target_entity) into a
    full brain.schemas.Proposal, assigning the id/status/created_at fields the model was never
    asked to produce. Returns None if the candidate is missing required fields.
    """
    source_doc_id = getattr(candidate, "source_doc_id", "") or ""
    locator = getattr(candidate, "locator", "") or ""
    claim = getattr(candidate, "claim", "") or ""
    reason = getattr(candidate, "reason", "") or ""
    if not (source_doc_id and locator and claim):
        return None
    if not reason:
        reason = f"Evidentiary connection derived from {source_doc_id} {locator}"

    return Proposal(
        id=f"{prefix}_{index:04d}",
        claim=claim,
        reason=reason,
        citation=Citation(source_doc_id=source_doc_id, locator=locator),
        confidence=getattr(candidate, "confidence", 0.8) or 0.8,
        source_entity=getattr(candidate, "source_entity", None),
        target_entity=getattr(candidate, "target_entity", None),
        status="proposed",
        created_at=datetime.now(timezone.utc).isoformat(),
    )


def _match_entity_note(case_dir: Path, entity_name: Optional[str]) -> Optional[tuple[str, str]]:
    """Finds the entity's note file (People/Identifiers/etc) by name. Returns (rel_path, note_id) or None."""
    if not entity_name:
        return None
    candidates: list[Path] = []
    for sub in ("01_People", "02_Identifiers", "03_Vehicles", "04_Locations", "05_Organisations"):
        folder = case_dir / sub
        if folder.exists():
            candidates.extend(folder.glob("*.md"))

    exact = [p for p in candidates if p.stem.lower() == entity_name.strip().lower()]
    chosen: Optional[Path] = None
    if exact:
        chosen = exact[0]
    else:
        stems = [p.stem for p in candidates]
        close = difflib.get_close_matches(entity_name, stems, n=1, cutoff=0.7)
        if close:
            chosen = next((p for p in candidates if p.stem == close[0]), None)

    if not chosen:
        return None

    note_id = None
    try:
        text = chosen.read_text(encoding="utf-8", errors="replace")
        id_match = re.search(r"^id:\s*(\S+)", text, re.MULTILINE)
        if id_match:
            note_id = id_match.group(1)
    except Exception:
        pass

    return str(chosen.relative_to(case_dir)), note_id


def _build_files_to_update(case_dir: Path, proposals: list[Proposal]) -> list[FileUpdateProposal]:
    """
    Groups surviving connection/contradiction proposals by the entity note they concern
    and turns each group into a suggested (never applied) addition to that note's
    ## Links section, citing the same evidence the proposal itself carries.
    """
    by_file: dict[str, dict[str, Any]] = {}

    for prop in proposals:
        for entity in (prop.source_entity, prop.target_entity):
            match = _match_entity_note(case_dir, entity)
            if not match:
                continue
            rel_path, note_id = match
            other = prop.target_entity if entity == prop.source_entity else prop.source_entity
            line = f"- [[{other}]] — {prop.claim} ^[{prop.citation.source_doc_id} {prop.citation.locator}]"

            bucket = by_file.setdefault(rel_path, {
                "note_id": note_id,
                "additions": [],
                "reasons": [],
                "citation": prop.citation,
            })
            if line not in bucket["additions"]:
                bucket["additions"].append(line)
            if prop.reason not in bucket["reasons"]:
                bucket["reasons"].append(prop.reason)

    files_to_update: list[FileUpdateProposal] = []
    for rel_path, bucket in by_file.items():
        files_to_update.append(
            FileUpdateProposal(
                file_path=rel_path,
                note_id=bucket["note_id"],
                suggested_additions=bucket["additions"],
                reason="; ".join(bucket["reasons"])[:500],
                citation=bucket["citation"],
            )
        )
    return files_to_update


def _generate_summary(
    llm_client: LLMClient,
    proposals: list[Proposal],
    case_name: str,
) -> str:
    """Asks the model for a short prose summary citing only the already-validated proposals."""
    if not proposals:
        return "No new citable connections or contradictions were identified in this pass."

    facts = "\n".join(
        f"- {p.claim} ^[{p.citation.source_doc_id} {p.citation.locator}]"
        for p in proposals
    )
    prompt = f"""Case: {case_name}

The following findings have ALREADY been verified and carry valid citations:
{facts}

Write a concise 2-4 sentence summary of what this analysis pass found. Every sentence
you write MUST end with one of the exact citation tokens shown above (e.g. ^[{proposals[0].citation.source_doc_id} {proposals[0].citation.locator}]),
copied verbatim. Do not invent any new citation. Do not include any sentence you cannot
cite from the list above."""

    try:
        out = llm_client.generate_structured(
            prompt=prompt,
            response_schema=SummaryOutput,
            system_prompt="You are a case-analysis summarizer. Output only JSON matching the schema. Never invent citations.",
        )
        return out.summary or ""
    except Exception as e:
        logger.warning(f"Summary generation failed, falling back to concatenated findings: {e}")
        return " ".join(
            f"{p.claim} ^[{p.citation.source_doc_id} {p.citation.locator}]" for p in proposals
        )


def _cache_dir(case_dir: Path) -> Path:
    return case_dir / CACHE_SUBDIR


def load_cached_analysis_result(case_dir: Path) -> Optional[AnalysisResult]:
    """Loads the pre-computed AnalysisResult fixture written by `scripts/reset.py --cached`."""
    synth_dir = _cache_dir(case_dir)
    marker = synth_dir / ".cache_ready"
    result_file = synth_dir / "analysis_result.json"
    if not marker.exists() or not result_file.exists():
        return None
    try:
        data = json.loads(result_file.read_text(encoding="utf-8"))
        return AnalysisResult.model_validate(data)
    except Exception as e:
        logger.warning(f"Failed to load cached analysis_result.json: {e}")
        return None


def _prefer_cache_flag() -> bool:
    return os.environ.get("SYNDICATEBRAIN_PREFER_CACHE", "").strip() == "1"


def run_fan_out_analysis(
    case_dir: Path,
    index_slices: dict[str, str],
    llm_client: Optional[LLMClient] = None,
) -> AnalysisResult:
    """
    Fans out analysis across the index slices and evidence documents, calling the
    Connection Finder and Contradiction Detector agents through the live LLM client.
    Produces candidate proposals and a model-generated summary, then subjects
    everything to Law 4 validation.
    """
    case_name = case_dir.name
    raw_files = get_raw_input_files(case_dir)

    valid_sources = build_valid_sources(case_dir, raw_files)
    known_identifiers = _extract_known_identifiers(case_dir)
    evidence_pack = _build_evidence_pack(raw_files)
    physical_evidence_text = _build_physical_evidence_text(raw_files, known_identifiers)

    candidate_raw: list[Any] = []
    start_time = time.monotonic()

    if llm_client is not None:
        # 1. Connection Finder — fan out across every non-empty per-folder index slice.
        for folder_name, slice_text in index_slices.items():
            if not slice_text.strip():
                continue
            if time.monotonic() - start_time > MAX_FAN_OUT_SECONDS:
                logger.warning("Fan-out time budget exceeded; skipping remaining folders.")
                break
            try:
                prompt = build_connection_prompt(
                    index_slice=slice_text[:MAX_INDEX_SLICE_CHARS],
                    raw_evidence_summary=evidence_pack,
                    focus_entity=None,
                )
                out = llm_client.generate_structured(
                    prompt=prompt,
                    response_schema=ConnectionFinderOutput,
                    system_prompt=CONNECTION_FINDER_SYSTEM_PROMPT,
                )
                candidate_raw.extend(out.proposals)
                logger.info(f"Connection finder ({folder_name}): {len(out.proposals)} proposal(s).")
            except Exception as e:
                logger.warning(f"Connection finder failed for folder {folder_name}: {e}")

        # 2. Contradiction Detector — statements vs physical records.
        statements_text = "\n".join(
            f.read_text(encoding="utf-8", errors="replace")
            for f in raw_files
            if f.parent.name == "Statement" and f.suffix.lower() == ".md"
        )
        if statements_text.strip() and physical_evidence_text.strip():
            try:
                c_prompt = build_contradiction_prompt(
                    statements_text=statements_text,
                    physical_evidence_text=physical_evidence_text,
                )
                c_out = llm_client.generate_structured(
                    prompt=c_prompt,
                    response_schema=ContradictionOutput,
                    system_prompt=CONTRADICTION_DETECTOR_SYSTEM_PROMPT,
                )
                candidate_raw.extend(c_out.contradictions)
                logger.info(f"Contradiction detector: {len(c_out.contradictions)} finding(s).")
            except Exception as e:
                logger.warning(f"Contradiction detector failed: {e}")
    else:
        logger.info("No LLM client available; returning empty candidate proposal set.")

    # Upgrade flat model candidates into full schema-valid Proposals with stable ids.
    normalized_proposals = [
        p for p in (
            _candidate_to_proposal(c, i + 1) for i, c in enumerate(candidate_raw)
        ) if p is not None
    ]

    # 3. LAW 4 CITATION VALIDATION — every proposal must carry a resolvable citation.
    surviving_proposals, dropped = validate_proposals(normalized_proposals, valid_sources=valid_sources)

    # 4. Files to Update — derived from surviving, validated proposals only.
    files_to_update = _build_files_to_update(case_dir, surviving_proposals)

    # 5. Model-generated summary, citing only already-validated proposals, then re-validated.
    if llm_client is not None:
        summary_text = _generate_summary(llm_client, surviving_proposals, case_name)
    else:
        summary_text = "No live model was available for this analysis pass."

    validated_summary = validate_text(summary_text, valid_sources=valid_sources)

    result = AnalysisResult(
        case_id=case_name,
        summary=validated_summary.surviving_text or summary_text,
        new_connections=surviving_proposals,
        files_to_update=files_to_update,
        dropped_proposals_count=len(dropped) + validated_summary.dropped_count,
        analyzed_at=datetime.now(timezone.utc).isoformat(),
    )

    try:
        from brain.crosscase import augment_analysis_result
        result = augment_analysis_result(result, case_id_or_path=case_dir)
    except Exception as exc:
        logger.debug(f"Crosscase augmentation skipped: {exc}")

    logger.info(
        f"Orchestrator completed for {case_name}: "
        f"{len(surviving_proposals)} proposals retained, {len(dropped)} dropped by Law 4 validator."
    )
    return result


def analyse_case(
    case_id: Optional[str] = None,
    case_path: Optional[str] = None,
    config_path: Optional[Union[str, Path]] = None,
) -> AnalysisResult:
    """
    Main entrypoint called by POST /api/case/analyse.

    Calls the live LLM-backed fan-out analysis. If that raises (model down, schema
    validation exhausted its one retry, connection refused, ...) and a cached fixture
    is available (07_AI_Synthesis/.cache_ready from `scripts/reset.py --cached`), serves
    that cached AnalysisResult instead of failing the request outright.
    SYNDICATEBRAIN_PREFER_CACHE=1 forces the cached result even when the model is healthy.
    """
    target = case_path or case_id
    case_dir = resolve_case_dir(target)
    index_slices = load_case_index_slices(case_dir)

    cached_result = load_cached_analysis_result(case_dir)
    if cached_result is not None:
        cached_result.cache_used = True
    if _prefer_cache_flag() and cached_result is not None:
        logger.info("SYNDICATEBRAIN_PREFER_CACHE=1 set; serving cached analysis_result.json.")
        return cached_result

    llm_client: Optional[LLMClient] = None
    try:
        llm_client = get_llm_client(config_path=config_path)
    except Exception as e:
        logger.info(f"No active LLM client available: {e}")

    try:
        res = run_fan_out_analysis(case_dir, index_slices, llm_client=llm_client)
        # Only fall back to the cached fixture when the live run genuinely found
        # nothing — a live run that returned fewer proposals than the fixture, or
        # one where the validator simply had nothing to drop, is still a real
        # result and must not be silently swapped for canned data (see
        # docs/OVERHAUL_SPEC.md §C1).
        if len(res.new_connections) == 0 and cached_result is not None:
            logger.info("Live analysis yielded zero proposals; using cached analysis_result.json.")
            return cached_result
        return res
    except Exception as e:
        logger.error(f"Live analysis failed: {e}")
        if cached_result is not None:
            logger.info("Falling back to cached analysis_result.json after live failure.")
            return cached_result
        raise

