from pydantic import BaseModel, Field, field_validator
from datetime import date as date_type, datetime
from typing import Optional, Any
from uuid import UUID


# ============================================================================
# 1. Financial Transactions
# ============================================================================

class TransactionCreate(BaseModel):
    amount: float = Field(..., gt=0, description="Transaction amount in local currency (must be positive)")
    category: str = Field(..., min_length=1, max_length=50, description="Category (e.g. Food Delivery, Groceries, Transport)")
    merchant: str = Field(..., min_length=1, max_length=100, description="Merchant or payee name")
    timestamp: datetime = Field(..., description="ISO 8601 transaction timestamp")
    is_discretionary: bool = Field(True, description="Whether this purchase is non-essential/discretionary")
    notes: Optional[str] = Field(None, max_length=1000, description="Optional personal notes")


class TransactionBatchCreate(BaseModel):
    transactions: list[TransactionCreate] = Field(..., min_length=1, max_length=500)


class TransactionResponse(BaseModel):
    id: UUID
    user_id: UUID
    amount: float
    category: str
    merchant: str
    timestamp: datetime
    is_discretionary: bool
    notes: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class TransactionSummaryResponse(BaseModel):
    total_spend: float
    discretionary_spend: float
    non_discretionary_spend: float
    discretionary_percentage: float
    transaction_count: int
    category_breakdown: dict[str, float]
    top_merchants: list[dict[str, Any]]


# ============================================================================
# 2. App Usage Sessions
# ============================================================================

class AppUsageCreate(BaseModel):
    app_name: str = Field(..., min_length=1, max_length=100, description="Application name")
    app_category: str = Field(..., min_length=1, max_length=50, description="Category (e.g. Social, Productivity, Entertainment)")
    duration_minutes: int = Field(..., gt=0, le=1440, description="Duration in minutes (1 - 1440)")
    start_time: datetime = Field(..., description="Session start timestamp")
    is_late_night: Optional[bool] = Field(None, description="Explicit flag; if None, derived from start_time (22:00 - 06:00)")


class AppUsageBatchCreate(BaseModel):
    sessions: list[AppUsageCreate] = Field(..., min_length=1, max_length=500)


class AppUsageResponse(BaseModel):
    id: UUID
    user_id: UUID
    app_name: str
    app_category: str
    duration_minutes: int
    start_time: datetime
    is_late_night: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class AppUsageSummaryResponse(BaseModel):
    total_minutes: int
    total_hours: float
    late_night_minutes: int
    category_breakdown: dict[str, int]
    top_apps: list[dict[str, Any]]


# ============================================================================
# 3. Focus & Study Sessions
# ============================================================================

class FocusSessionCreate(BaseModel):
    subject_or_task: str = Field(..., min_length=1, max_length=150, description="Subject, project, or task name")
    start_time: datetime = Field(..., description="Start timestamp")
    end_time: datetime = Field(..., description="End timestamp")
    duration_minutes: int = Field(..., gt=0, le=1440, description="Duration in minutes")
    self_reported_focus: int = Field(..., ge=1, le=5, description="Self-reported focus quality (1=distracted, 5=deep flow)")
    distraction_count: int = Field(0, ge=0, description="Number of interruptions / context switches")
    notes: Optional[str] = Field(None, max_length=1000, description="Reflection notes on session")

    @field_validator("end_time")
    @classmethod
    def end_time_after_start(_cls, v, info):
        start = info.data.get("start_time")
        if start and v < start:
            raise ValueError("end_time must be equal to or after start_time")
        return v


class FocusSessionResponse(BaseModel):
    id: UUID
    user_id: UUID
    subject_or_task: str
    start_time: datetime
    end_time: datetime
    duration_minutes: int
    self_reported_focus: int
    distraction_count: int
    notes: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class FocusSessionSummaryResponse(BaseModel):
    total_duration_minutes: int
    total_hours: float
    session_count: int
    average_focus_rating: float
    total_distractions: int
    subject_breakdown: dict[str, int]


# ============================================================================
# 4. Habits & Habit Logs
# ============================================================================

class HabitCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Habit title (e.g. Morning Meditation, Read 30m)")
    domain: str = Field("General", max_length=50, description="Domain (e.g. Health, Sleep, Productivity, Mindfulness, Finance)")
    frequency: str = Field("daily", max_length=20, description="Recurrence: daily, weekdays, weekends")
    target_per_day: int = Field(1, ge=1, le=100, description="Daily target completion count")


class HabitUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    domain: Optional[str] = Field(None, max_length=50)
    frequency: Optional[str] = Field(None, max_length=20)
    target_per_day: Optional[int] = Field(None, ge=1, le=100)
    is_active: Optional[bool] = None


class HabitResponse(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    domain: str
    frequency: str
    target_per_day: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class HabitLogCreate(BaseModel):
    habit_id: UUID = Field(..., description="UUID of the habit")
    date: date_type = Field(..., description="Date of the log entry")
    completed: bool = Field(True, description="Whether the habit was completed")
    value: float = Field(1.0, ge=0, description="Quantitative value completed (default 1.0)")
    notes: Optional[str] = Field(None, max_length=500, description="Optional notes")

    @field_validator("date")
    @classmethod
    def date_not_in_future(_cls, v):
        from datetime import date
        if v > date.today():
            raise ValueError("date cannot be in the future")
        return v


class HabitLogResponse(BaseModel):
    id: UUID
    habit_id: UUID
    user_id: UUID
    date: date_type
    completed: bool
    value: float
    notes: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class HabitWithStreakResponse(BaseModel):
    id: UUID
    name: str
    domain: str
    frequency: str
    target_per_day: int
    is_active: bool
    current_streak: int
    best_streak: int
    completed_today: bool
    completion_rate_7d: float
    history_7d: list[dict[str, Any]]

