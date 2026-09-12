import pytest
import pydantic
from brain.schemas import (
    Node,
    Edge,
    Provenance,
    Doc,
    SubgraphResponse,
    CertificateRequest,
    CertificateResponse,
    ResolveDecision,
    AgentCard,
)
from brain.mocks import MOCK_NODES, MOCK_EDGES, MOCK_DOCS


def test_edge_provenance_strictly_enforced():
    """Law 1 & Law 3: Provenance-less edge must be impossible to construct."""
    # Valid construction
    e = Edge(
        id="e1",
        source="p1",
        target="p2",
        type="CALLED",
        source_doc_id="DOC_CDR_98123",
        locator="row:4182",
    )
    assert e.source_doc_id == "DOC_CDR_98123"
    assert e.locator == "row:4182"

    # Missing source_doc_id must raise ValidationError
    with pytest.raises(pydantic.ValidationError) as exc:
        Edge(
            id="e2",
            source="p1",
            target="p2",
            type="CALLED",
            locator="row:4182",
        )
    assert "source_doc_id" in str(exc.value)

    # Missing locator must raise ValidationError
    with pytest.raises(pydantic.ValidationError) as exc:
        Edge(
            id="e3",
            source="p1",
            target="p2",
            type="CALLED",
            source_doc_id="DOC_CDR_98123",
        )
    assert "locator" in str(exc.value)


def test_mock_edges_validity():
    """Every mock edge must validate against Edge schema."""
    assert len(MOCK_EDGES) >= 20
    for edge in MOCK_EDGES:
        assert isinstance(edge, Edge)
        assert edge.source_doc_id
        assert edge.locator
        assert edge.source
        assert edge.target
        assert edge.type


def test_mock_nodes_validity():
    """Mock nodes should represent realistic entities."""
    assert len(MOCK_NODES) >= 20
    vikram = next((n for n in MOCK_NODES if n.id == "person_vikram_singh"), None)
    assert vikram is not None
    assert vikram.betweenness == 0.183
    assert vikram.canonical_name == "Vikram Singh"
    assert "Kharkhoda" in vikram.thana


def test_resolve_decision():
    """ResolveDecision model works properly."""
    decision = ResolveDecision(
        left_id="p1",
        right_id="p2",
        block_key="imei:864209041234567",
        phonetic_score=0.91,
        vector_score=0.88,
        context_score=0.95,
        combined=0.92,
        decision="auto_merge",
        reason="Shared IMEI and high phonetic match",
    )
    assert decision.combined == 0.92
    assert decision.decision == "auto_merge"


def test_agent_card():
    """AgentCard validates properly."""
    card = AgentCard(
        entity_id="person_vikram_singh",
        canonical_name="Vikram Singh",
        thana="Kharkhoda",
        betweenness=0.183,
        summary="Proxy kingpin",
        sources=["FIR_0142_2025_Sonipat.pdf"],
    )
    assert card.entity_id == "person_vikram_singh"
    assert card.betweenness == 0.183
