"""
ML Celery Tasks for LifeLens AI.

Full pipeline triggered when a user submits a new daily entry:
  1. Feature engineering + Life Score (sync, already done in request)
  2. Retrain or run clustering inference
  3. Retrain or run RF regression inference
  4. Run Isolation Forest anomaly detection
  5. Run ARIMA trend forecasting
  6. Run correlation analysis
  7. Run insight engine → persist insights to DB
  8. Invalidate Redis cache
"""

import asyncio
import uuid
from datetime import date, datetime, timezone

import pandas as pd
from sqlalchemy import select, and_

from app.tasks.celery_app import celery_app
from app.database import AsyncSessionLocal
from app.models.daily_entry import DailyEntry
from app.models.engineered_features import EngineeredFeatures
from app.models.insight import Insight, InsightTypeEnum, SeverityEnum
from app.models.ml_model_metadata import MLModelMetadata
from app.ml.feature_engineering import engineer_features, validate_min_data
from app.ml.life_score import compute_life_score
from app.ml.base import MODELS_DIR
from app.ml.clustering import (
    train_clustering_pipeline, predict_cluster,
    model_exists as cluster_model_exists, CLUSTERING_FEATURES,
)
from app.ml.regression import (
    train_regression_pipeline, predict_tomorrow,
    model_exists as rf_model_exists, REGRESSION_FEATURES,
)
from app.ml.anomaly import (
    train_anomaly_detector, detect_anomaly,
    model_exists as anomaly_model_exists, ANOMALY_FEATURES,
)
from app.ml.trend import run_all_trend_forecasts
from app.ml.correlation import analyse_correlations
from app.ml.insight_engine import run_insight_engine, Severity, InsightType
from app.cache.redis_client import invalidate_user_cache


