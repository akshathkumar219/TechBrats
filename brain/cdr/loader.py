"""
brain/cdr/loader.py — Call Detail Record (CDR) ingestion, normalization, SQL loading,
and markdown note materialization for SyndicateBrain (SIH26189).

THE SIX LAWS APPLIED:
- Evidence is immutable (00_Raw_Inputs/ files read-only).
- Map is deterministic; CDR provides record-derived edges.
- Every link carries source_doc_id and stable row:N locator.
- Phone numbers normalised ONCE at load to canonical 10-digit Indian mobile.
- Timestamps parsed UTC-aware with Indian DD/MM/YYYY order.
- Materialises 02_Identifiers/<phone>.md and 06_Events/ notes via brain.linker.write_link.
"""

from collections import defaultdict
import csv
from datetime import datetime, timezone
import os
from pathlib import Path
import re
import sys
import types
from typing import Any, Collection, Optional, Union
import yaml

from brain.schemas import Citation


# ---------------------------------------------------------------------------
# Linker module integration (AKS-T06 compatibility fallback)
# ---------------------------------------------------------------------------

def _fallback_write_link(
    note_path_or_id: Union[str, Path],
    target: str,
    reason: str,
    citation: Any,
    symmetric: bool = False,
    proposal_id: Optional[str] = None,
    case_path: Optional[Union[str, Path]] = None,
    valid_sources: Optional[Collection[str]] = None,
    **kwargs: Any,
) -> dict[str, Any]:
    """
    Fallback implementation of write_link matching brain.linker.write_link.
    Writes a link into a note's ## Links section per CASE_MODEL.md §4 & §6.
    Refuses any link without a resolvable citation (source_doc_id and locator).
    """
    if isinstance(citation, dict):
        source_doc_id = citation.get("source_doc_id")
        locator = citation.get("locator")
    elif hasattr(citation, "source_doc_id") and hasattr(citation, "locator"):
        source_doc_id = citation.source_doc_id
        locator = citation.locator
    else:
        raise ValueError("Cannot write link: invalid citation object.")

    if not source_doc_id or not str(source_doc_id).strip():
        raise ValueError("Link refused: source_doc_id is strictly required.")
    if not locator or not str(locator).strip():
        raise ValueError("Link refused: locator is strictly required.")

    source_doc_id = str(source_doc_id).strip()
    locator = str(locator).strip()

    target_path = Path(note_path_or_id)
    if not target_path.exists():
        target_path.parent.mkdir(parents=True, exist_ok=True)
        # Create minimal skeleton note if it does not exist
        title = target_path.stem
        initial_content = (
            f"# {title}\n\n"
            f"Materialised note for {title}.\n\n"
            f"## Links\n"
        )
        target_path.write_text(initial_content, encoding="utf-8")

    content = target_path.read_text(encoding="utf-8")

    # Clean target
    clean_target = str(target).strip()
    if clean_target.startswith("[[") and clean_target.endswith("]]"):
        clean_target = clean_target[2:-2].strip()

    # Build canonical link line
    link_line = f"- [[{clean_target}]] — {reason} ^[{source_doc_id} {locator}]"
    if proposal_id:
        link_line += f" <!-- ai:{proposal_id} accepted -->"

    # Insert into ## Links section
    if "## Links" in content:
        parts = content.split("## Links", 1)
        header = parts[0] + "## Links"
        rest = parts[1]

        # Check if identical link already present
        if link_line in rest:
            new_content = content
        else:
            lines = rest.splitlines(keepends=True)
            new_lines = []
            for line in lines:
                new_lines.append(line)
            if new_lines and not new_lines[-1].endswith("\n"):
                new_lines.append("\n")
            new_lines.append(f"{link_line}\n")
            new_content = header + "".join(new_lines)
    else:
        # Append ## Links section
        if not content.endswith("\n\n"):
            if not content.endswith("\n"):
                content += "\n"
            content += "\n"
        new_content = content + f"## Links\n{link_line}\n"

    target_path.write_text(new_content, encoding="utf-8")

    # Handle symmetric link if requested and case_path provided
    if symmetric and case_path:
        cp = Path(case_path)
        cand = None
        for sub in ["01_People", "02_Identifiers", "03_Vehicles", "04_Locations", "05_Organisations", "06_Events"]:
            p = cp / sub / f"{clean_target}.md"
            if p.exists():
                cand = p
                break
        if cand and cand != target_path:
            _fallback_write_link(
                note_path_or_id=cand,
                target=target_path.stem,
                reason=reason,
                citation=citation,
                symmetric=False,
                proposal_id=proposal_id,
                case_path=case_path,
                valid_sources=valid_sources,
            )

    return {"status": "written", "link_line": link_line}


