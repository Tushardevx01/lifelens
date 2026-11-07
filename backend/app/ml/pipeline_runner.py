"""
ML Pipeline Runner for LifeLens AI.

Clean orchestrator that runs all 5 ML algorithms in sequence for a given user
and date. Decoupled from Celery so it can be called from tests or CLI tools.

ml_tasks.py delegates to this module; only the DB persistence logic lives
in ml_tasks.py.
"""

from __future__ import annotations

import logging
from datetime import date
from typing import Optional

import pandas as pd

from app.ml.clustering import (
    train_clustering_pipeline, predict_cluster,
    model_exists as cluster_model_exists,
)
from app.ml.regression import (
    train_regression_pipeline, predict_tomorrow,
    model_exists as rf_model_exists,
)
from app.ml.anomaly import (
    train_anomaly_detector, detect_anomaly,
    model_exists as anomaly_model_exists,
)
from app.ml.trend import run_all_trend_forecasts
from app.ml.correlation import analyse_correlations
from app.ml.insight_engine import run_insight_engine
from app.ml.feature_engineering import validate_min_data, get_data_maturity, DataMaturity

logger = logging.getLogger(__name__)

RETRAIN_INTERVAL_DAYS = 7


class PipelineResult:
    """Container for results returned by run_pipeline()."""

    def __init__(self):
        # Clustering
        self.cluster_label: Optional[int] = None
        self.cluster_name: Optional[str] = None
        self.clustering_metrics: dict = {}

        # Regression
        self.predicted_productivity: Optional[float] = None
        self.pred_confidence_lower: Optional[float] = None
        self.pred_confidence_upper: Optional[float] = None
        self.regression_metrics: dict = {}

        # Anomaly
        self.anomaly_score: Optional[float] = None
        self.is_anomaly: bool = False
        self.anomaly_details: dict = {}
        self.primary_anomaly_feature: Optional[str] = None
        self.anomaly_metrics: dict = {}

        # Trends
        self.trend_results: dict = {}

        # Correlations
        self.correlation_findings: list = []

        # Insights
        self.insights: list = []

        # Metadata
        self.ml_ran: bool = False
        self.has_enough_data: bool = False
        self.data_maturity: str = DataMaturity.RULE_BASED_ONLY.value
        self.data_maturity_label: str = DataMaturity.RULE_BASED_ONLY.label
        self.days_until_next_tier: Optional[int] = None


