"""
Plausible mock responses for SyndicateBrain API endpoints.
Zero logic, no database, no computation.
Realistic Haryana names, phone numbers, and tower IDs (HR-SNP-0147).

Serves:
- /api/cases
- /api/case/analyse
- /api/copilot/ask
- /api/case/integrity
- /api/crosscase/hits
- /api/doc/{id}
"""

from typing import Optional
from brain.schemas import (
    Doc,
    Citation,
    Proposal,
    FileUpdateProposal,
    AnalysisResult,
    CaseSummary,
    CopilotRequest,
    CopilotResponse,
    IntegrityResponse,
    CrossCaseHit,
    CrossCaseResponse,
)

# -------------------------------------------------------------------------
# Evidentiary Documents (00_Raw_Inputs/)
# -------------------------------------------------------------------------

MOCK_DOCS: dict[str, Doc] = {
    "DOC_FIR_0142": Doc(
        id="DOC_FIR_0142",
        filename="FIR_0142_2026_Kharkhoda.pdf",
        type="FIR",
        sha256="a3f29c1e7845b123456789abcdef0123456789abcdef0123456789abcdef0123",
        ingest_timestamp="2026-02-14T10:15:00+05:30",
        original_path="00_Raw_Inputs/FIR/FIR_0142_2026_Kharkhoda.pdf",
        locked=True,
        bytes=412850,
        page_count=4,
    ),
    "DOC_CDR_9812345678": Doc(
        id="DOC_CDR_9812345678",
        filename="CDR_9812345678_Jan-Feb2026.csv",
        type="CDR",
        sha256="c0812f45123456789abcdef0123456789abcdef0123456789abcdef0123456789",
        ingest_timestamp="2026-02-15T09:30:00+05:30",
        original_path="00_Raw_Inputs/CDR/CDR_9812345678_Jan-Feb2026.csv",
        locked=True,
        bytes=1845200,
        page_count=None,
    ),
    "DOC_TD_HR_SNP_0147": Doc(
        id="DOC_TD_HR_SNP_0147",
        filename="TowerDump_HR-SNP-0147_2026-02-12.csv",
        type="TowerDump",
        sha256="b4821d33123456789abcdef0123456789abcdef0123456789abcdef0123456789",
        ingest_timestamp="2026-02-16T11:00:00+05:30",
        original_path="00_Raw_Inputs/TowerDump/TowerDump_HR-SNP-0147_2026-02-12.csv",
        locked=True,
        bytes=942100,
        page_count=None,
    ),
    "DOC_FL_004": Doc(
        id="DOC_FL_004",
        filename="FieldLog_2026-02-13_SonipatSadar.pdf",
        type="FieldLog",
        sha256="8f12a9bc123456789abcdef0123456789abcdef0123456789abcdef0123456789",
        ingest_timestamp="2026-02-16T14:20:00+05:30",
        original_path="00_Raw_Inputs/FieldLog/FieldLog_2026-02-13_SonipatSadar.pdf",
        locked=True,
        bytes=125400,
        page_count=2,
    ),
    "DOC_STMT_001": Doc(
        id="DOC_STMT_001",
        filename="Statement_Ramesh_Chander.pdf",
        type="Statement",
        sha256="e55208a7123456789abcdef0123456789abcdef0123456789abcdef0123456789",
        ingest_timestamp="2026-02-17T16:45:00+05:30",
        original_path="00_Raw_Inputs/Statement/Statement_Ramesh_Chander.pdf",
        locked=True,
        bytes=194200,
        page_count=2,
    ),
}

# -------------------------------------------------------------------------
# Cases Mock
# -------------------------------------------------------------------------

MOCK_CASES: list[CaseSummary] = [
    CaseSummary(
        id="Case_01_Sonipat_Arms",
        name="Sonipat Arms & Extortion Syndicate",
        path="vaults/Case_01_Sonipat_Arms",
        created="2026-02-14",
        entity_count=42,
        document_count=8,
        link_count=36,
    ),
    CaseSummary(
        id="Case_02_Rohtak_Hijack",
        name="Rohtak Highway Arms Hijack",
        path="vaults/Case_02_Rohtak_Hijack",
        created="2026-02-20",
        entity_count=14,
        document_count=3,
        link_count=12,
    ),
]

# -------------------------------------------------------------------------
# Analysis Result Mock (5 connections, 2 files to update, summary)
# -------------------------------------------------------------------------

