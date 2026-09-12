"""
brain/ingest/pipeline.py — Evidentiary Document Ingest Pipeline (Law 1).

Law 1: Evidence is immutable.
Files in 00_Raw_Inputs/ are classified, SHA-256 hashed BEFORE they move,
copied into 00_Raw_Inputs/<type>/ with a .sha256 sidecar, chmod 0444,
and registered with brain.guard.

The pipeline executes in this EXACT ORDER:
1. Classify: Inspect file extension and header sniff -> FIR | CDR | TowerDump | Statement | FieldLog | Misc
2. SHA-256: Hash original source bytes BEFORE the file moves
3. Copy: Copy into 00_Raw_Inputs/<type>/<filename> with sidecar <filename>.sha256
4. Lock: chmod 0444 on the copied file AND register with brain.guard.register_locked_path
5. Write & Return Doc: Construct and return Doc schema record
"""

import hashlib
import io
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, BinaryIO, Optional, Union

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from pydantic import BaseModel

from brain.guard import assert_writable, is_path_locked, register_locked_path
from brain.schemas import Doc


class GuardViolationError(PermissionError):
    """Raised when an operation attempts to violate Law 1 (evidence immutability)."""
    pass


# Valid document types
VALID_DOC_TYPES = ("FIR", "CDR", "TowerDump", "Statement", "FieldLog", "Misc")

# In-memory registry of ingested docs
INGESTED_DOCS: dict[str, Doc] = {}


