"""
FastAPI application for SyndicateBrain (SIH26189).
CORS configured for frontend development on http://localhost:5173.
Routes mounted to mock providers.
"""

from typing import Any, Optional
from fastapi import FastAPI, Body
from fastapi.middleware.cors import CORSMiddleware

from brain.schemas import (
    Doc,
    AnalysisResult,
    CaseSummary,
    CopilotRequest,
    CopilotResponse,
    IntegrityResponse,
    CrossCaseResponse,
)
import brain.mocks as mocks

app = FastAPI(
    title="SyndicateBrain API",
    description="Investigation workbench backend for Indian police (SIH26189).",
    version="0.1.0",
)

# CORS open to localhost:5173 per spec
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/cases", response_model=list[CaseSummary])
def get_cases():
    """List all case folders."""
    return mocks.get_cases()


@app.post("/api/case/analyse", response_model=AnalysisResult)
def post_case_analyse(payload: Optional[dict[str, Any]] = Body(None)):
    """Run agent layer analysis on a case, returning proposals and summary."""
    case_id = payload.get("case_id") if payload else None
    case_path = payload.get("case_path") if payload else None
    from brain.orchestrator import analyse_case
    return analyse_case(case_id=case_id, case_path=case_path)


@app.get("/api/case/analyse", response_model=AnalysisResult)
def get_case_analyse(case_id: Optional[str] = None, case_path: Optional[str] = None):
    """GET convenience for case analysis."""
    from brain.orchestrator import analyse_case
    return analyse_case(case_id=case_id, case_path=case_path)


@app.post("/api/copilot/ask", response_model=CopilotResponse)
def post_copilot_ask(req: Optional[CopilotRequest] = None):
    """Ask copilot a question about the case, returning citations and notes retrieved."""
    return mocks.ask_copilot(req=req)


@app.get("/api/copilot/ask", response_model=CopilotResponse)
def get_copilot_ask(question: Optional[str] = None, case_id: Optional[str] = None):
    """GET convenience for asking copilot."""
    req = CopilotRequest(question=question or "Who is Vikram Singh?", case_id=case_id)
    return mocks.ask_copilot(req=req)


@app.get("/api/case/integrity", response_model=IntegrityResponse)
def get_case_integrity(case_id: Optional[str] = None):
    """Verify evidence integrity across 00_Raw_Inputs/ against SHA-256 sidecars."""
    return mocks.get_case_integrity(case_id=case_id)


@app.get("/api/crosscase/hits", response_model=CrossCaseResponse)
def get_crosscase_hits():
    """Deterministic scan for identifiers appearing across multiple cases."""
    return mocks.get_crosscase_hits()


@app.get("/api/doc/{id}", response_model=Doc)
def get_doc(id: str):
    """Get metadata for an evidentiary document in 00_Raw_Inputs/."""
    return mocks.get_doc(doc_id=id)


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "ok", "service": "SyndicateBrain"}
