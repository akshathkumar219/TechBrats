"""
brain/ingest/__init__.py — Ingest package for evidentiary documents.
"""

from brain.ingest.pipeline import (
    router,
    ingest_file,
    classify_document,
    calculate_sha256,
    generate_doc_id,
    lock_evidentiary_file,
    GuardViolationError,
    INGESTED_DOCS,
)

__all__ = [
    "router",
    "ingest_file",
    "classify_document",
    "calculate_sha256",
    "generate_doc_id",
    "lock_evidentiary_file",
    "GuardViolationError",
    "INGESTED_DOCS",
]
