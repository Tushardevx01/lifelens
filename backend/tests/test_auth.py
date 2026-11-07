"""
Integration tests for authentication endpoints.
"""

import pytest
from httpx import AsyncClient


pytestmark = pytest.mark.asyncio


class TestRegister:
    async def test_register_creates_user_and_returns_token(self, client: AsyncClient):
        resp = await client.post("/api/auth/register", json={
            "email": "new@lifelens.ai",
            "password": "StrongPass1!",
            "full_name": "New User",
        })
        assert resp.status_code == 201, f"Expected 201, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    async def test_duplicate_email_returns_409(self, client: AsyncClient):
        payload = {"email": "dup@lifelens.ai", "password": "StrongPass1!", "full_name": "Dup"}
        await client.post("/api/auth/register", json=payload)
        resp = await client.post("/api/auth/register", json=payload)
        assert resp.status_code == 409

    async def test_register_invalid_email_rejected(self, client: AsyncClient):
        resp = await client.post("/api/auth/register", json={
            "email": "notanemail",
            "password": "StrongPass1!",
        })
        assert resp.status_code == 422



class TestLogin:
    async def test_login_returns_token(self, client: AsyncClient, test_user):
        resp = await client.post("/api/auth/login", data={
            "username": test_user.email,
            "password": "TestPass1!",
        })
        assert resp.status_code == 200
        assert "access_token" in resp.json()

    async def test_wrong_password_returns_401(self, client: AsyncClient, test_user):
        resp = await client.post("/api/auth/login", data={
            "username": test_user.email,
            "password": "WrongPassword!",
        })
        assert resp.status_code == 401

    async def test_wrong_email_returns_401(self, client: AsyncClient):
        resp = await client.post("/api/auth/login", data={
            "username": "nobody@lifelens.ai",
            "password": "StrongPass1!",
        })
        assert resp.status_code == 401


class TestGetMe:
    async def test_get_me_returns_user_info(self, client: AsyncClient, auth_headers: dict, test_user):
        resp = await client.get("/api/auth/me", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == test_user.email

    async def test_get_me_requires_auth(self, client: AsyncClient):
        resp = await client.get("/api/auth/me")
        assert resp.status_code in (401, 403)

    async def test_get_me_invalid_token_returns_401(self, client: AsyncClient):
        resp = await client.get("/api/auth/me", headers={"Authorization": "Bearer fake.token.here"})
        assert resp.status_code == 401
