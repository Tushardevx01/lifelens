"""
LifeLens Personal Briefings & Risk Forecasting Service (Phase 6).

Coordinates data retrieval, multi-target risk forecasts, multi-lag correlation,
and natural language briefing synthesis for daily mornings and weekly retrospectives.
"""

from __future__ import annotations
import json
import uuid
from datetime import date, datetime, timedelta
from typing import Optional, List, Dict, Any

try:
    import sqlalchemy as sa
    from sqlalchemy import select, func, desc, and_
    from sqlalchemy.ext.asyncio import AsyncSession
except ImportError:
    sa = None  # type: ignore
    select = func = desc = and_ = None  # type: ignore
    AsyncSession = Any  # type: ignore

try:
    from fastapi import HTTPException, status
except ImportError:
    class HTTPException(Exception):  # type: ignore
        def __init__(self, status_code=500, detail=""):
            super().__init__(detail)
            self.status_code = status_code
            self.detail = detail
    class status:  # type: ignore
        HTTP_400_BAD_REQUEST = 400
        HTTP_404_NOT_FOUND = 404

try:
    from app.models.briefing import Briefing, BriefingType
    from app.models.daily_entry import DailyEntry
    from app.models.experiment import Experiment
    from app.models.telemetry import FinancialTransaction
    from app.models.user import User
except ImportError:
    Briefing = BriefingType = DailyEntry = Experiment = FinancialTransaction = User = None  # type: ignore

try:
    from app.ml.life_score import compute_life_score
    from app.ml.feature_engineering import compute_sleep_score, compute_productivity_score, compute_activity_index, compute_finance_score
except ImportError:
    compute_life_score = compute_sleep_score = compute_productivity_score = compute_activity_index = compute_finance_score = None

from app.ml.risk_forecaster import (
    generate_composite_risk_forecast,
    CompositeRiskForecast,
)
from app.ml.dynamic_correlation import find_dynamic_correlations, DynamicCorrelationFinding
from app.ml.insight_synthesizer import (
    generate_morning_briefing,
    generate_weekly_review_story,
)


def _to_uuid(uid: Any) -> uuid.UUID:
    """Safely converts string or UUID to uuid.UUID object."""
    if isinstance(uid, uuid.UUID):
        return uid
    return uuid.UUID(str(uid))


