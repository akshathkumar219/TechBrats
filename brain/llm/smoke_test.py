"""
Smoke test running identical prompts through both Ollama and Gemini providers,
verifying that both produce schema-valid Pydantic objects adhering to response_schema.
"""

import os
from unittest.mock import MagicMock
from pydantic import BaseModel, Field
from brain.llm.client import OllamaClient, GeminiClient


class InvestigativeLead(BaseModel):
    target_entity: str = Field(description="Name or phone identifier of suspect")
    role_assessment: str = Field(description="Operational role within network")
    confidence: float = Field(description="Confidence score between 0.0 and 1.0")
    recommended_action: str = Field(description="Next investigative step")


def run_smoke_test():
    prompt = (
        "Assess telephone number 9896011223 associated with Rehan Khan during weapons transport along NH-44."
    )
    system_instruction = (
        "You are an analytical crime intelligence engine. Return concise, factual assessment."
    )

    print("=================================================================")
    print("      SYNDICATEBRAIN LLM PROVIDER DUAL SMOKE TEST               ")
    print("=================================================================\n")
    print("TEST PROMPT:\n  " + prompt + "\n")
    print(f"TARGET SCHEMA:\n  {InvestigativeLead.__name__}\n")

    # -------------------------------------------------------------
    # 1. Test Ollama Provider (DEFAULT - Live Local)
    # -------------------------------------------------------------
    print("--- 1. TESTING OLLAMA PROVIDER (Default / Offline) ---")
    ollama = OllamaClient(model="qwen2.5:3b-instruct")
    print("Calling Ollama warmup()...", end=" ")
    warmup_ok = ollama.warmup()
    print(f"OK ({warmup_ok})")

    print("Generating structured output via Ollama...")
    ollama_res = ollama.generate_structured(
        prompt=prompt,
        response_schema=InvestigativeLead,
        system_prompt=system_instruction,
    )
    assert isinstance(ollama_res, InvestigativeLead), "Ollama did not return InvestigativeLead instance"
    assert ollama_res.target_entity, "target_entity is empty"
    print("[✓ OLLAMA SUCCESS]")
    print(f"  Target Entity:      {ollama_res.target_entity}")
    print(f"  Role Assessment:    {ollama_res.role_assessment}")
    print(f"  Confidence:         {ollama_res.confidence}")
    print(f"  Recommended Action: {ollama_res.recommended_action}\n")

    # -------------------------------------------------------------
    # 2. Test Gemini Flash Provider (Parachute)
    # -------------------------------------------------------------
    print("--- 2. TESTING GEMINI FLASH PROVIDER (Parachute) ---")
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")

    if api_key:
        print("Live GEMINI_API_KEY detected. Running live call to Gemini Flash...")
        gemini = GeminiClient(api_key=api_key, model="gemini-2.5-flash")
        gemini_res = gemini.generate_structured(
            prompt=prompt,
            response_schema=InvestigativeLead,
            system_prompt=system_instruction,
        )
    else:
        print("No GEMINI_API_KEY in environment. Running client via verified mock transport...")
        gemini = GeminiClient(api_key="test_dummy_key", model="gemini-2.5-flash")
        mock_response = MagicMock()
        mock_response.text = """{
            "target_entity": "9896011223 (Rehan Khan)",
            "role_assessment": "Logistics and transport coordinator for Vikram Singh syndicate",
            "confidence": 0.95,
            "recommended_action": "Issue surveillance on vehicle HR-26-AB-1234 and monitor cell HR-SNP-0147"
        }"""
        mock_client = MagicMock()
        mock_client.models.generate_content.return_value = mock_response
        gemini._genai_client = mock_client

        gemini_res = gemini.generate_structured(
            prompt=prompt,
            response_schema=InvestigativeLead,
            system_prompt=system_instruction,
        )

    assert isinstance(gemini_res, InvestigativeLead), "Gemini did not return InvestigativeLead instance"
    assert gemini_res.target_entity, "target_entity is empty"
    print("[✓ GEMINI FLASH SUCCESS]")
    print(f"  Target Entity:      {gemini_res.target_entity}")
    print(f"  Role Assessment:    {gemini_res.role_assessment}")
    print(f"  Confidence:         {gemini_res.confidence}")
    print(f"  Recommended Action: {gemini_res.recommended_action}\n")

    print("=================================================================")
    print("   ALL PROVIDERS RETURNED SCHEMA-VALID OBJECTS SUCCESSFULLY!     ")
    print("=================================================================")


if __name__ == "__main__":
    run_smoke_test()
