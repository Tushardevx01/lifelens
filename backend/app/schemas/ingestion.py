from datetime import date as date_type, datetime
from typing import Optional, Any
from uuid import UUID
from pydantic import BaseModel, Field


class HealthSleepInterval(BaseModel):
    start_time: datetime
    end_time: datetime
    stage: str = Field("ASLEEP", description="Stage: CORE, DEEP, REM, AWAKE, IN_BED")


class HealthIngestPayload(BaseModel):
    date: date_type
    source: str = Field("APPLE_HEALTH", description="APPLE_HEALTH | GOOGLE_HEALTH_CONNECT | MANUAL")
    sleep_hours: float = Field(..., ge=0.0, le=24.0, description="Total sleep hours (0 - 24)")
    sleep_quality: int = Field(..., ge=1, le=5, description="Sleep quality rating (1 - 5)")
    sleep_bedtime: Optional[str] = Field(None, description="Bedtime in HH:MM or HH:MM:SS format")
    sleep_intervals: Optional[list[HealthSleepInterval]] = None
    steps: int = Field(..., ge=0, description="Total step count")
    active_minutes: Optional[int] = Field(None, ge=0, description="Active workout / exercise minutes")
    calories_burned: Optional[int] = Field(None, ge=0, description="Active or total calories burned")
    resting_heart_rate: Optional[float] = Field(None, ge=30.0, le=220.0, description="Resting heart rate in bpm")
    auto_merge_daily_entry: bool = Field(True, description="Automatically merge metrics into DailyEntry")


class UsageSessionItem(BaseModel):
    app_name: str = Field(..., min_length=1, max_length=100)
    app_category: str = Field(..., min_length=1, max_length=50)
    duration_minutes: int = Field(..., gt=0, le=1440)
    start_time: datetime
    is_late_night: Optional[bool] = Field(None, description="Derived from start_time if None (22:00 - 05:00)")


class UsageIngestPayload(BaseModel):
    date: date_type
    device_platform: str = Field("ANDROID", description="ANDROID | IOS | WEB")
    total_screen_time_hours: float = Field(..., ge=0.0, le=24.0)
    social_media_hours: Optional[float] = Field(None, ge=0.0, le=24.0)
    unlock_count: Optional[int] = Field(None, ge=0)
    sessions: list[UsageSessionItem] = Field(default_factory=list)
    auto_merge_daily_entry: bool = Field(True, description="Automatically update DailyEntry screen time metrics")


class SmsTransactionItem(BaseModel):
    amount: float = Field(..., gt=0, description="Amount debited")
    merchant: str = Field(..., min_length=1, max_length=100)
    category: str = Field(..., min_length=1, max_length=50)
    timestamp: datetime
    is_discretionary: bool = True
    external_id: str = Field(..., min_length=1, max_length=128, description="Deterministic deduplication hash")
    currency: str = Field("INR", max_length=10)
    notes: Optional[str] = Field(None, max_length=500)


class SmsIngestPayload(BaseModel):
    transactions: list[SmsTransactionItem] = Field(..., min_length=1)
    device_platform: str = Field("ANDROID", description="Device platform (ANDROID / IOS)")
    auto_merge_daily_entry: bool = Field(True, description="Automatically sum transactions into DailyEntry.daily_spend")


class StatementIngestPayload(BaseModel):
    institution: str = Field("GENERIC", max_length=100)
    csv_content: Optional[str] = Field(None, description="Raw CSV bank statement data")
    raw_transactions: Optional[list[SmsTransactionItem]] = None
    auto_merge_daily_entry: bool = Field(True)


class WebhookPayload(BaseModel):
    user_id: Optional[UUID | str] = None
    event_type: str = Field(..., description="TRANSACTIONS_SYNC | DEFAULT_UPDATE | HISTORICAL_UPDATE")
    institution: Optional[str] = Field("PLAID", max_length=50)
    transactions: list[dict[str, Any]] = Field(default_factory=list)
    raw_payload: Optional[dict[str, Any]] = None


class ConnectorResponse(BaseModel):
    id: UUID
    user_id: UUID
    connector_type: str
    status: str
    is_enabled: bool
    last_sync_at: Optional[datetime] = None
    sync_frequency_minutes: int
    total_records_synced: int
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ConnectorToggleRequest(BaseModel):
    is_enabled: bool


class SyncResultResponse(BaseModel):
    success: bool
    connector_type: str
    records_ingested: int
    records_deduplicated: int
    daily_entries_updated: int
    details: Optional[dict[str, Any]] = None
    synced_at: datetime

