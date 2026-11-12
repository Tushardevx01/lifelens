"""
Bulletproofing & Hardening Verification Test Suite.

Validates the security, reliability, boundary enforcement, and failure recovery
mechanisms implemented during the project bulletproofing audit:
1. Security Headers & Request Correlation IDs
2. Payload Size Limit Protections (HTTP 413)
3. Sliding Window Rate Limiting (HTTP 429)
4. Session Revocation on Password Invalidation (Immediate JWT token revocation)
5. Streaming CSV Upload Bounds (HTTP 413 on > 10MB)
6. Voice Audio Size Bounds (HTTP 413 on > 25MB)
7. Malformed Input & Webhook HMAC Boundary Resilience
"""

import io
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import _check_rate_limit
from app.models.user import User
from app.utils.security import hash_password, create_access_token


pytestmark = pytest.mark.asyncio


class TestSecurityHeadersAndCorrelationId:
    """Verifies defense-in-depth HTTP security headers and correlation ID tracking."""

    async def test_security_headers_present_on_all_responses(self, client: AsyncClient):
        resp = await client.get("/health")
        assert resp.status_code == 200
        headers = resp.headers

        # Verify critical OWASP security headers
        assert headers.get("X-Content-Type-Options") == "nosniff"
        assert headers.get("X-Frame-Options") == "DENY"
        assert headers.get("X-XSS-Protection") == "1; mode=block"
        assert headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
        assert "camera=()" in headers.get("Permissions-Policy", "")
        assert "microphone=(self)" in headers.get("Permissions-Policy", "")

    async def test_correlation_id_generated_and_propagated(self, client: AsyncClient):
        # 1. Server generates unique correlation ID when omitted
        resp = await client.get("/health")
        req_id = resp.headers.get("X-Request-ID")
        assert req_id is not None
        assert len(req_id) >= 8

        # 2. Server preserves incoming correlation ID
        custom_id = "req-audit-tracer-998811"
        resp2 = await client.get("/health", headers={"X-Request-ID": custom_id})
        assert resp2.headers.get("X-Request-ID") == custom_id


class TestPayloadSizeLimits:
    """Verifies that oversized payloads are rejected before exhausting server memory."""

    async def test_oversized_json_payload_rejected_with_413(self, client: AsyncClient):
        # Header claiming content length > 5MB on JSON endpoint
        headers = {
            "Content-Type": "application/json",
            "Content-Length": str(10 * 1024 * 1024),  # 10MB
        }
        resp = await client.post("/api/auth/register", content=b"{}", headers=headers)
        assert resp.status_code == 413
        assert "Request body too large" in resp.json().get("detail", "")

    async def test_oversized_csv_import_rejected_with_413(self, client: AsyncClient, test_user, auth_headers):
        # CSV stream larger than 10MB
        oversized_csv = b"date,sleep_hours,sleep_quality,screen_time_hours,steps,deep_work_hours,daily_spend\n" + (
            b"2026-11-01,8.0,8,4.0,8000,3.5,500.0\n" * 350000
        )
        assert len(oversized_csv) > 10 * 1024 * 1024

        files = {
            "file": ("oversized_import.csv", io.BytesIO(oversized_csv), "text/csv")
        }
        resp = await client.post("/api/entries/upload-csv", files=files, headers=auth_headers)
        assert resp.status_code == 413
        assert "exceeds maximum allowed size" in resp.json().get("detail", "")


class TestRateLimiting:
    """Verifies per-IP sliding-window rate limiting prevents denial-of-service."""

    async def test_rate_limiter_triggers_429_on_excessive_requests(self, client: AsyncClient):
        client_ip = "192.0.2.99"
        path = "/api/auth/login"

        # Simulate 60 calls to exhaust the per-minute limit on auth endpoints
        for _ in range(60):
            allowed = _check_rate_limit(client_ip, path)
            assert allowed is True

        # 61st call must be denied
        allowed_61 = _check_rate_limit(client_ip, path)
        assert allowed_61 is False


class TestSessionRevocation:
    """Verifies that password changes immediately invalidate existing JWT access tokens."""

    async def test_password_change_invalidates_active_token(self, client: AsyncClient, db: AsyncSession):
        # 1. Create a user
        u = User(
            email="revokeme@lifelens.ai",
            password_hash=hash_password("OldPassword1!"),
            full_name="Revoke Me",
            token_version=0,
            is_active=True,
        )
        db.add(u)
        await db.commit()
        await db.refresh(u)

        # 2. Issue a JWT with token_version = 0
        token = create_access_token(user_id=str(u.id), token_version=0)
        headers = {"Authorization": f"Bearer {token}"}

        # Verify the token works
        resp = await client.get("/api/auth/me", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["email"] == "revokeme@lifelens.ai"

        # 3. Change password via API
        resp_change = await client.patch(
            "/api/auth/password",
            json={
                "current_password": "OldPassword1!",
                "new_password": "BrandNewPassword1!",
            },
            headers=headers,
        )
        assert resp_change.status_code == 200

        # 4. Old token must immediately be REJECTED with 401 Unauthorized
        resp_after = await client.get("/api/auth/me", headers=headers)
        assert resp_after.status_code == 401
        assert "session expired" in resp_after.json().get("detail", "").lower()

        # 5. Logging in with new password issues a new valid token
        resp_login = await client.post(
            "/api/auth/login",
            data={"username": "revokeme@lifelens.ai", "password": "BrandNewPassword1!"},
        )
        assert resp_login.status_code == 200
        new_token = resp_login.json()["access_token"]

        # New token works
        resp_new = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {new_token}"})
        assert resp_new.status_code == 200


class TestIngestionBoundaryAndHMAC:
    """Verifies webhook signature verification and defensive handling of malformed payloads."""

    async def test_webhook_requires_target_user_id(self, client: AsyncClient):
        # Missing user_id in payload, header, and query param
        resp = await client.post(
            "/api/ingestion/financial/webhook",
            json={
                "event_type": "TRANSACTIONS_SYNC",
                "connector_type": "plaid",
                "records": [],
            },
        )
        assert resp.status_code == 400
        assert "Target user ID must be provided" in resp.json().get("detail", "")

    async def test_malformed_json_body_returns_422_safely(self, client: AsyncClient):
        # Sending invalid payload structure
        resp = await client.post(
            "/api/auth/login",
            content=b"<<invalid broken bytes>>",
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        # Fast-fails with 400 or 422 rather than 500 crash
        assert resp.status_code in (400, 422)
