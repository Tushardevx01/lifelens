"""add_experiments_and_evaluations

Revision ID: 004_add_experiments
Revises: 003_add_granular_telemetry
Create Date: 2026-11-04

Adds the core behavioral experimentation engine tables:
  - experiments: hypotheses, target metrics, baseline distribution, treatment stats, and evaluation verdicts
  - experiment_checkins: daily adherence logs during the treatment period
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '004_add_experiments'
down_revision = '003_add_granular_telemetry'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. experiments table
    op.create_table(
        'experiments',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('recommendation_source_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('insights.id', ondelete='SET NULL'), nullable=True),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('hypothesis', sa.Text(), nullable=False),
        sa.Column('target_metric', sa.String(50), nullable=False),
        sa.Column('desired_direction', sa.String(20), server_default='INCREASE', nullable=False),
        sa.Column('intervention_rule', sa.Text(), nullable=False),
        sa.Column('duration_days', sa.Integer(), server_default='7', nullable=False),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column('baseline_start', sa.Date(), nullable=False),
        sa.Column('baseline_end', sa.Date(), nullable=False),
        sa.Column('baseline_mean', sa.Float(), nullable=True),
        sa.Column('baseline_std', sa.Float(), nullable=True),
        sa.Column('baseline_sample_size', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(20), server_default='ACTIVE', nullable=False),
        sa.Column('treatment_mean', sa.Float(), nullable=True),
        sa.Column('treatment_std', sa.Float(), nullable=True),
        sa.Column('treatment_sample_size', sa.Integer(), nullable=True),
        sa.Column('outcome_delta', sa.Float(), nullable=True),
        sa.Column('outcome_delta_pct', sa.Float(), nullable=True),
        sa.Column('effect_size', sa.Float(), nullable=True),
        sa.Column('p_value', sa.Float(), nullable=True),
        sa.Column('is_statistically_significant', sa.Boolean(), nullable=True),
        sa.Column('adherence_rate', sa.Float(), nullable=True),
        sa.Column('outcome_verdict', sa.String(30), server_default='PENDING', nullable=False),
        sa.Column('evaluation_summary', sa.Text(), nullable=True),
        sa.Column('user_rating', sa.SmallInteger(), nullable=True),
        sa.Column('user_reflection', sa.Text(), nullable=True),
        sa.Column('adopted_as_habit', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint('duration_days >= 1', name='ck_experiment_duration_positive'),
        sa.CheckConstraint('user_rating IS NULL OR (user_rating >= 1 AND user_rating <= 5)', name='ck_experiment_user_rating_range'),
    )
    op.create_index('ix_experiments_user_id', 'experiments', ['user_id'])
    op.create_index('ix_experiments_user_status', 'experiments', ['user_id', 'status'])
    op.create_index('ix_experiments_user_dates', 'experiments', ['user_id', 'start_date', 'end_date'])
    op.create_index('ix_experiments_recommendation_source_id', 'experiments', ['recommendation_source_id'])

    # 2. experiment_checkins table
    op.create_table(
        'experiment_checkins',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('experiment_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('experiments.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('adhered', sa.Boolean(), nullable=False),
        sa.Column('metric_value', sa.Float(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint('experiment_id', 'date', name='uq_experiment_checkin_exp_date'),
    )
    op.create_index('ix_experiment_checkins_experiment_id', 'experiment_checkins', ['experiment_id'])
    op.create_index('ix_experiment_checkins_user_date', 'experiment_checkins', ['user_id', 'date'])


def downgrade() -> None:
    op.drop_table('experiment_checkins')
    op.drop_table('experiments')

