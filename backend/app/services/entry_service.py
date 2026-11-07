import uuid
import io
from datetime import date, datetime, time
from typing import Optional

import pandas as pd
from sqlalchemy import select, delete, and_
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status, UploadFile

from app.models.daily_entry import DailyEntry
from app.schemas.entry import DailyEntryCreate, DailyEntryUpdate, CsvUploadResponse


async def create_entry(
    db: AsyncSession, user_id: str, data: DailyEntryCreate
) -> DailyEntry:
    """Create a new daily entry. Raises 409 if entry for that date already exists."""
    uid = uuid.UUID(user_id)

    # Check for duplicate date
    stmt = select(DailyEntry).where(
        and_(DailyEntry.user_id == uid, DailyEntry.date == data.date)
    )
    result = await db.execute(stmt)
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An entry for {data.date} already exists."
        )

    # Parse bedtime
    bedtime = None
    if data.sleep_bedtime:
        try:
            bedtime = datetime.strptime(data.sleep_bedtime, "%H:%M").time()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="sleep_bedtime must be in HH:MM format"
            )

    entry = DailyEntry(
        user_id=uid,
        date=data.date,
        sleep_hours=data.sleep_hours,
        sleep_quality=data.sleep_quality,
        sleep_bedtime=bedtime,
        screen_time_hours=data.screen_time_hours,
        social_media_hours=data.social_media_hours,
        steps=data.steps,
        active_minutes=data.active_minutes,
        calories_burned=data.calories_burned,
        deep_work_hours=data.deep_work_hours,
        tasks_completed=data.tasks_completed,
        daily_spend=data.daily_spend,
        spend_category=data.spend_category,
        mood_score=data.mood_score,
        energy_level=data.energy_level,
        notes=data.notes,
    )
    db.add(entry)
    await db.flush()
    return entry


async def get_entries(
    db: AsyncSession, user_id: str,
    start_date: Optional[date] = None, end_date: Optional[date] = None,
    page: int = 1, page_size: int = 30,
) -> list[DailyEntry]:
    """Get paginated daily entries for a user, optionally filtered by date range."""
    uid = uuid.UUID(user_id)
    stmt = select(DailyEntry).where(DailyEntry.user_id == uid)

    if start_date:
        stmt = stmt.where(DailyEntry.date >= start_date)
    if end_date:
        stmt = stmt.where(DailyEntry.date <= end_date)

    offset = (page - 1) * page_size
    stmt = stmt.order_by(DailyEntry.date.desc()).limit(page_size).offset(offset)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_entry_by_date(db: AsyncSession, user_id: str, entry_date: date) -> DailyEntry:
    """Get a single entry by date. Raises 404 if not found."""
    uid = uuid.UUID(user_id)
    stmt = select(DailyEntry).where(
        and_(DailyEntry.user_id == uid, DailyEntry.date == entry_date)
    )
    result = await db.execute(stmt)
    entry = result.scalar_one_or_none()

    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No entry found for {entry_date}"
        )
    return entry


async def update_entry(
    db: AsyncSession, user_id: str, entry_date: date, data: DailyEntryUpdate
) -> DailyEntry:
    """Update an existing entry. Only updates provided fields."""
    entry = await get_entry_by_date(db, user_id, entry_date)
    update_data = data.model_dump(exclude_unset=True)

    # Handle bedtime conversion
    if 'sleep_bedtime' in update_data and update_data['sleep_bedtime'] is not None:
        try:
            update_data['sleep_bedtime'] = datetime.strptime(
                update_data['sleep_bedtime'], "%H:%M"
            ).time()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="sleep_bedtime must be in HH:MM format"
            )

    for field, value in update_data.items():
        setattr(entry, field, value)

    await db.flush()
    return entry


async def delete_entry(db: AsyncSession, user_id: str, entry_date: date) -> None:
    """Delete an entry by date. Raises 404 if not found."""
    entry = await get_entry_by_date(db, user_id, entry_date)
    await db.delete(entry)
    await db.flush()


