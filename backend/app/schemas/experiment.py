import uuid
from datetime import date, datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, field_validator
from app.models.experiment import ExperimentStatusEnum, ExperimentOutcomeEnum


class ExperimentCheckinCreate(BaseModel):
    date: date
    adhered: bool
    metric_value: Optional[float] = None
    notes: Optional[str] = Field(None, max_length=1000)


class ExperimentCheckinResponse(BaseModel):
    id: uuid.UUID
    experiment_id: uuid.UUID
    user_id: uuid.UUID
    date: date
    adhered: bool
    metric_value: Optional[float] = None
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ExperimentCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    hypothesis: str = Field(..., min_length=5, max_length=2000)
    target_metric: str = Field(
        ...,
        description="Metric being tracked, e.g. sleep_hours, screen_time_hours, productivity_score, daily_spend, steps, deep_work_hours"
    )
    desired_direction: str = Field(
        "INCREASE",
        description="'INCREASE' (higher is better) or 'DECREASE' (lower is better)"
    )
    intervention_rule: str = Field(..., min_length=3, max_length=1000)
    duration_days: int = Field(7, ge=1, le=90)
    start_date: Optional[date] = None
    baseline_start: Optional[date] = None
    baseline_end: Optional[date] = None
    recommendation_source_id: Optional[uuid.UUID] = None

    @field_validator("desired_direction")
    @classmethod
    def validate_direction(cls, v: str) -> str:
        upper = v.upper()
        if upper not in ("INCREASE", "DECREASE"):
            raise ValueError("desired_direction must be either 'INCREASE' or 'DECREASE'")
        return upper


class ExperimentUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=200)
    hypothesis: Optional[str] = Field(None, min_length=5, max_length=2000)
    intervention_rule: Optional[str] = Field(None, min_length=3, max_length=1000)
    status: Optional[ExperimentStatusEnum] = None
    user_rating: Optional[int] = Field(None, ge=1, le=5)
    user_reflection: Optional[str] = Field(None, max_length=2000)
    adopted_as_habit: Optional[bool] = None


class ExperimentCompleteRequest(BaseModel):
    user_rating: Optional[int] = Field(None, ge=1, le=5)
    user_reflection: Optional[str] = Field(None, max_length=2000)
    adopt_as_habit: bool = False
    habit_domain: Optional[str] = "General"


class ExperimentResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    recommendation_source_id: Optional[uuid.UUID] = None
    title: str
    hypothesis: str
    target_metric: str
    desired_direction: str
    intervention_rule: str
    duration_days: int
    start_date: date
    end_date: date
    baseline_start: date
    baseline_end: date
    baseline_mean: Optional[float] = None
    baseline_std: Optional[float] = None
    baseline_sample_size: Optional[int] = None
    status: ExperimentStatusEnum
    treatment_mean: Optional[float] = None
    treatment_std: Optional[float] = None
    treatment_sample_size: Optional[int] = None
    outcome_delta: Optional[float] = None
    outcome_delta_pct: Optional[float] = None
    effect_size: Optional[float] = None
    p_value: Optional[float] = None
    is_statistically_significant: Optional[bool] = None
    adherence_rate: Optional[float] = None
    outcome_verdict: ExperimentOutcomeEnum
    evaluation_summary: Optional[str] = None
    user_rating: Optional[int] = None
    user_reflection: Optional[str] = None
    adopted_as_habit: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DailyAdherencePoint(BaseModel):
    day_number: int
    date: date
    adhered: bool
    metric_value: Optional[float] = None


class ActiveExperimentProgress(BaseModel):
    experiment: ExperimentResponse
    current_day: int
    days_remaining: int
    total_days: int
    progress_percentage: float
    checked_in_today: bool
    today_adherence: Optional[bool] = None
    checkins_completed: int
    days_adhered: int
    current_adherence_rate: float
    current_treatment_mean: Optional[float] = None
    baseline_mean: Optional[float] = None
    interim_delta: Optional[float] = None
    interim_delta_pct: Optional[float] = None
    daily_history: List[DailyAdherencePoint] = []


class ExperimentEvaluationResponse(BaseModel):
    experiment_id: uuid.UUID
    title: str
    target_metric: str
    desired_direction: str
    duration_days: int
    status: ExperimentStatusEnum

    baseline_start: date
    baseline_end: date
    baseline_mean: float
    baseline_std: float
    baseline_sample_size: int

    treatment_start: date
    treatment_end: date
    treatment_mean: float
    treatment_std: float
    treatment_sample_size: int

    raw_delta: float
    percentage_change: float
    effect_size_cohens_d: float
    p_value: Optional[float] = None
    is_statistically_significant: bool

    adherence_rate: float
    days_adhered: int
    days_missed: int
    total_days_tracked: int

    outcome_verdict: ExperimentOutcomeEnum
    verdict_label: str
    plain_english_synthesis: str
    recommendation_next_steps: str
    daily_comparison: List[Dict[str, Any]] = []


class ExperimentTemplate(BaseModel):
    id: str
    title: str
    category: str
    target_metric: str
    desired_direction: str
    duration_days: int
    intervention_rule: str
    hypothesis: str
    scientific_rationale: str
    icon_name: str

