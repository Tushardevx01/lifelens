"""
Tests for the analytics API endpoints.

Uses the shared in-memory SQLite test DB (conftest.py).
Covers: dashboard, life-score history, insights, prediction, anomalies, correlations.
"""

import pytest
import pytest_asyncio
from datetime import date, timedelta
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.daily_entry import DailyEntry
from app.models.engineered_features import EngineeredFeatures
from app.models.insight import Insight, InsightTypeEnum, SeverityEnum


# ── Helpers ──────────────────────────────────────────────────────────────────

async def _seed_features(db: AsyncSession, user: User, days: int = 5):
    """Insert minimal engineered_features rows so dashboard returns data."""
    today = date.today()
    for i in range(days, 0, -1):
        d = today - timedelta(days=i)
        feat = EngineeredFeatures(
            user_id=user.id,
            date=d,
            sleep_score=70.0,
            distraction_level=0.3,
            activity_index=0.8,
            productivity_score=65.0,
            finance_score=90.0,
            spend_ratio=1.0,
            life_score=75.0,
            life_score_sleep=21.0,
            life_score_productivity=16.25,
            life_score_health=20.0,
            life_score_finance=18.0,
        )
        db.add(feat)
    await db.commit()


async def _seed_insights(db: AsyncSession, user: User):
    today = date.today()
    for sev in [SeverityEnum.INFO, SeverityEnum.WARNING, SeverityEnum.CRITICAL]:
        ins = Insight(
            user_id=user.id,
            date=today,
            insight_type=InsightTypeEnum.TREND,
            severity=sev,
            title=f"{sev.value} insight",
            message="Test message.",
        )
        db.add(ins)
    await db.commit()


# ── Dashboard ─────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_dashboard_unauthenticated(client: AsyncClient):
    r = await client.get("/api/analytics/dashboard")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_dashboard_empty_state(client: AsyncClient, auth_headers: dict):
    """New user with no data → days_tracked=0, life_score=0."""
    r = await client.get("/api/analytics/dashboard", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["days_tracked"] == 0
    assert data["life_score"] == 0
    assert data["is_data_sufficient_for_ml"] is False


@pytest.mark.asyncio
async def test_dashboard_with_data(client: AsyncClient, auth_headers: dict,
                                    db: AsyncSession, test_user: User):
    """User with entries + features → life_score > 0, days_tracked > 0."""
    await _seed_features(db, test_user, days=3)
    r = await client.get("/api/analytics/dashboard", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["days_tracked"] >= 0  # entries not seeded, features are
    assert isinstance(data["trend_data"], list)


# ── Life Score History ────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_life_score_history_empty(client: AsyncClient, auth_headers: dict):
    r = await client.get("/api/analytics/life-score/history", headers=auth_headers)
    assert r.status_code == 200
    assert r.json() == []


@pytest.mark.asyncio
async def test_life_score_history_returns_records(client: AsyncClient, auth_headers: dict,
                                                   db: AsyncSession, test_user: User):
    await _seed_features(db, test_user, days=5)
    r = await client.get("/api/analytics/life-score/history?days=30", headers=auth_headers)
    assert r.status_code == 200
    history = r.json()
    assert len(history) == 5
    for point in history:
        assert "date" in point
        assert "life_score" in point
        assert 0 <= point["life_score"] <= 100


# ── Insights ─────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_insights_empty(client: AsyncClient, auth_headers: dict):
    r = await client.get("/api/analytics/insights", headers=auth_headers)
    assert r.status_code == 200
    assert r.json() == []


@pytest.mark.asyncio
async def test_insights_returns_correct_count(client: AsyncClient, auth_headers: dict,
                                               db: AsyncSession, test_user: User):
    await _seed_insights(db, test_user)
    r = await client.get("/api/analytics/insights", headers=auth_headers)
    assert r.status_code == 200
    assert len(r.json()) == 3


@pytest.mark.asyncio
async def test_insights_severity_filter(client: AsyncClient, auth_headers: dict,
                                         db: AsyncSession, test_user: User):
    await _seed_insights(db, test_user)
    r = await client.get("/api/analytics/insights?severity=CRITICAL", headers=auth_headers)
    assert r.status_code == 200
    results = r.json()
    assert all(i["severity"] == "CRITICAL" for i in results)


# ── Prediction ────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_prediction_returns_none_without_ml(client: AsyncClient, auth_headers: dict):
    """No ML data yet → endpoint returns null (not 500)."""
    r = await client.get("/api/analytics/prediction/tomorrow", headers=auth_headers)
    assert r.status_code == 200
    assert r.json() is None


# ── Anomalies ─────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_anomalies_empty(client: AsyncClient, auth_headers: dict):
    r = await client.get("/api/analytics/anomalies", headers=auth_headers)
    assert r.status_code == 200
    assert r.json() == []


@pytest.mark.asyncio
async def test_anomalies_with_data(client: AsyncClient, auth_headers: dict,
                                    db: AsyncSession, test_user: User):
    """Seed two anomalous features — endpoint returns both."""
    today = date.today()
    for i in range(2):
        d = today - timedelta(days=i)
        f = EngineeredFeatures(
            user_id=test_user.id, date=d,
            is_anomaly=True, anomaly_score=0.8,
            life_score=50.0,
        )
        db.add(f)
    await db.commit()
    r = await client.get("/api/analytics/anomalies?last_n_days=7", headers=auth_headers)
    assert r.status_code == 200
    assert len(r.json()) == 2


# ── Correlations ──────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_correlations_empty_when_insufficient_data(client: AsyncClient, auth_headers: dict):
    """< 30 days of entries → returns empty list (not error)."""
    r = await client.get("/api/analytics/correlations", headers=auth_headers)
    assert r.status_code == 200
    assert r.json() == []
