import uuid
from datetime import date, timedelta, datetime
from typing import Optional, List, Dict, Any
from sqlalchemy import select, func, and_, or_, delete
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.experiment import (
    Experiment,
    ExperimentCheckin,
    ExperimentStatusEnum,
    ExperimentOutcomeEnum,
)
from app.models.daily_entry import DailyEntry
from app.models.telemetry import Habit
from app.schemas.experiment import (
    ExperimentCreate,
    ExperimentUpdate,
    ExperimentCheckinCreate,
    ActiveExperimentProgress,
    DailyAdherencePoint,
    ExperimentEvaluationResponse,
    ExperimentCompleteRequest,
)
from app.ml.experiment_evaluator import (
    compute_distribution_stats,
    evaluate_experiment_results,
    EXPERIMENT_TEMPLATES,
)


# Helper: Extract metric from DailyEntry record
def _extract_metric_value(entry: DailyEntry, metric_name: str) -> Optional[float]:
    normalized = metric_name.strip().lower()
    if not hasattr(entry, normalized):
        return None
    val = getattr(entry, normalized)
    return float(val) if val is not None else None


async def _fetch_metric_series(
    db: AsyncSession,
    user_id: str,
    metric_name: str,
    start_d: date,
    end_d: date,
) -> List[Tuple[date, float]]:
    """
    Fetches date-ordered (date, float_val) pairs from DailyEntry for the given user and window.
    """
    stmt = (
        select(DailyEntry)
        .where(
            DailyEntry.user_id == uuid.UUID(str(user_id)),
            DailyEntry.date >= start_d,
            DailyEntry.date <= end_d,
        )
        .order_by(DailyEntry.date.asc())
    )
    res = await db.execute(stmt)
    entries = res.scalars().all()

    series: List[Tuple[date, float]] = []
    for e in entries:
        val = _extract_metric_value(e, metric_name)
        if val is not None:
            series.append((e.date, val))
    return series


async def create_experiment(
    db: AsyncSession,
    user_id: str,
    data: ExperimentCreate,
) -> Experiment:
    """
    Creates a new behavioral experiment.
    Automatically establishes baseline window and baseline statistics from past entries.
    """
    u_uuid = uuid.UUID(str(user_id))
    today = date.today()

    start_d = data.start_date or today
    duration = data.duration_days or 7
    end_d = start_d + timedelta(days=duration - 1)

    # Establish baseline period (default: 14 days immediately preceding start_date)
    baseline_end = data.baseline_end or (start_d - timedelta(days=1))
    baseline_start = data.baseline_start or (baseline_end - timedelta(days=13))

    if baseline_end >= start_d:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="baseline_end must precede experiment start_date",
        )
    if baseline_start > baseline_end:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="baseline_start cannot be after baseline_end",
        )

    # Fetch baseline series
    baseline_series = await _fetch_metric_series(db, user_id, data.target_metric, baseline_start, baseline_end)
    baseline_vals = [val for _, val in baseline_series]
    b_stats = compute_distribution_stats(baseline_vals)

    # Convert recommendation_source_id
    rec_source_uuid = (
        uuid.UUID(str(data.recommendation_source_id))
        if data.recommendation_source_id
        else None
    )

    experiment = Experiment(
        user_id=u_uuid,
        recommendation_source_id=rec_source_uuid,
        title=data.title.strip(),
        hypothesis=data.hypothesis.strip(),
        target_metric=data.target_metric.strip().lower(),
        desired_direction=data.desired_direction.upper(),
        intervention_rule=data.intervention_rule.strip(),
        duration_days=duration,
        start_date=start_d,
        end_date=end_d,
        baseline_start=baseline_start,
        baseline_end=baseline_end,
        baseline_mean=b_stats["mean"] if b_stats["n"] > 0 else 0.0,
        baseline_std=b_stats["std"] if b_stats["n"] > 0 else 0.0,
        baseline_sample_size=b_stats["n"],
        status=ExperimentStatusEnum.ACTIVE,
        outcome_verdict=ExperimentOutcomeEnum.PENDING,
    )

    db.add(experiment)
    await db.commit()
    await db.refresh(experiment)
    return experiment


async def get_experiments(
    db: AsyncSession,
    user_id: str,
    status_filter: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
) -> List[Experiment]:
    """
    Returns user's experiments with optional status filter and pagination.
    """
    u_uuid = uuid.UUID(str(user_id))
    stmt = select(Experiment).where(Experiment.user_id == u_uuid)

    if status_filter:
        s_upper = status_filter.upper()
        if s_upper in ExperimentStatusEnum.__members__:
            stmt = stmt.where(Experiment.status == ExperimentStatusEnum[s_upper])

    stmt = stmt.order_by(Experiment.created_at.desc())
    stmt = stmt.offset((page - 1) * page_size).limit(page_size)

    res = await db.execute(stmt)
    return list(res.scalars().all())