def classify_document(filename: str, content: bytes) -> str:
    """
    Classifies a document based on file extension and header sniffing.
    Returns one of: 'FIR', 'CDR', 'TowerDump', 'Statement', 'FieldLog', 'Misc'.
    """
    fname = Path(filename).name.lower()
    fname_stem = Path(filename).stem.lower()
    fname_tokens = set(re.split(r"[^a-z0-9]+", fname_stem))

    # Decode raw text snippet for header sniffing (up to 64KB)
    sample = content[:65536]
    text = sample.decode("utf-8", errors="replace")

    # If PDF, attempt text extraction
    if sample.startswith(b"%PDF") or fname.endswith(".pdf"):
        try:
            import pdfplumber
            with pdfplumber.open(io.BytesIO(content)) as pdf:
                extracted = []
                for p in pdf.pages[:3]:
                    t = p.extract_text()
                    if t:
                        extracted.append(t)
                if extracted:
                    text += " " + " ".join(extracted)
        except Exception:
            pass

    # If Excel, attempt text extraction from headers
    if fname.endswith((".xlsx", ".xls")) or sample.startswith(b"PK\x03\x04"):
        try:
            import openpyxl
            wb = openpyxl.load_workbook(io.BytesIO(content), read_only=True, data_only=True)
            sheet = wb.active
            headers = []
            if sheet:
                for row in sheet.iter_rows(max_row=5, values_only=True):
                    headers.extend([str(c) for c in row if c is not None])
            if headers:
                text += " " + " ".join(headers)
        except Exception:
            pass

    text_lower = text.lower()

    # Step 1: Check Statement markers
    # Section 161 / 180 CrPC / BNSS statements or witness statement headers
    statement_patterns = [
        r"section\s*161",
        r"sec\.?\s*161",
        r"161\s*(?:crpc|bnss)",
        r"u/s\s*161",
        r"section\s*180",
        r"sec\.?\s*180",
        r"180\s*(?:crpc|bnss)",
        r"u/s\s*180",
        r"section\s*164",
        r"sec\.?\s*164",
        r"164\s*crpc",
        r"183\s*bnss",
        r"statement\s+of\b",
        r"witness\s+statement",
        r"statement\s+under\s+section",
        r"बयान\s*(?:गवाह)?",
    ]
    if any(re.search(pat, text_lower) for pat in statement_patterns):
        return "Statement"
    if "statement" in fname_tokens or "stmt" in fname_tokens:
        return "Statement"

    # Step 2: Check FieldLog markers
    fieldlog_patterns = [
        r"field\s*log",
        r"case\s*diary",
        r"daily\s*diary",
        r"general\s*diary",
        r"gd\s*entry",
        r"gd\s*no\.?",
        r"patrol\s*log",
        r"patrol\s*book",
        r"duty\s*roster",
        r"naka\s*(?:report|log|checking)",
        r"surveillance\s*log",
        r"रोजनामचा",
    ]
    if any(re.search(pat, text_lower) for pat in fieldlog_patterns):
        return "FieldLog"
    if "fieldlog" in fname_tokens or "field_log" in fname or "diary" in fname_tokens:
        return "FieldLog"

    # Step 3: Check CDR markers
    # CDR has calling party and called party (a_party, b_party, calling_num)
    cdr_patterns = [
        r"calling\s*party",
        r"called\s*party",
        r"calling\s*part(?:y|ies)\s*number",
        r"called\s*part(?:y|ies)\s*number",
        r"\ba_party\b",
        r"\bb_party\b",
        r"\ba\s*party\b",
        r"\bb\s*party\b",
        r"calling_?num",
        r"called_?num",
        r"calling_?no",
        r"called_?no",
        r"calling\s*number",
        r"called\s*number",
        r"dialed_?num",
        r"call\s*duration",
        r"duration\(s\)",
        r"call\s*date",
        r"call\s*time",
        r"call\s*type",
    ]
    if any(re.search(pat, text_lower) for pat in cdr_patterns):
        return "CDR"
    if "cdr" in fname_tokens:
        return "CDR"

    # Step 4: Check TowerDump markers
    # Tower dump has cell_id, tower, azimuth, lat/long without call pair
    tower_patterns = [
        r"tower\s*dump",
        r"towerdump",
        r"cell_?id",
        r"tower_?id",
        r"first\s*cgi",
        r"last\s*cgi",
        r"\bcgi\b",
        r"site_?id",
        r"\bazimuth\b",
        r"lat_?long",
        r"\blatitude\b",
        r"\blongitude\b",
        r"\bsector\b",
        r"\bbts\b",
        r"\bbts_?id\b",
        r"tower\s*location",
    ]
    if any(re.search(pat, text_lower) for pat in tower_patterns):
        return "TowerDump"
    if "towerdump" in fname_tokens or ("tower" in fname_tokens and "dump" in fname_tokens) or "tower" in fname_tokens:
        return "TowerDump"

    # Step 5: Check FIR markers
    fir_patterns = [
        r"\bfir\b",
        r"first\s+information\s+report",
        r"fir\s*no\.?",
        r"fir_number",
        r"प्रथम\s+सूचना\s+रिपोर्ट",
        r"police\s*station",
        r"police\s*thana",
        r"\bps\s+[a-z]",
        r"थाना",
        r"\bcomplainant\b",
        r"\baccused\b",
        r"शिकायतकर्ता",
        r"अभियुक्त",
        r"\bbnss\b",
        r"\bbns\b",
        r"\bipc\b",
        r"arms\s*act",
    ]
    if any(re.search(pat, text_lower) for pat in fir_patterns):
        return "FIR"
    if "fir" in fname_tokens:
        return "FIR"

    return "Misc"


def calculate_page_count(filename: str, content: bytes) -> Optional[int]:
    """Calculate page count for PDF or document files."""
    fname = Path(filename).name.lower()
    if fname.endswith(".pdf") or content.startswith(b"%PDF"):
        try:
            import pdfplumber
            with pdfplumber.open(io.BytesIO(content)) as pdf:
                return len(pdf.pages)
        except Exception:
            pass
        # Fallback inspection of PDF objects
        pages = len(re.findall(rb"/Type\s*/Page\b", content))
        return pages if pages > 0 else 1

    if fname.endswith((".docx", ".doc")):
        return 1

    return None


def calculate_sha256(data: bytes) -> str:
    """Calculates SHA-256 hash of bytes."""
    return hashlib.sha256(data).hexdigest()


