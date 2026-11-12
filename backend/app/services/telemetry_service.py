import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Optional, Any
from sqlalchemy import select, and_, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.telemetry import (
    FinancialTransaction,
    AppUsageSession,
    FocusStudySession,
    Habit,
    HabitLog,
    SleepInterval,
    WorkoutSession,
)
from app.models.daily_entry import DailyEntry
from app.utils.date_utils import ensure_utc, utc_date
from app.schemas.telemetry import (
    TransactionCreate,
    TransactionSummaryResponse,
    AppUsageCreate,
    AppUsageSummaryResponse,
    FocusSessionCreate,
    FocusSessionSummaryResponse,
    HabitCreate,
    HabitUpdate,
    HabitLogCreate,
    HabitWithStreakResponse,
    SleepIntervalCreate,
    SleepIntervalBatchCreate,
    SleepSummaryResponse,
    WorkoutSessionCreate,
    WorkoutConsistencyResponse,
)


def _to_uuid(val: str | uuid.UUID) -> uuid.UUID:
    return val if isinstance(val, uuid.UUID) else uuid.UUID(val)


async def _rollup_daily_spend(db: AsyncSession, uid: uuid.UUID, target_date: date):
    start_dt = datetime.combine(target_date, datetime.min.time(), tzinfo=timezone.utc)
    end_dt = datetime.combine(target_date, datetime.max.time(), tzinfo=timezone.utc)
    sum_stmt = select(func.sum(FinancialTransaction.amount)).where(
        and_(
            FinancialTransaction.user_id == uid,
            FinancialTransaction.timestamp >= start_dt,
            FinancialTransaction.timestamp <= end_dt,
        )
    )
    sum_res = await db.execute(sum_stmt)
    total_day_spend = float(sum_res.scalar() or 0.0)

    cat_stmt = (
        select(FinancialTransaction.category, func.sum(FinancialTransaction.amount))
        .where(
            and_(
                FinancialTransaction.user_id == uid,
                FinancialTransaction.timestamp >= start_dt,
                FinancialTransaction.timestamp <= end_dt,
            )
        )
        .group_by(FinancialTransaction.category)
        .order_by(desc(func.sum(FinancialTransaction.amount)))
    )
    cat_res = await db.execute(cat_stmt)
    top_cat = cat_res.first()
    primary_cat = top_cat[0] if top_cat else "Other"

    de_stmt = select(DailyEntry).where(
        and_(DailyEntry.user_id == uid, DailyEntry.date == target_date)
    )
    de_res = await db.execute(de_stmt)
    entry = de_res.scalar_one_or_none()
    if entry:
        entry.daily_spend = round(total_day_spend, 2)
        if primary_cat:
            entry.spend_category = primary_cat
    else:
        entry = DailyEntry(
            id=uuid.uuid4(),
            user_id=uid,
            date=target_date,
            sleep_hours=0.0,
            sleep_quality=3,
            steps=0,
            screen_time_hours=0.0,
            deep_work_hours=0.0,
            daily_spend=round(total_day_spend, 2),
            spend_category=primary_cat,
        )
        db.add(entry)


# ============================================================================
# 1. Financial Transactions Service
# ============================================================================

async def create_transaction(
    db: AsyncSession, user_id: str, data: TransactionCreate
) -> FinancialTransaction:
    uid = _to_uuid(user_id)
    tx = FinancialTransaction(
        id=uuid.uuid4(),
        user_id=uid,
        amount=round(data.amount, 2),
        category=data.category.strip(),
        merchant=data.merchant.strip(),
        timestamp=ensure_utc(data.timestamp),
        is_discretionary=data.is_discretionary,
        source=(data.source or "MANUAL").strip(),
        notes=data.notes.strip() if data.notes else None,
    )
    db.add(tx)
    await db.flush()
    await _rollup_daily_spend(db, uid, utc_date(data.timestamp))
    await db.commit()
    await db.refresh(tx)
    return tx


async def create_transactions_batch(
    db: AsyncSession, user_id: str, items: list[TransactionCreate]
) -> list[FinancialTransaction]:
    uid = _to_uuid(user_id)
    records = [
        FinancialTransaction(
            id=uuid.uuid4(),
            user_id=uid,
            amount=round(item.amount, 2),
            category=item.category.strip(),
            merchant=item.merchant.strip(),
            timestamp=ensure_utc(item.timestamp),
            is_discretionary=item.is_discretionary,
            source=(item.source or "MANUAL").strip(),
            notes=item.notes.strip() if item.notes else None,
        )
        for item in items
    ]
    db.add_all(records)
    await db.flush()
    affected_dates = {utc_date(item.timestamp) for item in items}
    for d in affected_dates:
        await _rollup_daily_spend(db, uid, d)
    await db.commit()
    for r in records:
        await db.refresh(r)
    return records


