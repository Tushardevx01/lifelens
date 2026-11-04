"""
Unit and integration tests for Granular Telemetry (Phase 1).
Tests Financial Transactions, App Usage Sessions, Focus Study Sessions,
and Habits with streak computations and validation boundaries.
"""

import uuid
from datetime import date, datetime, timedelta, timezone
import pytest
from httpx import AsyncClient


# ============================================================================
# 1. Financial Transactions Tests
# ============================================================================

@pytest.mark.asyncio
async def test_create_and_list_transaction(client: AsyncClient, auth_headers: dict):
    now_iso = datetime.now(timezone.utc).isoformat()
    payload = {
        "amount": 250.50,
        "category": "Food Delivery",
        "merchant": "Swiggy",
        "timestamp": now_iso,
        "is_discretionary": True,
        "notes": "Late dinner",
    }
    res = await client.post("/api/telemetry/transactions", json=payload, headers=auth_headers)
    assert res.status_code == 201
    data = res.json()
    assert data["amount"] == 250.50
    assert data["category"] == "Food Delivery"
    assert data["merchant"] == "Swiggy"
    assert data["is_discretionary"] is True
    tx_id = data["id"]

    # List transactions
    list_res = await client.get("/api/telemetry/transactions", headers=auth_headers)
    assert list_res.status_code == 200
    items = list_res.json()
    assert len(items) >= 1
    assert any(item["id"] == tx_id for item in items)


@pytest.mark.asyncio
async def test_transaction_validation_negative_amount(client: AsyncClient, auth_headers: dict):
    payload = {
        "amount": -50.0,
        "category": "Shopping",
        "merchant": "Amazon",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "is_discretionary": True,
    }
    res = await client.post("/api/telemetry/transactions", json=payload, headers=auth_headers)
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_transaction_batch_and_summary(client: AsyncClient, auth_headers: dict):
    now = datetime.now(timezone.utc)
    batch = {
        "transactions": [
            {
                "amount": 100.0,
                "category": "Groceries",
                "merchant": "Supermarket",
                "timestamp": now.isoformat(),
                "is_discretionary": False,
            },
            {
                "amount": 300.0,
                "category": "Dining",
                "merchant": "Bistro",
                "timestamp": now.isoformat(),
                "is_discretionary": True,
            },
        ]
    }
    batch_res = await client.post("/api/telemetry/transactions/batch", json=batch, headers=auth_headers)
    assert batch_res.status_code == 201
    assert len(batch_res.json()) == 2

    # Check summary
    sum_res = await client.get("/api/telemetry/transactions/summary", headers=auth_headers)
    assert sum_res.status_code == 200
    summary = sum_res.json()
    assert summary["total_spend"] >= 400.0
    assert summary["discretionary_spend"] >= 300.0
    assert summary["non_discretionary_spend"] >= 100.0
    assert "Groceries" in summary["category_breakdown"]
    assert "Dining" in summary["category_breakdown"]


@pytest.mark.asyncio
async def test_delete_transaction(client: AsyncClient, auth_headers: dict):
    payload = {
        "amount": 75.0,
        "category": "Transport",
        "merchant": "Uber",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "is_discretionary": True,
    }
    res = await client.post("/api/telemetry/transactions", json=payload, headers=auth_headers)
    tx_id = res.json()["id"]

    del_res = await client.delete(f"/api/telemetry/transactions/{tx_id}", headers=auth_headers)
    assert del_res.status_code == 200

    # Verify 404 on repeat delete
    del_res2 = await client.delete(f"/api/telemetry/transactions/{tx_id}", headers=auth_headers)
    assert del_res2.status_code == 404


# ============================================================================
# 2. App Usage Sessions Tests
# ============================================================================

@pytest.mark.asyncio
async def test_create_and_summarize_app_usage(client: AsyncClient, auth_headers: dict):
    # 23:30 should auto-tag as late night
    late_dt = datetime(2026, 11, 4, 23, 30, tzinfo=timezone.utc)
    afternoon_dt = datetime(2026, 11, 4, 14, 0, tzinfo=timezone.utc)

    batch = {
        "sessions": [
            {
                "app_name": "Instagram",
                "app_category": "Social",
                "duration_minutes": 45,
                "start_time": late_dt.isoformat(),
            },
            {
                "app_name": "VS Code",
                "app_category": "Productivity",
                "duration_minutes": 120,
                "start_time": afternoon_dt.isoformat(),
            },
        ]
    }
    res = await client.post("/api/telemetry/app-usage/batch", json=batch, headers=auth_headers)
    assert res.status_code == 201
    items = res.json()
    assert len(items) == 2
    ig = next(i for i in items if i["app_name"] == "Instagram")
    assert ig["is_late_night"] is True
    vsc = next(i for i in items if i["app_name"] == "VS Code")
    assert vsc["is_late_night"] is False

    # Summary
    sum_res = await client.get("/api/telemetry/app-usage/summary", headers=auth_headers)
    assert sum_res.status_code == 200
    summary = sum_res.json()
    assert summary["total_minutes"] >= 165
    assert summary["late_night_minutes"] >= 45
    assert "Social" in summary["category_breakdown"]


