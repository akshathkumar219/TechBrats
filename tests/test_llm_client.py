import os
from unittest.mock import MagicMock, patch
import pytest
from pydantic import BaseModel, Field, ValidationError

from brain.llm.client import (
    LLMClient,
    OllamaClient,
    GeminiClient,
    get_llm_client,
    clean_json_text,
)


class LeadSchema(BaseModel):
    suspect_name: str
    threat_level: str
    confidence: float


def test_clean_json_text():
    raw_markdown = """```json
{"suspect_name": "Vikram", "threat_level": "High", "confidence": 0.9}
```"""
    cleaned = clean_json_text(raw_markdown)
    assert cleaned.startswith("{")
    assert cleaned.endswith("}")


def test_ollama_client_structured_live():
    client = OllamaClient(model="qwen2.5:3b-instruct")
    # Test warmup
    assert client.warmup() is True

    # Test generate_structured
    res = client.generate_structured(
        prompt="Provide structured threat assessment for Vikram Singh in Sonipat.",
        response_schema=LeadSchema,
        system_prompt="Return JSON conforming to schema.",
    )
    assert isinstance(res, LeadSchema)
    assert res.suspect_name
    assert res.threat_level
    assert 0.0 <= res.confidence <= 1.0


def test_gemini_client_structured_and_retry():
    client = GeminiClient(api_key="test_key", model="gemini-2.5-flash")

    # Mock invalid output on attempt 1, valid on attempt 2 (retry test)
    bad_resp = MagicMock()
    bad_resp.text = "{\"invalid_key\": \"unknown\"}"

    good_resp = MagicMock()
    good_resp.text = """```json
{
    \"suspect_name\": \"Rehan Khan\",
    \"threat_level\": \"Medium\",
    \"confidence\": 0.85
}
```"""

    mock_genai_client = MagicMock()
    mock_genai_client.models.generate_content.side_effect = [bad_resp, good_resp]
    client._genai_client = mock_genai_client

    res = client.generate_structured(
        prompt="Assess Rehan Khan.",
        response_schema=LeadSchema,
    )

    # Asserts retry was triggered and succeeded
    assert mock_genai_client.models.generate_content.call_count == 2
    assert isinstance(res, LeadSchema)
    assert res.suspect_name == "Rehan Khan"
    assert res.confidence == 0.85


def test_factory_get_llm_client():
    client_ollama = get_llm_client(provider="ollama", model="qwen2.5:3b-instruct")
    assert isinstance(client_ollama, OllamaClient)
    assert client_ollama.model == "qwen2.5:3b-instruct"

    client_gemini = get_llm_client(provider="gemini", model="gemini-2.5-flash", api_key="test_key")
    assert isinstance(client_gemini, GeminiClient)
    assert client_gemini.model == "gemini-2.5-flash"