MOCK_PROPOSALS: list[Proposal] = [
    Proposal(
        id="prop_0001",
        claim="Vikram Singh coordinated arms consignment with Rehan Khan",
        reason="14 calls logged across 72 hours preceding Kharkhoda arms seizure between suspect phone and logistics coordinator",
        source_entity="Vikram Singh",
        target_entity="Rehan Khan",
        citation=Citation(
            source_doc_id="DOC_CDR_9812345678",
            locator="row:48219",
            snippet="9812345678 -> 9896011223 | 2026-02-12 21:14:02 | dur: 184s | cell: HR-SNP-0147",
        ),
        confidence=0.94,
        status="proposed",
        created_at="2026-02-19T14:30:00+05:30",
    ),
    Proposal(
        id="prop_0002",
        claim="Rehan Khan co-located with Amit Malik at Sonipat Toll Plaza",
        reason="Simultaneous cell tower registration on Sector 14 cell HR-SNP-0147 within 4-minute window during transit",
        source_entity="Rehan Khan",
        target_entity="Amit Malik",
        citation=Citation(
            source_doc_id="DOC_TD_HR_SNP_0147",
            locator="row:1204",
            snippet="HR-SNP-0147 | 2026-02-12 21:18:30 | 9896011223 & 9812099881 concurrent",
        ),
        confidence=0.91,
        status="proposed",
        created_at="2026-02-19T14:30:00+05:30",
    ),
    Proposal(
        id="prop_0003",
        claim="Amit Malik linked to Balwinder Singh via vehicle HR-26-AB-1234",
        reason="White Mahindra Scorpio registered to Balwinder sighted at Amit Malik's hideout during surveillance",
        source_entity="Amit Malik",
        target_entity="Balwinder Singh",
        citation=Citation(
            source_doc_id="DOC_FL_004",
            locator="p:1 l:18",
            snippet="White Mahindra Scorpio HR-26-AB-1234 parked outside warehouse, Malik present",
        ),
        confidence=0.86,
        status="proposed",
        created_at="2026-02-19T14:30:00+05:30",
    ),
    Proposal(
        id="prop_0004",
        claim="Gurpreet 'Guri' Sandhu shared handset IMEI 869123456789012 with Vikram Singh",
        reason="Consecutive IMSI activation on handset IMEI 869123456789012 within 14-day window",
        source_entity="Gurpreet Sandhu",
        target_entity="Vikram Singh",
        citation=Citation(
            source_doc_id="DOC_CDR_9812345678",
            locator="row:51204",
            snippet="IMEI 869123456789012 swap from IMSI 4044501... to 4044509... active Feb 1-14",
        ),
        confidence=0.89,
        status="proposed",
        created_at="2026-02-19T14:30:00+05:30",
    ),
    Proposal(
        id="prop_0005",
        claim="Balwinder Singh procured munitions documented in Kharkhoda seizure FIR 0142/2026",
        reason="Serial numbers and armorer markings match country-made .32 pistols seized at Kharkhoda checkpost",
        source_entity="Balwinder Singh",
        target_entity="FIR 0142/2026",
        citation=Citation(
            source_doc_id="DOC_FIR_0142",
            locator="p:3 l:14",
            snippet="Recovered 4 country-made .32 pistols marked 'BS-KHL' from glovebox during naka inspection",
        ),
        confidence=0.92,
        status="proposed",
        created_at="2026-02-19T14:30:00+05:30",
    ),
]

MOCK_FILES_TO_UPDATE: list[FileUpdateProposal] = [
    FileUpdateProposal(
        file_path="01_People/Vikram Singh.md",
        note_id="person_0031",
        reason="New burner handset IMEI linkage identified connecting to Gurpreet Sandhu",
        suggested_additions=[
            "Add alias 'Vicky Kharkhoda'",
            "Document shared handset IMEI 869123456789012 active Feb 1-14 2026",
            "Note coordination role with Balwinder Singh supply chain",
        ],
        citation=Citation(source_doc_id="DOC_FIR_0142", locator="p:2 l:11"),
    ),
    FileUpdateProposal(
        file_path="01_People/Rehan Khan.md",
        note_id="person_0042",
        reason="Tower dump places Rehan Khan at Sonipat toll plaza during arms drop",
        suggested_additions=[
            "Update status to co-accused in arms transit",
            "Add location tag: Sonipat Toll Plaza (cell HR-SNP-0147)",
            "Log 14 calls with Vikram Singh",
        ],
        citation=Citation(source_doc_id="DOC_TD_HR_SNP_0147", locator="row:1204"),
    ),
]

