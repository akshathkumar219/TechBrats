"""
FastAPI application for SyndicateBrain.
CORS configured for frontend development on http://localhost:5173.
All routes mounted to mock providers.
"""

from typing import Optional
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from brain.schemas import (
    Doc,
    Provenance,
    SubgraphResponse,
    CertificateRequest,
    CertificateResponse,
    AgentCard,
    TreeNode,
    CentralityItem,
)
import brain.mocks as mocks

app = FastAPI(
    title="SyndicateBrain API",
    description="Deterministic criminal knowledge graph backend for police investigations.",
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


@app.get("/api/graph/subgraph", response_model=SubgraphResponse)
def get_subgraph(
    case_id: Optional[str] = "CASE_2026_NCB_047",
    center: Optional[str] = None,
    depth: Optional[int] = None,
):
    return mocks.get_subgraph(case_id=case_id, center=center, depth=depth)


@app.get("/api/edge/{id}/provenance", response_model=Provenance)
def get_edge_provenance(id: str):
    return mocks.get_edge_provenance(edge_id=id)


@app.get("/api/vault/tree", response_model=list[TreeNode])
def get_vault_tree():
    return mocks.get_vault_tree()


@app.get("/api/analytics/centrality", response_model=list[CentralityItem])
def get_analytics_centrality():
    return mocks.get_centrality()


@app.get("/api/doc/{id}", response_model=Doc)
def get_doc(id: str):
    return mocks.get_doc(doc_id=id)


@app.get("/api/agent/card/{id}", response_model=AgentCard)
def get_agent_card(id: str):
    return mocks.get_agent_card(entity_id=id)


@app.post("/api/export/certificate", response_model=CertificateResponse)
def post_export_certificate(req: Optional[CertificateRequest] = None):
    return mocks.export_certificate(req=req)


@app.get("/api/export/certificate", response_model=CertificateResponse)
def get_export_certificate():
    return mocks.export_certificate(req=None)


@app.get("/api/vault/integrity")
def get_vault_integrity():
    return mocks.get_vault_integrity()