async def import_csv(
    db: AsyncSession, user_id: str, file: UploadFile
) -> CsvUploadResponse:
    """Batch import entries from CSV. Validates each row via Pydantic."""
    uid = uuid.UUID(user_id)
    content = await file.read()

    try:
        df = pd.read_csv(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to parse CSV: {str(e)}"
        )

    df.columns = [col.strip().lower() for col in df.columns]

    required_cols = ['date', 'sleep_hours', 'sleep_quality', 'screen_time_hours',
                     'steps', 'deep_work_hours', 'daily_spend']
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Missing required columns: {missing}"
        )

    # FIX: load all existing dates in ONE query — O(1) vs O(n queries) per row
    all_dates_stmt = select(DailyEntry.date).where(DailyEntry.user_id == uid)
    existing_result  = await db.execute(all_dates_stmt)
    existing_dates: set = {row[0] for row in existing_result.fetchall()}

    imported   = 0
    errors     = []
    total_rows = len(df)

    for idx, row in df.iterrows():
        try:
            entry_date = pd.to_datetime(row['date']).date()

            # Reject future dates
            if entry_date > date.today():
                errors.append({"row": int(idx) + 1, "error": f"Future date: {entry_date}"})
                continue

            # FIX: O(1) duplicate check using pre-loaded set
            if entry_date in existing_dates:
                errors.append({"row": int(idx) + 1, "error": f"Duplicate date: {entry_date}"})
                continue

            # FIX: Build Pydantic model for per-row validation (ranges, types, etc.)
            try:
                validated = DailyEntryCreate(
                    date=entry_date,
                    sleep_hours=float(row['sleep_hours']),
                    sleep_quality=int(row['sleep_quality']),
                    screen_time_hours=float(row['screen_time_hours']),
                    steps=int(row['steps']),
                    deep_work_hours=float(row['deep_work_hours']),
                    daily_spend=float(row['daily_spend']),
                    social_media_hours=float(row['social_media_hours']) if 'social_media_hours' in row and pd.notna(row.get('social_media_hours')) else None,
                    active_minutes=int(row['active_minutes']) if 'active_minutes' in row and pd.notna(row.get('active_minutes')) else None,
                    calories_burned=int(row['calories_burned']) if 'calories_burned' in row and pd.notna(row.get('calories_burned')) else None,
                    tasks_completed=int(row['tasks_completed']) if 'tasks_completed' in row and pd.notna(row.get('tasks_completed')) else None,
                    mood_score=int(row['mood_score']) if 'mood_score' in row and pd.notna(row.get('mood_score')) else None,
                    energy_level=int(row['energy_level']) if 'energy_level' in row and pd.notna(row.get('energy_level')) else None,
                    spend_category=str(row['spend_category']) if 'spend_category' in row and pd.notna(row.get('spend_category')) else None,
                    notes=str(row['notes']) if 'notes' in row and pd.notna(row.get('notes')) else None,
                )
            except Exception as ve:
                errors.append({"row": int(idx) + 1, "error": f"Validation error: {ve}"})
                continue

            entry = DailyEntry(
                user_id=uid,
                date=validated.date,
                sleep_hours=validated.sleep_hours,
                sleep_quality=validated.sleep_quality,
                screen_time_hours=validated.screen_time_hours,
                steps=validated.steps,
                deep_work_hours=validated.deep_work_hours,
                daily_spend=validated.daily_spend,
                social_media_hours=validated.social_media_hours,
                active_minutes=validated.active_minutes,
                calories_burned=validated.calories_burned,
                tasks_completed=validated.tasks_completed,
                mood_score=validated.mood_score,
                energy_level=validated.energy_level,
                spend_category=validated.spend_category,
                notes=validated.notes,
            )
            db.add(entry)
            existing_dates.add(entry_date)   # prevent dupes within same CSV
            imported += 1

        except Exception as e:
            errors.append({"row": int(idx) + 1, "error": str(e)})

    await db.flush()
    return CsvUploadResponse(imported=imported, errors=errors, total_rows=total_rows)