async def get_experiment_by_id(
    db: AsyncSession,
    user_id: str,
    experiment_id: str,
) -> Experiment:
    """
    Retrieves an experiment by ID, verifying user ownership.
    """
    u_uuid = uuid.UUID(str(user_id))
    exp_uuid = uuid.UUID(str(experiment_id))

    stmt = select(Experiment).where(
        Experiment.id == exp_uuid,
        Experiment.user_id == u_uuid,
    )
    res = await db.execute(stmt)
    exp = res.scalar_one_or_none()
    if not exp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Experiment not found",
        )
    return exp


async def get_active_experiments_progress(
    db: AsyncSession,
    user_id: str,
) -> List[ActiveExperimentProgress]:
    """
    Returns progress metrics for all currently ACTIVE experiments of the user.
    """
    u_uuid = uuid.UUID(str(user_id))
    today = date.today()

    stmt = (
        select(Experiment)
        .where(
            Experiment.user_id == u_uuid,
            Experiment.status == ExperimentStatusEnum.ACTIVE,
        )
        .order_by(Experiment.start_date.asc())
    )
    res = await db.execute(stmt)
    active_exps = res.scalars().all()

    progress_list: List[ActiveExperimentProgress] = []

    for exp in active_exps:
        # Checkins
        ck_stmt = (
            select(ExperimentCheckin)
            .where(ExperimentCheckin.experiment_id == exp.id)
            .order_by(ExperimentCheckin.date.asc())
        )
        ck_res = await db.execute(ck_stmt)
        checkins = ck_res.scalars().all()

        checkin_map = {ck.date: ck for ck in checkins}
        checked_in_today = today in checkin_map
        today_adherence = checkin_map[today].adhered if checked_in_today else None

        days_adhered = sum(1 for ck in checkins if ck.adhered)
        total_checkins = len(checkins)
        curr_adherence_rate = (
            round((days_adhered / total_checkins) * 100.0, 1) if total_checkins > 0 else 0.0
        )

        # Day calculations
        if today < exp.start_date:
            curr_day = 0
            days_remaining = exp.duration_days
            prog_pct = 0.0
        else:
            diff = (today - exp.start_date).days + 1
            curr_day = min(diff, exp.duration_days)
            days_remaining = max(0, exp.duration_days - curr_day)
            prog_pct = round((curr_day / exp.duration_days) * 100.0, 1)

        # Interim treatment metrics
        t_series = await _fetch_metric_series(
            db, user_id, exp.target_metric, exp.start_date, min(today, exp.end_date)
        )
        t_vals = [val for _, val in t_series]
        t_stats = compute_distribution_stats(t_vals)
        t_mean = t_stats["mean"] if t_stats["n"] > 0 else None

        b_mean = exp.baseline_mean
        interim_delta = None
        interim_delta_pct = None
        if t_mean is not None and b_mean is not None:
            interim_delta = round(t_mean - b_mean, 2)
            if b_mean != 0:
                interim_delta_pct = round((interim_delta / abs(b_mean)) * 100.0, 1)

        # Daily history points
        daily_history: List[DailyAdherencePoint] = []
        for i in range(curr_day):
            d = exp.start_date + timedelta(days=i)
            ck = checkin_map.get(d)
            if ck:
                daily_history.append(
                    DailyAdherencePoint(
                        day_number=i + 1,
                        date=d,
                        adhered=ck.adhered,
                        metric_value=ck.metric_value,
                    )
                )

        progress_list.append(
            ActiveExperimentProgress(
                experiment=exp,
                current_day=curr_day,
                days_remaining=days_remaining,
                total_days=exp.duration_days,
                progress_percentage=prog_pct,
                checked_in_today=checked_in_today,
                today_adherence=today_adherence,
                checkins_completed=total_checkins,
                days_adhered=days_adhered,
                current_adherence_rate=curr_adherence_rate,
                current_treatment_mean=t_mean,
                baseline_mean=b_mean,
                interim_delta=interim_delta,
                interim_delta_pct=interim_delta_pct,
                daily_history=daily_history,
            )
        )

    return progress_list


