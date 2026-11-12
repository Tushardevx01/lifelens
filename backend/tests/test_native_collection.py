import pytest
from datetime import date, datetime, timedelta, timezone
from httpx import AsyncClient


@pytest.mark.asyncio
class TestNativeTelemetryAndCollection:
    async def test_create_and_query_sleep_intervals(self, client: AsyncClient, auth_headers: dict):
        headers = auth_headers
        today_str = str(date.today())

        # Log sleep intervals batch
        base_time = datetime(2026, 11, 10, 23, 0, 0, tzinfo=timezone.utc)
        payload = {
            "intervals": [
                {
                    "stage": "CORE",
                    "start_time": base_time.isoformat(),
                    "end_time": (base_time + timedelta(minutes=90)).isoformat(),
                    "duration_minutes": 90,
                    "date": today_str,
                },
                {
                    "stage": "DEEP",
                    "start_time": (base_time + timedelta(minutes=90)).isoformat(),
                    "end_time": (base_time + timedelta(minutes=165)).isoformat(),
                    "duration_minutes": 75,
                    "date": today_str,
                },
                {
                    "stage": "REM",
                    "start_time": (base_time + timedelta(minutes=165)).isoformat(),
                    "end_time": (base_time + timedelta(minutes=255)).isoformat(),
                    "duration_minutes": 90,
                    "date": today_str,
                },
                {
                    "stage": "AWAKE",
                    "start_time": (base_time + timedelta(minutes=255)).isoformat(),
                    "end_time": (base_time + timedelta(minutes=265)).isoformat(),
                    "duration_minutes": 10,
                    "date": today_str,
                },
                {
                    "stage": "CORE",
                    "start_time": (base_time + timedelta(minutes=265)).isoformat(),
                    "end_time": (base_time + timedelta(minutes=435)).isoformat(),
                    "duration_minutes": 170,
                    "date": today_str,
                },
            ],
            "resting_heart_rate": 62,
            "auto_merge_daily_entry": True,
        }

        res = await client.post("/api/telemetry/sleep-intervals/batch", json=payload, headers=headers)
        assert res.status_code == 201, res.text
        data = res.json()
        assert len(data) == 5

        # Query sleep intervals
        list_res = await client.get(f"/api/telemetry/sleep-intervals?date={today_str}", headers=headers)
        assert list_res.status_code == 200
        assert len(list_res.json()) == 5

        # Query sleep summary
        summary_res = await client.get(f"/api/telemetry/sleep-summary?date={today_str}", headers=headers)
        assert summary_res.status_code == 200
        summary = summary_res.json()
        assert summary["total_sleep_hours"] == 7.08  # 425 minutes / 60
        assert summary["deep_minutes"] == 75
        assert summary["rem_minutes"] == 90
        assert summary["resting_heart_rate"] == 62
        assert summary["bedtime"] == "23:00"

        # Check DailyEntry was automatically rolled up
        entry_res = await client.get(f"/api/entries/{today_str}", headers=headers)
        assert entry_res.status_code == 200
        entry = entry_res.json()
        assert entry["sleep_hours"] == 7.08
        assert entry["resting_heart_rate"] == 62

    async def test_create_workout_session_and_consistency(self, client: AsyncClient, auth_headers: dict):
        headers = auth_headers
        today_str = str(date.today())

        start_time = datetime.now(timezone.utc) - timedelta(minutes=45)
        end_time = datetime.now(timezone.utc)

        workout_payload = {
            "activity_type": "Running",
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat(),
            "duration_minutes": 45,
            "calories_burned": 420,
            "steps": 5200,
            "intensity": "VIGOROUS",
            "notes": "Morning outdoor run",
        }

        res = await client.post("/api/telemetry/workouts", json=workout_payload, headers=headers)
        assert res.status_code == 201, res.text
        w_data = res.json()
        assert w_data["activity_type"] == "Running"
        assert w_data["calories_burned"] == 420
        assert w_data["steps"] == 5200

        # Verify DailyEntry received the rolled up active minutes, calories, steps
        entry_res = await client.get(f"/api/entries/{today_str}", headers=headers)
        assert entry_res.status_code == 200
        entry = entry_res.json()
        assert entry["active_minutes"] == 45
        assert entry["calories_burned"] == 420
        assert entry["steps"] == 5200

        # Query consistency
        cons_res = await client.get("/api/telemetry/workouts/consistency", headers=headers)
        assert cons_res.status_code == 200
        cons = cons_res.json()
        assert cons["current_streak"] >= 1
        assert cons["total_workouts_7d"] >= 1
        assert cons["total_active_minutes_7d"] >= 45
        assert 0.0 <= cons["workout_skip_vulnerability"] <= 1.0

    async def test_app_usage_distraction_index_and_late_night(self, client: AsyncClient, auth_headers: dict):
        headers = auth_headers
        day = date.today() - timedelta(days=1)
        today_str = str(day)

        # Post productive app session
        prod_time = datetime(day.year, day.month, day.day, 10, 0, 0, tzinfo=timezone.utc)
        await client.post(
            "/api/telemetry/app-usage",
            json={
                "app_name": "VS Code",
                "app_category": "Productivity",
                "duration_minutes": 90,
                "start_time": prod_time.isoformat(),
            },
            headers=headers,
        )

        # Post social media app session (daytime)
        soc_time = datetime(day.year, day.month, day.day, 14, 0, 0, tzinfo=timezone.utc)
        await client.post(
            "/api/telemetry/app-usage",
            json={
                "app_name": "Instagram",
                "app_category": "Social Media",
                "duration_minutes": 45,
                "start_time": soc_time.isoformat(),
            },
            headers=headers,
        )

        # Post late-night entertainment session (23:30)
        late_time = datetime(day.year, day.month, day.day, 23, 30, 0, tzinfo=timezone.utc)
        late_res = await client.post(
            "/api/telemetry/app-usage",
            json={
                "app_name": "YouTube",
                "app_category": "Entertainment",
                "duration_minutes": 30,
                "start_time": late_time.isoformat(),
            },
            headers=headers,
        )
        assert late_res.status_code == 201
        assert late_res.json()["is_late_night"] is True

        # Query app usage summary
        sum_res = await client.get(f"/api/telemetry/app-usage/summary?start_date={today_str}", headers=headers)
        assert sum_res.status_code == 200
        summary = sum_res.json()
        assert summary["total_minutes"] == 165
        assert summary["late_night_minutes"] == 30
        assert summary["distracting_minutes"] == 75  # 45 (Instagram) + 30 (YouTube)
        assert summary["productive_minutes"] == 90   # 90 (VS Code)
        # Distraction index = 75 / 90 = 0.83
        assert summary["distraction_index"] == 0.83

    async def test_focus_and_transaction_rollups(self, client: AsyncClient, auth_headers: dict):
        headers = auth_headers
        today_str = str(date.today())

        # Log focus session
        f_start = datetime.now(timezone.utc) - timedelta(minutes=120)
        f_end = datetime.now(timezone.utc)
        f_res = await client.post(
            "/api/telemetry/focus-sessions",
            json={
                "subject_or_task": "Deep Work Coding",
                "start_time": f_start.isoformat(),
                "end_time": f_end.isoformat(),
                "duration_minutes": 120,
                "self_reported_focus": 5,
                "distraction_count": 1,
            },
            headers=headers,
        )
        assert f_res.status_code == 201

        # Log financial transaction
        t_res = await client.post(
            "/api/telemetry/transactions",
            json={
                "amount": 250.0,
                "merchant": "Swiggy",
                "category": "Food & Dining",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "is_discretionary": True,
            },
            headers=headers,
        )
        assert t_res.status_code == 201

        # Check DailyEntry rolled up deep_work_hours and daily_spend
        entry_res = await client.get(f"/api/entries/{today_str}", headers=headers)
        assert entry_res.status_code == 200
        entry = entry_res.json()
        assert entry["deep_work_hours"] == 2.0  # 120 mins / 60
        assert entry["daily_spend"] == 250.0
        assert entry["spend_category"] == "Food & Dining"

    async def test_workout_rollup_no_double_counting(self, client: AsyncClient, auth_headers: dict):
        headers = auth_headers
        test_date = date(2026, 11, 2)
        test_date_str = str(test_date)

        # First workout: 300 kcal, 3000 steps, 30 mins
        start_1 = datetime(2026, 11, 2, 7, 0, 0, tzinfo=timezone.utc)
        await client.post(
            "/api/telemetry/workouts",
            json={
                "activity_type": "Running",
                "start_time": start_1.isoformat(),
                "end_time": (start_1 + timedelta(minutes=30)).isoformat(),
                "duration_minutes": 30,
                "calories_burned": 300,
                "steps": 3000,
                "intensity": "MODERATE",
            },
            headers=headers,
        )

        # Check first rollup
        entry_res = await client.get(f"/api/entries/{test_date_str}", headers=headers)
        assert entry_res.status_code == 200
        entry = entry_res.json()
        assert entry["calories_burned"] == 300
        assert entry["steps"] == 3000
        assert entry["active_minutes"] == 30

        # Second workout on same day: 200 kcal, 2000 steps, 20 mins
        start_2 = datetime(2026, 11, 2, 18, 0, 0, tzinfo=timezone.utc)
        await client.post(
            "/api/telemetry/workouts",
            json={
                "activity_type": "Cycling",
                "start_time": start_2.isoformat(),
                "end_time": (start_2 + timedelta(minutes=20)).isoformat(),
                "duration_minutes": 20,
                "calories_burned": 200,
                "steps": 2000,
                "intensity": "MODERATE",
            },
            headers=headers,
        )

        # Must sum to 500 kcal, 5000 steps, 50 mins (NOT double-counted into 800+ kcal!)
        entry_res2 = await client.get(f"/api/entries/{test_date_str}", headers=headers)
        assert entry_res2.status_code == 200
        entry2 = entry_res2.json()
        assert entry2["calories_burned"] == 500
        assert entry2["steps"] == 5000
        assert entry2["active_minutes"] == 50

    async def test_workout_consistency_response_fields(self, client: AsyncClient, auth_headers: dict):
        headers = auth_headers
        cons_res = await client.get("/api/telemetry/workouts/consistency", headers=headers)
        assert cons_res.status_code == 200
        cons = cons_res.json()

        # Both backend and frontend keys must be populated
        assert "current_streak" in cons
        assert "streak_days" in cons
        assert cons["streak_days"] == cons["current_streak"]

        assert "total_active_minutes_7d" in cons
        assert "total_minutes_7d" in cons
        assert cons["total_minutes_7d"] == cons["total_active_minutes_7d"]

        assert "rest_day_adherence_pct" in cons
        assert "rest_days_adherence" in cons
        assert 0.0 <= cons["rest_days_adherence"] <= 1.0

        assert "workout_skip_vulnerability" in cons
        assert "skip_vulnerability" in cons
        assert cons["skip_vulnerability"] == cons["workout_skip_vulnerability"]

    async def test_sleep_summary_circadian_drift_and_in_bed(self, client: AsyncClient, auth_headers: dict):
        headers = auth_headers
        test_date = date(2026, 11, 3)
        test_date_str = str(test_date)

        # Create sleep intervals with in_bed
        base_dt = datetime(2026, 11, 3, 22, 45, 0, tzinfo=timezone.utc)
        payload = {
            "intervals": [
                {
                    "stage": "IN_BED",
                    "start_time": base_dt.isoformat(),
                    "end_time": (base_dt + timedelta(minutes=15)).isoformat(),
                    "duration_minutes": 15,
                    "date": test_date_str,
                },
                {
                    "stage": "CORE",
                    "start_time": (base_dt + timedelta(minutes=15)).isoformat(),
                    "end_time": (base_dt + timedelta(minutes=200)).isoformat(),
                    "duration_minutes": 185,
                    "date": test_date_str,
                },
                {
                    "stage": "DEEP",
                    "start_time": (base_dt + timedelta(minutes=200)).isoformat(),
                    "end_time": (base_dt + timedelta(minutes=300)).isoformat(),
                    "duration_minutes": 100,
                    "date": test_date_str,
                },
                {
                    "stage": "REM",
                    "start_time": (base_dt + timedelta(minutes=300)).isoformat(),
                    "end_time": (base_dt + timedelta(minutes=420)).isoformat(),
                    "duration_minutes": 120,
                    "date": test_date_str,
                },
            ],
            "resting_heart_rate": 58,
            "auto_merge_daily_entry": True,
        }

        batch_res = await client.post("/api/telemetry/sleep-intervals/batch", json=payload, headers=headers)
        assert batch_res.status_code == 201

        summary_res = await client.get(f"/api/telemetry/sleep-summary?date={test_date_str}", headers=headers)
        assert summary_res.status_code == 200
        summary = summary_res.json()

        assert summary["in_bed_minutes"] == 15
        assert summary["total_in_bed_hours"] == 7.0  # (405 asleep + 15 in_bed) / 60
        assert summary["total_sleep_hours"] == 6.75  # 405 / 60
        assert summary["resting_heart_rate"] == 58
        assert "circadian_drift_minutes" in summary
        assert "bedtime_variance_minutes" in summary
        assert "phase_shift" in summary
        assert summary["phase_shift"] in ("advance", "delay", "aligned")
        assert "sleep_score" in summary
        assert 10 <= summary["sleep_score"] <= 100

    async def test_transaction_source_and_spend_velocity(self, client: AsyncClient, auth_headers: dict):
        headers = auth_headers
        now = datetime.now(timezone.utc)

        # Log transaction with SMS source
        tx_sms = await client.post(
            "/api/telemetry/transactions",
            json={
                "amount": 349.0,
                "merchant": "Swiggy",
                "category": "Food & Dining",
                "timestamp": now.isoformat(),
                "is_discretionary": True,
                "source": "SMS",
            },
            headers=headers,
        )
        assert tx_sms.status_code == 201
        data_sms = tx_sms.json()
        assert data_sms["source"] == "SMS"

        # Log transaction with CSV source
        tx_csv = await client.post(
            "/api/telemetry/transactions",
            json={
                "amount": 1200.0,
                "merchant": "Amazon India",
                "category": "Shopping",
                "timestamp": now.isoformat(),
                "is_discretionary": True,
                "source": "STATEMENT_CSV",
            },
            headers=headers,
        )
        assert tx_csv.status_code == 201
        data_csv = tx_csv.json()
        assert data_csv["source"] == "STATEMENT_CSV"

        # Query summary and verify velocity
        sum_res = await client.get("/api/telemetry/transactions/summary", headers=headers)
        assert sum_res.status_code == 200
        summary = sum_res.json()
        assert "daily_burn_rate" in summary
        assert "projected_eom_spend" in summary
        assert summary["monthly_budget"] == 35000.0
        assert "budget_run_rate_status" in summary
        assert summary["budget_run_rate_status"] in ("ON_TRACK", "PACING_AHEAD", "OVERRUN_IMMINENT", "DEFICIT_EXCEEDED")

    async def test_focus_session_task_completion_rollup(self, client: AsyncClient, auth_headers: dict):
        headers = auth_headers
        test_date = date(2026, 11, 4)
        test_date_str = str(test_date)

        f_start = datetime(2026, 11, 4, 9, 0, 0, tzinfo=timezone.utc)
        f_end = datetime(2026, 11, 4, 10, 30, 0, tzinfo=timezone.utc)

        f_res = await client.post(
            "/api/telemetry/focus-sessions",
            json={
                "subject_or_task": "Ship API Integration",
                "start_time": f_start.isoformat(),
                "end_time": f_end.isoformat(),
                "duration_minutes": 90,
                "self_reported_focus": 5,
                "distraction_count": 0,
                "task_completed": True,
            },
            headers=headers,
        )
        assert f_res.status_code == 201

        entry_res = await client.get(f"/api/entries/{test_date_str}", headers=headers)
        assert entry_res.status_code == 200
        entry = entry_res.json()
        assert entry["tasks_completed"] == 1
        assert entry["deep_work_hours"] == 1.5

    async def test_csv_import_resting_heart_rate_and_unlock_count(self, client: AsyncClient, auth_headers: dict):
        headers = auth_headers
        csv_content = (
            "date,sleep_hours,sleep_quality,sleep_bedtime,resting_heart_rate,screen_time_hours,unlock_count,steps,deep_work_hours,daily_spend\n"
            "2026-11-05,8.0,4,22:30,59,4.0,42,10500,4.5,150.0\n"
        )
        files = {"file": ("test_import.csv", csv_content.encode("utf-8"), "text/csv")}
        res = await client.post("/api/entries/upload-csv", files=files, headers=headers)
        assert res.status_code == 200
        assert res.json()["imported"] == 1

        entry_res = await client.get("/api/entries/2026-11-05", headers=headers)
        assert entry_res.status_code == 200
        entry = entry_res.json()
        assert entry["resting_heart_rate"] == 59
        assert entry["unlock_count"] == 42
        assert entry["sleep_bedtime"] == "22:30"