MOCK_ANALYSIS_RESULT = AnalysisResult(
    case_id="Case_01_Sonipat_Arms",
    summary=(
        "Analysis of recent evidence (FIR 0142/2026 Kharkhoda, CDR 9812345678, Tower Dump HR-SNP-0147) "
        "reveals 5 new cross-entity links connecting the Vikram Singh syndicate with Balwinder Singh's logistics "
        "network along NH-44. Vikram Singh acted as proxy kingpin coordinating via burner IMEI 869123456789012 "
        "without direct calls to field operatives."
    ),
    new_connections=MOCK_PROPOSALS,
    files_to_update=MOCK_FILES_TO_UPDATE,
    dropped_proposals_count=0,
    analyzed_at="2026-02-19T14:30:00+05:30",
)

# -------------------------------------------------------------------------
# Copilot Mock
# -------------------------------------------------------------------------

MOCK_COPILOT_RESPONSE = CopilotResponse(
    answer=(
        "Vikram Singh is named as an accused in FIR 0142/2026 (Kharkhoda Thana) in connection with the illicit arms "
        "seizure on NH-44. CDR analysis confirms he operates as a proxy kingpin, maintaining 14 direct phone calls "
        "with logistics lieutenant Rehan Khan prior to the recovery while avoiding direct contact with field operatives."
    ),
    citations=[
        Citation(
            source_doc_id="DOC_FIR_0142",
            locator="p:2 l:9",
            snippet="Vikram Singh s/o Ramesh, resident of Kharkhoda, named accused u/s 25 Arms Act.",
        ),
        Citation(
            source_doc_id="DOC_CDR_9812345678",
            locator="row:48219",
            snippet="14 calls logged between 9812345678 and 9896011223 across 72 hours.",
        ),
    ],
    notes_retrieved=[
        "01_People/Vikram Singh.md",
        "01_People/Rehan Khan.md",
        "00_Raw_Inputs/FIR/FIR_0142_2026_Kharkhoda.pdf",
    ],
)

# -------------------------------------------------------------------------
# Integrity Mock
# -------------------------------------------------------------------------

MOCK_INTEGRITY = IntegrityResponse(
    status="verified",
    failures=[],
    document_count=8,
    verified_at="2026-02-19T14:32:10+05:30",
)

# -------------------------------------------------------------------------
# Cross-case Hits Mock
# -------------------------------------------------------------------------

MOCK_CROSSCASE = CrossCaseResponse(
    hits=[
        CrossCaseHit(
            identifier="9896011223",
            cases=["Case_01_Sonipat_Arms", "Case_02_Rohtak_Hijack"],
            notes=["01_People/Rehan Khan.md", "01_People/Suresh Goel.md"],
            hit_type="phone",
        ),
        CrossCaseHit(
            identifier="869123456789012",
            cases=["Case_01_Sonipat_Arms", "Case_02_Rohtak_Hijack"],
            notes=["02_Identifiers/IMEI_869123456789012.md"],
            hit_type="imei",
        ),
    ]
)


# -------------------------------------------------------------------------
# Helper Functions for Endpoints
# -------------------------------------------------------------------------

def get_cases() -> list[CaseSummary]:
    return MOCK_CASES


def analyse_case(case_id: Optional[str] = None) -> AnalysisResult:
    return MOCK_ANALYSIS_RESULT


def ask_copilot(req: Optional[CopilotRequest] = None) -> CopilotResponse:
    return MOCK_COPILOT_RESPONSE


def get_case_integrity(case_id: Optional[str] = None) -> IntegrityResponse:
    return MOCK_INTEGRITY


def get_crosscase_hits() -> CrossCaseResponse:
    return MOCK_CROSSCASE


def get_doc(doc_id: str) -> Doc:
    if doc_id in MOCK_DOCS:
        return MOCK_DOCS[doc_id]
    # Plausible fallback if prefixed with DOC_ or not
    normalized_id = f"DOC_{doc_id}" if not doc_id.startswith("DOC_") else doc_id
    if normalized_id in MOCK_DOCS:
        return MOCK_DOCS[normalized_id]
    return Doc(
        id=doc_id,
        filename=f"{doc_id}.pdf",
        type="Misc",
        sha256="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        ingest_timestamp="2026-02-14T12:00:00+05:30",
        original_path=f"00_Raw_Inputs/Misc/{doc_id}.pdf",
        locked=True,
        bytes=102400,
        page_count=1,
    )
