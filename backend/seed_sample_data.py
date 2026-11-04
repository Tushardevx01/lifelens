"""
LifeLens AI — Sample Data Seeder
=================================
Generates 35 days of realistic synthetic lifestyle data for a demo user,
runs feature engineering + life score for every day, then triggers the
full ML pipeline (trains K-Means, RF, Isolation Forest, runs ARIMA
forecasts) so ALL dashboard widgets are populated on first launch.

Usage:
    python seed_sample_data.py              # seeds demo@lifelens.ai
    python seed_sample_data.py --reset      # deletes existing data first
    SEED_EMAIL=you@example.com python seed_sample_data.py

Environment variables (inherited from docker-compose.yml):
    DATABASE_URL   postgresql+asyncpg://...
    REDIS_URL      redis://...
"""

import asyncio
import os
import random
import sys
from datetime import date, timedelta

# ── Bootstrap path ────────────────────────────────────────────────────────────
sys.path.insert(0, os.path.dirname(__file__))

DEMO_EMAIL    = os.environ.get("SEED_EMAIL",    "demo@lifelens.ai")
DEMO_PASSWORD = os.environ.get("SEED_PASSWORD", "Demo123456!")
DEMO_NAME     = "Demo User"
DAYS          = 35
RESET         = "--reset" in sys.argv


async def main():
    from app.database import AsyncSessionLocal, create_db_tables
    from app.models.user import User
    from app.models.daily_entry import DailyEntry
    from app.services.auth_service import register_user, get_user_by_id
    from app.services.analytics_service import compute_and_store_features
    from app.schemas.auth import UserRegister
    from sqlalchemy import select, delete
    import uuid

    print("🌱 LifeLens AI — Seed Script")
    print(f"   Demo account : {DEMO_EMAIL}")
    print(f"   Days to seed : {DAYS}")
    print()

    # Ensure tables exist (safe in dev environment)
    await create_db_tables()

    async with AsyncSessionLocal() as db:
        # ── Find or create demo user ──────────────────────────────────────
        stmt   = select(User).where(User.email == DEMO_EMAIL)
        result = await db.execute(stmt)
        user   = result.scalar_one_or_none()

        if user and RESET:
            print("   ♻️  --reset: deleting existing entries for demo user…")
            await db.execute(delete(DailyEntry).where(DailyEntry.user_id == user.id))
            await db.commit()

        if not user:
            print("   👤 Creating demo user…")
            token_resp = await register_user(db, UserRegister(
                email=DEMO_EMAIL, password=DEMO_PASSWORD, full_name=DEMO_NAME,
            ))
            await db.commit()
            # Re-fetch to get the UUID
            result = await db.execute(select(User).where(User.email == DEMO_EMAIL))
            user   = result.scalar_one()
        else:
            print(f"   👤 Using existing demo user ({user.id})")

        user_id = str(user.id)

        # ── Check existing entries ────────────────────────────────────────
        count_stmt = select(DailyEntry).where(DailyEntry.user_id == user.id)
        count_res  = await db.execute(count_stmt)
        existing   = count_res.scalars().all()
        existing_dates = {e.date for e in existing}

        print(f"   📅 Generating synthetic data for {DAYS} days…")

        random.seed(42)

        # Simulate a realistic human pattern:
        # - sleep drifts between 5.5–8.5h with some bad nights
        # - productivity correlates loosely with sleep (with noise)
        # - one anomalous day around day 20 (very high spend + low sleep)

        today = date.today()
        n_seeded = 0

        for i in range(DAYS, 0, -1):
            entry_date = today - timedelta(days=i)
            if entry_date in existing_dates:
                continue

            # Patterned random generation
            t           = i / DAYS   # progress 0→1 (older→newer)
            # Sleep: starts lower, climbs toward the end with noise
            sleep_base  = 6.0 + 2.0 * (1 - t)
            sleep_hours = round(max(4.0, min(9.5,
                sleep_base + random.gauss(0, 0.8)
            )), 1)
            sleep_quality = max(1, min(5, round(
                (sleep_hours / 9.5) * 4 + random.randint(-1, 1)
            )))

            # Anomalous day at index ~15
            is_anomaly_day = (i == 20)

            screen_time   = round(max(0.5, min(10.0,
                (3.0 if not is_anomaly_day else 8.0) + random.gauss(0, 1.0)
            )), 1)
            social_media  = round(min(screen_time * 0.7, max(0.0,
                screen_time * 0.4 + random.gauss(0, 0.3)
            )), 1)

            steps         = max(500, int(
                (8000 if not is_anomaly_day else 1200) + random.gauss(0, 2500)
            ))
            active_min    = max(0, int(steps / 100 + random.gauss(0, 10)))

            deep_work     = round(max(0.0, min(10.0,
                (4.0 if not is_anomaly_day else 0.5) + random.gauss(0, 1.2)
            )), 1)
            tasks_done    = max(0, int(deep_work * 1.5 + random.randint(-2, 3)))

            # Finance: occasional high-spend spikes
            base_spend    = 650
            daily_spend   = round(max(0.0,
                (base_spend * 4 if is_anomaly_day else base_spend)
                + random.gauss(0, 200)
            ), 0)

            mood          = max(1, min(10, round(
                5 + (sleep_hours - 6) * 0.8 + random.gauss(0, 1.5)
                - (screen_time - 3) * 0.3
            )))
            energy        = max(1, min(5, round(mood / 2)))

            entry = DailyEntry(
                user_id            = user.id,
                date               = entry_date,
                sleep_hours        = sleep_hours,
                sleep_quality      = sleep_quality,
                screen_time_hours  = screen_time,
                social_media_hours = social_media,
                steps              = steps,
                active_minutes     = active_min,
                deep_work_hours    = deep_work,
                tasks_completed    = tasks_done,
                daily_spend        = daily_spend,
                mood_score         = mood,
                energy_level       = energy,
            )
            db.add(entry)
            n_seeded += 1

        await db.commit()
        print(f"   ✅ Inserted {n_seeded} new entries")

        # ── Feature engineering + Life Score for all days ─────────────────
        print("   🔧 Computing features + Life Scores…")
        all_dates_stmt = select(DailyEntry).where(
            DailyEntry.user_id == user.id
        ).order_by(DailyEntry.date.asc())
        all_result = await db.execute(all_dates_stmt)
        all_entries = all_result.scalars().all()

        for entry in all_entries:
            try:
                await compute_and_store_features(db, user_id, entry.date)
            except Exception as e:
                print(f"   ⚠️  Feature engineering failed for {entry.date}: {e}")

        await db.commit()
        print("   ✅ Features computed")

    # ── Full ML pipeline ──────────────────────────────────────────────────
    print("   🤖 Running ML pipeline (K-Means, RF, IsolationForest, ARIMA)…")
    try:
        from app.tasks.ml_tasks import _async_full_pipeline
        await _async_full_pipeline(user_id, str(today))
        print("   ✅ ML pipeline complete")
    except Exception as e:
        print(f"   ⚠️  ML pipeline error (non-fatal): {e}")

    print()
    print("🎉 Seed complete!")
    print(f"   Login with:  {DEMO_EMAIL} / {DEMO_PASSWORD}")
    print(f"   Frontend:    http://localhost:5173")
    print(f"   API Docs:    http://localhost:8000/docs")


if __name__ == "__main__":
    asyncio.run(main())
