"""
Tests for the ML pipeline layer:
  - feature_engineering produces correct column counts
  - life_score formula stays in 0–100 range
  - K-Means clustering trains + predicts on 14+ rows
  - Random Forest regressor trains + returns float in 0–100
  - Isolation Forest outputs anomaly_score in 0–1
  - Insight engine fires at least 1 rule on known inputs
"""

import uuid
import tempfile
from datetime import date, timedelta
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from app.ml.feature_engineering import engineer_features, validate_min_data
from app.ml.life_score import compute_life_score
from app.ml.insight_engine import run_insight_engine


# ── Fixtures ─────────────────────────────────────────────────────────────────

def _make_df(n: int, seed: int = 42) -> pd.DataFrame:
    """Generate n rows of synthetic daily entry data."""
    rng   = np.random.default_rng(seed)
    today = date.today()
    rows  = []
    for i in range(n, 0, -1):
        rows.append({
            'user_id':           str(uuid.uuid4()),
            'date':              today - timedelta(days=i),
            'sleep_hours':       float(rng.uniform(5, 9)),
            'sleep_quality':     int(rng.integers(1, 6)),
            'screen_time_hours': float(rng.uniform(1, 8)),
            'social_media_hours':float(rng.uniform(0.5, 3)),
            'steps':             int(rng.integers(2000, 15000)),
            'active_minutes':    int(rng.integers(0, 90)),
            'deep_work_hours':   float(rng.uniform(0, 8)),
            'tasks_completed':   int(rng.integers(0, 12)),
            'daily_spend':       float(rng.uniform(100, 2000)),
            'mood_score':        int(rng.integers(1, 11)),
            'energy_level':      int(rng.integers(1, 6)),
        })
    return pd.DataFrame(rows)


# ── Feature Engineering ───────────────────────────────────────────────────────

def test_engineer_features_single_row():
    df = _make_df(1)
    out = engineer_features(df)
    assert 'sleep_score' in out.columns
    assert 'distraction_level' in out.columns
    assert 'activity_index' in out.columns
    assert 'productivity_score' in out.columns
    assert 'finance_score' in out.columns
    assert 'sleep_7d_avg' in out.columns
    assert 'sleep_score_lag1' in out.columns


def test_engineer_features_35_rows():
    df  = _make_df(35)
    out = engineer_features(df)
    assert len(out) == 35
    # Scores must be in range
    assert (out['sleep_score'].dropna() >= 0).all()
    assert (out['sleep_score'].dropna() <= 100).all()
    assert (out['distraction_level'].dropna() >= 0).all()
    assert (out['distraction_level'].dropna() <= 1).all()


def test_validate_min_data():
    assert validate_min_data(_make_df(14)) is True
    assert validate_min_data(_make_df(13)) is False


# ── Life Score ────────────────────────────────────────────────────────────────

@pytest.mark.parametrize("sleep,prod,act,fin,mood", [
    (100, 100, 1.0, 100, 10),   # perfect day
    (0,   0,   0.0,   0, 1),    # terrible day
    (70,  60,  0.7,  80, 7),    # average day
    (50,  50,  0.5,  50, None), # no mood
])
def test_life_score_in_range(sleep, prod, act, fin, mood):
    result = compute_life_score(sleep, prod, act, fin, mood)
    score  = result['life_score']
    assert 0 <= score <= 100, f"Life score {score} out of range"


def test_life_score_components_sum():
    result = compute_life_score(80, 70, 0.8, 90, 8)
    total  = (
        result['life_score_sleep']
        + result['life_score_productivity']
        + result['life_score_health']
        + result['life_score_finance']
    )
    # Total component sum should be close to life_score (within mood adjustment)
    assert abs(total - result['life_score']) <= 6


# ── K-Means Clustering ────────────────────────────────────────────────────────

def test_clustering_trains_and_predicts():
    from app.ml.clustering import train_clustering_pipeline, predict_cluster

    df      = engineer_features(_make_df(20))
    uid     = str(uuid.uuid4())

    with tempfile.TemporaryDirectory() as tmp:
        import app.ml.base as base_mod
        orig    = base_mod.MODELS_DIR
        base_mod.MODELS_DIR = Path(tmp)

        # Patch MODELS_DIR in each submodule for this test
        import app.ml.clustering as cl_mod
        cl_mod.MODELS_DIR = Path(tmp)

        try:
            metrics = train_clustering_pipeline(df, uid)
            assert 'silhouette_score' in metrics
            assert metrics['silhouette_score'] >= -1

            today_row = df.iloc[[-1]]
            cl_id, cl_name = predict_cluster(today_row, uid)
            assert isinstance(cl_id, int)
            assert isinstance(cl_name, str)
        finally:
            base_mod.MODELS_DIR = orig
            cl_mod.MODELS_DIR   = orig


