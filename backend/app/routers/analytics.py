import html
import uuid
from datetime import date, timedelta
from typing import Optional, Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, and_, case, cast, String
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.utils.db_route import CommitRoute
from app.models.engineered_features import EngineeredFeatures
from app.models.daily_entry import DailyEntry
from app.models.insight import Insight
from app.models.ml_model_metadata import MLModelMetadata
from app.schemas.analytics import (
    DashboardResponse, DailySummarySchema, LifeScoreComponents, InsightResponse,
    LifeScoreHistoryPoint, PredictionResponse, ClusterBreakdownResponse,
    AnomalyResponse, CorrelationResponse,
    CompositeRiskForecastResponse, DailyMorningBriefingResponse,
    WeeklyReviewStoryResponse, DynamicCorrelationResponse
)
from app.services.briefing_service import BriefingService
from app.ml.insight_engine import generate_daily_summary
from app.ml.feature_engineering import get_data_maturity
import pandas as pd
from app.cache.redis_client import get_cached, set_cached
from app.utils.security import get_current_user

router = APIRouter(route_class=CommitRoute)


@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard(
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get the main dashboard data.
    Checks Redis cache first (TTL: 1 hour).
    """
    cache_key = f"dashboard:{user_id}"
    cached = get_cached(cache_key)
    if cached:
        return DashboardResponse(**cached)

    uid = uuid.UUID(user_id)
    today = date.today()

    # Count total days tracked
    count_stmt = select(func.count()).where(DailyEntry.user_id == uid)
    count_result = await db.execute(count_stmt)
    days_tracked = count_result.scalar() or 0

    # Single consolidated query for recent features (covers today, yesterday, and 30d trend)
    feat_stmt = (
        select(EngineeredFeatures)
        .where(EngineeredFeatures.user_id == uid)
        .order_by(EngineeredFeatures.date.desc())
        .limit(31)
    )
    feat_result = await db.execute(feat_stmt)
    recent_features = list(feat_result.scalars().all())

    today_features = recent_features[0] if recent_features else None
    ref_date = today_features.date if today_features else today
    yesterday = ref_date - timedelta(days=1)
    yest_features = next((f for f in recent_features if f.date == yesterday), None)

    # Compute life score change
    life_score = today_features.life_score if today_features and today_features.life_score else 0
    yest_score = yest_features.life_score if yest_features and yest_features.life_score else life_score
    score_change = round(life_score - yest_score, 1)

    # Get top insights for most recent available date — CRITICAL first
    severity_order = case(
        {"CRITICAL": 0, "WARNING": 1, "INFO": 2},
        value=cast(Insight.severity, String),
    )
    insight_stmt = (
        select(Insight)
        .where(and_(Insight.user_id == uid, Insight.date == ref_date))
        .order_by(severity_order.asc())
        .limit(5)
    )
    insight_result = await db.execute(insight_stmt)
    raw_insights = insight_result.scalars().all()
    top_insights = [
        {
            "id": str(i.id),
            "title": i.title,
            "message": i.message,
            "severity": i.severity.value if hasattr(i.severity, 'value') else i.severity,
            "insight_type": i.insight_type.value if hasattr(i.insight_type, 'value') else i.insight_type,
        }
        for i in raw_insights
    ]

    # 30-day trend data from consolidated query (chronological order)
    trend_data = [
        {
            "date": str(f.date),
            "life_score": f.life_score or 0,
            "sleep_score": f.sleep_score or 0,
            "productivity_score": f.productivity_score or 0,
        }
        for f in reversed(recent_features[:30])
    ]

    # ── Generate structured daily summary (What/Why/Action) ──────────────────
    daily_summary_obj = None
    if today_features:
        try:
            # Reconstruct insight_data for summary generation
            insight_data_for_summary = {
                'sleep_score':        float(today_features.sleep_score or 0),
                'sleep_7d_avg':       float(today_features.sleep_7d_avg or 8),
                'sleep_7d_std':       float(today_features.sleep_7d_std or 0),
                'steps_7d_avg':       float(today_features.steps_7d_avg or 8000),
                'productivity_score': float(today_features.productivity_score or 0),
                'productivity_7d_avg':float(today_features.productivity_7d_avg or 50),
                'spend_ratio':        float(today_features.spend_ratio or 1.0),
                'mood_score_lag1':    today_features.mood_score_lag1,
                'distraction_level':  float(today_features.distraction_level or 0),
                'distraction_7d_avg': float(today_features.distraction_7d_avg or 0),
                'is_anomaly':         bool(today_features.is_anomaly),
                'anomaly_score':      float(today_features.anomaly_score or 0),
                'primary_anomaly_feature': today_features.primary_anomaly_feature,
                'days_tracked':       days_tracked,
                'data_maturity':      'rule_based',
            }
            from app.ml.insight_engine import InsightResult
            from app.ml.insight_engine import Severity, InsightType
            insight_results = [
                InsightResult(
                    severity=Severity(i['severity']),
                    insight_type=InsightType(i['insight_type']),
                    title=i['title'],
                    message=i['message'],
                )
                for i in top_insights
                if i.get('severity') and i.get('insight_type')
            ]
            summary = generate_daily_summary(insight_results, insight_data_for_summary)
            daily_summary_obj = DailySummarySchema(
                what=summary.what,
                why=summary.why,
                action=summary.action,
                severity=summary.severity.value,
                insight_type=summary.insight_type.value,
                title=summary.title,
            )
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"Daily summary generation failed: {e}")

    # ── Data maturity tier ──────────────────────────────────────────────────
    try:
        maturity = get_data_maturity(days_tracked)
        data_maturity_val    = maturity.value
        data_maturity_label  = maturity.label
        days_until_next_tier = maturity.days_needed_for_next
    except Exception:
        data_maturity_val = data_maturity_label = None
        days_until_next_tier = None

    # Domain scores are 0–100. The stored life_score_* fields are weighted point
    # contributions, so return the underlying normalized domain scores instead.
    if today_features:
        sleep_domain = float(today_features.sleep_score or 0)
        productivity_domain = float(today_features.productivity_score or 0)
        health_domain = float(today_features.activity_index or 0) * 100
        finance_domain = float(today_features.finance_score or 0)
        weighted_sum = sum(
            float(v or 0)
            for v in (
                today_features.life_score_sleep,
                today_features.life_score_productivity,
                today_features.life_score_health,
                today_features.life_score_finance,
            )
        )
        mood_adjustment = round(float(today_features.life_score or 0) - weighted_sum, 1)
    else:
        sleep_domain = productivity_domain = health_domain = finance_domain = 0.0
        mood_adjustment = 0.0

    components = LifeScoreComponents(
        sleep=round(sleep_domain, 1),
        productivity=round(productivity_domain, 1),
        health=round(health_domain, 1),
        finance=round(finance_domain, 1),
        mood_adjustment=mood_adjustment,
    )

    response = DashboardResponse(
        today_date=str(today),
        life_score=life_score,
        life_score_components=components,
        life_score_change_from_yesterday=score_change,
        cluster_label=today_features.cluster_name if today_features else None,
        top_insights=top_insights,
        trend_data=trend_data,
        days_tracked=days_tracked,
        is_data_sufficient_for_ml=days_tracked >= 7,
        daily_summary=daily_summary_obj,
        data_maturity=data_maturity_val,
        data_maturity_label=data_maturity_label,
        days_until_next_tier=days_until_next_tier,
    )

    # Cache for 1 hour
    set_cached(cache_key, response.model_dump(), ttl=3600)
    return response


@router.get("/life-score/history", response_model=list[LifeScoreHistoryPoint])
async def get_life_score_history(
    days: int = Query(30, ge=7, le=365),
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get life score history for the last N days."""
    cache_key = f"life_score_history:{user_id}:{days}"
    cached = get_cached(cache_key)
    if cached:
        return cached

    uid = uuid.UUID(user_id)
    start = date.today() - timedelta(days=days)

    stmt = (
        select(EngineeredFeatures)
        .where(and_(
            EngineeredFeatures.user_id == uid,
            EngineeredFeatures.date >= start,
        ))
        .order_by(EngineeredFeatures.date.asc())
    )
    result = await db.execute(stmt)
    features = result.scalars().all()

    history = [
        LifeScoreHistoryPoint(
            date=str(f.date),
            life_score=f.life_score or 0,
            sleep_score=f.sleep_score,
            productivity_score=f.productivity_score,
            health_score=f.life_score_health,
            finance_score=f.life_score_finance,
            cluster_name=f.cluster_name,
            is_anomaly=f.is_anomaly or False,
        )
        for f in features
    ]

    set_cached(cache_key, [h.model_dump() for h in history], ttl=3600)
    return history


@router.get("/insights", response_model=list[InsightResponse])
async def get_insights(
    entry_date: Optional[date] = Query(None, alias="date"),
    severity: Optional[str] = Query(None),
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get insights, optionally filtered by date and/or severity."""
    uid = uuid.UUID(user_id)
    stmt = select(Insight).where(Insight.user_id == uid)

    if entry_date:
        stmt = stmt.where(Insight.date == entry_date)
    if severity:
        stmt = stmt.where(cast(Insight.severity, String) == severity)

    severity_order = case(
        {"CRITICAL": 0, "WARNING": 1, "INFO": 2},
        value=cast(Insight.severity, String),
    )
    stmt = stmt.order_by(severity_order.asc(), Insight.created_at.desc()).limit(50)
    result = await db.execute(stmt)
    insights = result.scalars().all()

    return [
        InsightResponse(
            id=str(i.id),
            date=str(i.date),
            insight_type=i.insight_type.value if hasattr(i.insight_type, 'value') else i.insight_type,
            severity=i.severity.value if hasattr(i.severity, 'value') else i.severity,
            title=i.title,
            message=i.message,
            data_payload=i.data_payload,
            is_read=i.is_read,
            created_at=i.created_at.isoformat() if i.created_at else "",
        )
        for i in insights
    ]


@router.get("/prediction/tomorrow", response_model=Optional[PredictionResponse])
async def get_prediction(
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get tomorrow's productivity prediction."""
    cache_key = f"prediction:{user_id}"
    cached = get_cached(cache_key)
    if cached:
        return PredictionResponse(**cached)

    # Prediction data comes from the ML pipeline — fall back to most recent available
    uid = uuid.UUID(user_id)
    today = date.today()

    stmt = select(EngineeredFeatures).where(
        and_(EngineeredFeatures.user_id == uid, EngineeredFeatures.date == today)
    )
    result = await db.execute(stmt)
    features = result.scalar_one_or_none()

    # No entry today — try most recent row that has a prediction
    if not features or features.predicted_productivity is None:
        fallback_stmt = (
            select(EngineeredFeatures)
            .where(and_(
                EngineeredFeatures.user_id == uid,
                EngineeredFeatures.predicted_productivity.isnot(None),
            ))
            .order_by(EngineeredFeatures.date.desc())
            .limit(1)
        )
        fallback_result = await db.execute(fallback_stmt)
        features = fallback_result.scalar_one_or_none()

    if not features or features.predicted_productivity is None:
        return None

    # FIX: read real RF metadata for key_driver and importances
    key_driver      = "sleep_score_lag1"
    key_driver_pct  = 0.0
    improvement_tip = "Get 7+ hours of quality sleep tonight to boost tomorrow's productivity."

    meta_stmt = (
        select(MLModelMetadata)
        .where(and_(
            MLModelMetadata.user_id == uid,
            MLModelMetadata.model_type == 'rf_regressor',
            MLModelMetadata.is_active.is_(True),
        ))
        .order_by(MLModelMetadata.trained_at.desc())
        .limit(1)
    )
    meta_result = await db.execute(meta_stmt)
    rf_meta = meta_result.scalar_one_or_none()
    if rf_meta and rf_meta.metrics:
        importances = rf_meta.metrics.get('feature_importances', {})
        if importances:
            key_driver     = max(importances, key=importances.get)
            key_driver_pct = float(importances[key_driver])

    tips = {
        'sleep_score_lag1':    "Get 7–9 hours of quality sleep tonight.",
        'screen_time_lag1':    "Keep screen time under 3 hours today.",
        'activity_index_lag1': "Hit 10,000 steps to improve tomorrow's output.",
        'mood_score_lag1':     "Your mood is the key driver — rest and recharge.",
        'sleep_7d_avg':        "Maintain consistent sleep over the next few days.",
        'distraction_7d_avg':  "Reduce distractions to improve weekly output.",
        'sleep_7d_std':        "Irregular sleep is hurting you — aim for a consistent bedtime.",
    }
    improvement_tip = tips.get(key_driver, improvement_tip)

    response = PredictionResponse(
        predicted_productivity=features.predicted_productivity,
        confidence_interval={
            "lower": features.pred_confidence_lower or 0,
            "upper": features.pred_confidence_upper or 100,
        },
        key_driver=key_driver,
        key_driver_importance_pct=key_driver_pct,
        improvement_tip=improvement_tip,
    )

    set_cached(cache_key, response.model_dump(), ttl=21600)
    return response


@router.get("/clusters", response_model=Optional[ClusterBreakdownResponse])
async def get_clusters(
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get cluster breakdown for the user's data."""
    cache_key = f"clusters:{user_id}"
    cached = get_cached(cache_key)
    if cached:
        return ClusterBreakdownResponse(**cached)

    uid = uuid.UUID(user_id)

    stmt = (
        select(EngineeredFeatures)
        .where(and_(
            EngineeredFeatures.user_id == uid,
            EngineeredFeatures.cluster_label.isnot(None),
        ))
    )
    result = await db.execute(stmt)
    features = result.scalars().all()

    if not features:
        return None

    # Aggregate cluster data
    cluster_counts: dict = {}
    cluster_features: dict = {}
    total = len(features)

    for f in features:
        name = f.cluster_name or f"Cluster {f.cluster_label}"
        if name not in cluster_counts:
            cluster_counts[name] = 0
            cluster_features[name] = {
                "sleep_score": [], "distraction_level": [],
                "activity_index": [], "productivity_score": [], "spend_ratio": []
            }
        cluster_counts[name] += 1
        for key in cluster_features[name]:
            val = getattr(f, key, None)
            if val is not None:
                cluster_features[name][key].append(val)

    clusters = []
    radar_data = []
    for name, count in cluster_counts.items():
        avg_feats = {k: round(sum(v) / len(v), 2) if v else 0 for k, v in cluster_features[name].items()}
        clusters.append({
            "cluster_name": name,
            "day_count": count,
            "pct_of_total": round(count / total * 100, 1),
            "avg_features": avg_feats,
        })
        radar_data.append({"cluster": name, **avg_feats})

    response = ClusterBreakdownResponse(clusters=clusters, radar_data=radar_data)
    set_cached(cache_key, response.model_dump(), ttl=43200)
    return response


@router.get("/anomalies", response_model=list[AnomalyResponse])
async def get_anomalies(
    last_n_days: int = Query(7, ge=1, le=90),
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get anomalous days in the last N days."""
    uid = uuid.UUID(user_id)
    start = date.today() - timedelta(days=last_n_days)

    stmt = (
        select(EngineeredFeatures)
        .where(and_(
            EngineeredFeatures.user_id == uid,
            EngineeredFeatures.date >= start,
            EngineeredFeatures.is_anomaly.is_(True),
        ))
        .order_by(EngineeredFeatures.date.desc())
    )
    result = await db.execute(stmt)
    anomalies = result.scalars().all()

    return [
        AnomalyResponse(
            date=str(a.date),
            anomaly_score=a.anomaly_score or 0,
            # FIX: pull feature_deviations and primary_feature from daily insight records
            primary_anomaly_feature=_get_anomaly_primary_feature(a),
            feature_deviations=_get_anomaly_deviations(a),
            insight_message=(
                f"Unusual day on {a.date}: anomaly score {a.anomaly_score or 0:.2f}. "
                f"Your behaviour deviated significantly from your baseline."
            ),
        )
        for a in anomalies
    ]


@router.get("/correlations", response_model=list[CorrelationResponse])
async def get_correlations(
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get significant correlations in user's data (requires 30+ days)."""
    cache_key = f"correlations:{user_id}"
    cached = get_cached(cache_key)
    if cached:
        return cached

    uid = uuid.UUID(user_id)
    from sqlalchemy import select as sa_select
    from app.models.daily_entry import DailyEntry as DE
    from app.ml.correlation import analyse_correlations

    stmt = sa_select(DE).where(DE.user_id == uid).order_by(DE.date.asc())
    result = await db.execute(stmt)
    entries = result.scalars().all()

    if len(entries) < 30:
        return []

    # Vectorized column dictionary conversion
    records = {
        'user_id':           [str(e.user_id) for e in entries],
        'date':              [e.date for e in entries],
        'sleep_hours':       [float(e.sleep_hours) for e in entries],
        'sleep_quality':     [int(e.sleep_quality) for e in entries],
        'screen_time_hours': [float(e.screen_time_hours) for e in entries],
        'steps':             [int(e.steps) for e in entries],
        'deep_work_hours':   [float(e.deep_work_hours) for e in entries],
        'daily_spend':       [float(e.daily_spend) for e in entries],
        'mood_score':        [e.mood_score for e in entries],
        'energy_level':      [e.energy_level for e in entries],
        'social_media_hours':[float(e.social_media_hours) if e.social_media_hours is not None else None for e in entries],
        'active_minutes':    [e.active_minutes for e in entries],
        'tasks_completed':   [e.tasks_completed for e in entries],
    }
    raw_df = pd.DataFrame(records)
    from app.ml.feature_engineering import engineer_features
    df = engineer_features(raw_df)

    findings = analyse_correlations(df)
    response = [
        CorrelationResponse(
            feature_a=f['feature_a'], feature_b=f['feature_b'],
            name_a=f['name_a'], name_b=f['name_b'],
            r=f['r'], p_value=f['p_value'],
            insight_message=f['insight_message'],
        )
        for f in findings
    ]

    set_cached(cache_key, [r.model_dump() for r in response], ttl=43200)
    return response


def _get_anomaly_primary_feature(feat_obj) -> str | None:
    """Read primary anomaly feature stored during ML pipeline run."""
    return getattr(feat_obj, 'primary_anomaly_feature', None)


def _get_anomaly_deviations(feat_obj) -> dict:
    """Read feature deviations stored during ML pipeline run."""
    return getattr(feat_obj, 'anomaly_details', None) or {}


# ---------------------------------------------------------------------------
# Phase 6: Behavioral Risk Forecasters & AI Personal Life Briefings
# ---------------------------------------------------------------------------

@router.get("/forecasts/risks", response_model=CompositeRiskForecastResponse)
async def get_risk_forecasts(
    target_date: Optional[date] = Query(None, alias="date"),
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get multi-head behavioral risk forecasts:
      - Workout Skip Risk Classifier (0.0 - 1.0 probability)
      - Budget Overrun Forecaster (EOM projection & velocity)
      - Circadian Drift Detector (Bedtime variance & phase shift)
    """
    uid = uuid.UUID(user_id)
    forecast = await BriefingService.get_composite_risk_forecasts(
        db=db, user_id=uid, target_date=target_date
    )
    return CompositeRiskForecastResponse(
        date=forecast.date,
        workout_skip=forecast.workout_skip.__dict__,
        budget_overrun=forecast.budget_overrun.__dict__,
        circadian_drift=forecast.circadian_drift.__dict__,
        overall_risk_score=forecast.overall_risk_score,
        key_vulnerability_summary=forecast.key_vulnerability_summary,
    )


@router.get("/briefing/morning", response_model=DailyMorningBriefingResponse)
async def get_morning_briefing(
    target_date: Optional[date] = Query(None, alias="date"),
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get or generate today's morning briefing:
      - Physical/neural recovery score (0-100)
      - Peak ultradian focus windows
      - Behavioral risk alerts with concrete micro-actions
      - Today's active experiment challenge
    """
    uid = uuid.UUID(user_id)
    briefing = await BriefingService.get_or_create_morning_briefing(
        db=db, user_id=uid, target_date=target_date
    )
    return DailyMorningBriefingResponse(**briefing)


@router.get("/briefing/weekly", response_model=WeeklyReviewStoryResponse)
async def get_weekly_review(
    target_date: Optional[date] = Query(None, alias="date"),
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get or generate Sunday Evening Weekly Review Story:
      - Holistic 7-day narrative arc
      - Top wins & behavioral bottlenecks
      - Best day & recovery day highlights
      - Next week's scientific experiment recommendation
      - Printable/shareable HTML export card
    """
    uid = uuid.UUID(user_id)
    story = await BriefingService.get_or_create_weekly_review(
        db=db, user_id=uid, target_date=target_date
    )
    return WeeklyReviewStoryResponse(**story)


@router.get("/correlations/dynamic", response_model=list[DynamicCorrelationResponse])
async def get_dynamic_correlations(
    min_sample_size: int = Query(7, ge=3, le=90),
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get dynamic multi-lag cross-feature correlations:
      - Temporal lag analysis (X[t-1] -> Y[t] and X[t] -> Y[t])
      - Pearson r, two-tailed p-value, Fisher z confidence intervals
      - Epistemic qualifiers strictly distinguishing correlation vs causation
    """
    uid = uuid.UUID(user_id)
    findings = await BriefingService.get_dynamic_correlations(
        db=db, user_id=uid, min_sample_size=min_sample_size
    )
    return [
        DynamicCorrelationResponse(
            feature_a=f.feature_a,
            feature_b=f.feature_b,
            name_a=f.name_a,
            name_b=f.name_b,
            lag=f.lag,
            r=f.r,
            p_value=f.p_value,
            sample_size=f.sample_size,
            is_statistically_significant=f.is_statistically_significant,
            strength=f.strength,
            direction=f.direction,
            ci_lower=f.ci_lower,
            ci_upper=f.ci_upper,
            insight_narrative=f.insight_narrative,
            epistemic_qualifier=f.epistemic_qualifier,
        )
        for f in findings
    ]


@router.get("/briefing/export")
async def export_briefing(
    briefing_type: Literal["DAILY_MORNING", "WEEKLY_REVIEW"] = Query("WEEKLY_REVIEW"),
    export_format: Literal["html", "markdown"] = Query("html"),
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Export briefing narrative as HTML or Markdown for user self-reflection.
    """
    from fastapi.responses import HTMLResponse, PlainTextResponse
    uid = uuid.UUID(user_id)
    if briefing_type == "DAILY_MORNING":
        b = await BriefingService.get_or_create_morning_briefing(db=db, user_id=uid)
        content = b["full_markdown"]
        if export_format == "html":
            safe_content = html.escape(content)
            html_wrap = f"<html><body style='font-family:sans-serif;padding:24px;background:#0A0D14;color:#FFF;'><pre style='white-space:pre-wrap;'>{safe_content}</pre></body></html>"
            return HTMLResponse(content=html_wrap)
        return PlainTextResponse(content=content)
    else:
        w = await BriefingService.get_or_create_weekly_review(db=db, user_id=uid)
        if export_format == "html":
            return HTMLResponse(content=w.get("html_export_card", "<div>No export available</div>"))
        return PlainTextResponse(content=w.get("full_narrative_markdown", ""))
