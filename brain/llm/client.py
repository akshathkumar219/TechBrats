"""
Provider-agnostic LLM Client Interface for SyndicateBrain.

Supports two implementations behind an identical abstract interface:
1. Ollama (DEFAULT — provider: ollama) for 100% offline police workbench deployment.
2. Gemini Flash (parachute provider) switched via Case_Config.yaml or environment.

Guarantees:
- JSON mode
- Temperature 0.0
- Pydantic schema validation against target response_schema
- Exactly 1 retry on validation or parsing failure
- warmup() hook to eliminate cold load latency at app start
"""

import json
import logging
import os
import re
import urllib.request
import urllib.error
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any, Dict, Optional, Type, TypeVar, Union
import yaml
from pydantic import BaseModel, ValidationError

logger = logging.getLogger("brain.llm")

T = TypeVar("T", bound=BaseModel)


def clean_json_text(text: str) -> str:
    """Strip markdown code fences and whitespace from model JSON output."""
    if not text:
        return ""
    text = text.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        text = "\n".join(lines).strip()
    return text


class LLMClient(ABC):
    """Abstract base interface for structured LLM providers."""

    @abstractmethod
    def generate_structured(
        self,
        prompt: str,
        response_schema: Type[T],
        system_prompt: Optional[str] = None,
    ) -> T:
        """
        Generate a structured response adhering strictly to response_schema.
        Must use JSON mode and temperature 0.
        Must retry exactly once on parse or schema validation failure.
        """
        pass

    @abstractmethod
    def warmup(self) -> bool:
        """
        App start warmup call to load model weights and prevent cold start lag.
        """
        pass


