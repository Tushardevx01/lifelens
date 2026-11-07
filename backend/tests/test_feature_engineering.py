"""
Unit tests for feature_engineering.py

Tests all fixes applied in audit:
  - active_minutes=0 not treated as None
  - no look-ahead bias in rolling fills
  - missing optional columns handled gracefully
  - productivity_score_lag1 generated
"""

import pytest
import pandas as pd
import numpy as np
from datetime import date, timedelta

from app.ml.feature_engineering import (
    engineer_features,
    compute_sleep_score,
    compute_activity_index,
    compute_productivity_score,
    compute_finance_score,
    validate_min_data,
    MIN_DATA_POINTS,
)


def make_df(n: int = 20, seed: int = 42) -> pd.DataFrame:
    """Generate n days of synthetic daily entries."""
    rng = np.random.default_rng(seed)
    today = date.today()
    rows = []
    for i in range(n):
        rows.append({
            "user_id":           "user-001",
            "date":              today - timedelta(days=n - i),
            "sleep_hours":       float(rng.uniform(5, 9)),
            "sleep_quality":     int(rng.integers(1, 6)),
            "screen_time_hours": float(rng.uniform(1, 8)),
            "steps":             int(rng.integers(2000, 15000)),
            "deep_work_hours":   float(rng.uniform(0, 6)),
            "daily_spend":       float(rng.uniform(100, 2000)),
            "tasks_completed":   int(rng.integers(0, 10)),
            "mood_score":        int(rng.integers(1, 11)),
            "active_minutes":    int(rng.integers(0, 90)),
        })
    return pd.DataFrame(rows)


# =============================================================================
# compute_sleep_score
# =============================================================================

class TestComputeSleepScore:
    def test_perfect_sleep(self):
        assert compute_sleep_score(8.0, 5) == 100.0

    def test_zero_hours(self):
        assert compute_sleep_score(0.0, 5) == 0.0

    def test_oversleep_capped(self):
        # 10 hours capped at 8 → same as 8
        assert compute_sleep_score(10.0, 5) == compute_sleep_score(8.0, 5)

    def test_low_quality_penalty(self):
        assert compute_sleep_score(8.0, 1) < compute_sleep_score(8.0, 5)

    def test_result_in_range(self):
        for h in [0, 4, 6, 7, 8, 10]:
            for q in [1, 2, 3, 4, 5]:
                score = compute_sleep_score(h, q)
                assert 0 <= score <= 100, f"Out of range for h={h} q={q}: {score}"


# =============================================================================
# compute_activity_index
# =============================================================================

class TestComputeActivityIndex:
    def test_zero_steps(self):
        assert compute_activity_index(0, None) == 0.0

    def test_target_steps(self):
        assert compute_activity_index(10000, None) == 1.0

    def test_oversteps_capped(self):
        assert compute_activity_index(20000, None) == 1.0

    def test_active_minutes_zero_is_not_none(self):
        """FIX 4.1: active_minutes=0 should not add bonus (not treated as None)."""
        without = compute_activity_index(5000, None)
        with_zero = compute_activity_index(5000, 0)
        # Both should give the same result (no bonus for 0 minutes)
        assert with_zero == without

    def test_active_minutes_adds_bonus(self):
        """Positive active_minutes should add a small bonus."""
        without = compute_activity_index(5000, None)
        with_mins = compute_activity_index(5000, 60)
        assert with_mins > without

    def test_active_minutes_positive_value(self):
        result = compute_activity_index(5000, 30)
        assert result > 0.5


# =============================================================================
# compute_productivity_score
# =============================================================================

class TestComputeProductivityScore:
    def test_zero_work(self):
        assert compute_productivity_score(0, None) == 0.0

    def test_tasks_bonus(self):
        base = compute_productivity_score(4, None)
        with_tasks = compute_productivity_score(4, 10)
        assert with_tasks > base

    def test_max_capped_at_100(self):
        assert compute_productivity_score(10, 100) == 100.0


# =============================================================================
# compute_finance_score
# =============================================================================

