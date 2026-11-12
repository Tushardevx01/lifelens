"""Regression tests for audit-confirmed defects.

Each test targets a concrete failure that was reproduced or code-traced during
the audit, so a future regression fails loudly instead of fabricating data.
"""

import hashlib
import hmac
import json
import uuid
from datetime import date, datetime, timedelta, timezone

import pytest
from httpx import AsyncClient
from sqlalchemy import select, case, cast, String
from sqlalchemy.dialects import postgresql

from app.ai.voice_utils import generate_synthesized_wav
from app.config import get_settings
from app.ml.insight_engine import _rule_perfect_day, _rule_streak_detection
from app.models.engineered_features import EngineeredFeatures
from app.models.insight import Insight
from app.services import assistant_service, voice_service


def _entry_payload(day: date, **overrides) -> dict:
    payload = {
        "date": str(day),
        "sleep_hours": 7.5,
        "sleep_quality": 4,
        "screen_time_hours": 3.0,
        "steps": 8500,
        "deep_work_hours": 4.0,
        "daily_spend": 500.0,
        "mood_score": 7,
        "energy_level": 5,
    }
    payload.update(overrides)
    return payload


@pytest.mark.asyncio
async def test_dashboard_components_are_normalized_scores(client: AsyncClient, auth_headers: dict):
    today = date.today()
    payload = _entry_payload(
        today,
        sleep_hours=8.0,
        sleep_quality=5,
        screen_time_hours=2.0,
        steps=10000,
        deep_work_hours=8.0,
        daily_spend=500.0,
    )
    created = await client.post("/api/entries/", json=payload, headers=auth_headers)
    assert created.status_code == 201, created.text

    res = await client.get("/api/analytics/dashboard", headers=auth_headers)
    assert res.status_code == 200, res.text
    components = res.json()["life_score_components"]

    # Domain scores are 0–100, not weighted point contributions.
    assert components["sleep"] == 100.0
    assert components["productivity"] == 90.0
    assert components["health"] == 100.0
    assert components["finance"] == 100.0
    for key in ("sleep", "productivity", "health", "finance"):
        assert 0.0 <= components[key] <= 100.0


@pytest.mark.asyncio
async def test_delete_transaction_recomputes_daily_spend(client: AsyncClient, auth_headers: dict):
    now = datetime.now(timezone.utc).isoformat()
    tx = await client.post(
        "/api/telemetry/transactions",
        json={
            "amount": 321.0,
            "category": "Food & Dining",
            "merchant": "Test Cafe",
            "timestamp": now,
            "is_discretionary": True,
        },
        headers=auth_headers,
    )
    assert tx.status_code == 201, tx.text

    today = datetime.now(timezone.utc).date()
    before = await client.get(f"/api/entries/{today}", headers=auth_headers)
    assert before.status_code == 200, before.text
    assert before.json()["daily_spend"] == 321.0

    deleted = await client.delete(
        f"/api/telemetry/transactions/{tx.json()['id']}", headers=auth_headers
    )
    assert deleted.status_code == 200, deleted.text

    after = await client.get(f"/api/entries/{today}", headers=auth_headers)
    assert after.status_code == 200, after.text
    assert after.json()["daily_spend"] == 0.0


@pytest.mark.asyncio
async def test_briefings_and_risks_return_404_without_data(client: AsyncClient, auth_headers: dict):
    for path in (
        "/api/analytics/briefing/morning",
        "/api/analytics/briefing/weekly",
        "/api/analytics/forecasts/risks",
    ):
        res = await client.get(path, headers=auth_headers)
        assert res.status_code == 404, f"{path} returned {res.status_code}: {res.text}"

    correlations = await client.get("/api/analytics/correlations/dynamic", headers=auth_headers)
    assert correlations.status_code == 200
    assert correlations.json() == []


@pytest.mark.asyncio
async def test_dynamic_correlations_do_not_inject_synthetic_days(
    client: AsyncClient, auth_headers: dict
):
    for offset in (2, 1):
        res = await client.post(
            "/api/entries/", json=_entry_payload(date.today() - timedelta(days=offset)), headers=auth_headers
        )
        assert res.status_code == 201, res.text

    res = await client.get(
        "/api/analytics/correlations/dynamic?min_sample_size=3", headers=auth_headers
    )
    assert res.status_code == 200, res.text
    assert res.json() == []