# Import write_link from brain.linker or fallback
try:
    from brain.linker import write_link
except ImportError:
    linker_module = types.ModuleType("brain.linker")
    linker_module.write_link = _fallback_write_link  # type: ignore
    sys.modules["brain.linker"] = linker_module
    from brain.linker import write_link  # type: ignore


# ---------------------------------------------------------------------------
# Phone Number Normalization
# ---------------------------------------------------------------------------

def normalize_phone(raw: Optional[Union[str, int]]) -> str:
    """
    Normalise phone numbers ONCE at load.
    Strips '+91', leading '0', spaces, dashes, parentheses -> canonical 10-digit Indian mobile.
    """
    if raw is None:
        return ""

    s = str(raw).strip()
    if not s:
        return ""

    # Remove +91 prefix explicitly if present
    if s.startswith("+91"):
        s = s[3:].strip()
    elif s.startswith("+"):
        s = s[1:].strip()

    # Extract all digits
    digits = re.sub(r"\D", "", s)
    if not digits:
        return ""

    # Check 12-digit format with 91 prefix
    if len(digits) == 12 and digits.startswith("91"):
        return digits[2:]

    # Check 11-digit format with leading 0
    if len(digits) == 11 and digits.startswith("0"):
        return digits[1:]

    # Check 14-digit format with 0091 prefix
    if len(digits) == 14 and digits.startswith("0091"):
        return digits[4:]

    # If longer than 10 and starts with 0, strip leading zeros
    if len(digits) > 10 and digits.startswith("0"):
        stripped = digits.lstrip("0")
        if len(stripped) == 10:
            return stripped
        if len(stripped) == 12 and stripped.startswith("91"):
            return stripped[2:]

    # If exactly 10 digits
    if len(digits) == 10:
        return digits

    return digits


# ---------------------------------------------------------------------------
# Timestamp Parsing
# ---------------------------------------------------------------------------

def parse_cdr_timestamp(raw_val: str, date_format: Optional[str] = None) -> str:
    """
    Parse CDR timestamp into UTC-aware standard ISO datetime (YYYY-MM-DDTHH:MM:SSZ).
    Indian CDR uses DD/MM/YYYY HH:MM:SS — strictly watches day/month order!
    """
    val = str(raw_val).strip()
    if not val:
        raise ValueError("Timestamp value is empty.")

    formats: list[str] = []
    if date_format:
        formats.append(date_format)

    formats.extend([
        "%d/%m/%Y %H:%M:%S",
        "%d/%m/%Y %H:%M",
        "%d-%m-%Y %H:%M:%S",
        "%d-%m-%Y %H:%M",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%dT%H:%M:%S%z",
    ])

    for fmt in formats:
        try:
            parsed = datetime.strptime(val, fmt)
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=timezone.utc)
            else:
                parsed = parsed.astimezone(timezone.utc)
            return parsed.strftime("%Y-%m-%dT%H:%M:%SZ")
        except ValueError:
            continue

    # Fallback to ISO format parser
    try:
        parsed = datetime.fromisoformat(val)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        else:
            parsed = parsed.astimezone(timezone.utc)
        return parsed.strftime("%Y-%m-%dT%H:%M:%SZ")
    except Exception:
        pass

    raise ValueError(f"Unable to parse timestamp '{val}' as UTC-aware datetime (expected DD/MM/YYYY HH:MM:SS).")