class TestComputeFinanceScore:
    def test_zero_avg_returns_100(self):
        assert compute_finance_score(500, 0) == 100.0

    def test_at_average_is_100(self):
        assert compute_finance_score(500, 500) == 100.0

    def test_double_average_is_50(self):
        # ratio=2 → 100 - (2-1)*50 = 50
        assert compute_finance_score(1000, 500) == 50.0

    def test_triple_floors_at_0(self):
        # ratio=4 → 100 - (4-1)*50 = -50 → clamped to 0
        assert compute_finance_score(2000, 500) == 0.0


# =============================================================================
# engineer_features (full pipeline)
# =============================================================================

class TestEngineerFeatures:
    def test_basic_output_columns(self):
        df = make_df(20)
        result = engineer_features(df)
        for col in ['sleep_score', 'distraction_level', 'activity_index',
                    'productivity_score', 'finance_score', 'spend_ratio']:
            assert col in result.columns, f"Missing column: {col}"

    def test_rolling_columns_exist(self):
        df = make_df(20)
        result = engineer_features(df)
        for col in ['sleep_7d_avg', 'sleep_7d_std', 'productivity_7d_avg',
                    'distraction_7d_avg', 'steps_7d_avg']:
            assert col in result.columns

    def test_lag_columns_exist(self):
        """FIX 4.4: productivity_score_lag1 must be present."""
        df = make_df(20)
        result = engineer_features(df)
        for col in ['sleep_score_lag1', 'screen_time_lag1',
                    'activity_index_lag1', 'mood_score_lag1',
                    'productivity_score_lag1']:
            assert col in result.columns, f"Missing lag column: {col}"

    def test_missing_optional_columns_handled(self):
        """FIX 4.3: DataFrame without social_media_hours should not raise."""
        df = make_df(15)
        df = df.drop(columns=['active_minutes', 'tasks_completed'])
        result = engineer_features(df)
        assert 'productivity_score' in result.columns

    def test_active_minutes_zero_not_inflated(self):
        """FIX 4.1: rows with active_minutes=0 treated same as no bonus."""
        df = make_df(15)
        df['active_minutes'] = 0
        result = engineer_features(df)
        # activity_index should equal steps/10000 (capped at 1), no bonus
        for _, row in result.iterrows():
            expected = min(float(df.loc[row.name, 'steps']) / 10000, 1.0)
            assert abs(row['activity_index'] - round(expected, 4)) < 0.001

    def test_no_lookahead_first_row_rolling(self):
        """FIX 4.2: first row's rolling avg should not use future values."""
        df = make_df(20)
        result = engineer_features(df)
        first_sleep = float(result['sleep_score'].iloc[0])
        first_avg   = float(result['sleep_7d_avg'].iloc[0])
        # The 7d avg for the first row should = the first day's value itself
        assert abs(first_avg - first_sleep) < 0.01, (
            f"Look-ahead bias: first row avg ({first_avg}) != first value ({first_sleep})"
        )

    def test_empty_df_raises(self):
        with pytest.raises(ValueError, match="No data points"):
            engineer_features(pd.DataFrame())

    def test_single_row_no_crash(self):
        df = make_df(1)
        result = engineer_features(df)
        assert len(result) == 1

    def test_all_scores_in_range(self):
        df = make_df(30)
        result = engineer_features(df)
        for col in ['sleep_score', 'productivity_score', 'finance_score']:
            assert (result[col] >= 0).all(), f"{col} has negative values"
            assert (result[col] <= 100).all(), f"{col} exceeds 100"
        for col in ['distraction_level', 'activity_index']:
            assert (result[col] >= 0).all()
            assert (result[col] <= 1.0001).all()


# =============================================================================
# validate_min_data
# =============================================================================

class TestValidateMinData:
    def test_below_threshold(self):
        df = make_df(MIN_DATA_POINTS - 1)
        assert validate_min_data(df) is False

    def test_at_threshold(self):
        df = make_df(MIN_DATA_POINTS)
        assert validate_min_data(df) is True

    def test_above_threshold(self):
        df = make_df(MIN_DATA_POINTS + 10)
        assert validate_min_data(df) is True
