"""
Case Index package for SyndicateBrain (SIH26189).
"""

from brain.index.build import (
    build_case_index,
    parse_entity_note,
    walk_case_notes,
    generate_case_index_content,
    router,
)
from brain.index.incremental import (
    refresh_case_index,
    parse_case_index_content,
    StoredIndexEntry,
    RefreshIndexRequest,
    RefreshIndexResponse,
)

__all__ = [
    "build_case_index",
    "parse_entity_note",
    "walk_case_notes",
    "generate_case_index_content",
    "refresh_case_index",
    "parse_case_index_content",
    "StoredIndexEntry",
    "RefreshIndexRequest",
    "RefreshIndexResponse",
    "router",
]
