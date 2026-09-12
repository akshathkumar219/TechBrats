"""
Plausible mock responses for SyndicateBrain API endpoints.
Zero logic, no database, no computation.
Realistic Indian names and Haryana phone numbers / tower IDs.

Every mock Edge is strictly validated against schemas.Edge.
"""

from typing import Optional
from brain.schemas import (
    Doc,
    Provenance,
    Edge,
    Node,
    SubgraphResponse,
    CertificateRequest,
    CertificateResponse,
    ResolveDecision,
    AgentCard,
    TreeNode,
    CentralityItem,
)

# -------------------------------------------------------------------------
# Mock Documents (Evidentiary Tier: 01_Evidence_Inbox)
# -------------------------------------------------------------------------

MOCK_DOCS: dict[str, Doc] = {
    "DOC_FIR_0142": Doc(
        id="DOC_FIR_0142",
        path="01_Evidence_Inbox/FIR/FIR_0142_2025_Sonipat.pdf",
        kind="FIR",
        sha256="a3f29c1e7845b123456789abcdef0123456789abcdef0123456789abcdef0123",
        bytes=412850,
        ingested_at="2025-11-03T10:15:00+05:30",
        ingested_by="SI Sukhwinder Singh",
        page_count=4,
    ),
    "DOC_FIR_0311": Doc(
        id="DOC_FIR_0311",
        path="01_Evidence_Inbox/FIR/FIR_0311_2026_Kharkhoda.pdf",
        kind="FIR",
        sha256="7b194dd0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
        bytes=328100,
        ingested_at="2026-02-16T16:45:00+05:30",
        ingested_by="Inspector Rajesh Kumar",
        page_count=3,
    ),
    "DOC_CDR_98123": Doc(
        id="DOC_CDR_98123",
        path="01_Evidence_Inbox/CDR/CDR_9812345678_Jan-Aug2026.csv",
        kind="CDR",
        sha256="c0812f45123456789abcdef0123456789abcdef0123456789abcdef0123456789",
        bytes=1845200,
        ingested_at="2026-08-28T09:30:00+05:30",
        ingested_by="Cyber Cell Sonipat",
        page_count=None,
    ),
    "DOC_STMT_0311": Doc(
        id="DOC_STMT_0311",
        path="01_Evidence_Inbox/Statements/STMT_0311_witness2.pdf",
        kind="Statement",
        sha256="e55208a7123456789abcdef0123456789abcdef0123456789abcdef0123456789",
        bytes=194200,
        ingested_at="2026-02-18T14:10:00+05:30",
        ingested_by="Inspector Rajesh Kumar",
        page_count=2,
    ),
    "DOC_RC_HR26": Doc(
        id="DOC_RC_HR26",
        path="01_Evidence_Inbox/Misc/RC_HR26AB1234.pdf",
        kind="Misc",
        sha256="d48109ab123456789abcdef0123456789abcdef0123456789abcdef0123456789",
        bytes=98400,
        ingested_at="2026-02-15T11:20:00+05:30",
        ingested_by="ASI Manoj Kumar",
        page_count=1,
    ),
}

# -------------------------------------------------------------------------
# Mock Nodes (~20 realistic Haryana entities)
# -------------------------------------------------------------------------

