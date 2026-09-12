"""
Pydantic v2 schemas for SyndicateBrain (SIH26189).

THE SIX LAWS:
1. Evidence is immutable (00_Raw_Inputs/ files hashed, locked, verified).
2. The map is deterministic; the AI only proposes (record-derived vs AI-proposed).
3. Every link carries its reason and citation (source_doc_id + locator required).
4. Nothing is asserted without a citation (uncited sentences dropped by validator).
5. The case is temporal (notes and links carry timestamps/dates).
6. Identity is resolved conservatively (hard signals only).

LOCATOR FORMAT:
Locator format is strictly fixed:
- Documents / FIRs / Statements: "p:3 l:11" (page and line)
- CDR / Call Detail Records: "row:48219" (stable row index)

CRITICAL INVARIANT:
Link and Proposal each carry a Citation as a strictly required field:
no default, not Optional. Citation carries source_doc_id: str and locator: str,
both strictly required. A link or proposal without a source must be impossible to construct.
"""

from typing import Any, Optional
from pydantic import BaseModel, ConfigDict, Field


class Doc(BaseModel):
    """Represents an ingested evidentiary document in 00_Raw_Inputs/."""
    model_config = ConfigDict(extra="allow")

    id: str
    filename: str
    type: str  # FIR | CDR | TowerDump | Statement | FieldLog | Misc
    sha256: str
    ingest_timestamp: str
    original_path: str
    locked: bool = True
    bytes: Optional[int] = None
    page_count: Optional[int] = None


class Citation(BaseModel):
    """
    Provenance record for an edge, link, claim, or proposal.
    Points to a verified source document and exact locator.
    Strictly requires source_doc_id and locator (no defaults, not Optional).
    """
    model_config = ConfigDict(extra="allow")

    source_doc_id: str
    locator: str  # Fixed format: 'p:3 l:11' for docs, 'row:48219' for CDR
    snippet: Optional[str] = None
    observed_at: Optional[str] = None
    tier: str = "deterministic"


class Link(BaseModel):
    """
    Link between entities in the knowledge graph / markdown notes.
    CRITICAL: citation is strictly required — no default, not Optional.
    A link without a source cannot be constructed.
    """
    model_config = ConfigDict(extra="allow")

    source: str
    target: str
    reason: str
    citation: Citation
    tier: str = "record-derived"  # 'record-derived' | 'ai-proposed'
    is_ai: bool = False
    ai_marker: Optional[str] = None  # e.g. "<!-- ai:prop_0007 accepted -->"
    confidence: Optional[float] = None
    observed_at: Optional[str] = None
    properties: dict[str, Any] = Field(default_factory=dict)


class Proposal(BaseModel):
    """
    AI-proposed link or lead awaiting human acceptance.
    CRITICAL: citation is strictly required — no default, not Optional.
    """
    model_config = ConfigDict(extra="allow")

    id: str  # e.g. "prop_0001"
    claim: str
    reason: str
    citation: Citation
    confidence: float
    source_entity: Optional[str] = None
    target_entity: Optional[str] = None
    status: str = "proposed"  # 'proposed' | 'accepted' | 'rejected'
    created_at: Optional[str] = None
    decided_at: Optional[str] = None
    decided_by: Optional[str] = None


class FileUpdateProposal(BaseModel):
    """
    Suggested additions for notes that may be out of date.
    Read-only suggestions; AI never edits note bodies directly.
    """
    model_config = ConfigDict(extra="allow")

    file_path: str
    note_id: Optional[str] = None
    suggested_additions: list[str] = Field(default_factory=list)
    reason: str
    citation: Optional[Citation] = None


class AnalysisResult(BaseModel):
    """
    Returned by POST /api/case/analyse.
    Contains New Connections, Files to Update, and Summary.
    """
    model_config = ConfigDict(extra="allow")

    case_id: str
    summary: str
    new_connections: list[Proposal] = Field(default_factory=list)
    files_to_update: list[FileUpdateProposal] = Field(default_factory=list)
    dropped_proposals_count: int = 0
    analyzed_at: Optional[str] = None
    cache_used: bool = False
    """True when this result was served from the 07_AI_Synthesis fixture rather
    than a live model run (SYNDICATEBRAIN_PREFER_CACHE=1, or a live-run fallback
    after the model produced too few/no proposals). The frontend must show this
    to the user — never present a cached result as a live one."""


class Entity(BaseModel):
    """
    Entity representation in case vault markdown notes.
    """
    model_config = ConfigDict(extra="allow")

    id: str
    type: str  # person | identifier | vehicle | location | organisation | event
    role: Optional[str] = None  # accused | witness | complainant | victim | officer
    names: list[str] = Field(default_factory=list)
    identifiers: list[str] = Field(default_factory=list)
    case: str
    created: Optional[str] = None
    updated: Optional[str] = None
    links: list[Link] = Field(default_factory=list)
    body: Optional[str] = None
    file_path: Optional[str] = None
    properties: dict[str, Any] = Field(default_factory=dict)


class CaseIndexEntry(BaseModel):
    """
    Compact entity record stored in _Case_Index.md.
    Maintained for fast copilot retrieval without scanning entire vault.
    """
    model_config = ConfigDict(extra="allow")

    id: str
    type: str
    role: Optional[str] = None
    file_path: str
    names: list[str] = Field(default_factory=list)
    identifiers: list[str] = Field(default_factory=list)
    existing_links: list[str] = Field(default_factory=list)
    key_facts: list[str] = Field(default_factory=list)
    mtime: float


# Supporting schemas for endpoints

class CaseSummary(BaseModel):
    """Summary of a case folder."""
    model_config = ConfigDict(extra="allow")

    id: str
    name: str
    path: str
    created: str
    entity_count: int
    document_count: int
    link_count: int


class CopilotRequest(BaseModel):
    """Question submitted to copilot."""
    model_config = ConfigDict(extra="allow")

    question: str
    case_id: Optional[str] = None


class CopilotResponse(BaseModel):
    """Answer returned by copilot with surviving citations."""
    model_config = ConfigDict(extra="allow")

    answer: str
    citations: list[Citation] = Field(default_factory=list)
    notes_retrieved: list[str] = Field(default_factory=list)


class IntegrityResponse(BaseModel):
    """Evidence verification status for case."""
    model_config = ConfigDict(extra="allow")

    status: str = "verified"  # verified | contaminated
    failures: list[str] = Field(default_factory=list)
    document_count: int = 0
    verified_at: Optional[str] = None


class CrossCaseHit(BaseModel):
    """Deterministic cross-case identifier match."""
    model_config = ConfigDict(extra="allow")

    identifier: str
    cases: list[str] = Field(default_factory=list)
    notes: list[str] = Field(default_factory=list)
    hit_type: str = "phone"


class CrossCaseResponse(BaseModel):
    """Collection of cross-case hits."""
    model_config = ConfigDict(extra="allow")

    hits: list[CrossCaseHit] = Field(default_factory=list)


# Backward compatibility aliases
Provenance = Citation

