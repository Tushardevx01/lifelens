"""
Feature Engineering Pipeline for LifeLens AI.

Transforms raw daily_entries data into ML-ready features.
All fixes applied per audit:
  - active_minutes truthiness (0 is not None)
  - look-ahead bias in rolling fillna
  - missing optional column guards
  - productivity_score_lag1 added
"""

import pandas as pd
import numpy as np
from typing import Optional


# ── Data Maturity Tiers ──────────────────────────────────────────────────────
# Each tier gates specific ML models. Prevents garbage predictions for new users.
from enum import Enum

class DataMaturity(str, Enum):
    RULE_BASED_ONLY  = "rule_based"    # 0–6 days:  insight rules only
    TRENDS_ONLY      = "trends"        # 7–20 days: rolling trends + averages
    ANOMALY_READY    = "anomaly"       # 21–29 days: + anomaly detection
    CLUSTERING_READY = "clustering"    # 30–59 days: + k-means + random forest
    FULL_ML          = "full_ml"       # 60+ days:  + ARIMA forecasting

    @property
    def label(self) -> str:
        labels = {
            "rule_based":  "Learning your patterns",
            "trends":      "Trends unlocked",
            "anomaly":     "Anomaly detection unlocked",
            "clustering":  "Full ML intelligence unlocked",
            "full_ml":     "Advanced forecasting unlocked",
        }
        return labels[self.value]

    @property
    def days_needed_for_next(self) -> int | None:
        thresholds = {
            "rule_based": 7,
            "trends": 21,
            "anomaly": 30,
            "clustering": 60,
            "full_ml": None,
        }
        return thresholds[self.value]


def get_data_maturity(data_or_count) -> DataMaturity:
    """Return the DataMaturity tier based on number of days/data rows."""
    n = data_or_count if isinstance(data_or_count, int) else len(data_or_count)
    if n < 7:   return DataMaturity.RULE_BASED_ONLY
    if n < 21:  return DataMaturity.TRENDS_ONLY
    if n < 30:  return DataMaturity.ANOMALY_READY
    if n < 60:  return DataMaturity.CLUSTERING_READY
    return DataMaturity.FULL_ML


# Legacy: kept for backward compatibility with any callers using the old constant
MIN_DATA_POINTS = 14


def compute_sleep_score(sleep_hours: float, sleep_quality: int) -> float:
    """
    Score = (hours / 8.0) capped at 1.0 × (quality / 5.0) × 100
    Max: 100 (8h, quality 5). Zero hours → 0 regardless of quality.
    """
    hours_factor   = min(sleep_hours / 8.0, 1.0)
    quality_factor = sleep_quality / 5.0
    return round(hours_factor * quality_factor * 100, 2)


def compute_distraction_level(screen_time_hours: float) -> float:
    """
    Distraction = screen_time / 6.0, capped at 1.0.
    6+ hours of screen time → maximum distraction (1.0).
    """
    return round(min(screen_time_hours / 6.0, 1.0), 4)


def compute_activity_index(
    steps: int, active_minutes: Optional[int] = None
) -> float:
    """
    Primary: steps / 10000, capped at 1.0.
    Bonus: active_minutes if provided (not None, not NaN).
    FIX: use `is not None` — 0 active minutes is valid data, not missing.
    """
    base = min(steps / 10000, 1.0)
    if active_minutes is not None:                  # FIX: was `if active_minutes:`
        bonus = min(active_minutes / 60, 0.1)
        return round(min(base + bonus, 1.0), 4)
    return round(base, 4)


def compute_productivity_score(
    deep_work_hours: float, tasks_completed: Optional[int] = None
) -> float:
    """
    Primary: deep_work_hours / 8.0 × 90 (max 90 base points).
    Bonus: tasks_completed / 10 × 10 (max 10 bonus points). Total max: 100.
    """
    base  = min(deep_work_hours / 8.0, 1.0) * 90
    bonus = min(tasks_completed / 10, 1.0) * 10 if tasks_completed is not None else 0
    return round(min(base + bonus, 100), 2)


def compute_finance_score(daily_spend: float, spend_30d_avg: float) -> float:
    """
    At or below average → 100. Each 10% above average → -5 points. Floor at 0.
    """
    if spend_30d_avg <= 0 or daily_spend <= spend_30d_avg:
        return 100.0
    ratio = daily_spend / spend_30d_avg
    return round(min(100.0, max(0.0, 100.0 - (ratio - 1.0) * 50.0)), 2)