def run_pipeline(
    df: pd.DataFrame,
    user_id: str,
    entry_date: date,
    force_retrain: bool = False,
) -> PipelineResult:
    """
    Run the full ML pipeline for one user synchronously.

    Args:
        df:          Full history DataFrame with engineered features.
        user_id:     User UUID string (used for model file naming).
        entry_date:  The date row to run inference on.
        force_retrain: If True, always retrain models regardless of age.

    Returns:
        PipelineResult with all ML outputs populated.
    """
    result = PipelineResult()

    # ── Determine data maturity tier ──────────────────────────────────────────
    maturity = get_data_maturity(df)
    result.has_enough_data     = maturity != DataMaturity.RULE_BASED_ONLY
    result.data_maturity       = maturity.value
    result.data_maturity_label = maturity.label
    result.days_until_next_tier = maturity.days_needed_for_next

    today_row = df[df['date'] == pd.Timestamp(entry_date).date()]
    if today_row.empty:
        logger.warning(f"No data row found for {entry_date} in pipeline for user {user_id}")
        return result

    can_cluster  = maturity in (DataMaturity.CLUSTERING_READY, DataMaturity.FULL_ML)
    can_anomaly  = maturity in (DataMaturity.ANOMALY_READY, DataMaturity.CLUSTERING_READY, DataMaturity.FULL_ML)
    can_forecast = maturity == DataMaturity.FULL_ML
    can_correlate = len(df) >= 30

    # ── 1. K-Means Clustering (30+ days) ─────────────────────────────────────
    if can_cluster:
        try:
            needs_retrain = force_retrain or _should_retrain(user_id, 'kmeans')
            if needs_retrain or not cluster_model_exists(user_id):
                result.clustering_metrics = train_clustering_pipeline(df, user_id)
                logger.info(f"[{user_id}] KMeans trained — {result.clustering_metrics}")

            if cluster_model_exists(user_id):
                cl_id, cl_name = predict_cluster(today_row, user_id)
                result.cluster_label = cl_id
                result.cluster_name  = cl_name
        except Exception as e:
            logger.warning(f"[{user_id}] Clustering failed: {e}")

    # ── 2. Random Forest Regression (30+ days) ───────────────────────────────
    if can_cluster:
        try:
            needs_retrain = force_retrain or _should_retrain(user_id, 'rf_regressor')
            if needs_retrain or not rf_model_exists(user_id):
                result.regression_metrics = train_regression_pipeline(df, user_id)
                logger.info(f"[{user_id}] RF trained — RMSE {result.regression_metrics.get('rmse_mean')}")

            if rf_model_exists(user_id):
                pred = predict_tomorrow(today_row, user_id)
                if pred and pred.get('predicted_productivity') is not None:
                    result.predicted_productivity  = pred['predicted_productivity']
                    result.pred_confidence_lower   = pred['confidence_interval']['lower']
                    result.pred_confidence_upper   = pred['confidence_interval']['upper']
        except Exception as e:
            logger.warning(f"[{user_id}] Regression failed: {e}")

    # ── 3. Isolation Forest Anomaly Detection (21+ days) ────────────────────
    if can_anomaly:
        try:
            needs_retrain = force_retrain or _should_retrain(user_id, 'isolation_forest')
            if needs_retrain or not anomaly_model_exists(user_id):
                result.anomaly_metrics = train_anomaly_detector(df, user_id)
                logger.info(f"[{user_id}] IsolationForest trained")

            if anomaly_model_exists(user_id):
                anom = detect_anomaly(today_row, user_id, df)
                result.anomaly_score           = anom.get('anomaly_score')
                result.is_anomaly              = anom.get('is_anomaly', False)
                result.anomaly_details         = anom.get('feature_deviations') or {}
                result.primary_anomaly_feature = anom.get('primary_anomaly_feature')
        except Exception as e:
            logger.warning(f"[{user_id}] Anomaly detection failed: {e}")

    # ── 4. ARIMA Trend Forecast (60+ days) ──────────────────────────────────
    if can_forecast:
        try:
            result.trend_results = run_all_trend_forecasts(df)
        except Exception as e:
            logger.warning(f"[{user_id}] ARIMA forecast failed: {e}")

    # ── 5. Pearson Correlation (30+ days) ───────────────────────────────────
    if can_correlate:
        try:
            corr_cols = [
                'sleep_hours', 'screen_time_hours', 'steps',
                'deep_work_hours', 'daily_spend', 'mood_score',
            ]
            available = [c for c in corr_cols if c in df.columns]
            corr_df   = df[available].dropna(axis=1, how='all')
            result.correlation_findings = analyse_correlations(corr_df)
        except Exception as e:
            logger.warning(f"[{user_id}] Correlation analysis failed: {e}")

    # ── 6. Insight Engine ─────────────────────────────────────────────────────
    # Always runs — rules are safe at any data level.
    # days_tracked + data_maturity let rolling-average rules self-gate.
    try:
        row = today_row.iloc[0]
        insight_data = {
            'sleep_hours':           float(row.get('sleep_hours', 0)),
            'sleep_score':           float(row.get('sleep_score', 0)),
            'sleep_7d_avg':          float(row.get('sleep_7d_avg', 8)),
            'sleep_7d_std':          float(row.get('sleep_7d_std', 0)),
            'screen_time_hours':     float(row.get('screen_time_hours', 0)),
            'social_media_hours':    row.get('social_media_hours'),
            'steps':                 int(row.get('steps', 0)),
            'steps_7d_avg':          float(row.get('steps_7d_avg', 8000)),
            'deep_work_hours':       float(row.get('deep_work_hours', 0)),
            'productivity_score':    float(row.get('productivity_score', 0)),
            'productivity_7d_avg':   float(row.get('productivity_7d_avg', 50)),
            'spend_ratio':           float(row.get('spend_ratio', 1.0)),
            'daily_spend':           float(row.get('daily_spend', 0)),
            'mood_score':            row.get('mood_score'),
            'mood_score_lag1':       row.get('mood_score_lag1'),
            'energy_level':          row.get('energy_level'),
            'distraction_level':     float(row.get('distraction_level', 0)),
            'distraction_7d_avg':    float(row.get('distraction_7d_avg', 0)),
            'is_anomaly':            result.is_anomaly,
            'anomaly_score':         result.anomaly_score or 0,
            'primary_anomaly_feature': result.primary_anomaly_feature,
            # Context for self-gating rules
            'days_tracked':          len(df),
            'data_maturity':         maturity.value,
        }
        result.insights = run_insight_engine(insight_data)
    except Exception as e:
        logger.warning(f"[{user_id}] Insight engine failed: {e}")

    result.ml_ran = True
    return result


# ── Helpers ──────────────────────────────────────────────────────────────────

def _should_retrain(user_id: str, model_type: str) -> bool:
    """Return True if model doesn't exist or is older than RETRAIN_INTERVAL_DAYS."""
    from datetime import datetime, timezone
    from app.ml.base import MODELS_DIR

    model_file_map = {
        'kmeans':           MODELS_DIR / f'kmeans_{user_id}.joblib',
        'rf_regressor':     MODELS_DIR / f'rf_{user_id}.joblib',
        'isolation_forest': MODELS_DIR / f'isolation_forest_{user_id}.joblib',
    }
    path = model_file_map.get(model_type)
    if path is None or not path.exists():
        return True
    age = datetime.now(timezone.utc).timestamp() - path.stat().st_mtime
    return age > RETRAIN_INTERVAL_DAYS * 86400