MOCK_NODES: list[Node] = [
    # Persons
    Node(
        id="person_vikram_singh",
        type="Person",
        label="Vikram Singh",
        canonical_name="Vikram Singh",
        aliases=["Vicky", "Vikram s/o Ramesh", "विक्रम सिंह", "विक्की"],
        thana="Kharkhoda",
        first_seen="2025-11-03",
        last_seen="2026-08-27",
        note_path="02_AI_Brain/Suspects/Vikram Singh.md",
        degree=14,
        betweenness=0.183,  # Top betweenness in the syndicate
        pagerank=0.0412,
        community="Sonipat_Arms_Ring",
        properties={"status": "active", "risk_flags": ["armed", "repeat_offender"]},
    ),
    Node(
        id="person_rehan_khan",
        type="Person",
        label="Rehan Khan",
        canonical_name="Rehan Khan",
        aliases=["Rehan", "रेहान खान"],
        thana="Kharkhoda",
        first_seen="2026-02-12",
        last_seen="2026-08-27",
        note_path="02_AI_Brain/Suspects/Rehan Khan.md",
        degree=19,  # Operational hub (highest degree)
        betweenness=0.071,
        pagerank=0.0890,
        community="Sonipat_Arms_Ring",
        properties={"status": "arrested"},
    ),
    Node(
        id="person_sandeep_malik",
        type="Person",
        label="Sandeep Malik",
        canonical_name="Sandeep Malik",
        aliases=["Sandy", "संदीप मलिक"],
        thana="Gohana",
        first_seen="2026-02-14",
        last_seen="2026-08-20",
        degree=11,
        betweenness=0.019,
        pagerank=0.0350,
        community="Sonipat_Arms_Ring",
        properties={"status": "active"},
    ),
    Node(
        id="person_jaspreet_dhillon",
        type="Person",
        label="Jaspreet Dhillon",
        canonical_name="Jaspreet Dhillon",
        aliases=["Jassa", "जसप्रीत ढिल्लों"],
        thana="Sonipat Sadar",
        first_seen="2026-02-14",
        last_seen="2026-08-25",
        degree=8,
        betweenness=0.004,
        pagerank=0.0210,
        community="Sonipat_Arms_Ring",
        properties={"status": "active"},
    ),
    Node(
        id="person_amit_dahiya",
        type="Person",
        label="Amit Dahiya",
        canonical_name="Amit Dahiya",
        aliases=["Dahiya", "अमित दहिया"],
        thana="Rai",
        first_seen="2026-01-10",
        last_seen="2026-08-22",
        degree=10,
        betweenness=0.045,
        pagerank=0.0380,
        community="Panipat_Nexus",
        properties={"status": "active"},
    ),
    Node(
        id="person_monu_gujjar",
        type="Person",
        label="Monu Gujjar",
        canonical_name="Monu Gujjar",
        aliases=["Monu", "मोनू"],
        thana="Ganaur",
        first_seen="2026-03-01",
        last_seen="2026-08-15",
        degree=9,
        betweenness=0.012,
        pagerank=0.0290,
        community="Panipat_Nexus",
        properties={"status": "active"},
    ),
    Node(
        id="person_kuldeep_hooda",
        type="Person",
        label="Kuldeep Hooda",
        canonical_name="Kuldeep Hooda",
        aliases=["KD", "कुलदीप"],
        thana="Rohtak City",
        first_seen="2026-04-12",
        last_seen="2026-08-10",
        degree=6,
        betweenness=0.008,
        pagerank=0.0190,
        community="Rohtak_Transport",
        properties={"status": "active"},
    ),
    # Phones
    Node(
        id="phone_9812345678",
        type="Phone",
        label="9812345678",
        canonical_name="9812345678",
        properties={"operator": "Airtel", "circle": "Haryana", "subscriber": "Vikram Singh"},
    ),
    Node(
        id="phone_9812345679",
        type="Phone",
        label="9812345679",
        canonical_name="9812345679",
        properties={"operator": "Airtel", "circle": "Haryana", "subscriber": "Rehan Khan"},
    ),
    Node(
        id="phone_9812001122",
        type="Phone",
        label="9812001122",
        canonical_name="9812001122",
        properties={"operator": "Jio", "circle": "Haryana", "subscriber": "Sandeep Malik"},
    ),
    Node(
        id="phone_9876543210",
        type="Phone",
        label="9876543210",
        canonical_name="9876543210",
        properties={"operator": "Airtel", "circle": "Haryana", "role": "Burner Handset"},
    ),
    Node(
        id="phone_9812998877",
        type="Phone",
        label="9812998877",
        canonical_name="9812998877",
        properties={"operator": "Vodafone Idea", "circle": "Haryana", "subscriber": "Jaspreet Dhillon"},
    ),
    Node(
        id="phone_9812112233",
        type="Phone",
        label="9812112233",
        canonical_name="9812112233",
        properties={"operator": "Jio", "circle": "Haryana", "subscriber": "Amit Dahiya"},
    ),
    # Devices (IMEI)
    Node(
        id="device_imei_3598",
        type="Device",
        label="IMEI 359842109876543",
        canonical_name="359842109876543",
        properties={"make": "Vivo Y20"},
    ),
    Node(
        id="device_imei_8642",
        type="Device",
        label="IMEI 864209041234567",
        canonical_name="864209041234567",
        properties={"make": "Redmi Note 11", "note": "Shared burner IMEI"},
    ),
    # Cell Towers
    Node(
        id="tower_hr_snp_0147",
        type="Tower",
        label="HR-SNP-0147 (Kharkhoda)",
        canonical_name="HR-SNP-0147",
        properties={"lat": 28.8824, "lon": 76.9121, "address": "Kharkhoda Bypass, Sonipat"},
    ),
    Node(
        id="tower_hr_snp_0219",
        type="Tower",
        label="HR-SNP-0219 (Gohana)",
        canonical_name="HR-SNP-0219",
        properties={"lat": 29.1378, "lon": 76.7012, "address": "Gohana Chowk, Sonipat"},
    ),
    Node(
        id="tower_hr_snp_0082",
        type="Tower",
        label="HR-SNP-0082 (Rai)",
        canonical_name="HR-SNP-0082",
        properties={"lat": 28.9312, "lon": 77.0945, "address": "Rai Industrial Area, Sonipat"},
    ),
    # Vehicle
    Node(
        id="vehicle_hr26ab1234",
        type="Vehicle",
        label="HR26AB1234 (Scorpio)",
        canonical_name="HR26AB1234",
        properties={"make": "Mahindra Scorpio", "colour": "Black"},
    ),
    # Organisation
    Node(
        id="org_sonipat_arms_ring",
        type="Org",
        label="Sonipat Arms Ring",
        canonical_name="Sonipat Arms Ring",
        community="Sonipat_Arms_Ring",
        properties={"kind": "gang", "detected_by": "leiden_cpm"},
    ),
    # FIRs
    Node(
        id="fir_0142_2025",
        type="FIR",
        label="FIR 0142/2025 (PS Kharkhoda)",
        canonical_name="FIR 0142/2025",
        properties={"thana": "Kharkhoda", "sections": ["307", "120B IPC"]},
    ),
    Node(
        id="fir_0311_2026",
        type="FIR",
        label="FIR 0311/2026 (PS Kharkhoda)",
        canonical_name="FIR 0311/2026",
        properties={"thana": "Kharkhoda", "sections": ["25", "54", "59 Arms Act"]},
    ),
    # Event
    Node(
        id="event_kharkhoda_seizure",
        type="Event",
        label="2026-02-14 Kharkhoda Seizure",
        canonical_name="2026-02-14 Kharkhoda Seizure",
        properties={"date": "2026-02-14", "summary": "Recovery of illegal arms at Kharkhoda"},
    ),
]