def generate_doc_id(filename: str, doc_type: str, sha256_hash: str) -> str:
    """Generate canonical doc id matching DOC_<type>_<stem> format."""
    stem = Path(filename).stem
    clean_stem = re.sub(r"[^a-zA-Z0-9_]", "_", stem).strip("_")

    if clean_stem.upper().startswith("DOC_"):
        return clean_stem
    if clean_stem.upper().startswith(f"{doc_type.upper()}_"):
        return f"DOC_{clean_stem}"
    return f"DOC_{doc_type}_{clean_stem}"


def lock_evidentiary_file(copied_path: Path, sidecar_path: Optional[Path] = None) -> None:
    """
    Lock an evidentiary path: sets chmod 0444 on the file AND registers with guard.
    Also locks sidecar and makes parent directory 0555 to prevent rename attacks.
    """
    os.chmod(copied_path, 0o444)
    register_locked_path(copied_path)

    if sidecar_path and sidecar_path.exists():
        try:
            os.chmod(sidecar_path, 0o444)
            register_locked_path(sidecar_path)
        except Exception:
            pass

    dest_dir = copied_path.parent
    if dest_dir.exists():
        try:
            os.chmod(dest_dir, 0o555)
            register_locked_path(dest_dir)
        except Exception:
            pass


def ingest_file(
    source: Union[str, Path, bytes, BinaryIO],
    case_path: Union[str, Path],
    filename: Optional[str] = None,
    original_path: Optional[str] = None,
) -> Doc:
    """
    Ingest pipeline in EXACT ORDER (The order is the guarantee):
    1. Classify: inspect file extension and header sniff -> FIR | CDR | TowerDump | Statement | FieldLog | Misc
    2. SHA-256 the file BEFORE it moves: calculate SHA-256 hash of original source bytes
    3. Copy into case directory: 00_Raw_Inputs/<type>/<filename> with sidecar <filename>.sha256
    4. Lock: chmod 0444 on copied file AND register with brain.guard.register_locked_path(copied_path)
    5. Write and return Doc record: Doc(id, filename, type, sha256, ingest_timestamp, original_path, locked=True, bytes, page_count)
    """
    # Resolve source bytes and metadata
    if isinstance(source, (str, Path)):
        src_path = Path(source).resolve()
        if not src_path.exists():
            raise FileNotFoundError(f"Source file does not exist: {source}")
        content_bytes = src_path.read_bytes()
        filename = filename or src_path.name
        original_path = original_path or str(src_path)
    elif isinstance(source, bytes):
        content_bytes = source
        filename = filename or "evidence.bin"
        original_path = original_path or filename
    elif hasattr(source, "read"):
        content_bytes = source.read()
        filename = filename or getattr(source, "filename", "evidence.bin")
        original_path = original_path or filename
    else:
        raise ValueError(f"Unsupported source type: {type(source)}")

    # Step 1. Classify: Inspect file extension and header sniff
    doc_type = classify_document(filename, content_bytes)

    # Step 2. SHA-256 the file BEFORE it moves
    sha256_hash = calculate_sha256(content_bytes)

    # Resolve case directory destination
    case_dir = Path(case_path).resolve()
    raw_inputs_dir = case_dir / "00_Raw_Inputs"
    dest_dir = raw_inputs_dir / doc_type

    safe_filename = Path(filename).name
    copied_path = dest_dir / safe_filename
    sidecar_path = dest_dir / f"{safe_filename}.sha256"

    # Law 1 Guard: If file already exists in 00_Raw_Inputs/, refuse overwrite
    if copied_path.exists():
        raise GuardViolationError(
            f"Law 1 Violation: Evidentiary document '{safe_filename}' already exists in {dest_dir} and is immutable."
        )

    # Step 3. Copy into case directory and write sidecar
    # Temporarily ensure directories are writable for the ingest write
    if raw_inputs_dir.exists():
        try:
            os.chmod(raw_inputs_dir, 0o755)
        except Exception:
            pass
    if dest_dir.exists():
        try:
            os.chmod(dest_dir, 0o755)
        except Exception:
            pass
    dest_dir.mkdir(parents=True, exist_ok=True)

    # Write copied file
    copied_path.write_bytes(content_bytes)

    # Write sidecar file (<filename>.sha256)
    sidecar_content = f"{sha256_hash}  {safe_filename}\n"
    sidecar_path.write_text(sidecar_content, encoding="utf-8")

    # Step 4. Lock: chmod 0444 on the copied file AND register with brain.guard
    # Both, not either!
    lock_evidentiary_file(copied_path, sidecar_path)

    # Step 5. Write and return Doc record
    doc_id = generate_doc_id(safe_filename, doc_type, sha256_hash)
    ingest_ts = datetime.now(timezone.utc).isoformat()
    page_count = calculate_page_count(safe_filename, content_bytes)

    doc = Doc(
        id=doc_id,
        filename=safe_filename,
        type=doc_type,
        sha256=sha256_hash,
        ingest_timestamp=ingest_ts,
        original_path=str(original_path),
        locked=True,
        bytes=len(content_bytes),
        page_count=page_count,
    )

    # Store in memory registry and persist hidden metadata
    INGESTED_DOCS[doc.id] = doc
    try:
        meta_path = dest_dir / f".{safe_filename}.doc.json"
        os.chmod(dest_dir, 0o755)
        meta_path.write_text(doc.model_dump_json(), encoding="utf-8")
        os.chmod(meta_path, 0o444)
        register_locked_path(meta_path)
        os.chmod(dest_dir, 0o555)
    except Exception:
        pass

    return doc


