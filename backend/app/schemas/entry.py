from pydantic import BaseModel, Field, field_validator
from datetime import date as date_type
from typing import Optional
from uuid import UUID


class DailyEntryCreate(BaseModel):
    """Request body for creating a daily entry."""
    date: date_type

    # Sleep
    sleep_hours: float = Field(..., ge=0, le=24, description="Hours of sleep")
    sleep_quality: int = Field(..., ge=1, le=5, description="Sleep quality 1-5")
    sleep_bedtime: Optional[str] = Field(None, description="Bedtime in HH:MM format")

    # Digital
    screen_time_hours: float = Field(..., ge=0, le=24)
    social_media_hours: Optional[float] = Field(None, ge=0)
    unlock_count: Optional[int] = Field(None, ge=0, description="Device unlocks count")

    # Health
    steps: int = Field(..., ge=0)
    active_minutes: Optional[int] = Field(None, ge=0)
    calories_burned: Optional[int] = Field(None, ge=0)
    resting_heart_rate: Optional[int] = Field(None, ge=30, le=220, description="Resting heart rate in bpm")

    # Productivity
    deep_work_hours: float = Field(..., ge=0, le=24)
    tasks_completed: Optional[int] = Field(None, ge=0)

    # Finance
    daily_spend: float = Field(..., ge=0)
    spend_category: Optional[str] = Field(None, max_length=50)

    # Subjective
    mood_score: Optional[int] = Field(None, ge=1, le=10)
    energy_level: Optional[int] = Field(None, ge=1, le=5)
    notes: Optional[str] = Field(None, max_length=1000)

    @field_validator('social_media_hours')
    @classmethod
    def social_media_not_exceed_screen(_cls, v, info):
        if v is not None and info.data.get('screen_time_hours') is not None:
            if v > info.data['screen_time_hours']:
                raise ValueError('social_media_hours cannot exceed screen_time_hours')
        return v

    @field_validator('date')
    @classmethod
    def date_not_in_future(_cls, v):
        from datetime import date
        if v > date.today():
            raise ValueError('date cannot be in the future')
        return v


class DailyEntryUpdate(BaseModel):
    """Request body for updating a daily entry (all fields optional)."""
    sleep_hours: Optional[float] = Field(None, ge=0, le=24)
    sleep_quality: Optional[int] = Field(None, ge=1, le=5)
    sleep_bedtime: Optional[str] = None
    screen_time_hours: Optional[float] = Field(None, ge=0, le=24)
    social_media_hours: Optional[float] = Field(None, ge=0)
    unlock_count: Optional[int] = Field(None, ge=0)
    steps: Optional[int] = Field(None, ge=0)
    active_minutes: Optional[int] = Field(None, ge=0)
    calories_burned: Optional[int] = Field(None, ge=0)
    resting_heart_rate: Optional[int] = Field(None, ge=30, le=220)
    deep_work_hours: Optional[float] = Field(None, ge=0, le=24)
    tasks_completed: Optional[int] = Field(None, ge=0)
    daily_spend: Optional[float] = Field(None, ge=0)
    spend_category: Optional[str] = Field(None, max_length=50)
    mood_score: Optional[int] = Field(None, ge=1, le=10)
    energy_level: Optional[int] = Field(None, ge=1, le=5)
    notes: Optional[str] = Field(None, max_length=1000)


class DailyEntryResponse(BaseModel):
    """Response body for a daily entry."""
    id: UUID
    user_id: UUID
    date: date_type
    sleep_hours: float
    sleep_quality: int
    sleep_bedtime: Optional[str] = None
    screen_time_hours: float
    social_media_hours: Optional[float] = None
    unlock_count: Optional[int] = None
    steps: int
    active_minutes: Optional[int] = None
    calories_burned: Optional[int] = None
    resting_heart_rate: Optional[int] = None
    deep_work_hours: float
    tasks_completed: Optional[int] = None
    daily_spend: float
    spend_category: Optional[str] = None
    mood_score: Optional[int] = None
    energy_level: Optional[int] = None
    notes: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True


class CsvUploadResponse(BaseModel):
    """Response body for CSV upload."""
    imported: int
    errors: list[dict]
    total_rows: int