# -------------------------------------------------------------------------
# Mock Edges (Every edge strictly validated against schemas.Edge)
# -------------------------------------------------------------------------

MOCK_EDGES: list[Edge] = [
    Edge(
        id="edge_call_01",
        source="phone_9812345678",
        target="phone_9812345679",
        type="CALLED",
        source_doc_id="DOC_CDR_98123",
        locator="rows:4182-4213",
        observed_at="2026-02-14T23:14:00+05:30",
        weight=31.0,
        tier="deterministic",
        properties={"duration_s": 240, "call_count": 31, "night_window": True},
    ),
    Edge(
        id="edge_call_02",
        source="phone_9812345679",
        target="phone_9812001122",
        type="CALLED",
        source_doc_id="DOC_CDR_98123",
        locator="row:512",
        observed_at="2026-02-15T01:22:10+05:30",
        weight=12.0,
        tier="deterministic",
        properties={"duration_s": 180, "call_count": 12},
    ),
    Edge(
        id="edge_call_03",
        source="phone_9812345679",
        target="phone_9812998877",
        type="CALLED",
        source_doc_id="DOC_CDR_98123",
        locator="row:890",
        observed_at="2026-02-15T02:05:00+05:30",
        weight=8.0,
        tier="deterministic",
        properties={"duration_s": 95, "call_count": 8},
    ),
    Edge(
        id="edge_call_04",
        source="phone_9812345679",
        target="phone_9812112233",
        type="CALLED",
        source_doc_id="DOC_CDR_98123",
        locator="row:1204",
        observed_at="2026-02-16T14:30:00+05:30",
        weight=5.0,
        tier="deterministic",
        properties={"duration_s": 140, "call_count": 5},
    ),
    Edge(
        id="edge_call_05",
        source="phone_9812112233",
        target="phone_9876543210",
        type="CALLED",
        source_doc_id="DOC_CDR_98123",
        locator="row:1450",
        observed_at="2026-02-16T18:10:00+05:30",
        weight=14.0,
        tier="deterministic",
        properties={"duration_s": 320, "call_count": 14},
    ),
    # USES_PHONE links
    Edge(
        id="edge_uses_01",
        source="person_vikram_singh",
        target="phone_9812345678",
        type="USES_PHONE",
        source_doc_id="DOC_FIR_0142",
        locator="page:2 line:4",
        observed_at="2025-11-03T10:00:00+05:30",
        weight=1.0,
        tier="deterministic",
    ),
    Edge(
        id="edge_uses_02",
        source="person_rehan_khan",
        target="phone_9812345679",
        type="USES_PHONE",
        source_doc_id="DOC_CDR_98123",
        locator="row:1",
        observed_at="2026-01-01T00:00:00+05:30",
        weight=1.0,
        tier="deterministic",
    ),
    Edge(
        id="edge_uses_03",
        source="person_sandeep_malik",
        target="phone_9812001122",
        type="USES_PHONE",
        source_doc_id="DOC_FIR_0311",
        locator="page:1 line:14",
        observed_at="2026-02-16T16:00:00+05:30",
        weight=1.0,
        tier="deterministic",
    ),
    Edge(
        id="edge_uses_04",
        source="person_jaspreet_dhillon",
        target="phone_9812998877",
        type="USES_PHONE",
        source_doc_id="DOC_FIR_0311",
        locator="page:2 line:3",
        observed_at="2026-02-16T16:00:00+05:30",
        weight=1.0,
        tier="deterministic",
    ),
    Edge(
        id="edge_uses_05",
        source="person_amit_dahiya",
        target="phone_9812112233",
        type="USES_PHONE",
        source_doc_id="DOC_CDR_98123",
        locator="row:1200",
        observed_at="2026-02-10T11:00:00+05:30",
        weight=1.0,
        tier="deterministic",
    ),
    # USES_DEVICE (Burner / IMEI pairings)
    Edge(
        id="edge_dev_01",
        source="phone_9812345678",
        target="device_imei_3598",
        type="USES_DEVICE",
        source_doc_id="DOC_CDR_98123",
        locator="row:4401",
        observed_at="2026-02-20T10:00:00+05:30",
        weight=1.0,
        tier="deterministic",
    ),
    Edge(
        id="edge_dev_02",
        source="phone_9876543210",
        target="device_imei_8642",
        type="USES_DEVICE",
        source_doc_id="DOC_CDR_98123",
        locator="row:9012",
        observed_at="2026-02-14T21:14:00+05:30",
        weight=1.0,
        tier="deterministic",
    ),
    # Tower Pings
    Edge(
        id="edge_ping_01",
        source="phone_9812345678",
        target="tower_hr_snp_0147",
        type="PINGED",
        source_doc_id="DOC_CDR_98123",
        locator="rows:4190-4203",
        observed_at="2026-02-14T21:14:00+05:30",
        weight=14.0,
        tier="deterministic",
        properties={"cell_id": "HR-SNP-0147"},
    ),
    Edge(
        id="edge_ping_02",
        source="phone_9876543210",
        target="tower_hr_snp_0147",
        type="PINGED",
        source_doc_id="DOC_CDR_98123",
        locator="row:9012",
        observed_at="2026-02-14T21:14:00+05:30",
        weight=1.0,
        tier="deterministic",
        properties={"cell_id": "HR-SNP-0147", "co_located": True},
    ),
    Edge(
        id="edge_ping_03",
        source="phone_9812001122",
        target="tower_hr_snp_0219",
        type="PINGED",
        source_doc_id="DOC_CDR_98123",
        locator="row:550",
        observed_at="2026-02-14T22:00:00+05:30",
        weight=1.0,
        tier="deterministic",
        properties={"cell_id": "HR-SNP-0219"},
    ),
    # FIR named relations
    Edge(
        id="edge_named_01",
        source="person_vikram_singh",
        target="fir_0142_2025",
        type="NAMED_IN",
        source_doc_id="DOC_FIR_0142",
        locator="page:1 line:8",
        observed_at="2025-11-03T00:00:00+05:30",
        weight=1.0,
        tier="deterministic",
        properties={"role": "accused"},
    ),
    Edge(
        id="edge_named_02",
        source="person_vikram_singh",
        target="fir_0311_2026",
        type="NAMED_IN",
        source_doc_id="DOC_FIR_0311",
        locator="page:1 line:11",
        observed_at="2026-02-16T00:00:00+05:30",
        weight=1.0,
        tier="deterministic",
        properties={"role": "accused"},
    ),
    Edge(
        id="edge_named_03",
        source="person_rehan_khan",
        target="fir_0311_2026",
        type="NAMED_IN",
        source_doc_id="DOC_FIR_0311",
        locator="page:1 line:12",
        observed_at="2026-02-16T00:00:00+05:30",
        weight=1.0,
        tier="deterministic",
        properties={"role": "accused"},
    ),
    Edge(
        id="edge_named_04",
        source="person_sandeep_malik",
        target="fir_0311_2026",
        type="NAMED_IN",
        source_doc_id="DOC_FIR_0311",
        locator="page:1 line:13",
        observed_at="2026-02-16T00:00:00+05:30",
        weight=1.0,
        tier="deterministic",
        properties={"role": "accused"},
    ),
    # Co-accused
    Edge(
        id="edge_coacc_01",
        source="person_vikram_singh",
        target="person_rehan_khan",
        type="CO_ACCUSED",
        source_doc_id="DOC_FIR_0311",
        locator="page:1 lines:11-13",
        observed_at="2026-02-16T00:00:00+05:30",
        weight=1.0,
        tier="deterministic",
        properties={"fir_id": "fir_0311_2026"},
    ),
    Edge(
        id="edge_coacc_02",
        source="person_rehan_khan",
        target="person_sandeep_malik",
        type="CO_ACCUSED",
        source_doc_id="DOC_FIR_0311",
        locator="page:1 lines:12-13",
        observed_at="2026-02-16T00:00:00+05:30",
        weight=1.0,
        tier="deterministic",
        properties={"fir_id": "fir_0311_2026"},
    ),
    # Vehicle Ownership
    Edge(
        id="edge_veh_01",
        source="person_vikram_singh",
        target="vehicle_hr26ab1234",
        type="OWNS_VEHICLE",
        source_doc_id="DOC_RC_HR26",
        locator="page:1 line:3",
        observed_at="2026-02-15T00:00:00+05:30",
        weight=1.0,
        tier="deterministic",
    ),
    # Gang membership
    Edge(
        id="edge_mem_01",
        source="person_vikram_singh",
        target="org_sonipat_arms_ring",
        type="MEMBER_OF",
        source_doc_id="DOC_FIR_0311",
        locator="page:2 line:15",
        observed_at="2026-02-16T00:00:00+05:30",
        weight=1.0,
        tier="deterministic",
        properties={"method": "leiden_cpm"},
    ),
    Edge(
        id="edge_mem_02",
        source="person_rehan_khan",
        target="org_sonipat_arms_ring",
        type="MEMBER_OF",
        source_doc_id="DOC_FIR_0311",
        locator="page:2 line:16",
        observed_at="2026-02-16T00:00:00+05:30",
        weight=1.0,
        tier="deterministic",
        properties={"method": "leiden_cpm"},
    ),
    # Present at Seizure
    Edge(
        id="edge_pres_01",
        source="person_rehan_khan",
        target="event_kharkhoda_seizure",
        type="PRESENT_AT",
        source_doc_id="DOC_FIR_0311",
        locator="page:1 line:20",
        observed_at="2026-02-14T22:30:00+05:30",
        weight=1.0,
        tier="deterministic",
        properties={"basis": "seizure_memo"},
    ),
]

