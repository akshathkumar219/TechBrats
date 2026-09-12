"""
brain/retrieval/__init__.py — Two-Tier Retrieval Package for SyndicateBrain.
"""

from brain.retrieval.service import ask_copilot, build_context_pack, select_tier2_notes

__all__ = ["ask_copilot", "build_context_pack", "select_tier2_notes"]