class BriefingService:
    @staticmethod
    async def get_or_create_morning_briefing(
        db: AsyncSession,
        user_id: Any,
        target_date: Optional[date] = None,
    ) -> Dict[str, Any]:
        """
        Retrieves or generates today's morning briefing.
        Guarantees idempotency via unique user_id + date + briefing_type.
        """
        ref_date = target_date or date.today()
        uid = _to_uuid(user_id)
        existing = None

        # 1. Check if already persisted
        if Briefing is not None and select is not None and db is not None:
            try:
                stmt = select(Briefing).where(
                    and_(
                        Briefing.user_id == uid,
                        Briefing.date == ref_date,
                        Briefing.briefing_type == "DAILY_MORNING",
                    )
                )
                res = await db.execute(stmt)
                existing = res.scalar_one_or_none()
                if existing and existing.payload_json:
                    payload = json.loads(existing.payload_json)
                    payload["is_read"] = existing.is_read
                    return payload
            except Exception:
                pass

        # 2. Extract recent data for generation
        yesterday_date = ref_date - timedelta(days=1)
        sleep_hours = None
        sleep_quality = None
        bedtime_str = None
        wake_time_str = None
        resting_hr = None
        recent_bedtimes: List[Optional[str]] = []
        energy_level = None
        steps_yesterday = 0
        entries = []
        active_exp_payload = None

        if DailyEntry is not None and select is not None and db is not None:
            try:
                # Fetch recent daily entries (including from 1st of month for MTD spending)
                start_window = min(ref_date - timedelta(days=14), ref_date.replace(day=1))
                entry_stmt = (
                    select(DailyEntry)
                    .where(and_(DailyEntry.user_id == uid, DailyEntry.date >= start_window))
                    .order_by(DailyEntry.date.desc())
                )
                entry_res = await db.execute(entry_stmt)
                entries = entry_res.scalars().all()

                if entries:
                    yest_e = next((e for e in entries if e.date == yesterday_date), entries[0])
                    sleep_hours = float(yest_e.sleep_hours)
                    sleep_quality = int(yest_e.sleep_quality)
                    if yest_e.sleep_bedtime:
                        bedtime_str = yest_e.sleep_bedtime.strftime("%H:%M")
                    resting_hr = yest_e.resting_heart_rate
                    if yest_e.energy_level is not None:
                        energy_level = int(yest_e.energy_level)
                    steps_yesterday = int(yest_e.steps)

                    recent_bedtimes = [
                        e.sleep_bedtime.strftime("%H:%M") if e.sleep_bedtime else None
                        for e in entries[:7]
                    ]

                    if bedtime_str:
                        bed_h, bed_m = (int(part) for part in bedtime_str.split(":"))
                        wake_mins = (bed_h * 60 + bed_m + int(round(sleep_hours * 60))) % 1440
                        wake_time_str = f"{wake_mins // 60:02d}:{wake_mins % 60:02d}"

                # Fetch active experiment if any
                if Experiment is not None:
                    exp_stmt = (
                        select(Experiment)
                        .where(and_(Experiment.user_id == uid, Experiment.status == "ACTIVE"))
                        .order_by(Experiment.start_date.desc())
                        .limit(1)
                    )
                    exp_res = await db.execute(exp_stmt)
                    active_exp = exp_res.scalar_one_or_none()
                    if active_exp:
                        days_running = max(1, (ref_date - active_exp.start_date).days + 1)
                        active_exp_payload = {
                            "title": active_exp.title,
                            "current_day": min(days_running, active_exp.duration_days),
                            "duration_days": active_exp.duration_days,
                            "intervention_rule": active_exp.intervention_rule,
                            "adhered_yesterday": True,
                        }
            except Exception:
                pass

        if not entries:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No daily entries yet. Log a day to generate a morning briefing.",
            )

        # 3. Resolve user identity and dynamic financial metrics
        user_name = "LifeLens Member"
        if User is not None and select is not None and db is not None:
            try:
                u_res = await db.execute(select(User).where(User.id == uid))
                u_obj = u_res.scalar_one_or_none()
                if u_obj and u_obj.full_name:
                    user_name = u_obj.full_name.split()[0]
            except Exception:
                pass

        current_spend = 0.0
        current_discretionary_spend = 0.0
        monthly_budget = 35000.0

        if FinancialTransaction is not None and select is not None and db is not None:
            try:
                from datetime import time, timezone
                from sqlalchemy import case
                month_start = ref_date.replace(day=1)
                start_dt = datetime.combine(month_start, time.min).replace(tzinfo=timezone.utc)
                end_dt = datetime.combine(ref_date, time.max).replace(tzinfo=timezone.utc)
                spend_stmt = select(
                    func.coalesce(func.sum(FinancialTransaction.amount), 0.0),
                    func.coalesce(func.sum(case((FinancialTransaction.is_discretionary.is_(True), FinancialTransaction.amount), else_=0.0)), 0.0)
                ).where(
                    and_(
                        FinancialTransaction.user_id == uid,
                        FinancialTransaction.timestamp >= start_dt,
                        FinancialTransaction.timestamp <= end_dt,
                    )
                )
                spend_res = await db.execute(spend_stmt)
                spend_row = spend_res.one_or_none()
                if spend_row and (spend_row[0] > 0 or spend_row[1] > 0):
                    current_spend = float(spend_row[0])
                    current_discretionary_spend = float(spend_row[1])
                elif entries:
                    month_entries = [e for e in entries if e.date.month == ref_date.month and e.date.year == ref_date.year]
                    if month_entries:
                        current_spend = sum(float(e.daily_spend) for e in month_entries)
                        # DailyEntry does not record discretionary status; leave it
                        # unknown instead of inventing a split.
                        current_discretionary_spend = 0.0
            except Exception:
                pass

        # 4. Generate composite risk
        risk_f = generate_composite_risk_forecast(
            sleep_hours=sleep_hours,
            sleep_quality=sleep_quality,
            bedtime=bedtime_str,
            recent_bedtimes=recent_bedtimes,
            current_spend=current_spend,
            current_discretionary_spend=current_discretionary_spend,
            monthly_budget=monthly_budget,
            energy_level=energy_level,
            steps_yesterday=steps_yesterday,
            as_of_date=ref_date,
        )

        # 5. Synthesize morning briefing
        briefing = generate_morning_briefing(
            today_date=ref_date,
            sleep_hours=sleep_hours,
            sleep_quality=sleep_quality,
            bedtime_str=bedtime_str,
            wake_time_str=wake_time_str,
            resting_hr=resting_hr,
            risk_forecast=risk_f,
            active_experiment=active_exp_payload,
            user_name=user_name,
        )

        briefing_id = str(existing.id) if existing else str(uuid.uuid4())
        created_at_str = datetime.now().isoformat()

        response = {
            "id": briefing_id,
            "date": briefing.date,
            "title": briefing.title,
            "greeting": briefing.greeting,
            "recovery_score": briefing.recovery_score,
            "recovery_tier": briefing.recovery_tier,
            "optimal_focus_window": briefing.optimal_focus_window,
            "secondary_focus_window": briefing.secondary_focus_window,
            "executive_summary": briefing.executive_summary,
            "sleep_summary": briefing.sleep_summary,
            "risk_alerts": briefing.risk_alerts,
            "experiment_callout": briefing.experiment_callout,
            "micro_action": briefing.micro_action,
            "full_markdown": briefing.full_markdown,
            "is_read": False,
            "created_at": created_at_str,
        }

        # 5. Persist to database if available
        if Briefing is not None and db is not None:
            try:
                new_b = existing
                if new_b is None:
                    new_b = Briefing(
                        id=uuid.UUID(briefing_id),
                        user_id=uid,
                        date=ref_date,
                        briefing_type="DAILY_MORNING",
                    )
                    db.add(new_b)
                new_b.title = briefing.title
                new_b.summary = briefing.executive_summary
                new_b.recovery_score = briefing.recovery_score
                new_b.focus_window = briefing.optimal_focus_window
                new_b.risk_factors_json = json.dumps(briefing.risk_alerts)
                new_b.experiment_focus = json.dumps(briefing.experiment_callout) if briefing.experiment_callout else None
                new_b.full_narrative_markdown = briefing.full_markdown
                new_b.payload_json = json.dumps(response)
                new_b.is_read = False
                await db.commit()
            except Exception:
                pass

        return response

    @staticmethod
    async def get_or_create_weekly_review(
        db: AsyncSession,
        user_id: Any,
        target_date: Optional[date] = None,
    ) -> Dict[str, Any]:
        """
        Retrieves or generates the comprehensive weekly review story.
        """
        ref_date = target_date or date.today()
        uid = _to_uuid(user_id)
        # Find start of the current week (7 days ago)
        week_start = ref_date - timedelta(days=6)
        week_end = ref_date
        existing = None

        if Briefing is not None and select is not None and db is not None:
            try:
                stmt = select(Briefing).where(
                    and_(
                        Briefing.user_id == uid,
                        Briefing.date == week_end,
                        Briefing.briefing_type == "WEEKLY_REVIEW",
                    )
                )
                res = await db.execute(stmt)
                existing = res.scalar_one_or_none()
                if existing and existing.payload_json:
                    payload = json.loads(existing.payload_json)
                    payload["is_read"] = existing.is_read
                    return payload
            except Exception:
                pass

        user_name = "LifeLens Member"
        if User is not None and select is not None and db is not None:
            try:
                u_res = await db.execute(select(User).where(User.id == uid))
                u_obj = u_res.scalar_one_or_none()
                if u_obj and u_obj.full_name:
                    user_name = u_obj.full_name.split()[0]
            except Exception:
                pass

        # Build entries list
        entries_data: List[Dict[str, Any]] = []
        if DailyEntry is not None and select is not None and db is not None:
            try:
                stmt = (
                    select(DailyEntry)
                    .where(and_(DailyEntry.user_id == uid, DailyEntry.date >= week_start, DailyEntry.date <= week_end))
                    .order_by(DailyEntry.date.asc())
                )
                res = await db.execute(stmt)
                rows = res.scalars().all()
                for r in rows:
                    ls = 80.0
                    if compute_life_score and compute_sleep_score and compute_productivity_score and compute_activity_index and compute_finance_score:
                        s_sc = compute_sleep_score(float(r.sleep_hours), int(r.sleep_quality))
                        p_sc = compute_productivity_score(float(r.deep_work_hours), float(r.screen_time_hours))
                        a_sc = compute_activity_index(int(r.steps), None)
                        f_sc = compute_finance_score(float(r.daily_spend), 1000.0)
                        ls = compute_life_score(s_sc, p_sc, a_sc, f_sc, None).get("score", 80.0)
                    else:
                        ls = 80.0 + (float(r.sleep_hours) * 1.5)

                    entries_data.append({
                        "date": r.date.isoformat(),
                        "sleep_hours": float(r.sleep_hours),
                        "sleep_quality": int(r.sleep_quality),
                        "steps": int(r.steps),
                        "deep_work_hours": float(r.deep_work_hours),
                        "screen_time_hours": float(r.screen_time_hours),
                        "daily_spend": float(r.daily_spend),
                        "life_score": round(ls, 1),
                    })
            except Exception:
                pass

        if not entries_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No daily entries in this week yet. Log a day to generate a weekly review.",
            )

        actual_discretionary = 0.0
        if FinancialTransaction is not None and select is not None and db is not None:
            try:
                from datetime import time, timezone
                w_start_dt = datetime.combine(week_start, time.min).replace(tzinfo=timezone.utc)
                w_end_dt = datetime.combine(week_end, time.max).replace(tzinfo=timezone.utc)
                stmt_disc = select(
                    func.coalesce(func.sum(FinancialTransaction.amount), 0.0)
                ).where(
                    and_(
                        FinancialTransaction.user_id == uid,
                        FinancialTransaction.is_discretionary.is_(True),
                        FinancialTransaction.timestamp >= w_start_dt,
                        FinancialTransaction.timestamp <= w_end_dt,
                    )
                )
                r_disc = await db.execute(stmt_disc)
                disc_val = r_disc.scalar_one_or_none()
                if disc_val and float(disc_val) > 0:
                    actual_discretionary = float(disc_val)
            except Exception:
                pass

        if actual_discretionary <= 0.0:
            # Transaction-level discretionary data is unavailable; do not invent
            # a percentage of total spend.
            actual_discretionary = 0.0

        story = generate_weekly_review_story(
            week_start=week_start,
            week_end=week_end,
            daily_entries=entries_data,
            discretionary_spend_total=actual_discretionary,
            user_name=user_name,
        )

        review_id = str(existing.id) if existing else str(uuid.uuid4())
        created_at_str = datetime.now().isoformat()

        response = {
            "id": review_id,
            "week_start": story.week_start,
            "week_end": story.week_end,
            "title": story.title,
            "avg_life_score": story.avg_life_score,
            "life_score_trend_delta": story.life_score_trend_delta,
            "best_day": story.best_day,
            "recovery_day": story.recovery_day,
            "top_wins": story.top_wins,
            "bottlenecks_identified": story.bottlenecks_identified,
            "experiments_evaluated": story.experiments_evaluated,
            "next_week_recommendation": story.next_week_recommendation,
            "full_narrative_markdown": story.full_narrative_markdown,
            "html_export_card": story.html_export_card,
            "is_read": False,
            "created_at": created_at_str,
        }

        if Briefing is not None and db is not None:
            try:
                new_b = existing
                if new_b is None:
                    new_b = Briefing(
                        id=uuid.UUID(review_id),
                        user_id=uid,
                        date=week_end,
                        briefing_type="WEEKLY_REVIEW",
                    )
                    db.add(new_b)
                new_b.title = story.title
                new_b.summary = f"Weekly average LifeScore: {story.avg_life_score:.0f}/100. Best day on {story.best_day['date']}."
                new_b.recovery_score = story.avg_life_score
                new_b.full_narrative_markdown = story.full_narrative_markdown
                new_b.html_export = story.html_export_card
                new_b.payload_json = json.dumps(response)
                new_b.is_read = False
                await db.commit()
            except Exception:
                pass

        return response

    @staticmethod
    async def get_composite_risk_forecasts(
        db: AsyncSession,
        user_id: Any,
        target_date: Optional[date] = None,
    ) -> CompositeRiskForecast:
        """
        Calculates all multi-head predictive risk forecasts.
        """
        ref_date = target_date or date.today()
        uid = _to_uuid(user_id)
        sleep_hours = None
        sleep_quality = None
        bedtime_str = None
        energy_level = None
        steps_yesterday = 0
        consecutive_inactive = 0
        scheduled_deep_work = 0.0
        current_spend = 0.0
        current_discretionary = 0.0
        budget = 35000.0
        recent_bedtimes: List[Optional[str]] = []
        entries = []

        if DailyEntry is not None and select is not None and db is not None:
            try:
                # Include from 1st of the month to capture full MTD spend
                start = min(ref_date - timedelta(days=14), ref_date.replace(day=1))
                stmt = (
                    select(DailyEntry)
                    .where(and_(DailyEntry.user_id == uid, DailyEntry.date >= start))
                    .order_by(DailyEntry.date.desc())
                )
                res = await db.execute(stmt)
                entries = res.scalars().all()
                if entries:
                    yest = entries[0]
                    sleep_hours = float(yest.sleep_hours)
                    sleep_quality = int(yest.sleep_quality)
                    if yest.sleep_bedtime:
                        bedtime_str = yest.sleep_bedtime.strftime("%H:%M")
                    if yest.energy_level is not None:
                        energy_level = int(yest.energy_level)
                    steps_yesterday = int(yest.steps)

                    recent_bedtimes = [
                        e.sleep_bedtime.strftime("%H:%M") if e.sleep_bedtime else None
                        for e in entries[:7]
                    ]

                    for e in entries:
                        if int(e.steps) < 1000:
                            consecutive_inactive += 1
                        else:
                            break

                    # Total spend MTD across the full month
                    current_spend = sum(float(e.daily_spend) for e in entries if e.date.month == ref_date.month and e.date.year == ref_date.year)
                    # DailyEntry has no discretionary flag; unknown until
                    # transaction-level data is available below.
                    current_discretionary = 0.0
            except Exception:
                pass

        if not entries:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No daily entries yet. Log a day to generate risk forecasts.",
            )

        if FinancialTransaction is not None and select is not None and db is not None:
            try:
                from datetime import time, timezone
                from sqlalchemy import case
                month_start = ref_date.replace(day=1)
                start_dt = datetime.combine(month_start, time.min).replace(tzinfo=timezone.utc)
                end_dt = datetime.combine(ref_date, time.max).replace(tzinfo=timezone.utc)
                spend_stmt = select(
                    func.coalesce(func.sum(FinancialTransaction.amount), 0.0),
                    func.coalesce(func.sum(case((FinancialTransaction.is_discretionary.is_(True), FinancialTransaction.amount), else_=0.0)), 0.0)
                ).where(
                    and_(
                        FinancialTransaction.user_id == uid,
                        FinancialTransaction.timestamp >= start_dt,
                        FinancialTransaction.timestamp <= end_dt,
                    )
                )
                spend_res = await db.execute(spend_stmt)
                spend_row = spend_res.one_or_none()
                if spend_row and (spend_row[0] > 0 or spend_row[1] > 0):
                    current_spend = float(spend_row[0])
                    current_discretionary = float(spend_row[1])
            except Exception:
                pass

        return generate_composite_risk_forecast(
            sleep_hours=sleep_hours,
            sleep_quality=sleep_quality,
            bedtime=bedtime_str,
            recent_bedtimes=recent_bedtimes,
            current_spend=current_spend,
            current_discretionary_spend=current_discretionary,
            monthly_budget=budget,
            energy_level=energy_level,
            steps_yesterday=steps_yesterday,
            consecutive_inactive_days=consecutive_inactive,
            scheduled_deep_work_hours=scheduled_deep_work,
            as_of_date=ref_date,
        )

    @staticmethod
    async def get_dynamic_correlations(
        db: AsyncSession,
        user_id: Any,
        min_sample_size: int = 7,
    ) -> List[DynamicCorrelationFinding]:
        """
        Runs multi-lag cross-feature correlation across all historical entries.
        """
        uid = _to_uuid(user_id)
        entries_data: List[Dict[str, Any]] = []
        if DailyEntry is not None and select is not None and db is not None:
            try:
                stmt = (
                    select(DailyEntry)
                    .where(DailyEntry.user_id == uid)
                    .order_by(DailyEntry.date.asc())
                )
                res = await db.execute(stmt)
                rows = res.scalars().all()
                for r in rows:
                    entries_data.append({
                        "date": r.date.isoformat(),
                        "sleep_hours": float(r.sleep_hours),
                        "sleep_quality": int(r.sleep_quality),
                        "steps": int(r.steps),
                        "deep_work_hours": float(r.deep_work_hours),
                        "screen_time_hours": float(r.screen_time_hours),
                        "social_media_hours": float(r.social_media_hours) if r.social_media_hours is not None else None,
                        "daily_spend": float(r.daily_spend),
                        "mood_score": int(r.mood_score) if r.mood_score is not None else None,
                        "energy_level": int(r.energy_level) if r.energy_level is not None else None,
                        "productivity_score": 70.0 + (float(r.deep_work_hours) * 5.0),
                    })
            except Exception:
                pass

        return find_dynamic_correlations(entries_data, min_sample_size=min_sample_size)

