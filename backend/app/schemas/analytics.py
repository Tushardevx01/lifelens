from pydantic import BaseModel
from typing import Optional


class LifeScoreComponents(BaseModel):
    sleep: float
    productivity: float
    health: float
    finance: float
    mood_adjustment: float


class DailySummarySchema(BaseModel):
    """Structured What/Why/Action daily insight card."""
    what:         str
    why:          str
    action:       str
    severity:     str
    insight_type: str
    title:        str


class DashboardResponse(BaseModel):
    today_date: str
    life_score: float
    life_score_components: LifeScoreComponents
    life_score_change_from_yesterday: float
    cluster_label: Optional[str] = None
    top_insights: list[dict]       # max 5, sorted by severity
    trend_data: list[dict]         # 30-day [{date, life_score, sleep_score, productivity_score}]
    days_tracked: int
    is_data_sufficient_for_ml: bool
    # Structured daily summary (What/Why/Action)
    daily_summary: Optional[DailySummarySchema] = None
    # Data maturity tier info for frontend progress display
    data_maturity:        Optional[str] = None   # e.g. "rule_based" | "trends" | "full_ml"
    data_maturity_label:  Optional[str] = None   # human-readable label
    days_until_next_tier: Optional[int] = None   # how many more days to next tier


class PredictionResponse(BaseModel):
    predicted_productivity: float
    confidence_interval: dict      # {lower: float, upper: float}
    key_driver: str
    key_driver_importance_pct: float
    improvement_tip: str


class AnomalyResponse(BaseModel):
    date: str
    anomaly_score: float
    primary_anomaly_feature: Optional[str] = None
    feature_deviations: dict
    insight_message: str


class ClusterBreakdownResponse(BaseModel):
    clusters: list[dict]     # [{cluster_name, day_count, pct_of_total, avg_features}]
    radar_data: list[dict]   # for Recharts RadarChart


class CorrelationResponse(BaseModel):
    feature_a: str
    feature_b: str
    name_a: str
    name_b: str
    r: float
    p_value: float
    insight_message: str


class WeeklyReportResponse(BaseModel):
    week_start: str
    week_end: str
    avg_life_score: float
    best_day: str
    worst_day: str
    total_insights: int
    critical_alerts: int
    week_summary: str


class InsightResponse(BaseModel):
    id: str
    date: str
    insight_type: str
    severity: str
    title: str
    message: str
    data_payload: Optional[dict] = None
    is_read: bool
    created_at: str

    class Config:
        from_attributes = True


class LifeScoreHistoryPoint(BaseModel):
    date: str
    life_score: float
    sleep_score: Optional[float] = None
    productivity_score: Optional[float] = None
    health_score: Optional[float] = None
    finance_score: Optional[float] = None
    cluster_name: Optional[str] = None
    is_anomaly: bool = False


# --- Phase 6 Schemas: Risk Forecasting & Briefing Synthesizer ---

class WorkoutSkipForecastSchema(BaseModel):
    probability: float
    risk_level: str
    confidence: float
    primary_driver: str
    contributing_factors: list[str]
    mitigation_strategy: str
    target_recommendation: str


class BudgetOverrunForecastSchema(BaseModel):
    monthly_budget: float
    current_spend: float
    current_discretionary_spend: float
    discretionary_ratio_pct: float
    days_elapsed: int
    days_remaining: int
    current_daily_velocity: float
    projected_eom_spend: float
    projected_overrun: float
    overrun_probability: float
    risk_status: str
    recommended_daily_cap: float
    top_discretionary_categories: list[dict]
    actionable_advice: str


class CircadianDriftForecastSchema(BaseModel):
    status: str
    alert_level: str
    bedtime_variance_minutes: float
    max_shift_minutes: float
    consecutive_drift_days: int
    average_bedtime: str
    average_wake_time: str
    social_jetlag_minutes: float
    resynchronization_protocol: str


class CompositeRiskForecastResponse(BaseModel):
    date: str
    workout_skip: WorkoutSkipForecastSchema
    budget_overrun: BudgetOverrunForecastSchema
    circadian_drift: CircadianDriftForecastSchema
    overall_risk_score: float
    key_vulnerability_summary: str


class DailyMorningBriefingResponse(BaseModel):
    id: str
    date: str
    title: str
    greeting: str
    recovery_score: float
    recovery_tier: str
    optimal_focus_window: str
    secondary_focus_window: str
    executive_summary: str
    sleep_summary: str
    risk_alerts: list[dict]
    experiment_callout: Optional[dict] = None
    micro_action: str
    full_markdown: str
    is_read: bool = False
    created_at: str


class WeeklyReviewStoryResponse(BaseModel):
    id: str
    week_start: str
    week_end: str
    title: str
    avg_life_score: float
    life_score_trend_delta: float
    best_day: dict
    recovery_day: dict
    top_wins: list[str]
    bottlenecks_identified: list[str]
    experiments_evaluated: list[dict]
    next_week_recommendation: dict
    full_narrative_markdown: str
    html_export_card: str
    is_read: bool = False
    created_at: str


class DynamicCorrelationResponse(BaseModel):
    feature_a: str
    feature_b: str
    name_a: str
    name_b: str
    lag: int
    r: float
    p_value: float
    sample_size: int
    is_statistically_significant: bool
    strength: str
    direction: str
    ci_lower: float
    ci_upper: float
    insight_narrative: str
    epistemic_qualifier: str