# ── Random Forest Regression ─────────────────────────────────────────────────

def test_regression_trains_and_predicts():
    from app.ml.regression import train_regression_pipeline, predict_tomorrow

    df  = engineer_features(_make_df(20))
    uid = str(uuid.uuid4())

    with tempfile.TemporaryDirectory() as tmp:
        import app.ml.regression as rf_mod
        orig = rf_mod.MODELS_DIR
        rf_mod.MODELS_DIR = Path(tmp)
        try:
            metrics = train_regression_pipeline(df, uid)
            assert 'rmse_mean' in metrics
            assert metrics['rmse_mean'] >= 0

            today_row = df.iloc[[-1]]
            pred = predict_tomorrow(today_row, uid)
            if pred.get('predicted_productivity') is not None:
                assert 0 <= pred['predicted_productivity'] <= 100
        finally:
            rf_mod.MODELS_DIR = orig


# ── Isolation Forest Anomaly ──────────────────────────────────────────────────

def test_anomaly_trains_and_scores():
    from app.ml.anomaly import train_anomaly_detector, detect_anomaly

    df  = engineer_features(_make_df(20))
    uid = str(uuid.uuid4())

    with tempfile.TemporaryDirectory() as tmp:
        import app.ml.anomaly as anom_mod
        orig = anom_mod.MODELS_DIR
        anom_mod.MODELS_DIR = Path(tmp)
        try:
            metrics = train_anomaly_detector(df, uid)
            assert 'contamination' in metrics

            today_row = df.iloc[[-1]]
            result = detect_anomaly(today_row, uid, df)
            assert 0 <= result['anomaly_score'] <= 1
            assert isinstance(result['is_anomaly'], bool)
        finally:
            anom_mod.MODELS_DIR = orig


# ── Insight Engine ────────────────────────────────────────────────────────────

def test_insight_engine_fires_low_sleep():
    """Guaranteed trigger: very low sleep hours → at least 1 insight."""
    data = {
        'sleep_hours': 3.0,        # definitely < 6 — triggers sleep rule
        'sleep_score': 15.0,
        'sleep_7d_avg': 55.0,
        'sleep_7d_std': 5.0,
        'screen_time_hours': 3.0,
        'social_media_hours': 1.0,
        'steps': 5000,
        'steps_7d_avg': 6000.0,
        'deep_work_hours': 4.0,
        'productivity_score': 50.0,
        'productivity_7d_avg': 55.0,
        'spend_ratio': 1.0,
        'daily_spend': 500.0,
        'mood_score': 5,
        'mood_score_lag1': 6,
        'energy_level': 3,
        'distraction_level': 0.4,
        'distraction_7d_avg': 0.3,
        'is_anomaly': False,
        'anomaly_score': 0.0,
        'primary_anomaly_feature': None,
    }
    insights = run_insight_engine(data)
    assert len(insights) >= 1


def test_insight_engine_fires_high_spend():
    """Spend 3× above average → finance rule fires."""
    data = {
        'sleep_hours': 7.5, 'sleep_score': 75.0, 'sleep_7d_avg': 70.0,
        'sleep_7d_std': 3.0, 'screen_time_hours': 3.0, 'social_media_hours': 1.0,
        'steps': 8000, 'steps_7d_avg': 7500.0, 'deep_work_hours': 4.0,
        'productivity_score': 65.0, 'productivity_7d_avg': 62.0,
        'spend_ratio': 3.2,          # 3.2× average → should trigger
        'daily_spend': 3200.0,
        'mood_score': 6, 'mood_score_lag1': 7, 'energy_level': 3,
        'distraction_level': 0.3, 'distraction_7d_avg': 0.35,
        'is_anomaly': False, 'anomaly_score': 0.0, 'primary_anomaly_feature': None,
    }
    insights = run_insight_engine(data)
    finance_insights = [i for i in insights if 'spend' in i.message.lower() or 'finance' in i.title.lower()]
    assert len(finance_insights) >= 1
