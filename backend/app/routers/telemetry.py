import uuid
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.utils.db_route import CommitRoute
from app.utils.security import get_current_user
from app.cache.redis_client import invalidate_user_cache
from app.schemas.telemetry import (
    TransactionCreate,
    TransactionBatchCreate,
    TransactionResponse,
    TransactionSummaryResponse,
    AppUsageCreate,
    AppUsageBatchCreate,
    AppUsageResponse,
    AppUsageSummaryResponse,
    FocusSessionCreate,
    FocusSessionResponse,
    FocusSessionSummaryResponse,
    HabitCreate,
    HabitUpdate,
    HabitResponse,
    HabitLogCreate,
    HabitLogResponse,
    HabitWithStreakResponse,
    SleepIntervalCreate,
    SleepIntervalBatchCreate,
    SleepIntervalResponse,
    SleepSummaryResponse,
    WorkoutSessionCreate,
    WorkoutSessionResponse,
    WorkoutConsistencyResponse,
)
from app.services import telemetry_service

router = APIRouter(route_class=CommitRoute)


# ============================================================================
# 1. Financial Transactions Endpoints
# ============================================================================

@router.post(
    "/transactions",
    response_model=TransactionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Log a single financial transaction",
)
async def create_transaction_endpoint(
    data: TransactionCreate,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tx = await telemetry_service.create_transaction(db, user_id, data)
    invalidate_user_cache(user_id)
    return tx


@router.post(
    "/transactions/batch",
    response_model=list[TransactionResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Batch import financial transactions",
)
async def create_transactions_batch_endpoint(
    data: TransactionBatchCreate,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    items = await telemetry_service.create_transactions_batch(db, user_id, data.transactions)
    invalidate_user_cache(user_id)
    return items


@router.get(
    "/transactions",
    response_model=list[TransactionResponse],
    summary="List transactions with filtering and pagination",
)
async def list_transactions_endpoint(
    start_date: Optional[date] = Query(None, description="Start date filter (inclusive)"),
    end_date: Optional[date] = Query(None, description="End date filter (inclusive)"),
    category: Optional[str] = Query(None, description="Filter by category"),
    is_discretionary: Optional[bool] = Query(None, description="Filter discretionary/essential"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(30, ge=1, le=100, description="Page size"),
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await telemetry_service.list_transactions(
        db, user_id, start_date, end_date, category, is_discretionary, page, page_size
    )


@router.get(
    "/transactions/summary",
    response_model=TransactionSummaryResponse,
    summary="Aggregated spending breakdown and discretionary ratios",
)
async def get_transaction_summary_endpoint(
    start_date: Optional[date] = Query(None, description="Start date filter"),
    end_date: Optional[date] = Query(None, description="End date filter"),
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await telemetry_service.get_transaction_summary(db, user_id, start_date, end_date)


@router.delete(
    "/transactions/{transaction_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete a transaction",
)
async def delete_transaction_endpoint(
    transaction_id: uuid.UUID,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    deleted = await telemetry_service.delete_transaction(db, user_id, transaction_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found or unauthorized",
        )
    invalidate_user_cache(user_id)
    return {"message": "Transaction deleted successfully"}


# ============================================================================
# 2. App Usage Sessions Endpoints
# ============================================================================

@router.post(
    "/app-usage",
    response_model=AppUsageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Log foreground application usage session",
)
async def create_app_usage_endpoint(
    data: AppUsageCreate,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await telemetry_service.create_app_usage(db, user_id, data)
    invalidate_user_cache(user_id)
    return session


@router.post(
    "/app-usage/batch",
    response_model=list[AppUsageResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Batch sync app usage sessions from device",
)
async def create_app_usage_batch_endpoint(
    data: AppUsageBatchCreate,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    items = await telemetry_service.create_app_usage_batch(db, user_id, data.sessions)
    invalidate_user_cache(user_id)
    return items


@router.get(
    "/app-usage",
    response_model=list[AppUsageResponse],
    summary="List app usage sessions",
)
async def list_app_usage_endpoint(
    start_date: Optional[date] = Query(None, description="Start date filter"),
    end_date: Optional[date] = Query(None, description="End date filter"),
    app_category: Optional[str] = Query(None, description="Filter by app category"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=200, description="Page size"),
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await telemetry_service.list_app_usage(
        db, user_id, start_date, end_date, app_category, page, page_size
    )


@router.get(
    "/app-usage/summary",
    response_model=AppUsageSummaryResponse,
    summary="Aggregated app usage breakdown, top apps and late-night minutes",
)
async def get_app_usage_summary_endpoint(
    start_date: Optional[date] = Query(None, description="Start date filter"),
    end_date: Optional[date] = Query(None, description="End date filter"),
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await telemetry_service.get_app_usage_summary(db, user_id, start_date, end_date)


# ============================================================================
# 3. Focus & Study Sessions Endpoints
# ============================================================================

@router.post(
    "/focus-sessions",
    response_model=FocusSessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Log completed focus or study interval",
)
async def create_focus_session_endpoint(
    data: FocusSessionCreate,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await telemetry_service.create_focus_session(db, user_id, data)
    invalidate_user_cache(user_id)
    return session


@router.get(
    "/focus-sessions",
    response_model=list[FocusSessionResponse],
    summary="List focus and study sessions",
)
async def list_focus_sessions_endpoint(
    start_date: Optional[date] = Query(None, description="Start date filter"),
    end_date: Optional[date] = Query(None, description="End date filter"),
    subject: Optional[str] = Query(None, description="Filter by subject or task"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(30, ge=1, le=100, description="Page size"),
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await telemetry_service.list_focus_sessions(
        db, user_id, start_date, end_date, subject, page, page_size
    )


@router.get(
    "/focus-sessions/summary",
    response_model=FocusSessionSummaryResponse,
    summary="Focus duration, average rating and distraction analytics",
)
async def get_focus_session_summary_endpoint(
    start_date: Optional[date] = Query(None, description="Start date filter"),
    end_date: Optional[date] = Query(None, description="End date filter"),
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await telemetry_service.get_focus_session_summary(db, user_id, start_date, end_date)


# ============================================================================
# 4. Habits & Habit Logs Endpoints
# ============================================================================

@router.post(
    "/habits",
    response_model=HabitResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new habit definition",
)
async def create_habit_endpoint(
    data: HabitCreate,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await telemetry_service.create_habit(db, user_id, data)


@router.get(
    "/habits",
    response_model=list[HabitWithStreakResponse],
    summary="List active habits with real-time streak and 7-day history",
)
async def list_habits_endpoint(
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await telemetry_service.list_habits_with_streaks(db, user_id)


@router.put(
    "/habits/{habit_id}",
    response_model=HabitResponse,
    summary="Update habit details or active status",
)
async def update_habit_endpoint(
    habit_id: uuid.UUID,
    data: HabitUpdate,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    habit = await telemetry_service.update_habit(db, user_id, habit_id, data)
    if not habit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Habit not found or unauthorized",
        )
    return habit


@router.delete(
    "/habits/{habit_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete a habit and all associated logs",
)
async def delete_habit_endpoint(
    habit_id: uuid.UUID,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    deleted = await telemetry_service.delete_habit(db, user_id, habit_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Habit not found or unauthorized",
        )
    invalidate_user_cache(user_id)
    return {"message": "Habit deleted successfully"}


@router.post(
    "/habits/log",
    response_model=HabitLogResponse,
    status_code=status.HTTP_200_OK,
    summary="Log or toggle daily habit completion",
)
async def log_habit_endpoint(
    data: HabitLogCreate,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    log = await telemetry_service.log_habit(db, user_id, data)
    invalidate_user_cache(user_id)
    return log


@router.get(
    "/habits/logs",
    response_model=list[HabitLogResponse],
    summary="List historical habit completion logs",
)
async def list_habit_logs_endpoint(
    habit_id: Optional[uuid.UUID] = Query(None, description="Filter by habit ID"),
    start_date: Optional[date] = Query(None, description="Start date filter"),
    end_date: Optional[date] = Query(None, description="End date filter"),
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await telemetry_service.list_habit_logs(db, user_id, habit_id, start_date, end_date)


# ============================================================================
# 5. Sleep Intervals & Stages Endpoints
# ============================================================================

@router.post(
    "/sleep-intervals",
    response_model=SleepIntervalResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Log a single granular sleep stage interval",
)
async def create_sleep_interval_endpoint(
    data: SleepIntervalCreate,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    interval = await telemetry_service.create_sleep_interval(db, user_id, data)
    invalidate_user_cache(user_id)
    return interval


@router.post(
    "/sleep-intervals/batch",
    response_model=list[SleepIntervalResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Batch log sleep stage intervals and resting heart rate",
)
async def create_sleep_intervals_batch_endpoint(
    data: SleepIntervalBatchCreate,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    intervals = await telemetry_service.create_sleep_intervals_batch(db, user_id, data)
    invalidate_user_cache(user_id)
    return intervals


@router.get(
    "/sleep-intervals",
    response_model=list[SleepIntervalResponse],
    summary="List granular sleep stage intervals",
)
async def list_sleep_intervals_endpoint(
    date: Optional[date] = Query(None, description="Specific sleep date"),
    start_date: Optional[date] = Query(None, description="Start date filter"),
    end_date: Optional[date] = Query(None, description="End date filter"),
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await telemetry_service.list_sleep_intervals(
        db, user_id, target_date=date, start_date=start_date, end_date=end_date
    )


@router.get(
    "/sleep-summary",
    response_model=SleepSummaryResponse,
    summary="Aggregated sleep duration, stages architecture, and resting heart rate",
)
async def get_sleep_summary_endpoint(
    date: Optional[date] = Query(None, description="Date for sleep summary (defaults to today)"),
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from datetime import date as dt_date
    target_d = date or dt_date.today()
    return await telemetry_service.get_sleep_summary(db, user_id, target_d)


# ============================================================================
# 6. Physical Health & Workouts Endpoints
# ============================================================================

@router.post(
    "/workouts",
    response_model=WorkoutSessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Log a completed workout or physical activity",
)
async def create_workout_endpoint(
    data: WorkoutSessionCreate,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    workout = await telemetry_service.create_workout_session(db, user_id, data)
    invalidate_user_cache(user_id)
    return workout


@router.get(
    "/workouts",
    response_model=list[WorkoutSessionResponse],
    summary="List workout sessions with filtering",
)
async def list_workouts_endpoint(
    start_date: Optional[date] = Query(None, description="Start date filter"),
    end_date: Optional[date] = Query(None, description="End date filter"),
    activity_type: Optional[str] = Query(None, description="Filter by activity type"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(30, ge=1, le=100, description="Page size"),
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await telemetry_service.list_workout_sessions(
        db, user_id, start_date, end_date, activity_type, page, page_size
    )


@router.get(
    "/workouts/consistency",
    response_model=WorkoutConsistencyResponse,
    summary="Workout streaks, rest-day adherence, and exercise skip vulnerability",
)
async def get_workout_consistency_endpoint(
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await telemetry_service.get_workout_consistency(db, user_id)