# -------------------------------------------------------------------------
# FastAPI Router Definition
# -------------------------------------------------------------------------

router = APIRouter(tags=["ingest"])


class IngestJsonRequest(BaseModel):
    source_path: str
    case_path: str


@router.post("/api/ingest", response_model=Doc)
async def post_ingest(
    request: Request,
    file: Optional[UploadFile] = File(None),
    case_path: Optional[str] = Form(None),
    source_path: Optional[str] = Form(None),
):
    """
    POST /api/ingest accepting either:
    - File upload (UploadFile) OR
    - JSON with source_path and case_path.
    Runs the pipeline and returns the Doc.
    """
    ct = request.headers.get("content-type", "")
    target_case_path = case_path
    target_source_path = source_path

    # Check JSON body if Content-Type is application/json
    if "application/json" in ct:
        try:
            body = await request.json()
            if isinstance(body, dict):
                target_source_path = body.get("source_path") or target_source_path
                target_case_path = body.get("case_path") or body.get("case_id") or target_case_path
        except Exception:
            pass

    # Check query params if case_path was not in form/json
    if not target_case_path:
        target_case_path = request.query_params.get("case_path") or request.query_params.get("case_id")

    if not target_case_path:
        # Check if default vault exists
        from brain.vault import get_vaults_root
        vroot = get_vaults_root()
        if vroot.exists():
            cases = [d for d in vroot.iterdir() if d.is_dir() and not d.name.startswith(".")]
            if len(cases) == 1:
                target_case_path = str(cases[0])

    if not target_case_path:
        raise HTTPException(status_code=400, detail="Missing required 'case_path' parameter.")

    # Handle UploadFile
    if file is not None and file.filename:
        try:
            content = await file.read()
            doc = ingest_file(
                source=content,
                case_path=target_case_path,
                filename=file.filename,
                original_path=file.filename,
            )
            return doc
        except GuardViolationError as e:
            raise HTTPException(status_code=409, detail=str(e))
        except FileNotFoundError as e:
            raise HTTPException(status_code=404, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    # Handle JSON or form with source_path
    if target_source_path:
        src = Path(target_source_path)
        if not src.exists():
            raise HTTPException(status_code=404, detail=f"Source file not found: {target_source_path}")
        try:
            doc = ingest_file(
                source=src,
                case_path=target_case_path,
            )
            return doc
        except GuardViolationError as e:
            raise HTTPException(status_code=409, detail=str(e))
        except FileNotFoundError as e:
            raise HTTPException(status_code=404, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    raise HTTPException(
        status_code=400,
        detail="Either file upload (UploadFile) or JSON with 'source_path' must be provided.",
    )