EDGES_BY_ID = {e.id: e for e in MOCK_EDGES}

# -------------------------------------------------------------------------
# Mock Endpoints Implementation
# -------------------------------------------------------------------------

def get_subgraph(
    case_id: Optional[str] = "CASE_2026_NCB_047",
    center: Optional[str] = None,
    depth: Optional[int] = None,
) -> SubgraphResponse:
    """GET /api/graph/subgraph"""
    return SubgraphResponse(
        nodes=MOCK_NODES,
        edges=MOCK_EDGES,
        case_id=case_id,
        center=center or "person_vikram_singh",
        depth=depth or 2,
    )


def get_edge_provenance(edge_id: str) -> Provenance:
    """GET /api/edge/{id}/provenance"""
    edge = EDGES_BY_ID.get(edge_id, MOCK_EDGES[0])
    doc = MOCK_DOCS.get(edge.source_doc_id, MOCK_DOCS["DOC_CDR_98123"])

    snippet = (
        "4182,9812345678,9812345679,2026-02-14 23:14:00,240,HR-SNP-0147\n"
        "4183,9812345678,9812345679,2026-02-14 23:32:15,180,HR-SNP-0147"
    )
    if "FIR" in edge.source_doc_id:
        snippet = "दिनांक 14.02.2026 को गुप्त सूचना के आधार पर विक्रम सिंह उर्फ विक्की व रेहान खान के विरुद्ध..."
    elif "STMT" in edge.source_doc_id:
        snippet = "गवाह ने बयान दिया कि विक्रम सिंह उर्फ विक्की को रेहान खान के साथ कई बार देखा गया..."

    return Provenance(
        source_doc_id=edge.source_doc_id,
        locator=edge.locator,
        observed_at=edge.observed_at,
        weight=edge.weight,
        tier=edge.tier,
        snippet=snippet,
        cypher=f"MATCH (a)-[r:{edge.type}]->(b) WHERE r.id = '{edge.id}' RETURN a, r, b",
        sql=f"SELECT * FROM edges WHERE id = '{edge.id}' AND source_doc_id = '{edge.source_doc_id}';",
        derivation_chain="Resolved via shared IMEI 864209041234567 on 2026-02-14",
        doc=doc,
    )