@pytest.mark.asyncio
async def test_repeated_sleep_interval_sync_is_idempotent(
    client: AsyncClient, auth_headers: dict
):
    day = date.today()
    base = datetime.combine(day, datetime.min.time()).replace(hour=23, tzinfo=timezone.utc)
    payload = {
        "intervals": [
            {
                "stage": "CORE",
                "start_time": base.isoformat(),
                "end_time": (base + timedelta(minutes=90)).isoformat(),
                "duration_minutes": 90,
                "date": str(day),
            },
            {
                "stage": "DEEP",
                "start_time": (base + timedelta(minutes=90)).isoformat(),
                "end_time": (base + timedelta(minutes=150)).isoformat(),
                "duration_minutes": 60,
                "date": str(day),
            },
        ],
        "auto_merge_daily_entry": True,
    }

    first = await client.post("/api/telemetry/sleep-intervals/batch", json=payload, headers=auth_headers)
    assert first.status_code == 201, first.text
    assert len(first.json()) == 2

    second = await client.post("/api/telemetry/sleep-intervals/batch", json=payload, headers=auth_headers)
    assert second.status_code == 201, second.text
    assert second.json() == []

    intervals = await client.get(f"/api/telemetry/sleep-intervals?date={day}", headers=auth_headers)
    assert len(intervals.json()) == 2

    entry = await client.get(f"/api/entries/{day}", headers=auth_headers)
    assert entry.status_code == 200, entry.text
    assert entry.json()["sleep_hours"] == 2.5


