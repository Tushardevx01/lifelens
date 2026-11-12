"""
LifeLens Structured Telemetry Tools for Conversational AI Companion (Phase 3).

Exposes personal telemetry querying and analytical synthesis functions:
  1. get_sleep_analysis(days: int)
  2. get_spending_breakdown(timeframe: str, category: Optional[str])
  3. get_productivity_patterns(days: int)
  4. get_active_experiments()
  5. get_anomalies_and_clusters(days: int)
  6. get_life_score_overview()

All tools return structured, serializable dictionaries containing:
- Quantitative statistics
- Epistemic pattern summaries (correlation vs causation qualified)
- Interactive Card data payloads for inline UI rendering
"""

from __future__ import annotations
import logging
import math
import uuid
from datetime import date, datetime, timedelta
from typing import Dict, Any, List, Optional

try:
    import sqlalchemy as sa
    from sqlalchemy import select, func, and_, desc
    from sqlalchemy.ext.asyncio import AsyncSession
except ImportError:
    sa = None  # type: ignore
    select = func = and_ = desc = None  # type: ignore
    AsyncSession = Any  # type: ignore

try:
    from app.models.daily_entry import DailyEntry
    from app.models.telemetry import (
        FinancialTransaction,
        AppUsageSession,
        FocusStudySession,
        Habit,
        HabitLog,
    )
    from app.models.experiment import Experiment, ExperimentCheckin, ExperimentStatusEnum
    from app.models.insight import Insight
    from app.models.engineered_features import EngineeredFeatures
except ImportError:
    DailyEntry = None  # type: ignore
    FinancialTransaction = None  # type: ignore
    AppUsageSession = None  # type: ignore
    FocusStudySession = None  # type: ignore
    Habit = None  # type: ignore
    HabitLog = None  # type: ignore
    Experiment = None  # type: ignore
    ExperimentCheckin = None  # type: ignore
    ExperimentStatusEnum = None  # type: ignore
    Insight = None  # type: ignore
    EngineeredFeatures = None  # type: ignore


# ============================================================================
# LLM Function Tool Declarations (OpenAI / Gemini / Claude Compatible Schema)
# ============================================================================

