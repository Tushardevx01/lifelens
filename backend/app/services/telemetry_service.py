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
)
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
)


def _to_uuid(val: str | uuid.UUID) -> uuid.UUID:
    return val if isinstance(val, uuid.UUID) else uuid.UUID(val)


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
        timestamp=data.timestamp,
        is_discretionary=data.is_discretionary,
        notes=data.notes.strip() if data.notes else None,
    )
    db.add(tx)
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
            timestamp=item.timestamp,
            is_discretionary=item.is_discretionary,
            notes=item.notes.strip() if item.notes else None,
        )
        for item in items
    ]
    db.add_all(records)
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

    return TransactionSummaryResponse(
        total_spend=total_spend,
        discretionary_spend=discretionary_spend,
        non_discretionary_spend=non_discretionary,
        discretionary_percentage=disc_pct,
        transaction_count=len(items),
        category_breakdown=category_map,
        top_merchants=top_merchants,
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
    await db.delete(tx)
    await db.commit()
    return True


# ============================================================================
# 2. App Usage Sessions Service
# ============================================================================

def _is_late_night(st: datetime) -> bool:
    # 22:00 to 06:00 is considered late night / sleep disruption hours
    return st.hour >= 22 or st.hour < 6


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

    for a in app_map.values():
        a["percentage"] = round((a["total_minutes"] / total_mins * 100), 1) if total_mins > 0 else 0.0

    top_apps = sorted(app_map.values(), key=lambda x: x["total_minutes"], reverse=True)[:10]

    return AppUsageSummaryResponse(
        total_minutes=total_mins,
        total_hours=round(total_mins / 60.0, 2),
        late_night_minutes=late_night_mins,
        category_breakdown=category_map,
        top_apps=top_apps,
    )


# ============================================================================
# 3. Focus & Study Sessions Service
# ============================================================================

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
        .where(and_(Habit.user_id == uid, Habit.is_active == True))
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

        completed_dates = {l.date for l in logs if l.completed}
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