@pytest.mark.asyncio
async def test_health_ingest_does_not_claim_success_when_nothing_is_stored(
    client: AsyncClient, auth_headers: dict
):
    res = await client.post(
        "/api/ingestion/health",
        json={
            "date": str(date.today()),
            "source": "APPLE_HEALTH",
            "sleep_hours": 7.0,
            "sleep_quality": 4,
            "steps": 8000,
            "auto_merge_daily_entry": False,
        },
        headers=auth_headers,
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["success"] is False
    assert body["records_ingested"] == 0


@pytest.mark.asyncio
async def test_social_media_zero_round_trips_as_zero(client: AsyncClient, auth_headers: dict):
    day = date.today()
    created = await client.post(
        "/api/entries/",
        json=_entry_payload(day, social_media_hours=0.0),
        headers=auth_headers,
    )
    assert created.status_code == 201, created.text

    res = await client.get(f"/api/entries/{day}", headers=auth_headers)
    assert res.status_code == 200, res.text
    assert res.json()["social_media_hours"] == 0.0


@pytest.mark.asyncio
async def test_webhook_preserves_supplied_utc_offset_and_rollup_day(
    client: AsyncClient, auth_headers: dict, test_user
):
    body = json.dumps(
        {
            "event_type": "TRANSACTIONS_SYNC",
            "transactions": [
                {
                    "transaction_id": "offset-test-1",
                    "amount": 149.0,
                    "merchant_name": "Offset Cafe",
                    "date": "2026-11-10T23:30:00+05:30",
                }
            ],
        },
        separators=(",", ":"),
    )
    secret = get_settings().FINANCIAL_WEBHOOK_SECRET
    signature = "sha256=" + hmac.new(
        secret.encode(), body.encode(), hashlib.sha256
    ).hexdigest()

    res = await client.post(
        f"/api/ingestion/financial/webhook?user_id={test_user.id}",
        content=body,
        headers={"Content-Type": "application/json", "X-Webhook-Signature": signature},
    )
    assert res.status_code == 200, res.text
    assert res.json()["records_ingested"] == 1

    tx_res = await client.get("/api/telemetry/transactions", headers=auth_headers)
    tx = next(t for t in tx_res.json() if t["merchant"] == "Offset Cafe")
    parsed = datetime.fromisoformat(tx["timestamp"].replace("Z", "+00:00"))
    if parsed.utcoffset() is None:
        # SQLite drops tzinfo on read; the stored instant is still UTC.
        parsed = parsed.replace(tzinfo=timezone.utc)
    assert parsed.utcoffset() == timedelta(0)
    assert (parsed.year, parsed.month, parsed.day, parsed.hour) == (2026, 11, 10, 18)

    entry = await client.get("/api/entries/2026-11-10", headers=auth_headers)
    assert entry.status_code == 200, entry.text
    assert entry.json()["daily_spend"] == 149.0


@pytest.mark.asyncio
async def test_csv_import_computes_features_for_imported_dates(
    client: AsyncClient, auth_headers: dict, db, test_user
):
    d1 = date.today() - timedelta(days=11)
    d2 = date.today() - timedelta(days=10)
    csv_content = (
        "date,sleep_hours,sleep_quality,screen_time_hours,steps,deep_work_hours,daily_spend\n"
        f"{d1},7.5,4,3.0,8500,4.0,500\n"
        f"{d2},8.0,5,2.0,10000,6.0,450\n"
    )
    res = await client.post(
        "/api/entries/upload-csv",
        files={"file": ("history.csv", csv_content.encode(), "text/csv")},
        headers=auth_headers,
    )
    assert res.status_code == 200, res.text
    assert res.json()["imported"] == 2

    feat_res = await db.execute(
        select(EngineeredFeatures).where(
            EngineeredFeatures.user_id == test_user.id,
            EngineeredFeatures.date.in_([d1, d2]),
        )
    )
    features = feat_res.scalars().all()
    assert len(features) == 2
    assert all(f.life_score is not None for f in features)


@pytest.mark.asyncio
async def test_sse_chat_stream_emits_tokens(
    client: AsyncClient, auth_headers: dict, monkeypatch
):
    async def fake_process_user_message(**kwargs):
        return {
            "id": uuid.uuid4(),
            "session_id": uuid.uuid4(),
            "content": "Here is your real summary.",
            "tool_calls": [],
            "cards": [],
            "disclaimer": None,
            "created_at": datetime.now(timezone.utc),
        }

    monkeypatch.setattr(
        assistant_service, "process_user_message", fake_process_user_message
    )

    async with client.stream(
        "GET",
        "/api/assistant/chat/stream",
        params={"message": "Summarize my day"},
        headers=auth_headers,
    ) as res:
        assert res.status_code == 200
        body = (await res.aread()).decode()

    assert "event: token" in body
    assert "event: done" in body
    assert "event: error" not in body


@pytest.mark.asyncio
async def test_voice_chat_returns_reply_from_dict_result(
    db, test_user, monkeypatch
):
    async def fake_process_user_message(**kwargs):
        return {
            "id": uuid.uuid4(),
            "session_id": uuid.uuid4(),
            "content": "Your sleep is steady.",
            "tool_calls": [],
            "cards": [],
            "disclaimer": None,
            "created_at": datetime.now(timezone.utc),
        }

    monkeypatch.setattr(
        assistant_service, "process_user_message", fake_process_user_message
    )

    audio = generate_synthesized_wav(duration_seconds=0.2)
    result = await voice_service.process_voice_chat(
        db=db,
        user_id=str(test_user.id),
        file_bytes=audio,
        filename="query.wav",
        content_type="audio/wav",
        mock_transcript="How is my sleep?",
    )
    assert result.reply_text == "Your sleep is steady."
    assert result.transcribed_query == "How is my sleep?"


def test_exceptional_day_does_not_require_mood_tracking():
    insight = _rule_perfect_day(
        {"sleep_score": 90, "productivity_score": 85, "steps": 10000}
    )
    assert insight is not None
    assert insight.title == "🏆 Exceptional Day"


def test_productive_streak_requires_prior_day():
    today_only = {
        "productivity_score": 80,
        "productivity_7d_avg": 70,
        "productivity_score_lag1": None,
    }
    assert _rule_streak_detection(today_only) is None

    with_history = {**today_only, "productivity_score_lag1": 72}
    assert _rule_streak_detection(with_history) is not None


def test_insight_enums_and_severity_ordering_match_postgres_schema():
    # Migration 001 created native enums; a VARCHAR-typed ORM column makes both
    # inserts and CASE ordering fail on PostgreSQL (`severityenum = varchar`).
    assert Insight.__table__.c.severity.type.native_enum is True
    assert Insight.__table__.c.insight_type.type.native_enum is True

    severity_order = case(
        {"CRITICAL": 0, "WARNING": 1, "INFO": 2},
        value=cast(Insight.severity, String),
    )
    sql = str(
        select(Insight)
        .order_by(severity_order)
        .compile(dialect=postgresql.dialect())
    )
    assert "CAST(insights.severity AS VARCHAR)" in sql
