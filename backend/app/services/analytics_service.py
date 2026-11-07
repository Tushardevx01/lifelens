"""
Analytics service — business logic for dashboard and ML result assembly.
"""

import uuid
from datetime import date, timedelta
from typing import Optional

import pandas as pd
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.daily_entry import DailyEntry
from app.models.engineered_features import EngineeredFeatures
from app.ml.feature_engineering import engineer_features
from app.ml.life_score import compute_life_score


async def compute_and_store_features(
    db: AsyncSession, user_id: str, entry_date: date
) -> Optional[EngineeredFeatures]:
    """
    Load user's entry history, run feature engineering, compute life score,
    and upsert the result into engineered_features table.
    """
    uid = uuid.UUID(user_id)

    # Load all entries for this user
    stmt = (
        select(DailyEntry)
        .where(DailyEntry.user_id == uid)
        .order_by(DailyEntry.date.asc())
    )
    result = await db.execute(stmt)
    entries = result.scalars().all()

    if not entries:
        return None

    # Vectorized column dictionary conversion (5-10x faster than row-by-row dict append)
    records = {
        'user_id':           [str(e.user_id) for e in entries],
        'date':              [e.date for e in entries],
        'sleep_hours':       [float(e.sleep_hours) for e in entries],
        'sleep_quality':     [e.sleep_quality for e in entries],
        'screen_time_hours': [float(e.screen_time_hours) for e in entries],
        'social_media_hours':[float(e.social_media_hours) if e.social_media_hours else None for e in entries],
        'steps':             [e.steps for e in entries],
        'active_minutes':    [e.active_minutes for e in entries],
        'calories_burned':   [e.calories_burned for e in entries],
        'deep_work_hours':   [float(e.deep_work_hours) for e in entries],
        'tasks_completed':   [e.tasks_completed for e in entries],
        'daily_spend':       [float(e.daily_spend) for e in entries],
        'mood_score':        [e.mood_score for e in entries],
        'energy_level':      [e.energy_level for e in entries],
    }

    df = pd.DataFrame(records)
    features_df = engineer_features(df)

    # Find the row for the target date
    target_row = features_df[features_df['date'] == entry_date]
    if target_row.empty:
        return None

    row = target_row.iloc[0]

    # Compute life score
    life_data = compute_life_score(
        sleep_score=row.get('sleep_score', 0),
        productivity_score=row.get('productivity_score', 0),
        activity_index=row.get('activity_index', 0),
        finance_score=row.get('finance_score', 0),
        mood_score=row.get('mood_score'),
    )

    # Upsert into engineered_features
    from datetime import datetime, timezone

    feat_stmt = select(EngineeredFeatures).where(
        and_(EngineeredFeatures.user_id == uid, EngineeredFeatures.date == entry_date)
    )
    feat_result = await db.execute(feat_stmt)
    existing = feat_result.scalar_one_or_none()

    if existing:
        feat = existing
    else:
        feat = EngineeredFeatures(user_id=uid, date=entry_date)
        db.add(feat)

    # Set feature values
    feat.sleep_score = row.get('sleep_score')
    feat.distraction_level = row.get('distraction_level')
    feat.activity_index = row.get('activity_index')
    feat.productivity_score = row.get('productivity_score')
    feat.finance_score = row.get('finance_score')
    feat.spend_ratio = row.get('spend_ratio')
    feat.sleep_7d_avg = row.get('sleep_7d_avg')
    feat.sleep_7d_std = row.get('sleep_7d_std')
    feat.productivity_7d_avg = row.get('productivity_7d_avg')
    feat.distraction_7d_avg = row.get('distraction_7d_avg')
    feat.steps_7d_avg = row.get('steps_7d_avg')
    feat.sleep_score_lag1 = row.get('sleep_score_lag1')
    feat.screen_time_lag1 = row.get('screen_time_lag1')
    feat.activity_index_lag1 = row.get('activity_index_lag1')
    feat.mood_score_lag1 = row.get('mood_score_lag1')

    # Life score
    feat.life_score = life_data['life_score']
    feat.life_score_sleep = life_data['life_score_sleep']
    feat.life_score_productivity = life_data['life_score_productivity']
    feat.life_score_health = life_data['life_score_health']
    feat.life_score_finance = life_data['life_score_finance']
    feat.computed_at = datetime.now(timezone.utc)

    await db.flush()
    return feat