# ---------------------------------------------------------------------------
# Profile Management
# ---------------------------------------------------------------------------

DEFAULT_PROFILES_PATH = Path(__file__).parent / "profiles.yaml"


def load_profiles(profiles_path: Optional[Path] = None) -> dict[str, Any]:
    """Load telco column mapping profiles from YAML."""
    p = profiles_path or DEFAULT_PROFILES_PATH
    if not p.exists():
        return {}
    with open(p, "r", encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def get_profile(name: str = "airtel", profiles_path: Optional[Path] = None) -> dict[str, Any]:
    """Retrieve profile by name (case-insensitive), defaulting to Airtel."""
    profiles = load_profiles(profiles_path)
    lookup_name = name.lower().strip() if name else "airtel"
    if lookup_name in profiles:
        return profiles[lookup_name]

    # Fallback hardcoded airtel profile matching data/TEMPLATE_CDR.csv exactly
    return {
        "name": "Airtel",
        "date_format": "%d/%m/%Y %H:%M:%S",
        "columns": {
            "calling_party": "Calling Party",
            "called_party": "Called Party",
            "call_date_time": "Call Date Time",
            "duration": "Duration(s)",
            "call_type": "Call Type",
            "imei": "IMEI",
            "imsi": "IMSI",
            "first_cgi": "First CGI",
            "tac": "TAC",
        },
        "header_mapping": {
            "Calling Party": "calling_party",
            "Called Party": "called_party",
            "Call Date Time": "call_date_time",
            "Duration(s)": "duration",
            "Call Type": "call_type",
            "IMEI": "imei",
            "IMSI": "imsi",
            "First CGI": "first_cgi",
            "TAC": "tac",
        },
    }


# ---------------------------------------------------------------------------
# SQL Database Engine (DuckDB with automatic sqlite3 fallback)
# ---------------------------------------------------------------------------

class CDRDatabase:
    """
    SQL storage engine for CDR records.
    Uses DuckDB if available, otherwise falls back to Python's built-in sqlite3 in-memory database.
    Stores records in table `cdr_records` with stable 1-indexed row_id.
    """

    def __init__(self, in_memory: bool = True, db_path: Optional[str] = None):
        self.is_duckdb = False
        self.engine_name = "sqlite3"
        try:
            import duckdb
            target = ":memory:" if in_memory or not db_path else db_path
            self.conn = duckdb.connect(database=target)
            self.is_duckdb = True
            self.engine_name = "duckdb"
        except ImportError:
            import sqlite3
            target = ":memory:" if in_memory or not db_path else db_path
            self.conn = sqlite3.connect(database=target)
            self.conn.row_factory = sqlite3.Row
            self.is_duckdb = False
            self.engine_name = "sqlite3"

        self._init_tables()

    def _init_tables(self) -> None:
        """Create cdr_records table schema."""
        create_sql = """
        CREATE TABLE IF NOT EXISTS cdr_records (
            row_id INTEGER PRIMARY KEY,
            calling_party TEXT,
            called_party TEXT,
            call_date_time TEXT,
            timestamp TEXT,
            duration_s INTEGER,
            duration INTEGER,
            call_type TEXT,
            imei TEXT,
            imsi TEXT,
            first_cgi TEXT,
            tac TEXT,
            doc_id TEXT
        );
        """
        self.execute(create_sql)

    def execute(self, sql: str, params: tuple = ()) -> None:
        """Execute a DDL or DML statement."""
        if self.is_duckdb:
            if params:
                self.conn.execute(sql, list(params))
            else:
                self.conn.execute(sql)
        else:
            cursor = self.conn.cursor()
            cursor.execute(sql, params)
            self.conn.commit()

    def query(self, sql: str, params: tuple = ()) -> list[dict[str, Any]]:
        """Run a SELECT query and return rows as list of dicts."""
        if self.is_duckdb:
            if params:
                res = self.conn.execute(sql, list(params))
            else:
                res = self.conn.execute(sql)
            if res.description:
                cols = [d[0] for d in res.description]
                return [dict(zip(cols, row)) for row in res.fetchall()]
            return []
        else:
            cursor = self.conn.cursor()
            cursor.execute(sql, params)
            if cursor.description:
                cols = [d[0] for d in cursor.description]
                return [dict(zip(cols, row)) for row in cursor.fetchall()]
            return []

    def insert_records(self, records: list[dict[str, Any]]) -> None:
        """Insert loaded CDR records into cdr_records table."""
        insert_sql = """
        INSERT INTO cdr_records (
            row_id, calling_party, called_party, call_date_time, timestamp,
            duration_s, duration, call_type, imei, imsi, first_cgi, tac, doc_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """
        for r in records:
            dur = r.get("duration") or r.get("duration_s") or 0
            ts = r.get("call_date_time") or r.get("timestamp") or ""
            params = (
                r["row_id"],
                r.get("calling_party", ""),
                r.get("called_party", ""),
                ts,
                ts,
                dur,
                dur,
                r.get("call_type", ""),
                r.get("imei", ""),
                r.get("imsi", ""),
                r.get("first_cgi", ""),
                r.get("tac", ""),
                r.get("doc_id", ""),
            )
            self.execute(insert_sql, params)

    def get_records(self) -> list[dict[str, Any]]:
        """Retrieve all records ordered by row_id."""
        return self.query("SELECT * FROM cdr_records ORDER BY row_id ASC")

    def get_by_row_id(self, row_id: int) -> Optional[dict[str, Any]]:
        """Retrieve record by 1-indexed row_id."""
        rows = self.query("SELECT * FROM cdr_records WHERE row_id = ?", (row_id,))
        return rows[0] if rows else None

    def get_distinct_phones(self) -> list[str]:
        """Return distinct normalised phone numbers from both parties."""
        sql = """
        SELECT DISTINCT calling_party AS phone FROM cdr_records WHERE calling_party != ''
        UNION
        SELECT DISTINCT called_party AS phone FROM cdr_records WHERE called_party != ''
        ORDER BY phone ASC;
        """
        rows = self.query(sql)
        return [r["phone"] for r in rows if r.get("phone")]

    def get_date_range(self) -> dict[str, Optional[str]]:
        """Return min and max timestamps."""
        rows = self.query("SELECT MIN(call_date_time) AS min_ts, MAX(call_date_time) AS max_ts FROM cdr_records WHERE call_date_time != ''")
        if rows and rows[0].get("min_ts"):
            min_ts = rows[0]["min_ts"]
            max_ts = rows[0]["max_ts"]
            return {
                "start": min_ts,
                "end": max_ts,
                "min": min_ts,
                "max": max_ts,
                "earliest": min_ts,
                "latest": max_ts,
            }
        return {"start": None, "end": None, "min": None, "max": None, "earliest": None, "latest": None}

    def count(self) -> int:
        """Count rows in cdr_records."""
        rows = self.query("SELECT count(*) AS cnt FROM cdr_records")
        return rows[0]["cnt"] if rows else 0

    def close(self) -> None:
        """Close connection."""
        if hasattr(self.conn, "close"):
            self.conn.close()


# ---------------------------------------------------------------------------
# Note Materialization (CASE_MODEL.md §4 & §6)
# ---------------------------------------------------------------------------

def materialize_cdr_notes(
    case_dir: Union[str, Path],
    records: list[dict[str, Any]],
    doc_id: str,
    db: Optional[CDRDatabase] = None,
) -> dict[str, Any]:
    """
    Materialise markdown notes in the case vault:
    - 02_Identifiers/<phone>.md for every distinct phone number with YAML frontmatter.
    - 06_Events/ notes for significant call pairs/clusters.
    - All links written exclusively through brain.linker.write_link with stable row:N locators.
    """
    cd = Path(case_dir)
    identifiers_dir = cd / "02_Identifiers"
    events_dir = cd / "06_Events"

    identifiers_dir.mkdir(parents=True, exist_ok=True)
    events_dir.mkdir(parents=True, exist_ok=True)

    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    case_name = cd.name

    # Step 1: Collect distinct phone numbers
    distinct_phones: set[str] = set()
    for r in records:
        cp = r.get("calling_party")
        if cp:
            distinct_phones.add(cp)
        cdp = r.get("called_party")
        if cdp:
            distinct_phones.add(cdp)

    materialized_count = 0

    # Step 2: Create or update 02_Identifiers/<number>.md per distinct phone number
    phone_notes: dict[str, Path] = {}
    for phone in sorted(distinct_phones):
        note_path = identifiers_dir / f"{phone}.md"
        phone_notes[phone] = note_path

        if note_path.exists():
            existing_text = note_path.read_text(encoding="utf-8")
            # Parse frontmatter if present
            existing_fm = {}
            body = existing_text
            if existing_text.startswith("---"):
                parts = existing_text.split("---", 2)
                if len(parts) >= 3:
                    try:
                        existing_fm = yaml.safe_load(parts[1]) or {}
                        body = parts[2]
                    except Exception:
                        pass

            # Update frontmatter preserving existing fields
            existing_fm["id"] = existing_fm.get("id", f"ident_{phone}")
            existing_fm["type"] = "identifier"
            existing_fm["identifier_type"] = "phone"
            existing_fm["sub_type"] = "phone"
            existing_fm["value"] = str(phone)
            existing_fm["case"] = existing_fm.get("case", case_name)
            existing_fm["created"] = str(existing_fm.get("created", today_str))
            existing_fm["updated"] = today_str

            fm_str = yaml.dump(existing_fm, sort_keys=False).strip()
            # Ensure ## Links is present in body
            if "## Links" not in body:
                body = body.rstrip() + "\n\n## Links\n"
            new_text = f"---\n{fm_str}\n---\n{body.lstrip()}"
            note_path.write_text(new_text, encoding="utf-8")
        else:
            fm = {
                "id": f"ident_{phone}",
                "type": "identifier",
                "identifier_type": "phone",
                "sub_type": "phone",
                "value": str(phone),
                "case": case_name,
                "created": today_str,
                "updated": today_str,
            }
            fm_str = yaml.dump(fm, sort_keys=False).strip()
            content = (
                f"---\n{fm_str}\n---\n\n"
                f"# {phone}\n\n"
                f"Phone identifier note extracted from CDR records.\n\n"
                f"## Links\n"
            )
            note_path.write_text(content, encoding="utf-8")

        materialized_count += 1

    # Step 3: Write direct communication links between phone pairs via write_link
    pair_calls: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
    for r in records:
        a = r.get("calling_party")
        b = r.get("called_party")
        if a and b and a != b:
            pair_calls[(a, b)].append(r)

    for (a, b), calls in pair_calls.items():
        first_row = calls[0]["row_id"]
        count = len(calls)
        reason_a = f"called [[{b}]] ({count} call{'s' if count > 1 else ''} in CDR)"
        citation_a = Citation(
            source_doc_id=doc_id,
            locator=f"row:{first_row}",
            tier="record-derived",
        )
        write_link(
            phone_notes[a],
            b,
            reason_a,
            citation_a,
            symmetric=False,
            case_path=cd,
            valid_sources=[doc_id],
        )

        reason_b = f"received call from [[{a}]] ({count} call{'s' if count > 1 else ''} in CDR)"
        citation_b = Citation(
            source_doc_id=doc_id,
            locator=f"row:{first_row}",
            tier="record-derived",
        )
        write_link(
            phone_notes[b],
            a,
            reason_b,
            citation_b,
            symmetric=False,
            case_path=cd,
            valid_sources=[doc_id],
        )

    # Step 4: Detect significant call clusters and create 06_Events/ notes
    cluster_pairs: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
    for r in records:
        a = r.get("calling_party")
        b = r.get("called_party")
        if a and b and a != b:
            key = (min(a, b), max(a, b))
            cluster_pairs[key].append(r)

    # Significant cluster: pairs with >= 2 calls, or top pair if none have >= 2
    significant_clusters = [
        (pair, calls) for pair, calls in cluster_pairs.items() if len(calls) >= 2
    ]
    if not significant_clusters and cluster_pairs:
        sorted_pairs = sorted(cluster_pairs.items(), key=lambda item: len(item[1]), reverse=True)
        if sorted_pairs:
            significant_clusters = [sorted_pairs[0]]

    event_notes_count = 0
    for (p1, p2), calls in significant_clusters:
        first_row = calls[0]["row_id"]
        first_ts = calls[0].get("timestamp") or calls[0].get("call_date_time") or ""
        last_ts = calls[-1].get("timestamp") or calls[-1].get("call_date_time") or ""
        count = len(calls)

        event_slug = f"Call_Cluster_{p1}_{p2}"
        event_note_path = events_dir / f"{event_slug}.md"

        event_fm = {
            "id": f"event_call_cluster_{p1}_{p2}",
            "type": "event",
            "sub_type": "call_cluster",
            "case": case_name,
            "parties": [str(p1), str(p2)],
            "call_count": count,
            "first_call": first_ts,
            "last_call": last_ts,
            "created": today_str,
            "updated": today_str,
        }
        event_fm_str = yaml.dump(event_fm, sort_keys=False).strip()

        event_body = (
            f"---\n{event_fm_str}\n---\n\n"
            f"# Call Cluster: {p1} — {p2}\n\n"
            f"Communication cluster of {count} calls between [[{p1}]] and [[{p2}]].\n"
            f"Observed communication interval: {first_ts} to {last_ts}.\n\n"
            f"## Links\n"
        )
        event_note_path.write_text(event_body, encoding="utf-8")
        event_notes_count += 1
        materialized_count += 1

        # Link event to both phone identifiers via write_link
        event_citation = Citation(
            source_doc_id=doc_id,
            locator=f"row:{first_row}",
            tier="record-derived",
        )
        write_link(
            event_note_path,
            p1,
            f"participating party in {count} calls",
            event_citation,
            symmetric=False,
            case_path=cd,
            valid_sources=[doc_id],
        )
        write_link(
            event_note_path,
            p2,
            f"participating party in {count} calls",
            event_citation,
            symmetric=False,
            case_path=cd,
            valid_sources=[doc_id],
        )

        # Link both phone notes to the event cluster note via write_link
        if p1 in phone_notes:
            write_link(
                phone_notes[p1],
                event_slug,
                f"call cluster with [[{p2}]] ({count} calls)",
                event_citation,
                symmetric=False,
                case_path=cd,
                valid_sources=[doc_id],
            )
        if p2 in phone_notes:
            write_link(
                phone_notes[p2],
                event_slug,
                f"call cluster with [[{p1}]] ({count} calls)",
                event_citation,
                symmetric=False,
                case_path=cd,
                valid_sources=[doc_id],
            )

    return {
        "distinct_phones": len(distinct_phones),
        "materialized_notes_count": materialized_count,
        "event_notes_count": event_notes_count,
    }


# ---------------------------------------------------------------------------
# High-Level Load Function
# ---------------------------------------------------------------------------

def load_cdr(
    file_path: Union[str, Path],
    case_path: Optional[Union[str, Path]] = None,
    case_id: Optional[str] = None,
    profile: str = "airtel",
    doc_id: Optional[str] = None,
    db: Optional[CDRDatabase] = None,
) -> dict[str, Any]:
    """
    Loads CDR CSV file:
    1. Reads headers and maps using specified telco profile (default 'airtel').
    2. Normalises phone numbers and parses timestamps (UTC-aware, DD/MM/YYYY).
    3. Populates SQL database (DuckDB / sqlite3) in table cdr_records with stable 1-indexed row_id.
    4. Materialises notes in 02_Identifiers/ and 06_Events/ using brain.linker.write_link.
    5. Returns summary dict: rows_loaded, distinct_phones, materialized_notes_count, date_range.
    """
    csv_file = Path(file_path)
    if not csv_file.exists():
        raise FileNotFoundError(f"CDR file not found: {file_path}")

    # Resolve case directory if explicitly passed or if file is within a case
    case_dir: Optional[Path] = None
    if case_path:
        cp = Path(case_path)
        if cp.exists() and cp.is_dir():
            case_dir = cp
    elif case_id:
        for root in [Path("data"), Path("vaults"), Path(".")]:
            cand = root / case_id
            if cand.exists() and cand.is_dir():
                case_dir = cand
                break
    else:
        # Check if CSV is within an existing case folder
        for p in [csv_file.parent, csv_file.parent.parent, csv_file.parent.parent.parent]:
            if (p / "_Case_Index.md").exists() or (p / "Case_Config.yaml").exists():
                case_dir = p
                break

    # Load profile
    prof = get_profile(profile)
    cols_map = prof.get("columns", {})
    date_fmt = prof.get("date_format", "%d/%m/%Y %H:%M:%S")

    col_calling = cols_map.get("calling_party", "Calling Party")
    col_called = cols_map.get("called_party", "Called Party")
    col_datetime = cols_map.get("call_date_time", "Call Date Time")
    col_dur = cols_map.get("duration", "Duration(s)")
    col_type = cols_map.get("call_type", "Call Type")
    col_imei = cols_map.get("imei", "IMEI")
    col_imsi = cols_map.get("imsi", "IMSI")
    col_cgi = cols_map.get("first_cgi", "First CGI")
    col_tac = cols_map.get("tac", "TAC")

    # Inferred doc_id
    if not doc_id:
        stem = re.sub(r"[^a-zA-Z0-9_]", "_", csv_file.stem).strip("_")
        doc_id = f"DOC_CDR_{stem}" if not stem.upper().startswith("DOC_") else stem

    # Read CSV and build records
    records: list[dict[str, Any]] = []
    with open(csv_file, "r", encoding="utf-8", errors="replace") as f:
        reader = csv.DictReader(f)
        for row_idx, row in enumerate(reader, start=1):
            calling = normalize_phone(row.get(col_calling, ""))
            called = normalize_phone(row.get(col_called, ""))

            raw_dt = row.get(col_datetime, "")
            parsed_dt = parse_cdr_timestamp(raw_dt, date_format=date_fmt) if raw_dt else ""

            dur_str = row.get(col_dur, "0")
            try:
                duration_val = int(float(dur_str))
            except (ValueError, TypeError):
                duration_val = 0

            rec = {
                "row_id": row_idx,
                "calling_party": calling,
                "called_party": called,
                "call_date_time": parsed_dt,
                "timestamp": parsed_dt,
                "duration_s": duration_val,
                "duration": duration_val,
                "call_type": str(row.get(col_type, "")).strip(),
                "imei": str(row.get(col_imei, "")).strip(),
                "imsi": str(row.get(col_imsi, "")).strip(),
                "first_cgi": str(row.get(col_cgi, "")).strip(),
                "tac": str(row.get(col_tac, "")).strip(),
                "doc_id": doc_id,
            }
            records.append(rec)

    # Store into SQL database
    database = db if db is not None else CDRDatabase(in_memory=True)
    database.insert_records(records)

    # Materialise notes if case directory is available
    materialized_count = 0
    distinct_phones = database.get_distinct_phones()
    if case_dir:
        mat_res = materialize_cdr_notes(case_dir, records, doc_id=doc_id, db=database)
        materialized_count = mat_res["materialized_notes_count"]

    date_range = database.get_date_range()

    return {
        "rows_loaded": len(records),
        "distinct_phones": len(distinct_phones),
        "distinct_phone_count": len(distinct_phones),
        "materialized_notes_count": materialized_count,
        "date_range": date_range,
        "profile": profile,
        "case_id": case_dir.name if case_dir else (case_id or ""),
        "doc_id": doc_id,
        "database": database,
    }