def compute_spend_ratio(daily_spend: float, spend_30d_avg: float) -> float:
    if spend_30d_avg <= 0:
        return 1.0
    return round(daily_spend / spend_30d_avg, 4)


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Main feature engineering function.

    Input columns (required): user_id, date, sleep_hours, sleep_quality,
        screen_time_hours, steps, deep_work_hours, daily_spend
    Input columns (optional): social_media_hours, active_minutes, tasks_completed,
        mood_score, energy_level, calories_burned

    Returns df with all engineered columns added.
    """
    if len(df) < 1:
        raise ValueError("No data points provided.")

    df = df.sort_values('date').copy()

    # ── Guard: ensure optional columns exist (may be absent in minimal CSVs) ──
    optional_cols = ['social_media_hours', 'active_minutes', 'tasks_completed',
                     'mood_score', 'energy_level', 'calories_burned']
    for col in optional_cols:
        if col not in df.columns:
            df[col] = None

    # ── Base feature computation ──────────────────────────────────────────────
    df['sleep_score'] = df.apply(
        lambda r: compute_sleep_score(float(r['sleep_hours']), int(r['sleep_quality'])),
        axis=1
    )

    df['distraction_level'] = df['screen_time_hours'].astype(float).apply(
        compute_distraction_level
    )

    df['activity_index'] = df.apply(
        lambda r: compute_activity_index(
            int(r['steps']),
            # FIX: convert to int only when not NaN, preserve None otherwise
            int(r['active_minutes']) if pd.notna(r['active_minutes']) else None
        ),
        axis=1
    )

    df['productivity_score'] = df.apply(
        lambda r: compute_productivity_score(
            float(r['deep_work_hours']),
            int(r['tasks_completed']) if pd.notna(r['tasks_completed']) else None
        ),
        axis=1
    )

    # Finance: 30-day rolling average of PAST spend (shift(1) avoids look-ahead)
    df['spend_30d_avg'] = (
        df['daily_spend'].astype(float)
        .rolling(window=30, min_periods=1)
        .mean()
        .shift(1)
        # FIX: fillna with expanding mean up to current row (not global mean)
        # Use bfill then 0 to prevent look-ahead bias from global .mean()
    )
    # For first row where shift gives NaN, use the day's own spend as baseline
    df['spend_30d_avg'] = df['spend_30d_avg'].fillna(df['daily_spend'].astype(float))

    df['spend_ratio'] = df.apply(
        lambda r: compute_spend_ratio(float(r['daily_spend']), float(r['spend_30d_avg'])),
        axis=1
    )
    df['finance_score'] = df.apply(
        lambda r: compute_finance_score(float(r['daily_spend']), float(r['spend_30d_avg'])),
        axis=1
    )

    # ── Rolling features (7-day window, min 3 periods) ────────────────────────
    rolling_configs = [
        ('sleep_score',       'sleep_7d_avg',        'mean'),
        ('sleep_score',       'sleep_7d_std',         'std'),
        ('productivity_score','productivity_7d_avg',  'mean'),
        ('distraction_level', 'distraction_7d_avg',   'mean'),
        ('steps',             'steps_7d_avg',          'mean'),
    ]

    for col, new_col, agg_type in rolling_configs:
        if agg_type == 'std':
            df[new_col] = (
                df[col].rolling(window=7, min_periods=2).std().fillna(0)
            )
        else:
            # FIX: use expanding min_periods=1 per-row to avoid any look-ahead.
            # expanding().mean() at each row only uses past data (after sort_values).
            rolling_vals = df[col].rolling(window=7, min_periods=3).mean()
            expanding_vals = df[col].expanding(min_periods=1).mean()
            df[new_col] = rolling_vals.fillna(expanding_vals)

    # ── Lagged features (yesterday → use to predict today) ────────────────────
    lag_cols = [
        ('sleep_score',       'sleep_score_lag1'),
        ('screen_time_hours', 'screen_time_lag1'),
        ('activity_index',    'activity_index_lag1'),
        ('productivity_score','productivity_score_lag1'),   # FIX: was missing
    ]
    if 'mood_score' in df.columns:
        lag_cols.append(('mood_score', 'mood_score_lag1'))

    for src_col, lag_name in lag_cols:
        if src_col in df.columns:
            series = pd.to_numeric(df[src_col], errors='coerce')
            col_mean = float(series.mean()) if not series.isna().all() else 0.0
            df[lag_name] = series.shift(1).fillna(col_mean).astype(float)

    # Ensure mood_score_lag1 always exists (engine references it even when mood not tracked)
    if 'mood_score_lag1' not in df.columns:
        df['mood_score_lag1'] = 5.0   # neutral default

    return df


def validate_min_data(df: pd.DataFrame) -> bool:
    """Return True if there is enough data for minimum ML models to be meaningful (≥14 days)."""
    return len(df) >= MIN_DATA_POINTS
