import uuid
from datetime import date, datetime
from sqlalchemy import (
    String, Date, Float, SmallInteger, Integer, Text, Boolean,
    DateTime, ForeignKey, UniqueConstraint, CheckConstraint, func
)
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.schema import Index
from app.database import Base
from app.ml.experiment_evaluator import ExperimentStatusEnum, ExperimentOutcomeEnum


class Experiment(Base):
    """
    Behavioral Experiment model representing Priya's 7-step Core Engagement Loop.
    Allows users to test hypotheses (e.g., 'No phone after 22:30 -> improve sleep by 1h')
    and statistically evaluate treatment outcomes against their baseline period.
    """
    __tablename__ = "experiments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    recommendation_source_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("insights.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    hypothesis: Mapped[str] = mapped_column(Text, nullable=False)
    target_metric: Mapped[str] = mapped_column(String(50), nullable=False)
    # Directionality: 'INCREASE' (e.g. sleep, focus, steps) or 'DECREASE' (e.g. screen time, spend)
    desired_direction: Mapped[str] = mapped_column(String(20), default="INCREASE", nullable=False)
    intervention_rule: Mapped[str] = mapped_column(Text, nullable=False)
    duration_days: Mapped[int] = mapped_column(Integer, default=7, nullable=False)

    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)

    baseline_start: Mapped[date] = mapped_column(Date, nullable=False)
    baseline_end: Mapped[date] = mapped_column(Date, nullable=False)
    baseline_mean: Mapped[float | None] = mapped_column(Float, nullable=True)
    baseline_std: Mapped[float | None] = mapped_column(Float, nullable=True)
    baseline_sample_size: Mapped[int | None] = mapped_column(Integer, nullable=True)

    status: Mapped[ExperimentStatusEnum] = mapped_column(
        SAEnum(ExperimentStatusEnum, name="experimentstatusenum", native_enum=False),
        default=ExperimentStatusEnum.ACTIVE,
        nullable=False,
        index=True,
    )

    # Statistical Evaluation Results
    treatment_mean: Mapped[float | None] = mapped_column(Float, nullable=True)
    treatment_std: Mapped[float | None] = mapped_column(Float, nullable=True)
    treatment_sample_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    outcome_delta: Mapped[float | None] = mapped_column(Float, nullable=True)
    outcome_delta_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    effect_size: Mapped[float | None] = mapped_column(Float, nullable=True)  # Cohen's d
    p_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    is_statistically_significant: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    adherence_rate: Mapped[float | None] = mapped_column(Float, nullable=True)  # 0.0 to 100.0%

    outcome_verdict: Mapped[ExperimentOutcomeEnum] = mapped_column(
        SAEnum(ExperimentOutcomeEnum, name="experimentoutcomeenum", native_enum=False),
        default=ExperimentOutcomeEnum.PENDING,
        nullable=False,
    )
    evaluation_summary: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Post-experiment user reflection & habit adoption
    user_rating: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)  # 1 to 5
    user_reflection: Mapped[str | None] = mapped_column(Text, nullable=True)
    adopted_as_habit: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    user = relationship("User", back_populates="experiments")
    recommendation_source = relationship("Insight")
    checkins = relationship(
        "ExperimentCheckin",
        back_populates="experiment",
        cascade="all, delete-orphan",
        order_by="ExperimentCheckin.date",
    )

    __table_args__ = (
        CheckConstraint("duration_days >= 1", name="ck_experiment_duration_positive"),
        CheckConstraint(
            "user_rating IS NULL OR (user_rating >= 1 AND user_rating <= 5)",
            name="ck_experiment_user_rating_range",
        ),
        Index("ix_experiments_user_status", "user_id", "status"),
        Index("ix_experiments_user_dates", "user_id", "start_date", "end_date"),
    )

    def __repr__(self) -> str:
        return f"<Experiment {self.title} status={self.status.value} target={self.target_metric}>"


class ExperimentCheckin(Base):
    """
    Daily check-in for an active experiment.
    Captures whether the user adhered to the intervention rule on a given date.
    """
    __tablename__ = "experiment_checkins"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    experiment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("experiments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    date: Mapped[date] = mapped_column(Date, nullable=False)
    adhered: Mapped[bool] = mapped_column(Boolean, nullable=False)
    metric_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    experiment = relationship("Experiment", back_populates="checkins")
    user = relationship("User", back_populates="experiment_checkins")

    __table_args__ = (
        UniqueConstraint("experiment_id", "date", name="uq_experiment_checkin_exp_date"),
        Index("ix_experiment_checkins_user_date", "user_id", "date"),
    )

    def __repr__(self) -> str:
        return f"<ExperimentCheckin exp={self.experiment_id} date={self.date} adhered={self.adhered}>"