async def record_checkin(
    db: AsyncSession,
    user_id: str,
    experiment_id: str,
    data: ExperimentCheckinCreate,
) -> ExperimentCheckin:
    """
    Records or updates daily adherence for an experiment.
    If metric_value is omitted, automatically resolves it from DailyEntry.
    """
    exp = await get_experiment_by_id(db, user_id, experiment_id)
    if exp.status != ExperimentStatusEnum.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot check in to experiment with status '{exp.status.value}'",
        )

    u_uuid = uuid.UUID(str(user_id))
    exp_uuid = exp.id
    checkin_date = data.date

    # Auto-resolve metric value if not provided
    resolved_metric = data.metric_value
    if resolved_metric is None:
        entry_stmt = select(DailyEntry).where(
            DailyEntry.user_id == u_uuid,
            DailyEntry.date == checkin_date,
        )
        res = await db.execute(entry_stmt)
        entry = res.scalar_one_or_none()
        if entry:
            resolved_metric = _extract_metric_value(entry, exp.target_metric)

    # Check for existing checkin for idempotent update
    stmt = select(ExperimentCheckin).where(
        ExperimentCheckin.experiment_id == exp_uuid,
        ExperimentCheckin.date == checkin_date,
    )
    res = await db.execute(stmt)
    existing = res.scalar_one_or_none()

    if existing:
        existing.adhered = data.adhered
        if resolved_metric is not None:
            existing.metric_value = resolved_metric
        if data.notes is not None:
            existing.notes = data.notes.strip()
        checkin_obj = existing
    else:
        checkin_obj = ExperimentCheckin(
            experiment_id=exp_uuid,
            user_id=u_uuid,
            date=checkin_date,
            adhered=data.adhered,
            metric_value=resolved_metric,
            notes=data.notes.strip() if data.notes else None,
        )
        db.add(checkin_obj)

    await db.commit()
    await db.refresh(checkin_obj)
    return checkin_obj


async def get_checkins(
    db: AsyncSession,
    user_id: str,
    experiment_id: str,
) -> List[ExperimentCheckin]:
    """
    Returns all checkins for an experiment ordered by date ASC.
    """
    exp = await get_experiment_by_id(db, user_id, experiment_id)
    stmt = (
        select(ExperimentCheckin)
        .where(ExperimentCheckin.experiment_id == exp.id)
        .order_by(ExperimentCheckin.date.asc())
    )
    res = await db.execute(stmt)
    return list(res.scalars().all())


async def evaluate_experiment(
    db: AsyncSession,
    user_id: str,
    experiment_id: str,
) -> ExperimentEvaluationResponse:
    """
    Runs full statistical evaluation on an experiment:
    Compares baseline distribution vs treatment period, computes Cohen's d,
    Welch's t-test p-value, and generates plain-English narrative.
    """
    exp = await get_experiment_by_id(db, user_id, experiment_id)
    today = date.today()
    eval_end_date = min(today, exp.end_date)

    # Fetch baseline series
    b_series = await _fetch_metric_series(
        db, user_id, exp.target_metric, exp.baseline_start, exp.baseline_end
    )
    b_vals = [val for _, val in b_series]

    # Fetch treatment series
    t_series = await _fetch_metric_series(
        db, user_id, exp.target_metric, exp.start_date, eval_end_date
    )
    t_vals = [val for _, val in t_series]

    # Fetch checkins for adherence
    ck_stmt = (
        select(ExperimentCheckin)
        .where(ExperimentCheckin.experiment_id == exp.id)
        .order_by(ExperimentCheckin.date.asc())
    )
    ck_res = await db.execute(ck_stmt)
    checkins = ck_res.scalars().all()
    adherence_list = [ck.adhered for ck in checkins]

    # Statistical Evaluation
    eval_res = evaluate_experiment_results(
        baseline_values=b_vals,
        treatment_values=t_vals,
        desired_direction=exp.desired_direction,
        checkin_adherence=adherence_list,
        target_metric_label=exp.target_metric,
        intervention_rule=exp.intervention_rule,
    )

    # Persist evaluation metrics to Experiment
    exp.treatment_mean = eval_res["treatment_mean"]
    exp.treatment_std = eval_res["treatment_std"]
    exp.treatment_sample_size = eval_res["treatment_sample_size"]
    exp.outcome_delta = eval_res["raw_delta"]
    exp.outcome_delta_pct = eval_res["percentage_change"]
    exp.effect_size = eval_res["effect_size_cohens_d"]
    exp.p_value = eval_res["p_value"]
    exp.is_statistically_significant = eval_res["is_statistically_significant"]
    exp.adherence_rate = eval_res["adherence_rate"]
    exp.outcome_verdict = eval_res["outcome_verdict"]
    exp.evaluation_summary = eval_res["plain_english_synthesis"]

    await db.commit()
    await db.refresh(exp)

    # Build daily comparison timeline
    treatment_dates_map = {d: val for d, val in t_series}
    checkin_dates_map = {ck.date: ck for ck in checkins}

    daily_comp: List[Dict[str, Any]] = []
    total_days = (eval_end_date - exp.start_date).days + 1
    for i in range(max(1, total_days)):
        d = exp.start_date + timedelta(days=i)
        if d > eval_end_date:
            break
        val = treatment_dates_map.get(d)
        ck = checkin_dates_map.get(d)
        daily_comp.append({
            "day": i + 1,
            "date": d.isoformat(),
            "metric_value": val,
            "adhered": ck.adhered if ck else None,
            "notes": ck.notes if ck else None,
        })

    return ExperimentEvaluationResponse(
        experiment_id=exp.id,
        title=exp.title,
        target_metric=exp.target_metric,
        desired_direction=exp.desired_direction,
        duration_days=exp.duration_days,
        status=exp.status,
        baseline_start=exp.baseline_start,
        baseline_end=exp.baseline_end,
        baseline_mean=eval_res["baseline_mean"],
        baseline_std=eval_res["baseline_std"],
        baseline_sample_size=eval_res["baseline_sample_size"],
        treatment_start=exp.start_date,
        treatment_end=eval_end_date,
        treatment_mean=eval_res["treatment_mean"],
        treatment_std=eval_res["treatment_std"],
        treatment_sample_size=eval_res["treatment_sample_size"],
        raw_delta=eval_res["raw_delta"],
        percentage_change=eval_res["percentage_change"],
        effect_size_cohens_d=eval_res["effect_size_cohens_d"],
        p_value=eval_res["p_value"],
        is_statistically_significant=eval_res["is_statistically_significant"],
        adherence_rate=eval_res["adherence_rate"],
        days_adhered=eval_res["days_adhered"],
        days_missed=eval_res["days_missed"],
        total_days_tracked=eval_res["total_days_tracked"],
        outcome_verdict=eval_res["outcome_verdict"],
        verdict_label=eval_res["verdict_label"],
        plain_english_synthesis=eval_res["plain_english_synthesis"],
        recommendation_next_steps=eval_res["recommendation_next_steps"],
        daily_comparison=daily_comp,
    )