# ============================================================================
# 3. Focus Study Sessions Tests
# ============================================================================

@pytest.mark.asyncio
async def test_create_and_summarize_focus_session(client: AsyncClient, auth_headers: dict):
    st = datetime.now(timezone.utc) - timedelta(minutes=50)
    et = datetime.now(timezone.utc)

    payload = {
        "subject_or_task": "Distributed Systems",
        "start_time": st.isoformat(),
        "end_time": et.isoformat(),
        "duration_minutes": 50,
        "self_reported_focus": 4,
        "distraction_count": 2,
        "notes": "Read Paxos paper",
    }
    res = await client.post("/api/telemetry/focus-sessions", json=payload, headers=auth_headers)
    assert res.status_code == 201
    data = res.json()
    assert data["subject_or_task"] == "Distributed Systems"
    assert data["self_reported_focus"] == 4

    sum_res = await client.get("/api/telemetry/focus-sessions/summary", headers=auth_headers)
    assert sum_res.status_code == 200
    summary = sum_res.json()
    assert summary["total_duration_minutes"] >= 50
    assert summary["session_count"] >= 1
    assert summary["average_focus_rating"] >= 1.0


@pytest.mark.asyncio
async def test_focus_session_invalid_focus_rating(client: AsyncClient, auth_headers: dict):
    st = datetime.now(timezone.utc)
    et = st + timedelta(minutes=30)
    payload = {
        "subject_or_task": "Math",
        "start_time": st.isoformat(),
        "end_time": et.isoformat(),
        "duration_minutes": 30,
        "self_reported_focus": 7,  # invalid: must be 1-5
    }
    res = await client.post("/api/telemetry/focus-sessions", json=payload, headers=auth_headers)
    assert res.status_code == 422


# ============================================================================
# 4. Habits & Streaks Tests
# ============================================================================

@pytest.mark.asyncio
async def test_habit_lifecycle_and_streak(client: AsyncClient, auth_headers: dict):
    # 1. Create habit
    create_payload = {
        "name": "Morning Meditation",
        "domain": "Mindfulness",
        "frequency": "daily",
        "target_per_day": 1,
    }
    res = await client.post("/api/telemetry/habits", json=create_payload, headers=auth_headers)
    assert res.status_code == 201
    habit = res.json()
    habit_id = habit["id"]
    assert habit["name"] == "Morning Meditation"

    # 2. Check initial streak is 0
    list_res = await client.get("/api/telemetry/habits", headers=auth_headers)
    assert list_res.status_code == 200
    habits = list_res.json()
    target_habit = next(h for h in habits if h["id"] == habit_id)
    assert target_habit["current_streak"] == 0
    assert target_habit["completed_today"] is False

    # 3. Log completion for today
    today_str = str(date.today())
    log_payload = {
        "habit_id": habit_id,
        "date": today_str,
        "completed": True,
        "value": 1.0,
        "notes": "15 min breathwork",
    }
    log_res = await client.post("/api/telemetry/habits/log", json=log_payload, headers=auth_headers)
    assert log_res.status_code == 200

    # 4. Log completion for yesterday to build streak of 2
    yest_str = str(date.today() - timedelta(days=1))
    log_payload_yest = {
        "habit_id": habit_id,
        "date": yest_str,
        "completed": True,
    }
    await client.post("/api/telemetry/habits/log", json=log_payload_yest, headers=auth_headers)

    # 5. Check streak is now 2
    list_res2 = await client.get("/api/telemetry/habits", headers=auth_headers)
    habits2 = list_res2.json()
    updated_h = next(h for h in habits2 if h["id"] == habit_id)
    assert updated_h["current_streak"] == 2
    assert updated_h["best_streak"] == 2
    assert updated_h["completed_today"] is True
    assert updated_h["completion_rate_7d"] > 0

    # 6. Delete habit
    del_res = await client.delete(f"/api/telemetry/habits/{habit_id}", headers=auth_headers)
    assert del_res.status_code == 200

