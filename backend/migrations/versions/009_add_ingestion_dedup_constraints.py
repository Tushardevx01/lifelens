"""add_ingestion_dedup_constraints

Revision ID: 009_add_ingestion_dedup
Revises: 008_add_native_telemetry
Create Date: 2026-11-11

Adds database-level uniqueness for deduplicated ingestion:
  - sleep_intervals: one row per user/sleep-stage/start/end window so repeated
    device syncs do not double-count sleep.
  - financial_transactions: one row per user/external_id so repeated webhook or
    SMS imports cannot create duplicate charges.
Existing duplicates are removed before the constraints are added.
"""
from alembic import op
import sqlalchemy as sa

revision = '009_add_ingestion_dedup'
down_revision = '008_add_native_telemetry'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    is_postgres = bind.dialect.name == "postgresql"

    if is_postgres:
        op.add_column('briefings', sa.Column('payload_json', sa.Text(), nullable=True))
        op.execute(
            """
            DELETE FROM sleep_intervals s
            USING sleep_intervals dup
            WHERE s.ctid > dup.ctid
              AND s.user_id = dup.user_id
              AND s.start_time = dup.start_time
              AND s.end_time = dup.end_time
              AND s.stage = dup.stage
            """
        )
        op.create_unique_constraint(
            'uq_sleep_interval_user_window_stage',
            'sleep_intervals',
            ['user_id', 'start_time', 'end_time', 'stage'],
        )
        op.execute(
            """
            DELETE FROM financial_transactions t
            USING financial_transactions dup
            WHERE t.ctid > dup.ctid
              AND t.user_id = dup.user_id
              AND t.external_id = dup.external_id
              AND t.external_id IS NOT NULL
            """
        )
        op.create_unique_constraint(
            'uq_financial_transaction_user_external',
            'financial_transactions',
            ['user_id', 'external_id'],
        )
    else:
        with op.batch_alter_table('briefings') as batch_op:
            batch_op.add_column(sa.Column('payload_json', sa.Text(), nullable=True))
        op.execute(
            """
            DELETE FROM sleep_intervals
            WHERE rowid NOT IN (
                SELECT MIN(rowid)
                FROM sleep_intervals
                GROUP BY user_id, start_time, end_time, stage
            )
            """
        )
        with op.batch_alter_table('sleep_intervals') as batch_op:
            batch_op.create_unique_constraint(
                'uq_sleep_interval_user_window_stage',
                ['user_id', 'start_time', 'end_time', 'stage'],
            )
        op.execute(
            """
            DELETE FROM financial_transactions
            WHERE external_id IS NOT NULL
              AND rowid NOT IN (
                SELECT MIN(rowid)
                FROM financial_transactions
                WHERE external_id IS NOT NULL
                GROUP BY user_id, external_id
            )
            """
        )
        with op.batch_alter_table('financial_transactions') as batch_op:
            batch_op.create_unique_constraint(
                'uq_financial_transaction_user_external',
                ['user_id', 'external_id'],
            )


def downgrade() -> None:
    bind = op.get_bind()
    is_postgres = bind.dialect.name == "postgresql"

    if is_postgres:
        op.drop_column('briefings', 'payload_json')
        op.drop_constraint(
            'uq_financial_transaction_user_external',
            'financial_transactions',
            type_='unique',
        )
        op.drop_constraint(
            'uq_sleep_interval_user_window_stage',
            'sleep_intervals',
            type_='unique',
        )
    else:
        with op.batch_alter_table('financial_transactions') as batch_op:
            batch_op.drop_constraint('uq_financial_transaction_user_external', type_='unique')
        with op.batch_alter_table('sleep_intervals') as batch_op:
            batch_op.drop_constraint('uq_sleep_interval_user_window_stage', type_='unique')
        with op.batch_alter_table('briefings') as batch_op:
            batch_op.drop_column('payload_json')