TOOL_DECLARATIONS = [
    {
        "type": "function",
        "function": {
            "name": "get_sleep_analysis",
            "description": "Analyzes user's sleep patterns, average duration, quality, bedtime consistency, and screen time association over recent days.",
            "parameters": {
                "type": "object",
                "properties": {
                    "days": {
                        "type": "integer",
                        "description": "Number of recent days to analyze (default 14, range 3-60)",
                        "default": 14,
                    }
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_spending_breakdown",
            "description": "Aggregates financial spending transactions, discretionary vs non-discretionary split, top categories, and weekend vs weekday habits.",
            "parameters": {
                "type": "object",
                "properties": {
                    "timeframe": {
                        "type": "string",
                        "description": "Time window: '7d', '14d', '30d', or 'this_month'",
                        "default": "30d",
                    },
                    "category": {
                        "type": "string",
                        "description": "Optional category filter (e.g. 'Food & Dining', 'Entertainment', 'Shopping')",
                    },
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_productivity_patterns",
            "description": "Analyzes deep work hours, focus study sessions, distraction rates, task completion, and previous night sleep impact.",
            "parameters": {
                "type": "object",
                "properties": {
                    "days": {
                        "type": "integer",
                        "description": "Number of days to analyze (default 14)",
                        "default": 14,
                    }
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_active_experiments",
            "description": "Retrieves active behavioral experiments, hypotheses, adherence rates, interim deltas, and recently completed experiment outcomes.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_anomalies_and_clusters",
            "description": "Fetches detected behavioral anomalies (outliers in sleep, spending, or screen time) and user's behavioral cluster archetype.",
            "parameters": {
                "type": "object",
                "properties": {
                    "days": {
                        "type": "integer",
                        "description": "Number of days to check for anomalies (default 14)",
                        "default": 14,
                    }
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_life_score_overview",
            "description": "Fetches current composite LifeScore, domain sub-scores (sleep, productivity, health, finance), and trend trajectory.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
            },
        },
    },
]


# ============================================================================
# Tool Implementations
# ============================================================================

async def get_sleep_analysis(
    db: AsyncSession,
    user_id: uuid.UUID,
    days: int = 14,
) -> Dict[str, Any]:
    """
    Analyzes sleep duration, quality, bedtime variance, and digital screen correlation.
    """
    days = max(3, min(60, int(days)))
    cutoff = date.today() - timedelta(days=days)

    stmt = (
        select(DailyEntry)
        .where(
            and_(
                DailyEntry.user_id == user_id,
                DailyEntry.date >= cutoff,
            )
        )
        .order_by(DailyEntry.date.desc())
    )
    result = await db.execute(stmt)
    entries: List[DailyEntry] = list(result.scalars().all())

    if not entries:
        return {
            "status": "no_data",
            "message": f"No sleep logs recorded in the last {days} days.",
            "days_analyzed": 0,
            "card": None,
        }

    sleep_hours = [float(e.sleep_hours) for e in entries if e.sleep_hours is not None]
    sleep_qualities = [int(e.sleep_quality) for e in entries if e.sleep_quality is not None]

    avg_sleep = round(sum(sleep_hours) / len(sleep_hours), 2) if sleep_hours else 0.0
    # DailyEntry sleep_quality is 1–5; the tool card reports it on a 0–10 scale.
    avg_quality = round(sum(sleep_qualities) / len(sleep_qualities) * 2, 1) if sleep_qualities else 0.0
    min_sleep = round(min(sleep_hours), 2) if sleep_hours else 0.0
    max_sleep = round(max(sleep_hours), 2) if sleep_hours else 0.0

    # Bedtime consistency (minutes variance)
    bedtimes = [e.sleep_bedtime for e in entries if e.sleep_bedtime is not None]
    bedtime_variance_min = 0
    if len(bedtimes) >= 3:
        minutes_list = [b.hour * 60 + b.minute for b in bedtimes]
        # Normalize times around midnight (e.g. 23:30 is -30, 01:00 is +60)
        norm_minutes = [m if m < 720 else m - 1440 for m in minutes_list]
        mean_m = sum(norm_minutes) / len(norm_minutes)
        variance = sum((m - mean_m) ** 2 for m in norm_minutes) / (len(norm_minutes) - 1)
        bedtime_variance_min = int(math.sqrt(variance))

    # Screen time correlation observation
    high_screen_threshold = 4.0
    high_screen_sleep = []
    low_screen_sleep = []
    for e in entries:
        if e.screen_time_hours is not None and e.sleep_hours is not None:
            if float(e.screen_time_hours) >= high_screen_threshold:
                high_screen_sleep.append(float(e.sleep_hours))
            else:
                low_screen_sleep.append(float(e.sleep_hours))

    correlation_note = None
    if high_screen_sleep and low_screen_sleep:
        avg_high = sum(high_screen_sleep) / len(high_screen_sleep)
        avg_low = sum(low_screen_sleep) / len(low_screen_sleep)
        diff = round(avg_low - avg_high, 1)
        if diff > 0.3:
            correlation_note = (
                f"On days with screen time over {high_screen_threshold}h, average sleep was {avg_high:.1f}h "
                f"vs {avg_low:.1f}h on other days (a difference of {diff}h; note: correlation does not prove causation)."
            )

    # Check late-night app sessions
    app_stmt = (
        select(func.count(AppUsageSession.id))
        .where(
            and_(
                AppUsageSession.user_id == user_id,
                AppUsageSession.is_late_night == True,  # noqa: E712
                AppUsageSession.start_time >= cutoff,
            )
        )
    )
    app_res = await db.execute(app_stmt)
    late_night_count = app_res.scalar() or 0

    card_data = {
        "card_type": "sleep_analysis",
        "title": f"Sleep Patterns ({len(entries)} days)",
        "data": {
            "avg_sleep_hours": avg_sleep,
            "avg_quality": avg_quality,
            "min_sleep": min_sleep,
            "max_sleep": max_sleep,
            "bedtime_variance_min": bedtime_variance_min,
            "late_night_sessions": late_night_count,
            "correlation_note": correlation_note,
            "entries_count": len(entries),
        },
    }

    return {
        "days_analyzed": len(entries),
        "avg_sleep_hours": avg_sleep,
        "avg_sleep_quality_out_of_10": avg_quality,
        "min_sleep_hours": min_sleep,
        "max_sleep_hours": max_sleep,
        "bedtime_variance_minutes": bedtime_variance_min,
        "late_night_screen_sessions": late_night_count,
        "correlation_observation": correlation_note,
        "card": card_data,
    }


async def get_spending_breakdown(
    db: AsyncSession,
    user_id: uuid.UUID,
    timeframe: str = "30d",
    category: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Aggregates financial transactions, discretionary vs essentials ratio, and weekend spending.
    """
    days = 30
    if timeframe == "7d":
        days = 7
    elif timeframe == "14d":
        days = 14
    elif timeframe == "30d" or timeframe == "this_month":
        days = 30

    cutoff = date.today() - timedelta(days=days)

    filters = [
        FinancialTransaction.user_id == user_id,
        FinancialTransaction.timestamp >= cutoff,
    ]
    if category:
        filters.append(func.lower(FinancialTransaction.category) == category.lower())

    stmt = (
        select(FinancialTransaction)
        .where(and_(*filters))
        .order_by(FinancialTransaction.timestamp.desc())
    )
    result = await db.execute(stmt)
    txs: List[FinancialTransaction] = list(result.scalars().all())

    # Fallback to DailyEntry daily_spend if no granular transactions
    if not txs:
        entry_stmt = (
            select(DailyEntry)
            .where(
                and_(
                    DailyEntry.user_id == user_id,
                    DailyEntry.date >= cutoff,
                )
            )
            .order_by(DailyEntry.date.desc())
        )
        entry_res = await db.execute(entry_stmt)
        daily_entries = list(entry_res.scalars().all())
        if not daily_entries:
            return {
                "status": "no_data",
                "message": f"No spending or daily spend logs recorded in the last {days} days.",
                "card": None,
            }
        total_spend = sum(float(e.daily_spend) for e in daily_entries if e.daily_spend)
        avg_daily = round(total_spend / len(daily_entries), 2) if daily_entries else 0.0

        card_data = {
            "card_type": "spending_breakdown",
            "title": f"Spending Summary ({days} days)",
            "data": {
                "total_spend": round(total_spend, 2),
                "avg_daily_spend": avg_daily,
                "days_logged": len(daily_entries),
                "is_granular": False,
            },
        }
        return {
            "timeframe": f"{days} days",
            "total_spend": round(total_spend, 2),
            "avg_daily_spend": avg_daily,
            "days_logged": len(daily_entries),
            "is_granular": False,
            "card": card_data,
        }

    total_spend = sum(float(t.amount) for t in txs)
    discretionary_spend = sum(float(t.amount) for t in txs if t.is_discretionary)
    non_discretionary_spend = total_spend - discretionary_spend
    discretionary_pct = round((discretionary_spend / total_spend * 100), 1) if total_spend > 0 else 0.0

    # Category breakdown
    cat_map: Dict[str, float] = {}
    for t in txs:
        cat_name = t.category or "Other"
        cat_map[cat_name] = cat_map.get(cat_name, 0.0) + float(t.amount)

    sorted_cats = sorted(cat_map.items(), key=lambda x: x[1], reverse=True)
    top_categories = [{"category": k, "amount": round(v, 2), "pct": round(v / total_spend * 100, 1)} for k, v in sorted_cats[:5]]

    # Weekend vs Weekday analysis
    weekend_amounts = []
    weekday_amounts = []
    for t in txs:
        # Python weekday: Monday=0, Sunday=6
        if t.timestamp.weekday() in (5, 6):
            weekend_amounts.append(float(t.amount))
        else:
            weekday_amounts.append(float(t.amount))

    weekend_total = sum(weekend_amounts)
    weekday_total = sum(weekday_amounts)

    card_data = {
        "card_type": "spending_breakdown",
        "title": f"Spending Breakdown ({days} days)",
        "data": {
            "total_spend": round(total_spend, 2),
            "discretionary_spend": round(discretionary_spend, 2),
            "non_discretionary_spend": round(non_discretionary_spend, 2),
            "discretionary_ratio_pct": discretionary_pct,
            "top_categories": top_categories,
            "weekend_total": round(weekend_total, 2),
            "weekday_total": round(weekday_total, 2),
            "transaction_count": len(txs),
            "is_granular": True,
        },
    }

    return {
        "timeframe": f"{days} days",
        "total_spend": round(total_spend, 2),
        "discretionary_spend": round(discretionary_spend, 2),
        "non_discretionary_spend": round(non_discretionary_spend, 2),
        "discretionary_ratio_pct": discretionary_pct,
        "top_categories": top_categories,
        "weekend_total": round(weekend_total, 2),
        "weekday_total": round(weekday_total, 2),
        "transaction_count": len(txs),
        "card": card_data,
    }


async def get_productivity_patterns(
    db: AsyncSession,
    user_id: uuid.UUID,
    days: int = 14,
) -> Dict[str, Any]:
    """
    Analyzes deep work hours, focus blocks, distraction rates, and previous night sleep impact.
    """
    days = max(3, min(60, int(days)))
    cutoff = date.today() - timedelta(days=days)

    stmt = (
        select(DailyEntry)
        .where(and_(DailyEntry.user_id == user_id, DailyEntry.date >= cutoff))
        .order_by(DailyEntry.date.desc())
    )
    res = await db.execute(stmt)
    entries: List[DailyEntry] = list(res.scalars().all())

    # Focus sessions
    focus_stmt = (
        select(FocusStudySession)
        .where(and_(FocusStudySession.user_id == user_id, FocusStudySession.start_time >= cutoff))
        .order_by(FocusStudySession.start_time.desc())
    )
    focus_res = await db.execute(focus_stmt)
    focus_sessions: List[FocusStudySession] = list(focus_res.scalars().all())

    if not entries and not focus_sessions:
        return {
            "status": "no_data",
            "message": f"No productivity or focus logs recorded in the last {days} days.",
            "days_analyzed": 0,
            "card": None,
        }

    deep_work_hours = [float(e.deep_work_hours) for e in entries if e.deep_work_hours is not None]
    tasks = [int(e.tasks_completed) for e in entries if e.tasks_completed is not None]

    avg_deep_work = round(sum(deep_work_hours) / len(deep_work_hours), 2) if deep_work_hours else 0.0
    avg_tasks = round(sum(tasks) / len(tasks), 1) if tasks else 0.0

    # Distraction analysis
    total_distractions = sum(s.distraction_count for s in focus_sessions)
    total_focus_min = sum(s.duration_minutes for s in focus_sessions)
    distraction_rate_per_hour = (
        round((total_distractions / (total_focus_min / 60)), 1)
        if total_focus_min > 0 else 0.0
    )

    ratings = [s.self_reported_focus for s in focus_sessions if s.self_reported_focus is not None]
    avg_focus_rating = round(sum(ratings) / len(ratings), 1) if ratings else 0.0

    # Subject breakdown
    subjects: Dict[str, int] = {}
    for s in focus_sessions:
        subj = s.subject_or_task or "General Focus"
        subjects[subj] = subjects.get(subj, 0) + s.duration_minutes

    top_subjects = [{"subject": k, "minutes": v} for k, v in sorted(subjects.items(), key=lambda x: x[1], reverse=True)[:4]]

    card_data = {
        "card_type": "productivity_patterns",
        "title": f"Productivity & Deep Work ({len(entries)} days)",
        "data": {
            "avg_deep_work_hours": avg_deep_work,
            "avg_tasks_completed": avg_tasks,
            "total_focus_sessions": len(focus_sessions),
            "distraction_rate_per_hour": distraction_rate_per_hour,
            "avg_focus_rating": avg_focus_rating,
            "top_subjects": top_subjects,
        },
    }

    return {
        "days_analyzed": len(entries),
        "avg_deep_work_hours": avg_deep_work,
        "avg_tasks_completed": avg_tasks,
        "focus_sessions_count": len(focus_sessions),
        "distraction_rate_per_hour": distraction_rate_per_hour,
        "avg_focus_rating_out_of_5": avg_focus_rating,
        "top_subjects": top_subjects,
        "card": card_data,
    }


async def get_active_experiments(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> Dict[str, Any]:
    """
    Retrieves active behavioral experiments and recent evaluation results.
    """
    stmt = (
        select(Experiment)
        .where(
            and_(
                Experiment.user_id == user_id,
                Experiment.status.in_([ExperimentStatusEnum.ACTIVE, ExperimentStatusEnum.COMPLETED]),
            )
        )
        .order_by(desc(Experiment.created_at))
        .limit(5)
    )
    result = await db.execute(stmt)
    experiments: List[Experiment] = list(result.scalars().all())

    if not experiments:
        return {
            "status": "none",
            "message": "No active or recently completed experiments found. You can start one from the Experiment Hub!",
            "active_count": 0,
            "card": None,
        }

    exp_list = []
    primary_card_data = None

    for exp in experiments:
        # Count checkins
        checkin_stmt = (
            select(func.count(ExperimentCheckin.id), func.sum(sa.case((ExperimentCheckin.adhered == True, 1), else_=0)))  # noqa: E712
            .where(ExperimentCheckin.experiment_id == exp.id)
        )
        ch_res = await db.execute(checkin_stmt)
        total_ch, adhered_ch = ch_res.one()
        total_ch = total_ch or 0
        adhered_ch = adhered_ch or 0

        adherence_rate = round((adhered_ch / total_ch * 100), 1) if total_ch > 0 else 0.0

        item = {
            "id": str(exp.id),
            "title": exp.title,
            "hypothesis": exp.hypothesis,
            "target_metric": exp.target_metric,
            "desired_direction": exp.desired_direction,
            "duration_days": exp.duration_days,
            "status": exp.status.value if hasattr(exp.status, "value") else exp.status,
            "days_completed": total_ch,
            "adherence_rate_pct": adherence_rate,
            "baseline_mean": exp.baseline_mean,
            "outcome_delta": exp.outcome_delta,
            "outcome_verdict": exp.outcome_verdict,
            "adopted_as_habit": exp.adopted_as_habit,
        }
        exp_list.append(item)

        if not primary_card_data:
            primary_card_data = {
                "card_type": "active_experiment",
                "title": f"Experiment: {exp.title}",
                "data": item,
            }

    return {
        "active_count": len([e for e in exp_list if e["status"] == "ACTIVE"]),
        "experiments": exp_list,
        "card": primary_card_data,
    }


async def get_anomalies_and_clusters(
    db: AsyncSession,
    user_id: uuid.UUID,
    days: int = 14,
) -> Dict[str, Any]:
    """
    Fetches behavioral anomaly records and user's cluster archetype.
    """
    cutoff = datetime.now() - timedelta(days=days)
    stmt = (
        select(Insight)
        .where(
            and_(
                Insight.user_id == user_id,
                Insight.created_at >= cutoff,
            )
        )
        .order_by(desc(Insight.created_at))
        .limit(10)
    )
    result = await db.execute(stmt)
    insights: List[Insight] = list(result.scalars().all())

    anomalies = []
    for ins in insights:
        insight_type = ins.insight_type.value if hasattr(ins.insight_type, "value") else str(ins.insight_type)
        severity = ins.severity.value if hasattr(ins.severity, "value") else str(ins.severity)
        if insight_type == "ANOMALY" or severity == "CRITICAL":
            anomalies.append({
                "title": ins.title,
                "message": ins.message,
                "insight_type": insight_type,
                "severity": severity,
            })

    card_data = {
        "card_type": "anomalies_and_clusters",
        "title": "Behavioral Patterns & Anomalies",
        "data": {
            "anomalies": anomalies,
            "anomaly_count": len(anomalies),
        },
    }

    return {
        "anomalies_detected": anomalies,
        "count": len(anomalies),
        "card": card_data,
    }


async def get_life_score_overview(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> Dict[str, Any]:
    """
    Fetches the stored LifeScore breakdown and recent trajectory.
    """
    stmt = (
        select(EngineeredFeatures)
        .where(EngineeredFeatures.user_id == user_id)
        .order_by(EngineeredFeatures.date.desc())
        .limit(7)
    )
    result = await db.execute(stmt)
    rows: List[EngineeredFeatures] = list(result.scalars().all())

    scored = [r for r in rows if r.life_score is not None]
    if not scored:
        return {
            "status": "no_data",
            "message": "No LifeScore has been computed yet. Log a daily entry to generate one.",
            "card": None,
        }

    latest = scored[0]
    composite = round(float(latest.life_score), 1)
    sleep_score = round(float(latest.sleep_score), 1) if latest.sleep_score is not None else None
    productivity_score = round(float(latest.productivity_score), 1) if latest.productivity_score is not None else None
    health_score = round(float(latest.activity_index) * 100, 1) if latest.activity_index is not None else None
    finance_score = round(float(latest.finance_score), 1) if latest.finance_score is not None else None

    change_7d = round(composite - float(scored[-1].life_score), 1) if len(scored) > 1 else 0.0

    card_data = {
        "card_type": "lifescore_overview",
        "title": f"Current LifeScore: {composite}/100",
        "data": {
            "composite": composite,
            "sleep_score": sleep_score,
            "productivity_score": productivity_score,
            "health_score": health_score,
            "finance_score": finance_score,
            "change_7d": change_7d,
            "as_of": str(latest.date),
        },
    }

    return {
        "composite_lifescore": composite,
        "sleep_score": sleep_score,
        "productivity_score": productivity_score,
        "health_score": health_score,
        "finance_score": finance_score,
        "change_7d": change_7d,
        "as_of": str(latest.date),
        "card": card_data,
    }


logger = logging.getLogger("lifelens.ai.tools")


def _to_uuid(user_id: uuid.UUID | str) -> uuid.UUID:
    return user_id if isinstance(user_id, uuid.UUID) else uuid.UUID(str(user_id))


# Tool Dispatcher
TOOL_MAP = {
    "get_sleep_analysis": get_sleep_analysis,
    "get_spending_breakdown": get_spending_breakdown,
    "get_productivity_patterns": get_productivity_patterns,
    "get_active_experiments": get_active_experiments,
    "get_anomalies_and_clusters": get_anomalies_and_clusters,
    "get_life_score_overview": get_life_score_overview,
}


async def execute_tool(
    tool_name: str,
    args: Dict[str, Any],
    db: AsyncSession,
    user_id: uuid.UUID | str,
) -> Dict[str, Any]:
    """
    Executes a declared telemetry tool by name with arguments.
    """
    if tool_name not in TOOL_MAP:
        return {"error": f"Tool '{tool_name}' is not recognized."}

    handler = TOOL_MAP[tool_name]
    try:
        return await handler(db=db, user_id=_to_uuid(user_id), **args)
    except Exception:
        logger.exception("Failed executing assistant tool %s", tool_name)
        return {"error": f"Tool '{tool_name}' is temporarily unavailable."}