def get_vault_tree() -> list[TreeNode]:
    """GET /api/vault/tree"""
    return [
        TreeNode(
            name="00_Case",
            displayName="00_Case",
            path="00_Case",
            isFolder=True,
            children=[
                TreeNode(name="Case_Overview.md", displayName="Case_Overview", path="00_Case/Case_Overview.md", isFolder=False),
                TreeNode(name="Team.md", displayName="Team", path="00_Case/Team.md", isFolder=False),
                TreeNode(name="Case_Config.yaml", displayName="Case_Config", path="00_Case/Case_Config.yaml", isFolder=False),
            ],
        ),
        TreeNode(
            name="01_Evidence_Inbox",
            displayName="01_Evidence_Inbox",
            path="01_Evidence_Inbox",
            isFolder=True,
            is_locked=True,
            children=[
                TreeNode(
                    name="FIR",
                    displayName="FIR",
                    path="01_Evidence_Inbox/FIR",
                    isFolder=True,
                    is_locked=True,
                    children=[
                        TreeNode(name="FIR_0142_2025_Sonipat.pdf", displayName="FIR_0142_2025_Sonipat", path="01_Evidence_Inbox/FIR/FIR_0142_2025_Sonipat.pdf", isFolder=False, is_locked=True),
                        TreeNode(name="FIR_0311_2026_Kharkhoda.pdf", displayName="FIR_0311_2026_Kharkhoda", path="01_Evidence_Inbox/FIR/FIR_0311_2026_Kharkhoda.pdf", isFolder=False, is_locked=True),
                    ],
                ),
                TreeNode(
                    name="CDR",
                    displayName="CDR",
                    path="01_Evidence_Inbox/CDR",
                    isFolder=True,
                    is_locked=True,
                    children=[
                        TreeNode(name="CDR_9812345678_Jan-Aug2026.csv", displayName="CDR_9812345678_Jan-Aug2026", path="01_Evidence_Inbox/CDR/CDR_9812345678_Jan-Aug2026.csv", isFolder=False, is_locked=True),
                    ],
                ),
                TreeNode(
                    name="Statements",
                    displayName="Statements",
                    path="01_Evidence_Inbox/Statements",
                    isFolder=True,
                    is_locked=True,
                    children=[
                        TreeNode(name="STMT_0311_witness2.pdf", displayName="STMT_0311_witness2", path="01_Evidence_Inbox/Statements/STMT_0311_witness2.pdf", isFolder=False, is_locked=True),
                    ],
                ),
                TreeNode(
                    name="Misc",
                    displayName="Misc",
                    path="01_Evidence_Inbox/Misc",
                    isFolder=True,
                    is_locked=True,
                    children=[
                        TreeNode(name="RC_HR26AB1234.pdf", displayName="RC_HR26AB1234", path="01_Evidence_Inbox/Misc/RC_HR26AB1234.pdf", isFolder=False, is_locked=True),
                    ],
                ),
            ],
        ),
        TreeNode(
            name="02_AI_Brain",
            displayName="02_AI_Brain",
            path="02_AI_Brain",
            isFolder=True,
            children=[
                TreeNode(
                    name="Suspects",
                    displayName="Suspects",
                    path="02_AI_Brain/Suspects",
                    isFolder=True,
                    children=[
                        TreeNode(name="Vikram Singh.md", displayName="Vikram Singh", path="02_AI_Brain/Suspects/Vikram Singh.md", isFolder=False),
                        TreeNode(name="Rehan Khan.md", displayName="Rehan Khan", path="02_AI_Brain/Suspects/Rehan Khan.md", isFolder=False),
                    ],
                ),
                TreeNode(
                    name="Organisations",
                    displayName="Organisations",
                    path="02_AI_Brain/Organisations",
                    isFolder=True,
                    children=[
                        TreeNode(name="Sonipat Arms Ring.md", displayName="Sonipat Arms Ring", path="02_AI_Brain/Organisations/Sonipat Arms Ring.md", isFolder=False),
                    ],
                ),
                TreeNode(
                    name="Phones",
                    displayName="Phones",
                    path="02_AI_Brain/Phones",
                    isFolder=True,
                    children=[
                        TreeNode(name="9812345678.md", displayName="9812345678", path="02_AI_Brain/Phones/9812345678.md", isFolder=False),
                        TreeNode(name="9812345679.md", displayName="9812345679", path="02_AI_Brain/Phones/9812345679.md", isFolder=False),
                    ],
                ),
                TreeNode(
                    name="Locations",
                    displayName="Locations",
                    path="02_AI_Brain/Locations",
                    isFolder=True,
                    children=[
                        TreeNode(name="Tower_HR_SNP_0147.md", displayName="Tower_HR_SNP_0147", path="02_AI_Brain/Locations/Tower_HR_SNP_0147.md", isFolder=False),
                    ],
                ),
                TreeNode(
                    name="Events",
                    displayName="Events",
                    path="02_AI_Brain/Events",
                    isFolder=True,
                    children=[
                        TreeNode(name="2026-02-14_Kharkhoda_Seizure.md", displayName="2026-02-14_Kharkhoda_Seizure", path="02_AI_Brain/Events/2026-02-14_Kharkhoda_Seizure.md", isFolder=False),
                    ],
                ),
                TreeNode(
                    name="Hypotheses",
                    displayName="Hypotheses",
                    path="02_AI_Brain/Hypotheses",
                    isFolder=True,
                    children=[
                        TreeNode(name="H-0031_Vikram-to-Rehan_bridge.md", displayName="H-0031_Vikram-to-Rehan_bridge", path="02_AI_Brain/Hypotheses/H-0031_Vikram-to-Rehan_bridge.md", isFolder=False),
                    ],
                ),
                TreeNode(name="Delta_Log.md", displayName="Delta_Log", path="02_AI_Brain/Delta_Log.md", isFolder=False),
            ],
        ),
        TreeNode(
            name="03_Workspace",
            displayName="03_Workspace",
            path="03_Workspace",
            isFolder=True,
            children=[
                TreeNode(name="Scratch.md", displayName="Scratch", path="03_Workspace/Scratch.md", isFolder=False),
            ],
        ),
        TreeNode(
            name="04_Exports",
            displayName="04_Exports",
            path="04_Exports",
            isFolder=True,
            children=[
                TreeNode(name="BSA63_Certificate_2026-09-12_subgraph-A.pdf", displayName="BSA63_Certificate_2026-09-12_subgraph-A.pdf", path="04_Exports/BSA63_Certificate_2026-09-12_subgraph-A.pdf", isFolder=False),
            ],
        ),
    ]


