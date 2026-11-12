"""Regression tests for assistant telemetry tools against a real database."""

from datetime import date, datetime, time, timedelta, timezone

import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.tools import execute_tool
from app.models.daily_entry import DailyEntry
from app.models.engineered_features import EngineeredFeatures
from app.models.experiment import Experiment
from app.models.insight import Insight, InsightTypeEnum, SeverityEnum
from app.models.telemetry import (
    AppUsageSession,
    FinancialTransaction,
    FocusStudySession,
)
from app.ml.experiment_evaluator import ExperimentStatusEnum


def _daily_entry(user_id: uuid.UUID, entry_date: date) -> DailyEntry:
    return DailyEntry(
        user_id=user_id,
        date=entry_date,
        sleep_hours=7.5,
        sleep_quality=4,
        sleep_bedtime=time(23, 0),
        screen_time_hours=3.0,
        steps=8500,
        deep_work_hours=4.0,
        tasks_completed=5,
        daily_spend=500.0,
    )


async def _seed(db: AsyncSession, user_id: uuid.UUID) -> None:
    now = datetime.now(timezone.utc)
    today = date.today()

    db.add(_daily_entry(user_id, today))
    db.add(
        FinancialTransaction(
            user_id=user_id,
            amount=250.0,
            category="Food & Dining",
            merchant="Cafe",
            timestamp=now - timedelta(days=1),
            is_discretionary=True,
        )
    )
    db.add(
        AppUsageSession(
            user_id=user_id,
            app_name="YouTube",
            app_category="Entertainment",
            duration_minutes=30,
            start_time=now - timedelta(hours=2),
            is_late_night=True,
        )
    )
    db.add(
        FocusStudySession(
            user_id=user_id,
            subject_or_task="Deep Work",
            start_time=now - timedelta(hours=4),
            end_time=now - timedelta(hours=2),
            duration_minutes=120,
            self_reported_focus=4,
            distraction_count=2,
        )
    )
    db.add(
        EngineeredFeatures(
            user_id=user_id,
            date=today,
            sleep_score=80.0,
            productivity_score=70.0,
            activity_index=0.85,
            finance_score=60.0,
            life_score=74.5,
        )
    )
    db.add(
        Insight(
            user_id=user_id,
            date=today,
            insight_type=InsightTypeEnum.ANOMALY,
            severity=SeverityEnum.WARNING,
            title="Late-night screen spike",
            message="Your late-night screen time was above your usual range.",
        )
    )
    db.add(
        Experiment(
            user_id=user_id,
            title="Digital Sunset",
            hypothesis="No screens before bed improves sleep",
            target_metric="sleep_hours",
            desired_direction="INCREASE",
            intervention_rule="No screens after 22:30",
            duration_days=7,
            start_date=today,
            end_date=today + timedelta(days=7),
            baseline_start=today - timedelta(days=7),
            baseline_end=today,
            status=ExperimentStatusEnum.ACTIVE,
        )
    )
    await db.flush()


@pytest.mark.parametrize(
    "tool_name,args",
    [
        ("get_sleep_analysis", {"days": 14}),
        ("get_spending_breakdown", {"timeframe": "30d"}),
        ("get_productivity_patterns", {"days": 14}),
        ("get_active_experiments", {}),
        ("get_anomalies_and_clusters", {"days": 14}),
        ("get_life_score_overview", {}),
    ],
)
async def test_each_tool_executes_with_string_user_id(
    db: AsyncSession, test_user, tool_name: str, args: dict
):
    await _seed(db, test_user.id)

    result = await execute_tool(tool_name, args, db=db, user_id=str(test_user.id))

    assert "error" not in result, result
    assert result.get("card") is not None


async def test_sleep_quality_is_reported_on_ten_point_scale(db: AsyncSession, test_user):
    await _seed(db, test_user.id)

    result = await execute_tool(
        "get_sleep_analysis", {"days": 14}, db=db, user_id=str(test_user.id)
    )

    assert result["avg_sleep_quality_out_of_10"] == 8.0


async def test_life_score_uses_stored_features(db: AsyncSession, test_user):
    await _seed(db, test_user.id)

    result = await execute_tool(
        "get_life_score_overview", {}, db=db, user_id=str(test_user.id)
    )

    assert result["composite_lifescore"] == 74.5
    assert result["sleep_score"] == 80.0
    assert result["productivity_score"] == 70.0
    assert result["health_score"] == 85.0
    assert result["finance_score"] == 60.0


async def test_assistant_chat_reports_real_score(
    client: AsyncClient, db: AsyncSession, test_user, auth_headers
):
    await _seed(db, test_user.id)

    response = await client.post(
        "/api/assistant/chat",
        json={"message": "Give me a LifeScore overview"},
        headers=auth_headers,
    )

    assert response.status_code == 200, response.text
    content = response.json()["content"]
    assert "74.5/100" in content
    assert "LifeScore is 0/100" not in content


async def test_assistant_chat_does_not_invent_data(
    client: AsyncClient, test_user, auth_headers
):
    response = await client.post(
        "/api/assistant/chat",
        json={"message": "Give me a LifeScore overview"},
        headers=auth_headers,
    )

    assert response.status_code == 200, response.text
    content = response.json()["content"]
    assert "No LifeScore has been computed" in content
    assert "LifeScore is 0/100" not in content
