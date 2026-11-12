from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, UploadFile, File, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.utils.db_route import CommitRoute
from app.schemas.entry import (
    DailyEntryCreate, DailyEntryUpdate, DailyEntryResponse, CsvUploadResponse
)
from app.services.entry_service import (
    create_entry, get_entries, get_entry_by_date,
    update_entry, delete_entry, import_csv
)
from app.utils.security import get_current_user
from app.services.analytics_service import compute_and_store_features
from app.cache.redis_client import invalidate_user_cache, get_redis_client

import logging
logger = logging.getLogger(__name__)

router = APIRouter(route_class=CommitRoute)


# ── IMPORTANT: static string routes MUST come before parameterised routes.
# FastAPI matches in declaration order.  /upload-csv must be above /{entry_date}
# or the router will try to parse "upload-csv" as a date → 422.

@router.post("/upload-csv", response_model=CsvUploadResponse, status_code=status.HTTP_200_OK)
async def upload_csv(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Batch-import daily entries from a CSV file.
    Required columns: date, sleep_hours, sleep_quality, screen_time_hours,
                      steps, deep_work_hours, daily_spend
    Optional columns: social_media_hours, active_minutes, tasks_completed,
                      mood_score, energy_level, notes, spend_category
    """
    if not file.filename or not file.filename.lower().endswith('.csv'):
        from fastapi import HTTPException
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="File must be a .csv file."
        )
    result = await import_csv(db, user_id, file)

    invalidate_user_cache(user_id)
    return result


@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
async def submit_entry(
    data: DailyEntryCreate,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Submit a new daily entry.
    1. Creates entry in DB.
    2. Synchronously computes features + Life Score (so dashboard renders immediately).
    3. Fires async Celery task for full ML pipeline (clustering, RF, anomaly, insights).
    """
    entry = await create_entry(db, user_id, data)

    # Sync: feature engineering + Life Score — user sees updated dashboard instantly
    try:
        await compute_and_store_features(db, user_id, data.date)
    except Exception as e:
        logger.warning(f"Sync feature computation failed for {data.date}: {e}")

    # Async: full ML pipeline — runs in Celery worker if broker is available
    if get_redis_client():
        try:
            from app.tasks.ml_tasks import run_full_pipeline
            run_full_pipeline.apply_async(args=[user_id, str(data.date)], retry=False)
        except Exception as e:
            logger.info(f"Celery task not dispatched: {e}")

    invalidate_user_cache(user_id)
    return {"entry_id": str(entry.id), "message": "Entry submitted successfully."}


@router.get("/", response_model=list[DailyEntryResponse])
async def list_entries(
    start: Optional[date] = Query(None),
    end: Optional[date] = Query(None),
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(30, ge=1, le=100, description="Entries per page"),
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List daily entries with pagination. Defaults to page 1, 30 entries."""
    entries = await get_entries(db, user_id, start, end, page=page, page_size=page_size)
    return [_entry_to_response(e) for e in entries]


# NOTE: /{entry_date} comes AFTER all fixed-string routes
@router.get("/{entry_date}", response_model=DailyEntryResponse)
async def get_single_entry(
    entry_date: date,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single daily entry by date (YYYY-MM-DD)."""
    entry = await get_entry_by_date(db, user_id, entry_date)
    return _entry_to_response(entry)


@router.put("/{entry_date}", response_model=DailyEntryResponse)
async def update_single_entry(
    entry_date: date,
    data: DailyEntryUpdate,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a daily entry. Only provided fields are changed."""
    entry = await update_entry(db, user_id, entry_date, data)
    # Recompute features after update
    try:
        await compute_and_store_features(db, user_id, entry_date)
    except Exception as e:
        logger.warning(f"Feature recompute after update failed: {e}")
    invalidate_user_cache(user_id)
    return _entry_to_response(entry)


@router.delete("/{entry_date}", status_code=status.HTTP_200_OK)
async def delete_single_entry(
    entry_date: date,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a daily entry by date."""
    await delete_entry(db, user_id, entry_date)
    invalidate_user_cache(user_id)
    return {"message": "Entry deleted successfully."}


def _entry_to_response(entry) -> DailyEntryResponse:
    return DailyEntryResponse(
        id=entry.id,
        user_id=entry.user_id,
        date=entry.date,
        sleep_hours=float(entry.sleep_hours),
        sleep_quality=entry.sleep_quality,
        sleep_bedtime=entry.sleep_bedtime.strftime("%H:%M") if entry.sleep_bedtime else None,
        screen_time_hours=float(entry.screen_time_hours),
        social_media_hours=float(entry.social_media_hours) if entry.social_media_hours is not None else None,
        unlock_count=entry.unlock_count,
        steps=entry.steps,
        active_minutes=entry.active_minutes,
        calories_burned=entry.calories_burned,
        resting_heart_rate=entry.resting_heart_rate,
        deep_work_hours=float(entry.deep_work_hours),
        tasks_completed=entry.tasks_completed,
        daily_spend=float(entry.daily_spend),
        spend_category=entry.spend_category,
        mood_score=entry.mood_score,
        energy_level=entry.energy_level,
        notes=entry.notes,
        created_at=entry.created_at.isoformat() if entry.created_at else "",
    )
