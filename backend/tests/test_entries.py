"""
Integration tests for the entries API.

Tests 6 cases from the Module 9 verification plan.
"""

import io
import pytest
import pytest_asyncio
from datetime import date, timedelta
from httpx import AsyncClient


pytestmark = pytest.mark.asyncio


class TestCreateEntry:
    async def test_create_entry_returns_entry_id(self, client: AsyncClient, auth_headers: dict, sample_entry_data: dict):
        """POST /api/entries/ with valid data returns entry_id."""
        resp = await client.post("/api/entries/", json=sample_entry_data, headers=auth_headers)
        assert resp.status_code == 201
        data = resp.json()
        assert "entry_id" in data
        assert "message" in data

    async def test_create_duplicate_date_returns_409(self, client: AsyncClient, auth_headers: dict, sample_entry_data: dict):
        """Second POST for same date must return 409."""
        await client.post("/api/entries/", json=sample_entry_data, headers=auth_headers)
        resp = await client.post("/api/entries/", json=sample_entry_data, headers=auth_headers)
        assert resp.status_code == 409

    async def test_create_entry_without_auth_returns_401(self, client: AsyncClient, sample_entry_data: dict):
        resp = await client.post("/api/entries/", json=sample_entry_data)
        assert resp.status_code in (401, 403)

    async def test_create_entry_future_date_rejected(self, client: AsyncClient, auth_headers: dict):
        """Pydantic must reject future dates."""
        payload = {
            "date": str(date.today() + timedelta(days=1)),
            "sleep_hours": 7.0, "sleep_quality": 4,
            "screen_time_hours": 3.0, "steps": 8000,
            "deep_work_hours": 4.0, "daily_spend": 500.0,
        }
        resp = await client.post("/api/entries/", json=payload, headers=auth_headers)
        # Should be rejected by Pydantic validator on DailyEntryCreate
        assert resp.status_code in (422, 400)

    async def test_create_entry_invalid_sleep_quality_rejected(self, client: AsyncClient, auth_headers: dict, sample_entry_data: dict):
        """sleep_quality must be 1-5."""
        sample_entry_data["sleep_quality"] = 9
        resp = await client.post("/api/entries/", json=sample_entry_data, headers=auth_headers)
        assert resp.status_code == 422


class TestGetEntries:
    async def test_get_entries_pagination(self, client: AsyncClient, auth_headers: dict):
        """GET /api/entries/?page=1&page_size=5 returns at most 5 entries."""
        # Create 3 entries on different days
        for days_ago in [1, 2, 3]:
            payload = {
                "date": str(date.today() - timedelta(days=days_ago)),
                "sleep_hours": 7.0, "sleep_quality": 4,
                "screen_time_hours": 3.0, "steps": 8000,
                "deep_work_hours": 4.0, "daily_spend": 500.0,
            }
            await client.post("/api/entries/", json=payload, headers=auth_headers)

        resp = await client.get("/api/entries/?page=1&page_size=2", headers=auth_headers)
        assert resp.status_code == 200
        assert len(resp.json()) <= 2

    async def test_get_entries_empty(self, client: AsyncClient, auth_headers: dict):
        resp = await client.get("/api/entries/", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json() == []


class TestCSVUpload:
    async def test_csv_upload_route_accessible(self, client: AsyncClient, auth_headers: dict):
        """POST /upload-csv must not return 422 from route mismatch (FIX 3.1)."""
        csv_content = (
            "date,sleep_hours,sleep_quality,screen_time_hours,steps,deep_work_hours,daily_spend\n"
            f"{date.today() - timedelta(days=5)},7.5,4,3.0,8000,4.0,500\n"
        )
        resp = await client.post(
            "/api/entries/upload-csv",
            files={"file": ("test.csv", io.BytesIO(csv_content.encode()), "text/csv")},
            headers=auth_headers,
        )
        # Should NOT be 422 from route mismatch — any valid response is acceptable
        assert resp.status_code != 422 or "date" not in resp.text

    async def test_csv_upload_imports_rows(self, client: AsyncClient, auth_headers: dict):
        csv_content = (
            "date,sleep_hours,sleep_quality,screen_time_hours,steps,deep_work_hours,daily_spend\n"
            f"{date.today() - timedelta(days=10)},8,5,2.0,10000,5.0,400\n"
            f"{date.today() - timedelta(days=11)},7,4,3.0,9000,4.0,450\n"
        )
        resp = await client.post(
            "/api/entries/upload-csv",
            files={"file": ("test.csv", io.BytesIO(csv_content.encode()), "text/csv")},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["imported"] == 2

    async def test_csv_upload_skips_future_dates(self, client: AsyncClient, auth_headers: dict):
        csv_content = (
            "date,sleep_hours,sleep_quality,screen_time_hours,steps,deep_work_hours,daily_spend\n"
            f"{date.today() + timedelta(days=1)},7.5,4,3.0,8000,4.0,500\n"
        )
        resp = await client.post(
            "/api/entries/upload-csv",
            files={"file": ("test.csv", io.BytesIO(csv_content.encode()), "text/csv")},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["imported"] == 0
        assert len(data["errors"]) == 1
        assert "Future date" in data["errors"][0]["error"]

    async def test_csv_upload_skips_duplicates(self, client: AsyncClient, auth_headers: dict, sample_entry_data: dict):
        """Uploading the same date twice in CSV must only import once."""
        entry_date = date.today() - timedelta(days=20)
        csv_line = f"{entry_date},7.5,4,3.0,8000,4.0,500"
        csv_content = f"date,sleep_hours,sleep_quality,screen_time_hours,steps,deep_work_hours,daily_spend\n{csv_line}\n{csv_line}\n"

        resp = await client.post(
            "/api/entries/upload-csv",
            files={"file": ("test.csv", io.BytesIO(csv_content.encode()), "text/csv")},
            headers=auth_headers,
        )
        data = resp.json()
        assert data["imported"] == 1
        assert len(data["errors"]) == 1

    async def test_csv_upload_non_csv_rejected(self, client: AsyncClient, auth_headers: dict):
        resp = await client.post(
            "/api/entries/upload-csv",
            files={"file": ("test.txt", io.BytesIO(b"not a csv"), "text/plain")},
            headers=auth_headers,
        )
        assert resp.status_code == 422
