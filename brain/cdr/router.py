"""
brain/cdr/router.py — FastAPI router for Call Detail Record (CDR) ingestion.
"""

from typing import Any, Optional
from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel, ConfigDict

from brain.cdr.loader import load_cdr

router = APIRouter(prefix="/api/cdr", tags=["cdr"])


class CDRLoadPayload(BaseModel):
    model_config = ConfigDict(extra="allow")

    file_path: str
    case_path: Optional[str] = None
    case_id: Optional[str] = None
    profile: Optional[str] = "airtel"
    doc_id: Optional[str] = None


@router.post("/load")
def post_cdr_load(payload: CDRLoadPayload = Body(...)) -> dict[str, Any]:
    """
    POST /api/cdr/load:
    Loads CDR CSV file, normalises numbers, parses UTC timestamps, stores into SQL engine,
    and materialises notes in 02_Identifiers/ and 06_Events/ with citations.
    """
    try:
        res = load_cdr(
            file_path=payload.file_path,
            case_path=payload.case_path,
            case_id=payload.case_id,
            profile=payload.profile or "airtel",
            doc_id=payload.doc_id,
        )
        # Exclude internal database connection from response
        output = {k: v for k, v in res.items() if k != "database"}
        return output
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CDR loading error: {str(e)}")