async def list_transactions(
    db: AsyncSession,
    user_id: str,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    category: Optional[str] = None,
    is_discretionary: Optional[bool] = None,
    page: int = 1,
    page_size: int = 30,
) -> list[FinancialTransaction]:
    uid = _to_uuid(user_id)
    filters = [FinancialTransaction.user_id == uid]

    if start_date:
        start_dt = datetime.combine(start_date, datetime.min.time(), tzinfo=timezone.utc)
        filters.append(FinancialTransaction.timestamp >= start_dt)
    if end_date:
        end_dt = datetime.combine(end_date, datetime.max.time(), tzinfo=timezone.utc)
        filters.append(FinancialTransaction.timestamp <= end_dt)
    if category:
        filters.append(FinancialTransaction.category == category)
    if is_discretionary is not None:
        filters.append(FinancialTransaction.is_discretionary == is_discretionary)

    offset_val = (max(1, page) - 1) * page_size
    stmt = (
        select(FinancialTransaction)
        .where(and_(*filters))
        .order_by(desc(FinancialTransaction.timestamp))
        .offset(offset_val)
        .limit(page_size)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_transaction_summary(
    db: AsyncSession,
    user_id: str,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
) -> TransactionSummaryResponse:
    uid = _to_uuid(user_id)
    filters = [FinancialTransaction.user_id == uid]

    if start_date:
        start_dt = datetime.combine(start_date, datetime.min.time(), tzinfo=timezone.utc)
        filters.append(FinancialTransaction.timestamp >= start_dt)
    if end_date:
        end_dt = datetime.combine(end_date, datetime.max.time(), tzinfo=timezone.utc)
        filters.append(FinancialTransaction.timestamp <= end_dt)

    stmt = select(FinancialTransaction).where(and_(*filters))
    result = await db.execute(stmt)
    items = list(result.scalars().all())

    total_spend = 0.0
    discretionary_spend = 0.0
    category_map: dict[str, float] = {}
    merchant_map: dict[str, dict[str, Any]] = {}

    for tx in items:
        amt = float(tx.amount)
        total_spend += amt
        if tx.is_discretionary:
            discretionary_spend += amt

        cat = tx.category or "Other"
        category_map[cat] = round(category_map.get(cat, 0.0) + amt, 2)

        m = tx.merchant or "Unknown"
        if m not in merchant_map:
            merchant_map[m] = {"merchant": m, "total_spend": 0.0, "count": 0}
        merchant_map[m]["total_spend"] = round(merchant_map[m]["total_spend"] + amt, 2)
        merchant_map[m]["count"] += 1

    total_spend = round(total_spend, 2)
    discretionary_spend = round(discretionary_spend, 2)
    non_discretionary = round(total_spend - discretionary_spend, 2)
    disc_pct = round((discretionary_spend / total_spend * 100), 1) if total_spend > 0 else 0.0

    top_merchants = sorted(
        merchant_map.values(), key=lambda x: x["total_spend"], reverse=True
    )[:10]

    import calendar
    today = date.today()
    ref_start = start_date or today.replace(day=1)
    ref_end = end_date or today
    days_elapsed = max(1, (ref_end - ref_start).days + 1)
    daily_burn_rate = round(total_spend / days_elapsed, 2)

    _, total_days_in_month = calendar.monthrange(ref_end.year, ref_end.month)
    projected_eom_spend = round(daily_burn_rate * total_days_in_month, 2)

    monthly_budget = 35000.0
    budget_remaining = round(max(0.0, monthly_budget - total_spend), 2)

    if total_spend > monthly_budget:
        budget_status = "DEFICIT_EXCEEDED"
    elif projected_eom_spend > monthly_budget:
        budget_status = "OVERRUN_IMMINENT"
    elif projected_eom_spend > monthly_budget * 0.9:
        budget_status = "PACING_AHEAD"
    else:
        budget_status = "ON_TRACK"

    return TransactionSummaryResponse(
        total_spend=total_spend,
        discretionary_spend=discretionary_spend,
        non_discretionary_spend=non_discretionary,
        discretionary_percentage=disc_pct,
        transaction_count=len(items),
        category_breakdown=category_map,
        top_merchants=top_merchants,
        daily_burn_rate=daily_burn_rate,
        projected_eom_spend=projected_eom_spend,
        monthly_budget=monthly_budget,
        budget_remaining=budget_remaining,
        budget_run_rate_status=budget_status,
    )


async def delete_transaction(
    db: AsyncSession, user_id: str, transaction_id: uuid.UUID
) -> bool:
    uid = _to_uuid(user_id)
    stmt = select(FinancialTransaction).where(
        and_(
            FinancialTransaction.id == transaction_id,
            FinancialTransaction.user_id == uid,
        )
    )
    result = await db.execute(stmt)
    tx = result.scalar_one_or_none()
    if not tx:
        return False
    target_date = utc_date(tx.timestamp)
    await db.delete(tx)
    await db.flush()
    await _rollup_daily_spend(db, uid, target_date)
    await db.commit()
    return True


# ============================================================================
# 2. App Usage Sessions Service
# ============================================================================

def _is_late_night(st: datetime) -> bool:
    # 22:00 to 05:59 is considered late night / sleep disruption hours
    return st.hour >= 22 or st.hour < 6


async def _rollup_app_usage(db: AsyncSession, uid: uuid.UUID, target_date: date):
    start_dt = datetime.combine(target_date, datetime.min.time(), tzinfo=timezone.utc)
    end_dt = datetime.combine(target_date, datetime.max.time(), tzinfo=timezone.utc)
    stmt = select(AppUsageSession).where(
        and_(
            AppUsageSession.user_id == uid,
            AppUsageSession.start_time >= start_dt,
            AppUsageSession.start_time <= end_dt,
        )
    )
    res = await db.execute(stmt)
    sessions = list(res.scalars().all())
    total_mins = sum(s.duration_minutes for s in sessions)
    social_mins = sum(
        s.duration_minutes
        for s in sessions
        if s.app_category.lower() in ("social media", "social", "networking")
    )
    screen_hrs = round(total_mins / 60.0, 2)
    social_hrs = round(social_mins / 60.0, 2)

    de_stmt = select(DailyEntry).where(
        and_(DailyEntry.user_id == uid, DailyEntry.date == target_date)
    )
    de_res = await db.execute(de_stmt)
    entry = de_res.scalar_one_or_none()
    if entry:
        entry.screen_time_hours = screen_hrs
        entry.social_media_hours = social_hrs
    else:
        entry = DailyEntry(
            id=uuid.uuid4(),
            user_id=uid,
            date=target_date,
            sleep_hours=0.0,
            sleep_quality=3,
            steps=0,
            screen_time_hours=screen_hrs,
            social_media_hours=social_hrs,
            deep_work_hours=0.0,
            daily_spend=0.0,
        )
        db.add(entry)


async def create_app_usage(
    db: AsyncSession, user_id: str, data: AppUsageCreate
) -> AppUsageSession:
    uid = _to_uuid(user_id)
    late_night = data.is_late_night if data.is_late_night is not None else _is_late_night(data.start_time)
    session = AppUsageSession(
        id=uuid.uuid4(),
        user_id=uid,
        app_name=data.app_name.strip(),
        app_category=data.app_category.strip(),
        duration_minutes=data.duration_minutes,
        start_time=data.start_time,
        is_late_night=late_night,
    )
    db.add(session)
    await db.flush()
    await _rollup_app_usage(db, uid, data.start_time.date())
    await db.commit()
    await db.refresh(session)
    return session


async def create_app_usage_batch(
    db: AsyncSession, user_id: str, items: list[AppUsageCreate]
) -> list[AppUsageSession]:
    uid = _to_uuid(user_id)
    records = [
        AppUsageSession(
            id=uuid.uuid4(),
            user_id=uid,
            app_name=item.app_name.strip(),
            app_category=item.app_category.strip(),
            duration_minutes=item.duration_minutes,
            start_time=item.start_time,
            is_late_night=item.is_late_night if item.is_late_night is not None else _is_late_night(item.start_time),
        )
        for item in items
    ]
    db.add_all(records)
    await db.flush()
    affected_dates = {item.start_time.date() for item in items}
    for d in affected_dates:
        await _rollup_app_usage(db, uid, d)
    await db.commit()
    for r in records:
        await db.refresh(r)
    return records


async def list_app_usage(
    db: AsyncSession,
    user_id: str,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    app_category: Optional[str] = None,
    page: int = 1,
    page_size: int = 50,
) -> list[AppUsageSession]:
    uid = _to_uuid(user_id)
    filters = [AppUsageSession.user_id == uid]

    if start_date:
        start_dt = datetime.combine(start_date, datetime.min.time(), tzinfo=timezone.utc)
        filters.append(AppUsageSession.start_time >= start_dt)
    if end_date:
        end_dt = datetime.combine(end_date, datetime.max.time(), tzinfo=timezone.utc)
        filters.append(AppUsageSession.start_time <= end_dt)
    if app_category:
        filters.append(AppUsageSession.app_category == app_category)

    offset_val = (max(1, page) - 1) * page_size
    stmt = (
        select(AppUsageSession)
        .where(and_(*filters))
        .order_by(desc(AppUsageSession.start_time))
        .offset(offset_val)
        .limit(page_size)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_app_usage_summary(
    db: AsyncSession,
    user_id: str,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
) -> AppUsageSummaryResponse:
    uid = _to_uuid(user_id)
    filters = [AppUsageSession.user_id == uid]

    if start_date:
        start_dt = datetime.combine(start_date, datetime.min.time(), tzinfo=timezone.utc)
        filters.append(AppUsageSession.start_time >= start_dt)
    if end_date:
        end_dt = datetime.combine(end_date, datetime.max.time(), tzinfo=timezone.utc)
        filters.append(AppUsageSession.start_time <= end_dt)

    stmt = select(AppUsageSession).where(and_(*filters))
    result = await db.execute(stmt)
    items = list(result.scalars().all())

    total_mins = 0
    late_night_mins = 0
    category_map: dict[str, int] = {}
    app_map: dict[str, dict[str, Any]] = {}

    distracting_cats = {"social media", "entertainment", "gaming", "social", "games", "video"}
    productive_cats = {"productivity", "utilities", "communication", "work", "development", "education", "tools"}

    distracting_mins = 0
    productive_mins = 0

    for s in items:
        total_mins += s.duration_minutes
        if s.is_late_night:
            late_night_mins += s.duration_minutes

        cat = s.app_category or "Other"
        category_map[cat] = category_map.get(cat, 0) + s.duration_minutes

        app = s.app_name or "Unknown"
        if app not in app_map:
            app_map[app] = {"app_name": app, "category": cat, "total_minutes": 0}
        app_map[app]["total_minutes"] += s.duration_minutes

        cat_lower = cat.lower()
        if cat_lower in distracting_cats:
            distracting_mins += s.duration_minutes
        elif cat_lower in productive_cats:
            productive_mins += s.duration_minutes

    for a in app_map.values():
        a["percentage"] = round((a["total_minutes"] / total_mins * 100), 1) if total_mins > 0 else 0.0

    top_apps = sorted(app_map.values(), key=lambda x: x["total_minutes"], reverse=True)[:10]

    # Distraction Index: Ratio of distracting apps to productive focus
    distraction_index = round(distracting_mins / max(1, productive_mins), 2)

    return AppUsageSummaryResponse(
        total_minutes=total_mins,
        total_hours=round(total_mins / 60.0, 2),
        late_night_minutes=late_night_mins,
        category_breakdown=category_map,
        top_apps=top_apps,
        distraction_index=distraction_index,
        distracting_minutes=distracting_mins,
        productive_minutes=productive_mins,
    )


# ============================================================================
# 3. Focus & Study Sessions Service
# ============================================================================

async def _rollup_focus_sessions(db: AsyncSession, uid: uuid.UUID, target_date: date, task_completed: bool = False):
    start_dt = datetime.combine(target_date, datetime.min.time(), tzinfo=timezone.utc)
    end_dt = datetime.combine(target_date, datetime.max.time(), tzinfo=timezone.utc)
    stmt = select(FocusStudySession).where(
        and_(
            FocusStudySession.user_id == uid,
            FocusStudySession.start_time >= start_dt,
            FocusStudySession.start_time <= end_dt,
        )
    )
    res = await db.execute(stmt)
    sessions = list(res.scalars().all())
    total_focus_mins = sum(s.duration_minutes for s in sessions)
    deep_work_hrs = round(total_focus_mins / 60.0, 2)

    de_stmt = select(DailyEntry).where(
        and_(DailyEntry.user_id == uid, DailyEntry.date == target_date)
    )
    de_res = await db.execute(de_stmt)
    entry = de_res.scalar_one_or_none()
    if entry:
        entry.deep_work_hours = deep_work_hrs
        if task_completed:
            entry.tasks_completed = (entry.tasks_completed or 0) + 1
    else:
        entry = DailyEntry(
            id=uuid.uuid4(),
            user_id=uid,
            date=target_date,
            sleep_hours=0.0,
            sleep_quality=3,
            steps=0,
            screen_time_hours=0.0,
            deep_work_hours=deep_work_hrs,
            daily_spend=0.0,
            tasks_completed=1 if task_completed else None,
        )
        db.add(entry)


async def create_focus_session(
    db: AsyncSession, user_id: str, data: FocusSessionCreate
) -> FocusStudySession:
    uid = _to_uuid(user_id)
    session = FocusStudySession(
        id=uuid.uuid4(),
        user_id=uid,
        subject_or_task=data.subject_or_task.strip(),
        start_time=data.start_time,
        end_time=data.end_time,
        duration_minutes=data.duration_minutes,
        self_reported_focus=data.self_reported_focus,
        distraction_count=data.distraction_count,
        notes=data.notes.strip() if data.notes else None,
    )
    db.add(session)
    await db.flush()
    await _rollup_focus_sessions(db, uid, data.start_time.date(), task_completed=bool(data.task_completed))
    await db.commit()
    await db.refresh(session)
    return session


async def list_focus_sessions(
    db: AsyncSession,
    user_id: str,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    subject: Optional[str] = None,
    page: int = 1,
    page_size: int = 30,
) -> list[FocusStudySession]:
    uid = _to_uuid(user_id)
    filters = [FocusStudySession.user_id == uid]

    if start_date:
        start_dt = datetime.combine(start_date, datetime.min.time(), tzinfo=timezone.utc)
        filters.append(FocusStudySession.start_time >= start_dt)
    if end_date:
        end_dt = datetime.combine(end_date, datetime.max.time(), tzinfo=timezone.utc)
        filters.append(FocusStudySession.start_time <= end_dt)
    if subject:
        filters.append(FocusStudySession.subject_or_task.ilike(f"%{subject.strip()}%"))

    offset_val = (max(1, page) - 1) * page_size
    stmt = (
        select(FocusStudySession)
        .where(and_(*filters))
        .order_by(desc(FocusStudySession.start_time))
        .offset(offset_val)
        .limit(page_size)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_focus_session_summary(
    db: AsyncSession,
    user_id: str,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
) -> FocusSessionSummaryResponse:
    uid = _to_uuid(user_id)
    filters = [FocusStudySession.user_id == uid]

    if start_date:
        start_dt = datetime.combine(start_date, datetime.min.time(), tzinfo=timezone.utc)
        filters.append(FocusStudySession.start_time >= start_dt)
    if end_date:
        end_dt = datetime.combine(end_date, datetime.max.time(), tzinfo=timezone.utc)
        filters.append(FocusStudySession.start_time <= end_dt)

    stmt = select(FocusStudySession).where(and_(*filters))
    result = await db.execute(stmt)
    items = list(result.scalars().all())

    total_mins = 0
    total_focus_points = 0
    total_distractions = 0
    subject_map: dict[str, int] = {}

    for s in items:
        total_mins += s.duration_minutes
        total_focus_points += s.self_reported_focus
        total_distractions += s.distraction_count
        subj = s.subject_or_task or "General"
        subject_map[subj] = subject_map.get(subj, 0) + s.duration_minutes

    count = len(items)
    avg_focus = round(total_focus_points / count, 2) if count > 0 else 0.0

    return FocusSessionSummaryResponse(
        total_duration_minutes=total_mins,
        total_hours=round(total_mins / 60.0, 2),
        session_count=count,
        average_focus_rating=avg_focus,
        total_distractions=total_distractions,
        subject_breakdown=subject_map,
    )


# ============================================================================
# 4. Habits & Habit Logs Service (With Streak Calculation)
# ============================================================================

def _compute_habit_streaks(completed_dates: set[date], today: date) -> tuple[int, int]:
    """
    Computes (current_streak, best_streak) from a set of completed dates.
    - current_streak is active if today OR yesterday is completed.
    - best_streak is maximum consecutive days across all history.
    """
    if not completed_dates:
        return 0, 0

    sorted_dates = sorted(completed_dates)

    # Best streak calculation
    best_streak = 0
    temp_streak = 0
    prev_d: Optional[date] = None

    for d in sorted_dates:
        if prev_d is None or d == prev_d + timedelta(days=1):
            temp_streak += 1
        elif d > prev_d + timedelta(days=1):
            temp_streak = 1
        prev_d = d
        if temp_streak > best_streak:
            best_streak = temp_streak

    # Current streak calculation
    current_streak = 0
    check_date = today if today in completed_dates else today - timedelta(days=1)

    while check_date in completed_dates:
        current_streak += 1
        check_date -= timedelta(days=1)

    return current_streak, best_streak


async def create_habit(
    db: AsyncSession, user_id: str, data: HabitCreate
) -> Habit:
    uid = _to_uuid(user_id)
    habit = Habit(
        id=uuid.uuid4(),
        user_id=uid,
        name=data.name.strip(),
        domain=data.domain.strip(),
        frequency=data.frequency.strip(),
        target_per_day=data.target_per_day,
        is_active=True,
    )
    db.add(habit)
    await db.commit()
    await db.refresh(habit)
    return habit


async def update_habit(
    db: AsyncSession, user_id: str, habit_id: uuid.UUID, data: HabitUpdate
) -> Optional[Habit]:
    uid = _to_uuid(user_id)
    stmt = select(Habit).where(and_(Habit.id == habit_id, Habit.user_id == uid))
    result = await db.execute(stmt)
    habit = result.scalar_one_or_none()
    if not habit:
        return None

    if data.name is not None:
        habit.name = data.name.strip()
    if data.domain is not None:
        habit.domain = data.domain.strip()
    if data.frequency is not None:
        habit.frequency = data.frequency.strip()
    if data.target_per_day is not None:
        habit.target_per_day = data.target_per_day
    if data.is_active is not None:
        habit.is_active = data.is_active

    await db.commit()
    await db.refresh(habit)
    return habit


async def delete_habit(
    db: AsyncSession, user_id: str, habit_id: uuid.UUID
) -> bool:
    uid = _to_uuid(user_id)
    stmt = select(Habit).where(and_(Habit.id == habit_id, Habit.user_id == uid))
    result = await db.execute(stmt)
    habit = result.scalar_one_or_none()
    if not habit:
        return False
    await db.delete(habit)
    await db.commit()
    return True


async def list_habits_with_streaks(
    db: AsyncSession, user_id: str
) -> list[HabitWithStreakResponse]:
    uid = _to_uuid(user_id)
    today = date.today()

    stmt = (
        select(Habit)
        .where(and_(Habit.user_id == uid, Habit.is_active.is_(True)))
        .order_by(Habit.created_at.asc())
    )
    result = await db.execute(stmt)
    habits = list(result.scalars().all())

    output: list[HabitWithStreakResponse] = []

    for habit in habits:
        # Fetch logs for this habit
        log_stmt = (
            select(HabitLog)
            .where(and_(HabitLog.habit_id == habit.id, HabitLog.user_id == uid))
            .order_by(HabitLog.date.desc())
        )
        log_res = await db.execute(log_stmt)
        logs = list(log_res.scalars().all())

        completed_dates = {log.date for log in logs if log.completed}
        curr_streak, best_streak = _compute_habit_streaks(completed_dates, today)
        completed_today = today in completed_dates

        # Past 7 days history
        history_7d: list[dict[str, Any]] = []
        completed_7d_count = 0
        for i in range(6, -1, -1):
            day_i = today - timedelta(days=i)
            is_done = day_i in completed_dates
            if is_done:
                completed_7d_count += 1
            history_7d.append({
                "date": str(day_i),
                "day_name": day_i.strftime("%a"),
                "completed": is_done,
            })

        rate_7d = round((completed_7d_count / 7.0 * 100), 1)

        output.append(
            HabitWithStreakResponse(
                id=habit.id,
                name=habit.name,
                domain=habit.domain,
                frequency=habit.frequency,
                target_per_day=habit.target_per_day,
                is_active=habit.is_active,
                current_streak=curr_streak,
                best_streak=best_streak,
                completed_today=completed_today,
                completion_rate_7d=rate_7d,
                history_7d=history_7d,
            )
        )

    return output


async def log_habit(
    db: AsyncSession, user_id: str, data: HabitLogCreate
) -> HabitLog:
    uid = _to_uuid(user_id)

    # Verify habit belongs to user
    habit_stmt = select(Habit).where(and_(Habit.id == data.habit_id, Habit.user_id == uid))
    habit_res = await db.execute(habit_stmt)
    habit = habit_res.scalar_one_or_none()
    if not habit:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Habit not found")

    # Check if a log entry already exists for this habit & date
    log_stmt = select(HabitLog).where(
        and_(
            HabitLog.habit_id == data.habit_id,
            HabitLog.user_id == uid,
            HabitLog.date == data.date,
        )
    )
    log_res = await db.execute(log_stmt)
    existing_log = log_res.scalar_one_or_none()

    if existing_log:
        existing_log.completed = data.completed
        existing_log.value = round(data.value, 2)
        if data.notes is not None:
            existing_log.notes = data.notes.strip() if data.notes else None
        await db.commit()
        await db.refresh(existing_log)
        return existing_log
    else:
        new_log = HabitLog(
            id=uuid.uuid4(),
            habit_id=data.habit_id,
            user_id=uid,
            date=data.date,
            completed=data.completed,
            value=round(data.value, 2),
            notes=data.notes.strip() if data.notes else None,
        )
        db.add(new_log)
        await db.commit()
        await db.refresh(new_log)
        return new_log


async def list_habit_logs(
    db: AsyncSession,
    user_id: str,
    habit_id: Optional[uuid.UUID] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
) -> list[HabitLog]:
    uid = _to_uuid(user_id)
    filters = [HabitLog.user_id == uid]

    if habit_id:
        filters.append(HabitLog.habit_id == habit_id)
    if start_date:
        filters.append(HabitLog.date >= start_date)
    if end_date:
        filters.append(HabitLog.date <= end_date)

    stmt = select(HabitLog).where(and_(*filters)).order_by(desc(HabitLog.date))
    result = await db.execute(stmt)
    return list(result.scalars().all())


# ============================================================================
# 5. Sleep Intervals & Stages Service
# ============================================================================

async def _rollup_sleep_intervals(
    db: AsyncSession, uid: uuid.UUID, target_date: date, resting_hr: Optional[int] = None
):
    stmt = select(SleepInterval).where(
        and_(
            SleepInterval.user_id == uid,
            SleepInterval.date == target_date,
        )
    )
    res = await db.execute(stmt)
    intervals = list(res.scalars().all())
    if not intervals:
        return

    asleep_stages = {"CORE", "DEEP", "REM"}
    asleep_mins = sum(i.duration_minutes for i in intervals if i.stage.upper() in asleep_stages)
    deep_mins = sum(i.duration_minutes for i in intervals if i.stage.upper() == "DEEP")
    rem_mins = sum(i.duration_minutes for i in intervals if i.stage.upper() == "REM")
    awake_count = sum(1 for i in intervals if i.stage.upper() == "AWAKE")

    total_sleep_hrs = round(asleep_mins / 60.0, 2)
    deep_ratio = deep_mins / max(1, asleep_mins)
    rem_ratio = rem_mins / max(1, asleep_mins)

    # Bedtime derivation
    asleep_intervals = [i for i in intervals if i.stage.upper() in asleep_stages]
    earliest_start = min((i.start_time for i in asleep_intervals), default=None)
    bedtime_time = earliest_start.time() if earliest_start else None

    # Quality score (1-5)
    quality = 3
    if total_sleep_hrs >= 7.0 and deep_ratio >= 0.15 and rem_ratio >= 0.18 and awake_count <= 2:
        quality = 5
    elif total_sleep_hrs >= 6.5 and (deep_ratio >= 0.12 or rem_ratio >= 0.15) and awake_count <= 3:
        quality = 4
    elif total_sleep_hrs < 5.0 or awake_count > 5:
        quality = 1
    elif total_sleep_hrs < 6.0 or deep_ratio < 0.08:
        quality = 2

    de_stmt = select(DailyEntry).where(
        and_(DailyEntry.user_id == uid, DailyEntry.date == target_date)
    )
    de_res = await db.execute(de_stmt)
    entry = de_res.scalar_one_or_none()
    if entry:
        entry.sleep_hours = total_sleep_hrs
        entry.sleep_quality = quality
        if bedtime_time:
            entry.sleep_bedtime = bedtime_time
        if resting_hr is not None:
            entry.resting_heart_rate = resting_hr
    else:
        entry = DailyEntry(
            id=uuid.uuid4(),
            user_id=uid,
            date=target_date,
            sleep_hours=total_sleep_hrs,
            sleep_quality=quality,
            sleep_bedtime=bedtime_time,
            resting_heart_rate=resting_hr,
            steps=0,
            screen_time_hours=0.0,
            deep_work_hours=0.0,
            daily_spend=0.0,
        )
        db.add(entry)


async def create_sleep_interval(
    db: AsyncSession, user_id: str, data: SleepIntervalCreate
) -> SleepInterval:
    uid = _to_uuid(user_id)
    interval_date = data.date or data.start_time.date()
    stage = data.stage.upper()
    start_utc = ensure_utc(data.start_time)
    end_utc = ensure_utc(data.end_time)

    dup_stmt = (
        select(SleepInterval)
        .where(
            and_(
                SleepInterval.user_id == uid,
                SleepInterval.stage == stage,
                SleepInterval.start_time == start_utc,
                SleepInterval.end_time == end_utc,
            )
        )
        .limit(1)
    )
    dup_res = await db.execute(dup_stmt)
    existing = dup_res.scalar_one_or_none()
    if existing:
        return existing

    interval = SleepInterval(
        id=uuid.uuid4(),
        user_id=uid,
        date=interval_date,
        stage=stage,
        start_time=start_utc,
        end_time=end_utc,
        duration_minutes=data.duration_minutes,
    )
    db.add(interval)
    await db.flush()
    await _rollup_sleep_intervals(db, uid, interval_date)
    await db.commit()
    await db.refresh(interval)
    return interval


async def create_sleep_intervals_batch(
    db: AsyncSession, user_id: str, data: SleepIntervalBatchCreate
) -> list[SleepInterval]:
    uid = _to_uuid(user_id)
    records: list[SleepInterval] = []
    affected_dates: set[date] = set()
    candidates: list[tuple[SleepIntervalCreate, date, str, tuple]] = []

    for item in data.intervals:
        interval_date = item.date or item.start_time.date()
        stage = item.stage.upper()
        key = (interval_date, ensure_utc(item.start_time), ensure_utc(item.end_time), stage)
        candidates.append((item, interval_date, stage, key))

    candidate_dates = {c[1] for c in candidates}
    existing_keys: set[tuple] = set()
    if candidate_dates:
        existing_res = await db.execute(
            select(SleepInterval).where(
                and_(
                    SleepInterval.user_id == uid,
                    SleepInterval.date.in_(candidate_dates),
                )
            )
        )
        existing_keys = {
            (i.date, ensure_utc(i.start_time), ensure_utc(i.end_time), i.stage.upper())
            for i in existing_res.scalars().all()
        }

    for item, interval_date, stage, key in candidates:
        if key in existing_keys:
            continue
        existing_keys.add(key)
        rec = SleepInterval(
            id=uuid.uuid4(),
            user_id=uid,
            date=interval_date,
            stage=stage,
            start_time=ensure_utc(item.start_time),
            end_time=ensure_utc(item.end_time),
            duration_minutes=item.duration_minutes,
        )
        records.append(rec)
        affected_dates.add(interval_date)

    if records:
        db.add_all(records)
        await db.flush()

        if data.auto_merge_daily_entry:
            for d in affected_dates:
                await _rollup_sleep_intervals(db, uid, d, resting_hr=data.resting_heart_rate)

        await db.commit()
        for r in records:
            await db.refresh(r)
    return records


async def list_sleep_intervals(
    db: AsyncSession,
    user_id: str,
    target_date: Optional[date] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
) -> list[SleepInterval]:
    uid = _to_uuid(user_id)
    filters = [SleepInterval.user_id == uid]

    if target_date:
        filters.append(SleepInterval.date == target_date)
    if start_date:
        filters.append(SleepInterval.date >= start_date)
    if end_date:
        filters.append(SleepInterval.date <= end_date)

    stmt = select(SleepInterval).where(and_(*filters)).order_by(SleepInterval.start_time.asc())
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_sleep_summary(
    db: AsyncSession,
    user_id: str,
    target_date: date,
) -> SleepSummaryResponse:
    uid = _to_uuid(user_id)
    intervals = await list_sleep_intervals(db, user_id, target_date=target_date)

    stage_breakdown: dict[str, int] = {}
    deep_m = 0
    rem_m = 0
    core_m = 0
    awake_m = 0
    in_bed_m = 0
    asleep_m = 0

    for i in intervals:
        st = i.stage.upper()
        stage_breakdown[st] = stage_breakdown.get(st, 0) + i.duration_minutes
        if st == "DEEP":
            deep_m += i.duration_minutes
            asleep_m += i.duration_minutes
        elif st == "REM":
            rem_m += i.duration_minutes
            asleep_m += i.duration_minutes
        elif st in ("CORE", "LIGHT"):
            core_m += i.duration_minutes
            asleep_m += i.duration_minutes
        elif st == "AWAKE":
            awake_m += i.duration_minutes
        elif st in ("IN_BED", "INBED"):
            in_bed_m += i.duration_minutes

    total_sleep_hours = round(asleep_m / 60.0, 2)
    total_in_bed_hours = round((asleep_m + in_bed_m + awake_m) / 60.0, 2)
    asleep_intervals = [i for i in intervals if i.stage.upper() in {"CORE", "DEEP", "REM", "LIGHT"}]
    earliest_asleep = min((i.start_time for i in asleep_intervals), default=None)
    latest_asleep = max((i.end_time for i in asleep_intervals), default=None)
    bedtime_str = earliest_asleep.strftime("%H:%M") if earliest_asleep else None
    wake_str = latest_asleep.strftime("%H:%M") if latest_asleep else None

    # Get resting heart rate from DailyEntry if available
    de_stmt = select(DailyEntry).where(
        and_(DailyEntry.user_id == uid, DailyEntry.date == target_date)
    )
    de_res = await db.execute(de_stmt)
    entry = de_res.scalar_one_or_none()
    quality = entry.sleep_quality if entry else 3
    r_hr = entry.resting_heart_rate if entry else None

    # Query recent DailyEntry records to compute circadian drift & social jetlag
    recent_stmt = (
        select(DailyEntry)
        .where(
            and_(
                DailyEntry.user_id == uid,
                DailyEntry.date <= target_date,
                DailyEntry.date >= target_date - timedelta(days=14),
            )
        )
        .order_by(DailyEntry.date.asc())
    )
    recent_res = await db.execute(recent_stmt)
    recent_entries = list(recent_res.scalars().all())

    from app.ml.risk_forecaster import detect_circadian_drift, CircadianStatus
    bedtimes = [e.sleep_bedtime for e in recent_entries if e.sleep_bedtime]
    entry_dates = [e.date for e in recent_entries if e.sleep_bedtime]
    wake_times = [wake_str] if wake_str else []

    drift_f = detect_circadian_drift(bedtimes, wake_times=wake_times, entry_dates=entry_dates)
    phase_shift_val = "aligned"
    if drift_f.status == CircadianStatus.PHASE_DELAY:
        phase_shift_val = "delay"
    elif drift_f.max_shift_minutes < -15:
        phase_shift_val = "advance"

    # Physiological Sleep Score (0-100)
    score_components = (
        min(35.0, (total_sleep_hours / 8.0) * 35.0) +
        (quality * 7.0) +
        min(20.0, ((deep_m + rem_m) / max(1, asleep_m)) * 50.0) +
        max(0.0, 10.0 - awake_m)
    )
    sleep_score = int(min(100, max(15, round(score_components))))

    return SleepSummaryResponse(
        date=target_date,
        total_sleep_hours=total_sleep_hours,
        total_in_bed_hours=total_in_bed_hours,
        sleep_quality=quality,
        bedtime=bedtime_str,
        wake_time=wake_str,
        deep_minutes=deep_m,
        rem_minutes=rem_m,
        core_minutes=core_m,
        awake_minutes=awake_m,
        in_bed_minutes=in_bed_m,
        resting_heart_rate=r_hr,
        stage_breakdown=stage_breakdown,
        circadian_drift_minutes=drift_f.max_shift_minutes,
        bedtime_variance_minutes=drift_f.bedtime_variance_minutes,
        phase_shift=phase_shift_val,
        social_jetlag_minutes=drift_f.social_jetlag_minutes,
        sleep_score=sleep_score,
    )


# ============================================================================
# 6. Physical Health & Workouts Service
# ============================================================================

async def _rollup_workouts(db: AsyncSession, uid: uuid.UUID, target_date: date):
    start_dt = datetime.combine(target_date, datetime.min.time(), tzinfo=timezone.utc)
    end_dt = datetime.combine(target_date, datetime.max.time(), tzinfo=timezone.utc)
    stmt = select(WorkoutSession).where(
        and_(
            WorkoutSession.user_id == uid,
            WorkoutSession.start_time >= start_dt,
            WorkoutSession.start_time <= end_dt,
        )
    )
    res = await db.execute(stmt)
    workouts = list(res.scalars().all())
    total_active_mins = sum(w.duration_minutes for w in workouts)
    total_cals = sum(w.calories_burned or 0 for w in workouts)
    total_steps = sum(w.steps or 0 for w in workouts)

    de_stmt = select(DailyEntry).where(
        and_(DailyEntry.user_id == uid, DailyEntry.date == target_date)
    )
    de_res = await db.execute(de_stmt)
    entry = de_res.scalar_one_or_none()
    if entry:
        entry.active_minutes = total_active_mins
        entry.calories_burned = total_cals if total_cals > 0 else entry.calories_burned
        entry.steps = max(entry.steps or 0, total_steps)
    else:
        entry = DailyEntry(
            id=uuid.uuid4(),
            user_id=uid,
            date=target_date,
            sleep_hours=0.0,
            sleep_quality=3,
            steps=total_steps,
            active_minutes=total_active_mins,
            calories_burned=total_cals if total_cals > 0 else None,
            screen_time_hours=0.0,
            deep_work_hours=0.0,
            daily_spend=0.0,
        )
        db.add(entry)


async def create_workout_session(
    db: AsyncSession, user_id: str, data: WorkoutSessionCreate
) -> WorkoutSession:
    uid = _to_uuid(user_id)
    workout = WorkoutSession(
        id=uuid.uuid4(),
        user_id=uid,
        activity_type=data.activity_type.strip(),
        start_time=data.start_time,
        end_time=data.end_time,
        duration_minutes=data.duration_minutes,
        calories_burned=data.calories_burned,
        steps=data.steps,
        intensity=(data.intensity or "MODERATE").upper(),
        notes=data.notes.strip() if data.notes else None,
    )
    db.add(workout)
    await db.flush()
    await _rollup_workouts(db, uid, data.start_time.date())
    await db.commit()
    await db.refresh(workout)
    return workout


async def list_workout_sessions(
    db: AsyncSession,
    user_id: str,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    activity_type: Optional[str] = None,
    page: int = 1,
    page_size: int = 30,
) -> list[WorkoutSession]:
    uid = _to_uuid(user_id)
    filters = [WorkoutSession.user_id == uid]

    if start_date:
        start_dt = datetime.combine(start_date, datetime.min.time(), tzinfo=timezone.utc)
        filters.append(WorkoutSession.start_time >= start_dt)
    if end_date:
        end_dt = datetime.combine(end_date, datetime.max.time(), tzinfo=timezone.utc)
        filters.append(WorkoutSession.start_time <= end_dt)
    if activity_type:
        filters.append(WorkoutSession.activity_type.ilike(f"%{activity_type.strip()}%"))

    offset_val = (max(1, page) - 1) * page_size
    stmt = (
        select(WorkoutSession)
        .where(and_(*filters))
        .order_by(desc(WorkoutSession.start_time))
        .offset(offset_val)
        .limit(page_size)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_workout_consistency(
    db: AsyncSession,
    user_id: str,
) -> WorkoutConsistencyResponse:
    uid = _to_uuid(user_id)
    today = date.today()
    start_7d = today - timedelta(days=6)
    start_30d = today - timedelta(days=29)

    stmt = (
        select(DailyEntry)
        .where(and_(DailyEntry.user_id == uid, DailyEntry.date >= start_30d))
        .order_by(DailyEntry.date.desc())
    )
    res = await db.execute(stmt)
    entries = list(res.scalars().all())
    entry_map = {e.date: e for e in entries}

    w_stmt = select(WorkoutSession).where(
        and_(
            WorkoutSession.user_id == uid,
            WorkoutSession.start_time >= datetime.combine(start_30d, datetime.min.time(), tzinfo=timezone.utc),
        )
    )
    w_res = await db.execute(w_stmt)
    workouts = list(w_res.scalars().all())

    w_7d = [w for w in workouts if w.start_time.date() >= start_7d]
    total_workouts_7d = len(w_7d)
    total_active_mins_7d = sum(w.duration_minutes for w in w_7d)

    # Streak calculation
    current_streak = 0
    best_streak = 0
    running_streak = 0

    today_active = (entry_map.get(today) and (entry_map[today].active_minutes or 0) >= 20) or any(w.start_time.date() == today for w in workouts)
    check_date = today if today_active else (today - timedelta(days=1))

    for i in range(30):
        d = check_date - timedelta(days=i)
        had_workout = (entry_map.get(d) and (entry_map[d].active_minutes or 0) >= 20) or any(w.start_time.date() == d for w in workouts)
        if had_workout:
            current_streak += 1
        else:
            break

    all_dates = [start_30d + timedelta(days=i) for i in range(30)]
    for d in all_dates:
        had_workout = (entry_map.get(d) and (entry_map[d].active_minutes or 0) >= 20) or any(w.start_time.date() == d for w in workouts)
        if had_workout:
            running_streak += 1
            if running_streak > best_streak:
                best_streak = running_streak
        else:
            running_streak = 0

    best_streak = max(best_streak, current_streak)

    workout_days_7d = len({w.start_time.date() for w in w_7d} | {e.date for e in entries if e.date >= start_7d and (e.active_minutes or 0) >= 20})
    if 3 <= workout_days_7d <= 6:
        rest_day_adherence = 100.0
    elif workout_days_7d == 7:
        rest_day_adherence = 75.0
    elif workout_days_7d == 2:
        rest_day_adherence = 60.0
    elif workout_days_7d == 1:
        rest_day_adherence = 40.0
    else:
        rest_day_adherence = 20.0

    latest_entry = entry_map.get(today) or (entries[0] if entries else None)
    sleep_hrs = float(latest_entry.sleep_hours) if latest_entry else 7.0
    sleep_qual = int(latest_entry.sleep_quality) if latest_entry else 3
    energy = int(latest_entry.energy_level or 3) if latest_entry else 3

    from app.ml.risk_forecaster import calculate_workout_skip_risk
    inactive_days = 0 if current_streak > 0 else 1
    skip_forecast = calculate_workout_skip_risk(
        sleep_hours=sleep_hrs,
        sleep_quality=sleep_qual,
        energy_level=energy * 2 if energy <= 5 else energy,
        consecutive_inactive_days=inactive_days,
    )

    return WorkoutConsistencyResponse(
        current_streak=current_streak,
        streak_days=current_streak,
        best_streak=best_streak,
        total_workouts_7d=total_workouts_7d,
        total_active_minutes_7d=total_active_mins_7d,
        total_minutes_7d=total_active_mins_7d,
        rest_day_adherence_pct=rest_day_adherence,
        rest_days_adherence=round(rest_day_adherence / 100.0, 2),
        workout_skip_vulnerability=skip_forecast.probability,
        skip_vulnerability=skip_forecast.probability,
        skip_risk_level=skip_forecast.risk_level.value,
        recommendation=skip_forecast.target_recommendation,
    )