def get_centrality() -> list[CentralityItem]:
    """
    GET /api/analytics/centrality
    Sorted by betweenness descending — Vikram Singh emerges as the proxy kingpin!
    """
    return [
        CentralityItem(
            id="person_vikram_singh",
            name="Vikram Singh",
            type="Person",
            degree=14,
            betweenness=0.183,  # Top betweenness bridge
            pagerank=0.0412,
        ),
        CentralityItem(
            id="person_rehan_khan",
            name="Rehan Khan",
            type="Person",
            degree=19,  # Highest degree hub
            betweenness=0.071,
            pagerank=0.0890,
        ),
        CentralityItem(
            id="person_amit_dahiya",
            name="Amit Dahiya",
            type="Person",
            degree=10,
            betweenness=0.045,
            pagerank=0.0380,
        ),
        CentralityItem(
            id="person_sandeep_malik",
            name="Sandeep Malik",
            type="Person",
            degree=11,
            betweenness=0.019,
            pagerank=0.0350,
        ),
        CentralityItem(
            id="person_monu_gujjar",
            name="Monu Gujjar",
            type="Person",
            degree=9,
            betweenness=0.012,
            pagerank=0.0290,
        ),
        CentralityItem(
            id="person_kuldeep_hooda",
            name="Kuldeep Hooda",
            type="Person",
            degree=6,
            betweenness=0.008,
            pagerank=0.0190,
        ),
        CentralityItem(
            id="person_jaspreet_dhillon",
            name="Jaspreet Dhillon",
            type="Person",
            degree=8,
            betweenness=0.004,
            pagerank=0.0210,
        ),
    ]


