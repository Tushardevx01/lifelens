import uuid
from datetime import date, datetime
from sqlalchemy import (
    Float, SmallInteger, Boolean, String, Date,
    DateTime, ForeignKey, JSON
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.schema import Index
from app.database import Base


class EngineeredFeatures(Base):
    __tablename__ = "engineered_features"

    # Composite primary key: one features row per user per date
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    date: Mapped[date] = mapped_column(Date, primary_key=True)

    # --- Normalized scores (0–100) ---
    sleep_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    distraction_level: Mapped[float | None] = mapped_column(Float, nullable=True)
    activity_index: Mapped[float | None] = mapped_column(Float, nullable=True)
    productivity_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    finance_score: Mapped[float | None] = mapped_column(Float, nullable=True)

    # --- Ratios ---
    spend_ratio: Mapped[float | None] = mapped_column(Float, nullable=True)

    # --- Rolling window features (7-day) ---
    sleep_7d_avg: Mapped[float | None] = mapped_column(Float, nullable=True)
    sleep_7d_std: Mapped[float | None] = mapped_column(Float, nullable=True)
    productivity_7d_avg: Mapped[float | None] = mapped_column(Float, nullable=True)
    distraction_7d_avg: Mapped[float | None] = mapped_column(Float, nullable=True)
    steps_7d_avg: Mapped[float | None] = mapped_column(Float, nullable=True)

    # --- Lagged features (yesterday's values → predict today) ---
    sleep_score_lag1: Mapped[float | None] = mapped_column(Float, nullable=True)
    screen_time_lag1: Mapped[float | None] = mapped_column(Float, nullable=True)
    activity_index_lag1: Mapped[float | None] = mapped_column(Float, nullable=True)
    mood_score_lag1: Mapped[float | None] = mapped_column(Float, nullable=True)
    productivity_score_lag1: Mapped[float | None] = mapped_column(Float, nullable=True)  # FIX: was missing

    # --- ML pipeline outputs ---
    cluster_label: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    cluster_name: Mapped[str | None] = mapped_column(String(50), nullable=True)
    anomaly_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    is_anomaly: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # Rich anomaly detail — populated by detect_anomaly() in ml_tasks.py
    anomaly_details: Mapped[dict | None] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"), nullable=True
    )
    primary_anomaly_feature: Mapped[str | None] = mapped_column(String(60), nullable=True)
    predicted_productivity: Mapped[float | None] = mapped_column(Float, nullable=True)
    pred_confidence_lower: Mapped[float | None] = mapped_column(Float, nullable=True)
    pred_confidence_upper: Mapped[float | None] = mapped_column(Float, nullable=True)

    # --- Life score breakdown ---
    life_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    life_score_sleep: Mapped[float | None] = mapped_column(Float, nullable=True)
    life_score_productivity: Mapped[float | None] = mapped_column(Float, nullable=True)
    life_score_health: Mapped[float | None] = mapped_column(Float, nullable=True)
    life_score_finance: Mapped[float | None] = mapped_column(Float, nullable=True)

    # --- Metadata ---
    computed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    __table_args__ = (
        # FIX: use string column name, not `date.desc()` (Python datetime class)
        Index("idx_features_user_date", "user_id", "date"),
    )

    def __repr__(self) -> str:
        return f"<EngineeredFeatures user={self.user_id} date={self.date}>"
