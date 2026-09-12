"""
brain/cdr — Call Detail Record (CDR) parsing, normalization, DuckDB/sqlite3 loading,
and note materialization.
"""

from brain.cdr.loader import (
    CDRDatabase,
    load_cdr,
    materialize_cdr_notes,
    normalize_phone,
    parse_cdr_timestamp,
    get_profile,
    load_profiles,
)
from brain.cdr.router import router

__all__ = [
    "CDRDatabase",
    "load_cdr",
    "materialize_cdr_notes",
    "normalize_phone",
    "parse_cdr_timestamp",
    "get_profile",
    "load_profiles",
    "router",
]