def get_doc(doc_id: str) -> Doc:
    """GET /api/doc/{id}"""
    if doc_id in MOCK_DOCS:
        return MOCK_DOCS[doc_id]
    # Fallback plausible doc
    return Doc(
        id=doc_id,
        path=f"01_Evidence_Inbox/FIR/{doc_id}.pdf",
        kind="FIR",
        sha256="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        bytes=245000,
        ingested_at="2026-09-12T10:00:00+05:30",
        ingested_by="Inspector Rajesh Kumar",
        page_count=2,
    )


def get_agent_card(entity_id: str) -> AgentCard:
    """GET /api/agent/card/{id}"""
    markdown_content = """# Vikram Singh

## Summary

Named as accused in 3 FIRs across Sonipat district between Nov 2025 and Aug 2026 ^[FIR_0142_2025_Sonipat.pdf p:1 l:8]. Holds the **highest betweenness centrality (0.183) in this network** despite only the 6th-highest degree — he connects clusters that have no other path between them ^[graph:metrics 2026-09-11]. Has used four distinct MSISDNs across two IMEIs since Feb 2026 ^[CDR_9812345678.csv rows:1-24891].

## Identity & Aliases

| Form | Source |
| :--- | :--- |
| विक्रम सिंह | FIR 0142/2025, complainant statement ^[FIR_0142_2025_Sonipat.pdf p:2 l:4] |
| Vikram Singh s/o Ramesh | FIR 0311/2026 accused list ^[FIR_0311_2026_Kharkhoda.pdf p:1 l:11] |
| विक्की / Vicky | Witness statement, "विक्रम सिंह उर्फ विक्की" ^[STMT_0311_witness2.pdf p:1 l:6] |

## Verified Connections

- Called [[Rehan Khan]] 31 times between 12–19 Feb 2026, all between 23:00 and 04:00 ^[CDR_9812345678.csv rows:4182-4213]
- Co-accused with [[Rehan Khan]] and [[Sandeep Malik]] in FIR 0311/2026 ^[FIR_0311_2026_Kharkhoda.pdf p:1 l:11-13]
- Registered owner of vehicle HR26AB1234 ^[RC_HR26AB1234.pdf p:1 l:3]
- Phone [[9812345678]] pinged [[Tower HR-SNP-0147]] 14 times in the 6 hours before the [[2026-02-14 Kharkhoda Seizure]] ^[CDR_9812345678.csv rows:4190-4203]

## Timeline

| Date | Event | Source |
| :--- | :--- | :--- |
| 2025-11-03 | First appearance — FIR 0142/2025 | ^[FIR_0142_2025_Sonipat.pdf p:1 l:8] |
| 2026-02-12 | Call burst with [[Rehan Khan]] begins | ^[CDR_9812345678.csv row:4182] |
| 2026-02-14 | [[2026-02-14 Kharkhoda Seizure]] | ^[FIR_0311_2026_Kharkhoda.pdf p:1] |
| 2026-08-27 | Last recorded activity | ^[CDR_9812345678.csv row:24891] |

## Contradictions

*None detected for this entity.*

## Sources

1. `FIR_0142_2025_Sonipat.pdf` — SHA-256 `a3f2…9c1e`
2. `FIR_0311_2026_Kharkhoda.pdf` — SHA-256 `7b19…4dd0`
3. `CDR_9812345678_Jan-Aug2026.csv` — SHA-256 `c081…2f45`
4. `STMT_0311_witness2.pdf` — SHA-256 `e552…08a7`
"""
    return AgentCard(
        entity_id=entity_id,
        type="suspect",
        canonical_name="Vikram Singh",
        aliases=["Vicky", "विक्रम सिंह", "विक्की", "Vikram s/o Ramesh"],
        thana="Kharkhoda",
        status="active",
        risk_flags=["armed", "repeat_offender"],
        communities=["Sonipat_Arms_Ring"],
        degree=14,
        pagerank=0.0412,
        betweenness=0.183,
        first_seen="2025-11-03",
        last_seen="2026-08-27",
        summary="Named as accused in 3 FIRs across Sonipat district. Holds highest betweenness centrality (0.183) in this network.",
        markdown=markdown_content,
        sources=[
            "FIR_0142_2025_Sonipat.pdf",
            "FIR_0311_2026_Kharkhoda.pdf",
            "CDR_9812345678_Jan-Aug2026.csv",
            "STMT_0311_witness2.pdf",
        ],
        model="qwen3.5:9b-instruct-q4_K_M",
        generated_at="2026-09-12T10:00:00+05:30",
        human_edited=False,
    )


def export_certificate(req: Optional[CertificateRequest] = None) -> CertificateResponse:
    """POST/GET /api/export/certificate"""
    case_id = req.case_id if req else "CASE_2026_NCB_047"
    elements_count = len(req.subgraph_edges) + len(req.subgraph_nodes) if req and (req.subgraph_edges or req.subgraph_nodes) else 24
    return CertificateResponse(
        pdf_path="04_Exports/BSA63_Certificate_2026-09-12_subgraph-A.pdf",
        sha256="4d7c08e1a6b0c29f8d147e256b823e6189af04b9318b76df429532db6822c19a",
        status="generated",
        case_id=case_id,
        elements_certified=elements_count,
        refused_elements=[],
    )


def get_vault_integrity():
    from brain.schemas import VaultIntegrityResponse
    return VaultIntegrityResponse(
        status="verified",
        failures=[],
        document_count=len(MOCK_DOCS),
    )