class OllamaClient(LLMClient):
    """
    Local Ollama implementation (Default Provider).
    Communicates via Ollama HTTP REST API with temperature 0.0 and JSON format.
    """

    def __init__(
        self,
        base_url: str = "http://localhost:11434",
        model: str = "qwen2.5:3b-instruct",
        timeout: float = 60.0,
        num_ctx: int = 8192,
    ):
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.timeout = timeout
        self.num_ctx = num_ctx

    def _call_api(self, messages: list[dict[str, str]], format_schema: Optional[Any] = "json") -> str:
        url = f"{self.base_url}/api/chat"
        payload = {
            "model": self.model,
            "messages": messages,
            "format": format_schema if format_schema is not None else "json",
            "stream": False,
            "options": {
                "temperature": 0.0,
                "num_ctx": self.num_ctx,
            },
        }
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=data,
            headers={"Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                res_json = json.loads(resp.read().decode("utf-8"))
                message = res_json.get("message", {})
                return message.get("content", "")
        except urllib.error.URLError as e:
            logger.error(f"Ollama connection failed: {e}")
            raise ConnectionError(f"Failed to connect to Ollama at {self.base_url}: {e}")

    def generate_structured(
        self,
        prompt: str,
        response_schema: Type[T],
        system_prompt: Optional[str] = None,
    ) -> T:
        schema_dict = response_schema.model_json_schema()
        schema_json = json.dumps(schema_dict, indent=2)
        props = list(schema_dict.get("properties", {}).keys())
        example_keys = ", ".join(f'"{k}": ...' for k in props)
        base_system = (
            "You are an offline analytical intelligence engine for law enforcement.\n"
            "You must output ONLY raw, valid JSON matching the following JSON Schema:\n"
            f"{schema_json}\n"
            f"Expected JSON object format: {{{example_keys}}}\n"
            "Do not output markdown code fences, greetings, or explanations. Only the JSON object."
        )
        effective_system = f"{base_system}\n{system_prompt}" if system_prompt else base_system

        messages = [
            {"role": "system", "content": effective_system},
            {"role": "user", "content": prompt},
        ]

        def _parse_and_validate(raw_str: str) -> T:
            cleaned_str = clean_json_text(raw_str)
            try:
                parsed = json.loads(cleaned_str)
                if isinstance(parsed, dict):
                    if "properties" in parsed and isinstance(parsed["properties"], dict):
                        for k in props:
                            if k in parsed["properties"]:
                                parsed[k] = parsed["properties"][k]
                    if len(props) == 1 and props[0] not in parsed and len(parsed) == 1:
                        parsed[props[0]] = next(iter(parsed.values()))
                    # Widen alias repair for list-valued keys when an expected list property is absent
                    for prop_name, prop_meta in schema_dict.get("properties", {}).items():
                        if prop_name not in parsed or not parsed[prop_name]:
                            if isinstance(prop_meta, dict) and (prop_meta.get("type") == "array" or "items" in prop_meta):
                                for k, v in parsed.items():
                                    if k != prop_name and isinstance(v, list) and v:
                                        parsed[prop_name] = v
                                        break
                return response_schema.model_validate(parsed)
            except Exception:
                return response_schema.model_validate_json(cleaned_str)

        # Attempt 1
        raw_output = ""
        try:
            raw_output = self._call_api(messages, format_schema=schema_dict)
            return _parse_and_validate(raw_output)
        except ConnectionError:
            raise
        except (ValidationError, json.JSONDecodeError, Exception) as first_err:
            logger.warning(
                f"Ollama attempt 1 failed validation for {response_schema.__name__}: {first_err}. "
                "Retrying exactly once with schema correction."
            )

            # Retry: exactly 1 retry
            retry_messages = list(messages)
            retry_messages.append({"role": "assistant", "content": raw_output})
            retry_messages.append(
                {
                    "role": "user",
                    "content": (
                        f"Your previous JSON was invalid: {first_err}. "
                        f"Please return ONLY the valid JSON strictly conforming to schema {response_schema.__name__}."
                    ),
                }
            )

            try:
                second_output = self._call_api(retry_messages, format_schema=schema_dict)
                return _parse_and_validate(second_output)
            except ConnectionError:
                raise
            except Exception as second_err:
                logger.error(f"Ollama retry failed for {response_schema.__name__}: {second_err}")
                raise ValueError(
                    f"Ollama failed to produce schema-valid {response_schema.__name__} after 1 retry: {second_err}"
                )

    def warmup(self) -> bool:
        """Ping Ollama with a minimal structured request."""
        class WarmupSchema(BaseModel):
            status: str

        try:
            res = self.generate_structured(
                prompt="Respond with status: ready",
                response_schema=WarmupSchema,
                system_prompt="Warmup check",
            )
            return bool(res.status)
        except Exception as e:
            logger.warning(f"Ollama warmup ping failed: {e}")
            return False


class GeminiClient(LLMClient):
    """
    Google Gemini Flash provider (Parachute Provider).
    Used when local model quality is insufficient or Gemini key is configured.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = "gemini-2.5-flash",
        timeout: float = 30.0,
    ):
        self.api_key = (
            api_key
            or os.environ.get("GEMINI_API_KEY")
            or os.environ.get("GOOGLE_API_KEY")
        )
        self.model = model
        self.timeout = timeout
        self._genai_client = None

    def _get_client(self):
        if self._genai_client is None:
            if not self.api_key:
                raise ValueError(
                    "Gemini API key not found. Set GEMINI_API_KEY environment variable or specify api_key."
                )
            try:
                from google import genai
                self._genai_client = genai.Client(api_key=self.api_key)
            except ImportError:
                raise ImportError("google-genai package is required for GeminiClient. Run pip install google-genai.")
        return self._genai_client

    def generate_structured(
        self,
        prompt: str,
        response_schema: Type[T],
        system_prompt: Optional[str] = None,
    ) -> T:
        client = self._get_client()
        from google.genai import types

        config = types.GenerateContentConfig(
            temperature=0.0,
            response_mime_type="application/json",
            response_schema=response_schema,
            system_instruction=system_prompt,
        )

        # Attempt 1
        try:
            resp = client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=config,
            )
            cleaned = clean_json_text(resp.text)
            return response_schema.model_validate_json(cleaned)
        except (ValidationError, Exception) as first_err:
            logger.warning(
                f"Gemini attempt 1 failed validation for {response_schema.__name__}: {first_err}. "
                "Retrying exactly once."
            )

            # Retry: exactly 1 retry
            retry_prompt = (
                f"{prompt}\n\n"
                f"Note: Previous response failed schema validation: {first_err}. "
                f"Return strictly schema-valid JSON for {response_schema.__name__}."
            )
            try:
                resp2 = client.models.generate_content(
                    model=self.model,
                    contents=retry_prompt,
                    config=config,
                )
                cleaned2 = clean_json_text(resp2.text)
                return response_schema.model_validate_json(cleaned2)
            except Exception as second_err:
                logger.error(f"Gemini retry failed for {response_schema.__name__}: {second_err}")
                raise ValueError(
                    f"Gemini failed to produce schema-valid {response_schema.__name__} after 1 retry: {second_err}"
                )

    def warmup(self) -> bool:
        """Perform lightweight structured warmup call."""
        class WarmupSchema(BaseModel):
            status: str

        try:
            res = self.generate_structured(
                prompt="Confirm status ready",
                response_schema=WarmupSchema,
                system_prompt="Warmup ping",
            )
            return bool(res.status)
        except Exception as e:
            logger.warning(f"Gemini warmup failed: {e}")
            return False


def load_case_config(config_path: Optional[Union[str, Path]] = None) -> dict[str, Any]:
    """Load Case_Config.yaml from specified path or standard candidate paths."""
    candidates = []
    if config_path:
        candidates.append(Path(config_path))
    candidates.extend([
        Path("Case_Config.yaml"),
        Path("data/Case_01_Sonipat_Arms/Case_Config.yaml"),
        Path("vaults/Case_01_Sonipat_Arms/Case_Config.yaml"),
    ])
    for parent in [Path("data"), Path("vaults")]:
        if parent.exists():
            for sub in parent.iterdir():
                if sub.is_dir():
                    candidates.append(sub / "Case_Config.yaml")

    for p in candidates:
        if p.exists() and p.is_file():
            try:
                with open(p, "r", encoding="utf-8") as f:
                    data = yaml.safe_load(f)
                    if isinstance(data, dict) and data:
                        return data
            except Exception as e:
                logger.warning(f"Failed reading config at {p}: {e}")
    return {}


def get_llm_client(
    config_path: Optional[Union[str, Path]] = None,
    provider: Optional[str] = None,
    model: Optional[str] = None,
    api_key: Optional[str] = None,
    base_url: Optional[str] = None,
    num_ctx: Optional[int] = None,
) -> LLMClient:
    """
    Factory function returning the configured LLMClient.
    Priority:
    1. Explicit arguments
    2. Case_Config.yaml (keys: model_provider / provider, model_name / model)
    3. Default: Ollama (qwen2.5:3b-instruct or llama3 on http://localhost:11434)
    """
    config = load_case_config(config_path)

    chosen_provider = (
        provider
        or config.get("model_provider")
        or config.get("provider")
        or os.environ.get("LLM_PROVIDER")
        or "ollama"
    ).lower()

    if chosen_provider in ("gemini", "gemini_flash", "gemini-flash"):
        chosen_model = (
            model
            or config.get("model_name")
            or config.get("model")
            or os.environ.get("GEMINI_MODEL")
            or "gemini-2.5-flash"
        )
        resolved_key = api_key or config.get("gemini_api_key")
        return GeminiClient(api_key=resolved_key, model=chosen_model)

    # Default to Ollama
    chosen_model = (
        model
        or config.get("model_name")
        or config.get("model")
        or os.environ.get("OLLAMA_MODEL")
        or "llama3"
    )
    resolved_base_url = (
        base_url
        or config.get("ollama_base_url")
        or os.environ.get("OLLAMA_BASE_URL")
        or "http://localhost:11434"
    )
    resolved_num_ctx = (
        num_ctx
        or config.get("num_ctx")
        or 8192
    )
    return OllamaClient(base_url=resolved_base_url, model=chosen_model, num_ctx=resolved_num_ctx)
