"""
LifeLens Gemini AI Integration Service.

Connects LifeLens AI features to Google's Gemini models via the official
Google Generative Language REST API using async HTTP (httpx).

Capabilities:
1. Securely manages GEMINI_API_KEY from backend configuration (never exposed to client).
2. Grounded prompt assembly: combines LifeLens system instructions,
   retrieved personal telemetry tools, and user conversation history.
3. Robust error handling, configurable timeouts, request validation, and fallback mechanisms.
4. Streaming response generator for Server-Sent Events (SSE).
5. Health and configuration status probes.
"""

from __future__ import annotations
import json
import logging
from typing import Dict, Any, List, Optional, AsyncGenerator
import httpx

from app.config import get_settings

logger = logging.getLogger("lifelens.ai.gemini")

GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta"
DEFAULT_MODEL = "gemini-3.5-flash-lite"
REQUEST_TIMEOUT_SECONDS = 20.0
CONNECT_TIMEOUT_SECONDS = 5.0


class GeminiService:
    def __init__(self):
        self._settings = get_settings()

    @property
    def api_key(self) -> Optional[str]:
        import os
        key = getattr(self._settings, "GEMINI_API_KEY", None) or os.environ.get("GEMINI_API_KEY")
        if key and isinstance(key, str) and key.strip() and key.strip() != "":
            return key.strip()
        return None

    @property
    def model_name(self) -> str:
        model = getattr(self._settings, "LLM_MODEL", None)
        if model and isinstance(model, str) and model.strip():
            # If model name does not already start with gemini, default to gemini-1.5-flash
            clean = model.strip()
            return clean if "gemini" in clean.lower() else DEFAULT_MODEL
        return DEFAULT_MODEL

    def is_configured(self) -> bool:
        """Returns True if a non-empty Gemini API key is configured."""
        return self.api_key is not None

    def get_status(self) -> Dict[str, Any]:
        """Returns diagnostic status of Gemini integration (never leaks full secret)."""
        key = self.api_key
        masked_key = f"{key[:4]}...{key[-4:]}" if key and len(key) >= 8 else ("Set" if key else "Not Set")
        return {
            "provider": "google_gemini",
            "model": self.model_name,
            "is_configured": self.is_configured(),
            "api_key_status": masked_key,
            "status": "ready" if self.is_configured() else "awaiting_api_key",
        }

    def _format_telemetry_grounding(self, telemetry_context: List[Dict[str, Any]]) -> str:
        """Formats retrieved telemetry tool data into structured context for Gemini."""
        if not telemetry_context:
            return "No recent telemetry data available for this query."

        grounding_lines = ["--- BEGIN VERIFIED USER TELEMETRY (GROUND TRUTH) ---"]
        for item in telemetry_context:
            tool = item.get("tool", "unknown_tool")
            res = item.get("result", {})
            grounding_lines.append(f"\n[Telemetry Tool: {tool}]")
            if isinstance(res, dict):
                # Clean error states or serialize metrics
                if res.get("status") == "no_data":
                    grounding_lines.append(f"Status: {res.get('message', 'No records logged yet')}")
                else:
                    # Omit verbose raw card payloads from LLM input to conserve tokens
                    clean_res = {k: v for k, v in res.items() if k != "card"}
                    grounding_lines.append(json.dumps(clean_res, indent=2, default=str))
            else:
                grounding_lines.append(str(res))

        grounding_lines.append("\n--- END VERIFIED USER TELEMETRY ---")
        grounding_lines.append(
            "\nGROUNDING MANDATE: You MUST quote the exact numbers and deltas from the verified telemetry above. "
            "Never invent or hallucinate metrics. Never assert causation when data only shows correlation."
        )
        return "\n".join(grounding_lines)

    def _build_payload(
        self,
        system_prompt: str,
        user_query: str,
        telemetry_context: List[Dict[str, Any]],
        conversation_history: Optional[List[Dict[str, str]]] = None,
    ) -> Dict[str, Any]:
        """Constructs Google Gemini generateContent request body."""
        grounding_text = self._format_telemetry_grounding(telemetry_context)

        system_instruction = {
            "parts": [
                {
                    "text": (
                        f"{system_prompt}\n\n"
                        f"{grounding_text}\n\n"
                        "Remember: Use an empathetic, supportive, and non-judgmental tone. "
                        "Do not provide clinical diagnoses or speculative financial advice."
                    )
                }
            ]
        }

        contents: List[Dict[str, Any]] = []

        # Include prior conversation history if available (role: user or model)
        if conversation_history:
            for msg in conversation_history[-8:]:  # keep last 8 turns for context window
                role = "user" if msg.get("role") == "user" else "model"
                content_text = msg.get("content", "").strip()
                if content_text:
                    contents.append({
                        "role": role,
                        "parts": [{"text": content_text}],
                    })

        # Append current user query
        contents.append({
            "role": "user",
            "parts": [{"text": user_query}],
        })

        return {
            "system_instruction": system_instruction,
            "contents": contents,
            "generationConfig": {
                "temperature": 0.3,
                "topP": 0.85,
                "maxOutputTokens": 1024,
            },
        }

    async def generate_lifestyle_response(
        self,
        system_prompt: str,
        user_query: str,
        telemetry_context: List[Dict[str, Any]],
        conversation_history: Optional[List[Dict[str, str]]] = None,
    ) -> Optional[str]:
        """
        Calls Gemini API with validated telemetry grounding.
        Returns the generated response string, or None if unavailable or failed.
        """
        api_key = self.api_key
        if not api_key:
            logger.debug("Gemini API key is not configured. Falling back to deterministic synthesis.")
            return None

        clean_query = user_query.strip()
        if not clean_query:
            return None

        models_to_try = [self.model_name]
        fallback = "gemini-3.5-flash-lite" if self.model_name != "gemini-3.5-flash-lite" else "gemini-3.1-flash-lite"
        if fallback not in models_to_try:
            models_to_try.append(fallback)

        payload = self._build_payload(system_prompt, clean_query, telemetry_context, conversation_history)
        timeout = httpx.Timeout(REQUEST_TIMEOUT_SECONDS, connect=CONNECT_TIMEOUT_SECONDS)

        for model in models_to_try:
            url = f"{GEMINI_BASE_URL}/models/{model}:generateContent?key={api_key}"
            try:
                async with httpx.AsyncClient(timeout=timeout) as client:
                    response = await client.post(
                        url,
                        json=payload,
                        headers={"Content-Type": "application/json"},
                    )

                    if response.status_code == 200:
                        data = response.json()
                        candidates = data.get("candidates", [])
                        if candidates and len(candidates) > 0:
                            parts = candidates[0].get("content", {}).get("parts", [])
                            if parts and len(parts) > 0:
                                generated_text = parts[0].get("text", "").strip()
                                if generated_text:
                                    logger.info(f"Gemini ({model}) generated response ({len(generated_text)} chars)")
                                    return generated_text
                        logger.warning(f"Gemini ({model}) returned 200 OK but candidate text was empty.")
                        return None

                    elif response.status_code in (401, 403) or (
                        response.status_code == 400 and "API_KEY_INVALID" in response.text
                    ):
                        logger.error(
                            f"Gemini authentication failed (HTTP {response.status_code}): Invalid or inactive GEMINI_API_KEY."
                        )
                        return None
                    elif response.status_code == 429:
                        logger.warning("Gemini rate limit / quota exceeded (HTTP 429). Falling back to deterministic synthesis.")
                        return None
                    elif response.status_code in (503, 404):
                        logger.warning(f"Gemini model {model} returned HTTP {response.status_code}. Attempting fallback model.")
                        continue
                    else:
                        logger.warning(
                            f"Gemini API returned HTTP {response.status_code}: {response.text[:200]}"
                        )
                        return None

            except httpx.TimeoutException:
                logger.warning(f"Gemini API request timed out for {model}. Attempting fallback.")
                continue
            except httpx.RequestError as exc:
                logger.warning(f"Gemini HTTP connection error for {model}: {exc}.")
                continue
            except Exception as exc:
                logger.exception(f"Unexpected error calling Gemini API: {exc}")
                return None

        return None

    async def stream_lifestyle_response(
        self,
        system_prompt: str,
        user_query: str,
        telemetry_context: List[Dict[str, Any]],
        conversation_history: Optional[List[Dict[str, str]]] = None,
    ) -> AsyncGenerator[str, None]:
        """
        Streams response chunks from Gemini streamGenerateContent.
        Yields text deltas as they arrive.
        """
        api_key = self.api_key
        if not api_key:
            return

        model = self.model_name
        url = f"{GEMINI_BASE_URL}/models/{model}:streamGenerateContent?key={api_key}&alt=sse"
        payload = self._build_payload(system_prompt, user_query, telemetry_context, conversation_history)
        timeout = httpx.Timeout(REQUEST_TIMEOUT_SECONDS, connect=CONNECT_TIMEOUT_SECONDS)

        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                async with client.stream("POST", url, json=payload, headers={"Content-Type": "application/json"}) as resp:
                    if resp.status_code != 200:
                        logger.warning(f"Gemini streaming failed with HTTP {resp.status_code}")
                        return

                    async for line in resp.aiter_lines():
                        if line.startswith("data: "):
                            raw_data = line[6:].strip()
                            if raw_data:
                                try:
                                    chunk = json.loads(raw_data)
                                    candidates = chunk.get("candidates", [])
                                    if candidates:
                                        parts = candidates[0].get("content", {}).get("parts", [])
                                        if parts:
                                            text_part = parts[0].get("text", "")
                                            if text_part:
                                                yield text_part
                                except json.JSONDecodeError:
                                    continue
        except Exception as e:
            logger.warning(f"Gemini streaming error: {e}")
            return


# Singleton instance
gemini_service = GeminiService()