def run_async(coro):
    """Helper to run async code from sync Celery tasks."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


RETRAIN_INTERVAL_DAYS = 7   # Retrain models weekly


@celery_app.task(name="app.tasks.ml_tasks.run_full_pipeline", bind=True, max_retries=2)
def run_full_pipeline(self, user_id: str, entry_date_str: str):
    """
    Full ML pipeline for one user after a new entry is submitted.
    Runs training OR inference depending on model age and data volume.
    """
    try:
        run_async(_async_full_pipeline(user_id, entry_date_str))
    except Exception as exc:
        raise self.retry(countdown=60, exc=exc)


async def _async_full_pipeline(user_id: str, entry_date_str: str):
    """Core async ML pipeline logic."""
    uid         = uuid.UUID(user_id)
    entry_date  = date.fromisoformat(entry_date_str)

    async with AsyncSessionLocal() as db:
        # ── Load all entries ──────────────────────────────────────────────
        stmt    = select(DailyEntry).where(DailyEntry.user_id == uid).order_by(DailyEntry.date.asc())
        result  = await db.execute(stmt)
        entries = result.scalars().all()

        if not entries:
            return

        # Convert to DataFrame
        records = [_entry_to_dict(e) for e in entries]
        df_raw  = pd.DataFrame(records)
        df      = engineer_features(df_raw)

        has_enough = validate_min_data(df)
        today_row  = df[df['date'] == pd.Timestamp(entry_date).date()]
        if today_row.empty:
            return

        # ── Life Score (already computed by request, just ensure up-to-date) ─
        row        = today_row.iloc[0]
        life_data  = compute_life_score(
            sleep_score=float(row.get('sleep_score', 0)),
            productivity_score=float(row.get('productivity_score', 0)),
            activity_index=float(row.get('activity_index', 0)),
            finance_score=float(row.get('finance_score', 0)),
            mood_score=row.get('mood_score'),
        )

        # ── Get or create EngineeredFeatures row ─────────────────────────
        feat_stmt  = select(EngineeredFeatures).where(
            and_(EngineeredFeatures.user_id == uid, EngineeredFeatures.date == entry_date)
        )
        feat_result = await db.execute(feat_stmt)
        feat_obj    = feat_result.scalar_one_or_none()

        if feat_obj is None:
            feat_obj = EngineeredFeatures(user_id=uid, date=entry_date)
            db.add(feat_obj)

        # Write base features
        _write_features_to_obj(feat_obj, row, life_data)

        # ── Clustering ───────────────────────────────────────────────────
        if has_enough:
            needs_retrain = _should_retrain(user_id, 'kmeans')
            if needs_retrain or not cluster_model_exists(user_id):
                metrics = train_clustering_pipeline(df, user_id)
                await _save_model_metadata(db, uid, 'kmeans', len(df), metrics)

            if cluster_model_exists(user_id):
                cluster_id, cluster_name = predict_cluster(today_row, user_id)
                feat_obj.cluster_label = cluster_id
                feat_obj.cluster_name  = cluster_name

        # ── Regression ───────────────────────────────────────────────────
        if has_enough:
            needs_retrain = _should_retrain(user_id, 'rf_regressor')
            if needs_retrain or not rf_model_exists(user_id):
                metrics = train_regression_pipeline(df, user_id)
                await _save_model_metadata(db, uid, 'rf_regressor', len(df), metrics)

            if rf_model_exists(user_id):
                pred = predict_tomorrow(today_row, user_id)
                if pred:
                    feat_obj.predicted_productivity  = pred.get('predicted_productivity')
                    feat_obj.pred_confidence_lower   = pred.get('confidence_interval', {}).get('lower')
                    feat_obj.pred_confidence_upper   = pred.get('confidence_interval', {}).get('upper')

        # ── Anomaly Detection ────────────────────────────────────────────
        if has_enough:
            needs_retrain = _should_retrain(user_id, 'isolation_forest')
            if needs_retrain or not anomaly_model_exists(user_id):
                metrics = train_anomaly_detector(df, user_id)
                await _save_model_metadata(db, uid, 'isolation_forest', len(df), metrics)

            if anomaly_model_exists(user_id):
                anomaly_result = detect_anomaly(today_row, user_id, df)
                feat_obj.anomaly_score             = anomaly_result.get('anomaly_score')
                feat_obj.is_anomaly                = anomaly_result.get('is_anomaly', False)
                feat_obj.anomaly_details           = anomaly_result.get('feature_deviations') or {}
                feat_obj.primary_anomaly_feature   = anomaly_result.get('primary_anomaly_feature')

        feat_obj.computed_at = datetime.now(timezone.utc)

        # ── Build insight engine input dict ──────────────────────────────
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
            'is_anomaly':            feat_obj.is_anomaly or False,
            'anomaly_score':         feat_obj.anomaly_score or 0,
            'primary_anomaly_feature': feat_obj.primary_anomaly_feature,
            'days_tracked':          len(df),
        }

        # ── Run Insight Engine ────────────────────────────────────────────
        insight_results = run_insight_engine(insight_data)

        # Persist insights (delete today's first to avoid dupes)
        del_stmt = select(Insight).where(
            and_(Insight.user_id == uid, Insight.date == entry_date)
        )
        del_res = await db.execute(del_stmt)
        for old in del_res.scalars().all():
            await db.delete(old)

        # Persist ARIMA trend forecast results to MLModelMetadata
        if has_enough:
            try:
                from app.ml.trend import run_all_trend_forecasts
                trend_results = run_all_trend_forecasts(df)
                if trend_results:
                    await _save_model_metadata(db, uid, 'arima', len(df), trend_results)
            except Exception as e:
                import logging
                logging.getLogger(__name__).warning(f'ARIMA forecast failed: {e}')

        for ins in insight_results:
            # FIX: map all InsightTypes to correct InsightTypeEnum values
            insight_type_map = {
                InsightType.SLEEP:        InsightTypeEnum.TREND,
                InsightType.DIGITAL:      InsightTypeEnum.TREND,
                InsightType.HEALTH:       InsightTypeEnum.TREND,
                InsightType.PRODUCTIVITY: InsightTypeEnum.TREND,
                InsightType.FINANCE:      InsightTypeEnum.TREND,
                InsightType.CORRELATION:  InsightTypeEnum.CORRELATION,
                InsightType.ANOMALY:      InsightTypeEnum.ANOMALY,
                InsightType.TREND:        InsightTypeEnum.TREND,
                InsightType.PREDICTION:   InsightTypeEnum.PREDICTION,
            }
            severity_map = {
                Severity.INFO:     SeverityEnum.INFO,
                Severity.WARNING:  SeverityEnum.WARNING,
                Severity.CRITICAL: SeverityEnum.CRITICAL,
            }
            new_insight = Insight(
                user_id      = uid,
                date         = entry_date,
                insight_type = insight_type_map.get(ins.insight_type, InsightTypeEnum.TREND),
                severity     = severity_map[ins.severity],
                title        = ins.title,
                message      = ins.message,
                data_payload = ins.data_payload,
            )
            db.add(new_insight)

        await db.commit()

    # Invalidate Redis cache
    invalidate_user_cache(user_id)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _entry_to_dict(e: DailyEntry) -> dict:
    return {
        'user_id':           str(e.user_id),
        'date':              e.date,
        'sleep_hours':       float(e.sleep_hours),
        'sleep_quality':     e.sleep_quality,
        'screen_time_hours': float(e.screen_time_hours),
        'social_media_hours': float(e.social_media_hours) if e.social_media_hours else None,
        'steps':             e.steps,
        'active_minutes':    e.active_minutes,
        'deep_work_hours':   float(e.deep_work_hours),
        'tasks_completed':   e.tasks_completed,
        'daily_spend':       float(e.daily_spend),
        'mood_score':        e.mood_score,
        'energy_level':      e.energy_level,
    }


def _write_features_to_obj(feat_obj: EngineeredFeatures, row: pd.Series, life_data: dict):
    feat_obj.sleep_score           = row.get('sleep_score')
    feat_obj.distraction_level     = row.get('distraction_level')
    feat_obj.activity_index        = row.get('activity_index')
    feat_obj.productivity_score    = row.get('productivity_score')
    feat_obj.finance_score         = row.get('finance_score')
    feat_obj.spend_ratio           = row.get('spend_ratio')
    feat_obj.sleep_7d_avg          = row.get('sleep_7d_avg')
    feat_obj.sleep_7d_std          = row.get('sleep_7d_std')
    feat_obj.productivity_7d_avg   = row.get('productivity_7d_avg')
    feat_obj.distraction_7d_avg    = row.get('distraction_7d_avg')
    feat_obj.steps_7d_avg          = row.get('steps_7d_avg')
    feat_obj.sleep_score_lag1         = row.get('sleep_score_lag1')
    feat_obj.screen_time_lag1         = row.get('screen_time_lag1')
    feat_obj.activity_index_lag1      = row.get('activity_index_lag1')
    feat_obj.mood_score_lag1          = row.get('mood_score_lag1')
    feat_obj.productivity_score_lag1  = row.get('productivity_score_lag1')   # FIX: was missing
    feat_obj.life_score               = life_data['life_score']
    feat_obj.life_score_sleep      = life_data['life_score_sleep']
    feat_obj.life_score_productivity = life_data['life_score_productivity']
    feat_obj.life_score_health     = life_data['life_score_health']
    feat_obj.life_score_finance    = life_data['life_score_finance']


def _should_retrain(user_id: str, model_type: str) -> bool:
    """
    Time-gate retrain: only retrain if model file doesn't exist OR older than 7 days.
    Prevents retraining on EVERY entry submission (catastrophic for performance).
    """
    from datetime import datetime, timezone, timedelta

    model_file_map = {
        'kmeans':           MODELS_DIR / f'kmeans_{user_id}.joblib',
        'rf_regressor':     MODELS_DIR / f'rf_{user_id}.joblib',
        'isolation_forest': MODELS_DIR / f'isolation_forest_{user_id}.joblib',
    }
    model_path = model_file_map.get(model_type)
    if model_path is None or not model_path.exists():
        return True

    age = datetime.now(timezone.utc).timestamp() - model_path.stat().st_mtime
    return age > RETRAIN_INTERVAL_DAYS * 86400


async def _save_model_metadata(db, uid, model_type: str, n_samples: int, metrics: dict):
    """Upsert model metadata — update existing row if found, insert if new."""
    from sqlalchemy import and_
    stmt = (
        select(MLModelMetadata)
        .where(and_(
            MLModelMetadata.user_id    == uid,
            MLModelMetadata.model_type == model_type,
            MLModelMetadata.is_active  == True,
        ))
    )
    result = await db.execute(stmt)
    existing = result.scalar_one_or_none()

    clean_metrics = {k: v for k, v in metrics.items() if k != 'model_path'}

    if existing:
        existing.trained_at = datetime.now(timezone.utc)
        existing.n_samples  = n_samples
        existing.metrics    = clean_metrics
    else:
        meta = MLModelMetadata(
            user_id    = uid,
            model_type = model_type,
            n_samples  = n_samples,
            metrics    = clean_metrics,
            is_active  = True,
        )
        db.add(meta)


@celery_app.task(name="app.tasks.ml_tasks.full_pipeline_for_all_users")
def full_pipeline_for_all_users():
    """Daily beat task — retrain/refresh all active users."""
    run_async(_refresh_all_users())


async def _refresh_all_users():
    from app.models.user import User
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User.id))
        user_ids = [str(row[0]) for row in result.fetchall()]

    today = date.today().isoformat()
    for uid in user_ids:
        run_full_pipeline.delay(uid, today)
