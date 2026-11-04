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
