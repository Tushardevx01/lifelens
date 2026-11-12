"""add_native_collection_and_telemetry

Revision ID: 008_add_native_telemetry
Revises: 007_add_briefings
Create Date: 2026-11-10

Adds native on-device telemetry and wearable-independent collections:
  - daily_entries: adds resting_heart_rate and unlock_count columns.
  - sleep_intervals: granular sleep stage intervals (CORE, DEEP, REM, AWAKE, IN_BED).
  - workout_sessions: granular physical movement/exercise intervals with intensity, steps, and calories.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '008_add_native_telemetry'
down_revision = '007_add_briefings'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Add columns to daily_entries
    op.add_column('daily_entries', sa.Column('resting_heart_rate', sa.Integer(), nullable=True))
    op.add_column('daily_entries', sa.Column('unlock_count', sa.Integer(), nullable=True))

    # 2. Create sleep_intervals table
    op.create_table(
        'sleep_intervals',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('stage', sa.String(20), nullable=False),
        sa.Column('start_time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('end_time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('duration_minutes', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint('duration_minutes >= 0', name='ck_sleep_interval_duration'),
    )
    op.create_index('ix_sleep_intervals_user_id', 'sleep_intervals', ['user_id'])
    op.create_index('ix_sleep_intervals_user_date', 'sleep_intervals', ['user_id', 'date'])

    # 3. Create workout_sessions table
    op.create_table(
        'workout_sessions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('activity_type', sa.String(50), nullable=False),
        sa.Column('start_time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('end_time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('duration_minutes', sa.Integer(), nullable=False),
        sa.Column('calories_burned', sa.Integer(), nullable=True),
        sa.Column('steps', sa.Integer(), nullable=True),
        sa.Column('intensity', sa.String(20), server_default='MODERATE', nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint('duration_minutes > 0', name='ck_workout_duration_positive'),
    )
    op.create_index('ix_workout_sessions_user_id', 'workout_sessions', ['user_id'])
    op.create_index('ix_workout_sessions_user_start', 'workout_sessions', ['user_id', 'start_time'])


def downgrade() -> None:
    op.drop_index('ix_workout_sessions_user_start', table_name='workout_sessions')
    op.drop_index('ix_workout_sessions_user_id', table_name='workout_sessions')
    op.drop_table('workout_sessions')

    op.drop_index('ix_sleep_intervals_user_date', table_name='sleep_intervals')
    op.drop_index('ix_sleep_intervals_user_id', table_name='sleep_intervals')
    op.drop_table('sleep_intervals')

    op.drop_column('daily_entries', 'unlock_count')
    op.drop_column('daily_entries', 'resting_heart_rate')
