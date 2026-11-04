"""add_granular_telemetry_tables

Revision ID: 003_add_granular_telemetry
Revises: 002_add_anomaly_details
Create Date: 2026-11-04

Adds granular telemetry tables:
  - financial_transactions: discrete purchase tracking (merchant, category, discretionary)
  - app_usage_sessions: foreground app tracking (app name, category, duration, late night)
  - focus_study_sessions: focus/study blocks (subject, focus rating, distractions)
  - habits: user-defined habit tracking (domain, frequency, target)
  - habit_logs: daily habit completion records with streaks
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '003_add_granular_telemetry'
down_revision = '002_add_anomaly_details'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. financial_transactions
    op.create_table(
        'financial_transactions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('amount', sa.Numeric(10, 2), nullable=False),
        sa.Column('category', sa.String(50), nullable=False),
        sa.Column('merchant', sa.String(100), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('is_discretionary', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint('amount > 0', name='ck_financial_transaction_positive_amount'),
    )
    op.create_index('ix_financial_transactions_user_id', 'financial_transactions', ['user_id'])
    op.create_index('ix_financial_transactions_user_timestamp', 'financial_transactions', ['user_id', 'timestamp'])

    # 2. app_usage_sessions
    op.create_table(
        'app_usage_sessions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('app_name', sa.String(100), nullable=False),
        sa.Column('app_category', sa.String(50), nullable=False),
        sa.Column('duration_minutes', sa.Integer(), nullable=False),
        sa.Column('start_time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('is_late_night', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint('duration_minutes > 0', name='ck_app_usage_positive_duration'),
    )
    op.create_index('ix_app_usage_user_id', 'app_usage_sessions', ['user_id'])
    op.create_index('ix_app_usage_user_start_time', 'app_usage_sessions', ['user_id', 'start_time'])

    # 3. focus_study_sessions
    op.create_table(
        'focus_study_sessions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('subject_or_task', sa.String(150), nullable=False),
        sa.Column('start_time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('end_time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('duration_minutes', sa.Integer(), nullable=False),
        sa.Column('self_reported_focus', sa.SmallInteger(), nullable=False),
        sa.Column('distraction_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint('duration_minutes > 0', name='ck_focus_session_positive_duration'),
        sa.CheckConstraint('self_reported_focus >= 1 AND self_reported_focus <= 5', name='ck_focus_session_focus_range'),
        sa.CheckConstraint('distraction_count >= 0', name='ck_focus_session_distraction_non_negative'),
    )
    op.create_index('ix_focus_study_sessions_user_id', 'focus_study_sessions', ['user_id'])
    op.create_index('ix_focus_study_sessions_user_start', 'focus_study_sessions', ['user_id', 'start_time'])

    # 4. habits
    op.create_table(
        'habits',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('domain', sa.String(50), server_default='General', nullable=False),
        sa.Column('frequency', sa.String(20), server_default='daily', nullable=False),
        sa.Column('target_per_day', sa.Integer(), server_default='1', nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint('target_per_day >= 1', name='ck_habit_target_positive'),
    )
    op.create_index('ix_habits_user_id', 'habits', ['user_id'])
    op.create_index('ix_habits_user_active', 'habits', ['user_id', 'is_active'])

    # 5. habit_logs
    op.create_table(
        'habit_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('habit_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('habits.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('completed', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('value', sa.Numeric(10, 2), server_default='1.0', nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint('habit_id', 'date', name='uq_habit_log_habit_date'),
    )
    op.create_index('ix_habit_logs_habit_id', 'habit_logs', ['habit_id'])
    op.create_index('ix_habit_logs_user_id', 'habit_logs', ['user_id'])
    op.create_index('ix_habit_logs_user_date', 'habit_logs', ['user_id', 'date'])


def downgrade() -> None:
    op.drop_table('habit_logs')
    op.drop_table('habits')
    op.drop_table('focus_study_sessions')
    op.drop_table('app_usage_sessions')
    op.drop_table('financial_transactions')