async def complete_experiment(
    db: AsyncSession,
    user_id: str,
    experiment_id: str,
    data: ExperimentCompleteRequest,
) -> Experiment:
    """
    Marks an experiment as COMPLETED.
    Records user review/reflection and optionally adopts the intervention rule as a Habit!
    """
    exp = await get_experiment_by_id(db, user_id, experiment_id)

    # Ensure evaluation has been run
    if exp.outcome_verdict == ExperimentOutcomeEnum.PENDING or exp.treatment_mean is None:
        await evaluate_experiment(db, user_id, experiment_id)
        await db.refresh(exp)

    exp.status = ExperimentStatusEnum.COMPLETED
    if data.user_rating is not None:
        exp.user_rating = data.user_rating
    if data.user_reflection is not None:
        exp.user_reflection = data.user_reflection.strip()
    exp.adopted_as_habit = bool(data.adopt_as_habit)

    # Phase 2 -> Phase 1 Bridge: Automatically instantiate a permanent Habit!
    if data.adopt_as_habit:
        habit = Habit(
            user_id=exp.user_id,
            name=exp.intervention_rule[:100],
            domain=data.habit_domain or "General",
            frequency="daily",
            target_per_day=1,
            is_active=True,
        )
        db.add(habit)

    await db.commit()
    await db.refresh(exp)
    return exp


async def abandon_experiment(
    db: AsyncSession,
    user_id: str,
    experiment_id: str,
    reason: Optional[str] = None,
) -> Experiment:
    """
    Abandons an active experiment.
    """
    exp = await get_experiment_by_id(db, user_id, experiment_id)
    exp.status = ExperimentStatusEnum.ABANDONED
    if reason:
        exp.user_reflection = f"Abandoned: {reason.strip()}"
    await db.commit()
    await db.refresh(exp)
    return exp


async def update_experiment(
    db: AsyncSession,
    user_id: str,
    experiment_id: str,
    data: ExperimentUpdate,
) -> Experiment:
    """
    Updates editable fields of an experiment.
    """
    exp = await get_experiment_by_id(db, user_id, experiment_id)

    if data.title is not None:
        exp.title = data.title.strip()
    if data.hypothesis is not None:
        exp.hypothesis = data.hypothesis.strip()
    if data.intervention_rule is not None:
        exp.intervention_rule = data.intervention_rule.strip()
    if data.status is not None:
        exp.status = data.status
    if data.user_rating is not None:
        exp.user_rating = data.user_rating
    if data.user_reflection is not None:
        exp.user_reflection = data.user_reflection.strip()
    if data.adopted_as_habit is not None:
        exp.adopted_as_habit = data.adopted_as_habit

    await db.commit()
    await db.refresh(exp)
    return exp


async def delete_experiment(
    db: AsyncSession,
    user_id: str,
    experiment_id: str,
) -> bool:
    """
    Permanently deletes an experiment and cascaded checkins.
    """
    exp = await get_experiment_by_id(db, user_id, experiment_id)
    await db.delete(exp)
    await db.commit()
    return True


def get_templates() -> List[Dict[str, Any]]:
    """
    Returns curated experiment templates catalog.
    """
    return EXPERIMENT_TEMPLATES

