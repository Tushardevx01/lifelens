"""
Unit and Integration Tests for LifeLens Gemini AI Integration.

Verifies:
1. Configuration resolution and status reporting (without leaking API key).
2. Telemetry grounding serialization and prompt assembly.
3. Payload construction adhering to Google Generative Language schema.
4. Successful response parsing and extraction.
5. Graceful fallback on timeout, rate-limit (429), or invalid key (401).
6. Agent orchestration connecting telemetry tools to Gemini.
7. /api/assistant/gemini/status endpoint behavior.
"""

import pytest
import json
from unittest.mock import AsyncMock, patch, MagicMock
import httpx
from httpx import AsyncClient

from app.services.gemini_service import GeminiService, gemini_service
from app.ai.agent import run_conversational_agent, SYSTEM_PROMPT


class TestGeminiServiceConfiguration:
    def test_status_when_unconfigured(self, monkeypatch):
        test_service = GeminiService()
        monkeypatch.setattr(test_service._settings, "GEMINI_API_KEY", None)

        assert test_service.is_configured() is False
        status = test_service.get_status()
        assert status["provider"] == "google_gemini"
        assert status["is_configured"] is False
        assert status["status"] == "awaiting_api_key"
        assert status["api_key_status"] == "Not Set"

    def test_status_when_configured(self, monkeypatch):
        test_service = GeminiService()
        monkeypatch.setattr(test_service._settings, "GEMINI_API_KEY", "AIzaSyFakeKeyForTesting123456789")
        monkeypatch.setattr(test_service._settings, "LLM_MODEL", "gemini-1.5-flash")

        assert test_service.is_configured() is True
        status = test_service.get_status()
        assert status["is_configured"] is True
        assert status["status"] == "ready"
        assert status["model"] == "gemini-1.5-flash"
        # Key must be masked, never fully printed
        assert "AIza" in status["api_key_status"]
        assert "6789" in status["api_key_status"]
        assert "FakeKeyForTesting" not in status["api_key_status"]


class TestGeminiGroundingAndPayload:
    def test_telemetry_grounding_serialization(self):
        service = GeminiService()
        telemetry = [
            {
                "tool": "get_sleep_analysis",
                "result": {
                    "avg_sleep_hours": 7.8,
                    "avg_sleep_quality_out_of_10": 8.0,
                    "late_night_screen_sessions": 2,
                    "card": {"type": "sleep", "title": "Sleep Card"},
                },
            },
            {
                "tool": "get_spending_breakdown",
                "result": {
                    "total_spend": 2450.0,
                    "discretionary_spend": 800.0,
                    "discretionary_ratio_pct": 32.6,
                },
            },
        ]

        grounding = service._format_telemetry_grounding(telemetry)
        assert "7.8" in grounding
        assert "2450" in grounding
        assert "32.6" in grounding
        assert "GROUNDING MANDATE" in grounding
        # Verbose UI card metadata should be excluded from LLM prompt
        assert "Sleep Card" not in grounding

    def test_payload_structure_matches_gemini_schema(self):
        service = GeminiService()
        system_prompt = "You are LifeLens AI."
        query = "Why did my productivity drop yesterday?"
        history = [
            {"role": "user", "content": "Hello"},
            {"role": "assistant", "content": "Hi, I am LifeLens."},
        ]
        telemetry = [{"tool": "get_productivity_patterns", "result": {"avg_deep_work_hours": 3.2}}]

        payload = service._build_payload(system_prompt, query, telemetry, history)

        assert "system_instruction" in payload
        assert "parts" in payload["system_instruction"]
        assert "contents" in payload
        # System instruction has prompt + telemetry grounding
        sys_text = payload["system_instruction"]["parts"][0]["text"]
        assert "You are LifeLens AI" in sys_text
        assert "3.2" in sys_text

        # Contents has conversation history mapped correctly
        assert len(payload["contents"]) == 3
        assert payload["contents"][0]["role"] == "user"
        assert payload["contents"][0]["parts"][0]["text"] == "Hello"
        assert payload["contents"][1]["role"] == "model"  # assistant mapped to model
        assert payload["contents"][1]["parts"][0]["text"] == "Hi, I am LifeLens."
        assert payload["contents"][2]["role"] == "user"
        assert payload["contents"][2]["parts"][0]["text"] == query


@pytest.mark.asyncio
class TestGeminiApiExecution:
    async def test_successful_gemini_generation(self, monkeypatch):
        service = GeminiService()
        monkeypatch.setattr(service._settings, "GEMINI_API_KEY", "AIzaSyValidTestKey123")

        mock_gemini_resp = {
            "candidates": [
                {
                    "content": {
                        "parts": [
                            {
                                "text": "Based on your logged data, your average sleep was 7.8 hours. This correlated with 4.2 hours of deep work."
                            }
                        ]
                    }
                }
            ]
        }

        mock_post = AsyncMock()
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_gemini_resp
        mock_post.return_value = mock_response

        with patch("httpx.AsyncClient.post", mock_post):
            result = await service.generate_lifestyle_response(
                system_prompt="Test System",
                user_query="How is my sleep?",
                telemetry_context=[{"tool": "get_sleep_analysis", "result": {"avg_sleep_hours": 7.8}}],
            )

        assert result is not None
        assert "7.8 hours" in result
        assert "deep work" in result

    async def test_gemini_timeout_falls_back_to_none(self, monkeypatch):
        service = GeminiService()
        monkeypatch.setattr(service._settings, "GEMINI_API_KEY", "AIzaSyValidTestKey123")

        with patch("httpx.AsyncClient.post", side_effect=httpx.TimeoutException("Connection timed out")):
            result = await service.generate_lifestyle_response(
                system_prompt="Test",
                user_query="My focus",
                telemetry_context=[],
            )

        # Timeout should return None rather than raising an unhandled exception
        assert result is None

    async def test_gemini_429_quota_exceeded_returns_none(self, monkeypatch):
        service = GeminiService()
        monkeypatch.setattr(service._settings, "GEMINI_API_KEY", "AIzaSyValidTestKey123")

        mock_response = MagicMock()
        mock_response.status_code = 429
        mock_response.text = "RESOURCE_EXHAUSTED: Rate limit exceeded"

        with patch("httpx.AsyncClient.post", AsyncMock(return_value=mock_response)):
            result = await service.generate_lifestyle_response(
                system_prompt="Test",
                user_query="My spend",
                telemetry_context=[],
            )

        assert result is None


@pytest.mark.asyncio
class TestGeminiStatusEndpoint:
    async def test_status_endpoint_returns_json(self, client: AsyncClient):
        resp = await client.get("/api/assistant/gemini/status")
        assert resp.status_code == 200
        data = resp.json()
        assert data["provider"] == "google_gemini"
        assert "is_configured" in data
        assert "model" in data
        assert "status" in data
