import uuid
import hashlib
from datetime import date, datetime, time, timezone
from sqlalchemy import select, and_, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.config import get_settings
from app.models.daily_entry import DailyEntry
from app.models.telemetry import FinancialTransaction, AppUsageSession, SleepInterval
from app.utils.date_utils import ensure_utc, utc_date
from app.models.connector import (
    DataConnector,
    ConnectorSyncLog,
    DataConnectorType,
    DataConnectorStatus,
    SyncLogStatus,
)
from app.utils.ingestion_utils import (
    parse_bedtime_string as _parse_bedtime,
    categorize_merchant,
    parse_csv_statement as parse_csv_statement_rows,
    verify_hmac_sha256,
)
from app.schemas.ingestion import (
    HealthIngestPayload,
    UsageIngestPayload,
    SmsIngestPayload,
    StatementIngestPayload,
    WebhookPayload,
    SyncResultResponse,
)

settings = get_settings()

DEFAULT_CONNECTORS = [
    DataConnectorType.APPLE_HEALTH.value,
    DataConnectorType.GOOGLE_HEALTH_CONNECT.value,
    DataConnectorType.DEVICE_USAGE.value,
    DataConnectorType.SMS_PARSER.value,
    DataConnectorType.PLAID.value,
    DataConnectorType.FINVU_AA.value,
    DataConnectorType.CSV_STATEMENT.value,
]


def _to_uuid(val: str | uuid.UUID) -> uuid.UUID:
    return val if isinstance(val, uuid.UUID) else uuid.UUID(val)


# ============================================================================
# 1. Connector Management Service
# ============================================================================

async def get_or_create_connectors(db: AsyncSession, user_id: str) -> list[DataConnector]:
    """Retrieve all connectors for a user, provisioning defaults if not present."""
    uid = _to_uuid(user_id)
    stmt = select(DataConnector).where(DataConnector.user_id == uid).order_by(DataConnector.connector_type)
    result = await db.execute(stmt)
    existing = {c.connector_type: c for c in result.scalars().all()}

    missing = [c_type for c_type in DEFAULT_CONNECTORS if c_type not in existing]
    if missing:
        for c_type in missing:
            conn = DataConnector(
                id=uuid.uuid4(),
                user_id=uid,
                connector_type=c_type,
                status=DataConnectorStatus.DISCONNECTED.value,
                is_enabled=True,
                sync_frequency_minutes=360,
                total_records_synced=0,
            )
            db.add(conn)
            existing[c_type] = conn
        await db.commit()

    return list(existing.values())


async def toggle_connector(
    db: AsyncSession, user_id: str, connector_type: str, is_enabled: bool
) -> DataConnector:
    """Enable or disable a specific connector."""
    uid = _to_uuid(user_id)
    c_type_upper = connector_type.upper()
    stmt = select(DataConnector).where(
        and_(DataConnector.user_id == uid, DataConnector.connector_type == c_type_upper)
    )
    result = await db.execute(stmt)
    connector = result.scalar_one_or_none()

    if not connector:
        connector = DataConnector(
            id=uuid.uuid4(),
            user_id=uid,
            connector_type=c_type_upper,
            status=DataConnectorStatus.CONNECTED.value if is_enabled else DataConnectorStatus.DISCONNECTED.value,
            is_enabled=is_enabled,
            sync_frequency_minutes=360,
            total_records_synced=0,
        )
        db.add(connector)
    else:
        connector.is_enabled = is_enabled
        if not is_enabled:
            connector.status = DataConnectorStatus.DISCONNECTED.value
        elif connector.status == DataConnectorStatus.DISCONNECTED.value:
            connector.status = DataConnectorStatus.CONNECTED.value

    await db.commit()
    await db.refresh(connector)
    return connector


# ============================================================================
# 2. HealthKit & Health Connect Ingestion
# ============================================================================

async def ingest_health_data(
    db: AsyncSession, user_id: str, payload: HealthIngestPayload
) -> SyncResultResponse:
    """
    Ingests normalized sleep, activity, and vital metrics from Apple Health / Google Health Connect.
    Automatically merges into DailyEntry if requested.
    """
    uid = _to_uuid(user_id)
    synced_at = datetime.now(timezone.utc)
    bedtime = _parse_bedtime(payload.sleep_bedtime)
    entries_updated = 0

    if payload.auto_merge_daily_entry:
        stmt = select(DailyEntry).where(
            and_(DailyEntry.user_id == uid, DailyEntry.date == payload.date)
        )
        result = await db.execute(stmt)
        entry = result.scalar_one_or_none()

        if entry:
            entry.sleep_hours = payload.sleep_hours
            entry.sleep_quality = payload.sleep_quality
            if bedtime is not None:
                entry.sleep_bedtime = bedtime
            entry.steps = payload.steps
            if payload.active_minutes is not None:
                entry.active_minutes = payload.active_minutes
            if payload.calories_burned is not None:
                entry.calories_burned = payload.calories_burned
            if payload.resting_heart_rate is not None:
                entry.resting_heart_rate = payload.resting_heart_rate
        else:
            entry = DailyEntry(
                id=uuid.uuid4(),
                user_id=uid,
                date=payload.date,
                sleep_hours=payload.sleep_hours,
                sleep_quality=payload.sleep_quality,
                sleep_bedtime=bedtime,
                steps=payload.steps,
                active_minutes=payload.active_minutes,
                calories_burned=payload.calories_burned,
                resting_heart_rate=payload.resting_heart_rate,
                screen_time_hours=0.0,
                deep_work_hours=0.0,
                daily_spend=0.0,
            )
            db.add(entry)
        entries_updated = 1

    # Ingest granular sleep intervals if provided
    stored_intervals = 0
    if payload.sleep_intervals:
        existing_res = await db.execute(
            select(SleepInterval).where(
                and_(SleepInterval.user_id == uid, SleepInterval.date == payload.date)
            )
        )
        existing_keys = {
            (ensure_utc(i.start_time), ensure_utc(i.end_time), i.stage.upper())
            for i in existing_res.scalars().all()
        }
        for interval in payload.sleep_intervals:
            try:
                start_dt = datetime.fromisoformat(interval.start_time.replace("Z", "+00:00")) if isinstance(interval.start_time, str) else interval.start_time
                end_dt = datetime.fromisoformat(interval.end_time.replace("Z", "+00:00")) if isinstance(interval.end_time, str) else interval.end_time
                key = (ensure_utc(start_dt), ensure_utc(end_dt), interval.stage.upper())
                if key in existing_keys:
                    continue
                dur_mins = max(0, int((end_dt - start_dt).total_seconds() / 60))
                s_rec = SleepInterval(
                    id=uuid.uuid4(),
                    user_id=uid,
                    date=payload.date,
                    stage=interval.stage.upper(),
                    start_time=start_dt,
                    end_time=end_dt,
                    duration_minutes=dur_mins,
                )
                db.add(s_rec)
                existing_keys.add(key)
                stored_intervals += 1
            except Exception:
                pass

    records_ingested = entries_updated + stored_intervals

    # Update connector state
    source_type = payload.source.upper()
    if source_type not in (DataConnectorType.APPLE_HEALTH.value, DataConnectorType.GOOGLE_HEALTH_CONNECT.value):
        source_type = DataConnectorType.APPLE_HEALTH.value

    c_stmt = select(DataConnector).where(
        and_(DataConnector.user_id == uid, DataConnector.connector_type == source_type)
    )
    c_res = await db.execute(c_stmt)
    connector = c_res.scalar_one_or_none()
    if connector:
        connector.status = DataConnectorStatus.CONNECTED.value
        connector.last_sync_at = synced_at
        connector.total_records_synced += 1
        connector.error_message = None

    # Log sync audit
    log = ConnectorSyncLog(
        id=uuid.uuid4(),
        connector_id=connector.id if connector else None,
        user_id=uid,
        connector_type=source_type,
        status=SyncLogStatus.SUCCESS.value if records_ingested else SyncLogStatus.FAILED.value,
        records_ingested=records_ingested,
        records_deduplicated=0,
        details_json=f'{{"date":"{payload.date}","sleep_hours":{payload.sleep_hours},"steps":{payload.steps},"resting_heart_rate":{payload.resting_heart_rate}}}',
    )
    db.add(log)
    await db.commit()

    return SyncResultResponse(
        success=records_ingested > 0,
        connector_type=source_type,
        records_ingested=records_ingested,
        records_deduplicated=0,
        daily_entries_updated=entries_updated,
        details={
            "date": str(payload.date),
            "sleep_hours": payload.sleep_hours,
            "steps": payload.steps,
            "resting_heart_rate": payload.resting_heart_rate,
        },
        synced_at=synced_at,
    )


# ============================================================================
# 3. Device Usage & Screen Time Ingestion
# ============================================================================

async def ingest_device_usage_data(
    db: AsyncSession, user_id: str, payload: UsageIngestPayload
) -> SyncResultResponse:
    """
    Ingests per-app foreground intervals from Android UsageStatsManager or iOS Screen Time.
    Deduplicates sessions, identifies circadian late-night screen time, and updates DailyEntry.
    """
    uid = _to_uuid(user_id)
    synced_at = datetime.now(timezone.utc)
    ingested_count = 0
    dedup_count = 0
    entries_updated = 0

    # Process app sessions
    for item in payload.sessions:
        # Check duplicate by (user_id, app_name, start_time)
        dup_stmt = select(AppUsageSession).where(
            and_(
                AppUsageSession.user_id == uid,
                AppUsageSession.app_name == item.app_name.strip(),
                AppUsageSession.start_time == item.start_time,
            )
        )
        dup_res = await db.execute(dup_stmt)
        if dup_res.scalar_one_or_none():
            dedup_count += 1
            continue

        # Derive late night if None (22:00 to 05:59)
        is_late = item.is_late_night
        if is_late is None:
            hr = item.start_time.hour
            is_late = hr >= 22 or hr < 6

        session = AppUsageSession(
            id=uuid.uuid4(),
            user_id=uid,
            app_name=item.app_name.strip(),
            app_category=item.app_category.strip(),
            duration_minutes=item.duration_minutes,
            start_time=item.start_time,
            is_late_night=is_late,
        )
        db.add(session)
        ingested_count += 1

    # Merge into DailyEntry if requested
    if payload.auto_merge_daily_entry:
        stmt = select(DailyEntry).where(
            and_(DailyEntry.user_id == uid, DailyEntry.date == payload.date)
        )
        result = await db.execute(stmt)
        entry = result.scalar_one_or_none()

        social_hrs = payload.social_media_hours
        if social_hrs is None and payload.sessions:
            social_mins = sum(
                s.duration_minutes
                for s in payload.sessions
                if s.app_category.lower() in ("social media", "social", "networking")
            )
            social_hrs = round(social_mins / 60.0, 2)

        if entry:
            entry.screen_time_hours = payload.total_screen_time_hours
            if social_hrs is not None:
                entry.social_media_hours = social_hrs
            if payload.unlock_count is not None:
                entry.unlock_count = payload.unlock_count
        else:
            entry = DailyEntry(
                id=uuid.uuid4(),
                user_id=uid,
                date=payload.date,
                sleep_hours=0.0,
                sleep_quality=3,
                steps=0,
                screen_time_hours=payload.total_screen_time_hours,
                social_media_hours=social_hrs,
                unlock_count=payload.unlock_count,
                deep_work_hours=0.0,
                daily_spend=0.0,
            )
            db.add(entry)
        entries_updated = 1

    # Update connector state
    c_stmt = select(DataConnector).where(
        and_(DataConnector.user_id == uid, DataConnector.connector_type == DataConnectorType.DEVICE_USAGE.value)
    )
    c_res = await db.execute(c_stmt)
    connector = c_res.scalar_one_or_none()
    if connector:
        connector.status = DataConnectorStatus.CONNECTED.value
        connector.last_sync_at = synced_at
        connector.total_records_synced += ingested_count
        connector.error_message = None

    log = ConnectorSyncLog(
        id=uuid.uuid4(),
        connector_id=connector.id if connector else None,
        user_id=uid,
        connector_type=DataConnectorType.DEVICE_USAGE.value,
        status=SyncLogStatus.SUCCESS.value,
        records_ingested=ingested_count,
        records_deduplicated=dedup_count,
        details_json=f'{{"date":"{payload.date}","screen_time_hours":{payload.total_screen_time_hours},"sessions":{len(payload.sessions)}}}',
    )
    db.add(log)
    await db.commit()

    return SyncResultResponse(
        success=True,
        connector_type=DataConnectorType.DEVICE_USAGE.value,
        records_ingested=ingested_count,
        records_deduplicated=dedup_count,
        daily_entries_updated=entries_updated,
        details={
            "date": str(payload.date),
            "screen_time_hours": payload.total_screen_time_hours,
            "social_media_hours": payload.social_media_hours,
            "sessions_ingested": ingested_count,
        },
        synced_at=synced_at,
    )


# ============================================================================
# 4. Financial SMS Ingestion & Aggregation
# ============================================================================

async def ingest_sms_transactions(
    db: AsyncSession, user_id: str, payload: SmsIngestPayload
) -> SyncResultResponse:
    """
    Ingests on-device parsed SMS transactions (UPI, Debit cards, Netbanking).
    Deduplicates via deterministic external_id, saves individual records to
    financial_transactions, and recalculates DailyEntry.daily_spend for all affected dates.
    """
    uid = _to_uuid(user_id)
    synced_at = datetime.now(timezone.utc)
    ingested_count = 0
    dedup_count = 0
    affected_dates: set[date] = set()

    for item in payload.transactions:
        # Check duplicate by external_id
        dup_stmt = select(FinancialTransaction).where(
            and_(
                FinancialTransaction.user_id == uid,
                FinancialTransaction.external_id == item.external_id,
            )
        )
        dup_res = await db.execute(dup_stmt)
        if dup_res.scalar_one_or_none():
            dedup_count += 1
            continue

        tx = FinancialTransaction(
            id=uuid.uuid4(),
            user_id=uid,
            amount=round(item.amount, 2),
            category=item.category.strip(),
            merchant=item.merchant.strip(),
            timestamp=ensure_utc(item.timestamp),
            is_discretionary=item.is_discretionary,
            external_id=item.external_id.strip(),
            source="SMS_PARSER",
            notes=item.notes.strip() if item.notes else None,
        )
        db.add(tx)
        ingested_count += 1
        affected_dates.add(utc_date(item.timestamp))

    # Auto merge into DailyEntry.daily_spend for affected dates
    entries_updated = 0
    if payload.auto_merge_daily_entry and affected_dates:
        # Flush pending tx to DB so aggregation includes newly added records
        await db.flush()

        for d in affected_dates:
            start_dt = datetime.combine(d, time.min).replace(tzinfo=timezone.utc)
            end_dt = datetime.combine(d, time.max).replace(tzinfo=timezone.utc)

            sum_stmt = select(func.sum(FinancialTransaction.amount)).where(
                and_(
                    FinancialTransaction.user_id == uid,
                    FinancialTransaction.timestamp >= start_dt,
                    FinancialTransaction.timestamp <= end_dt,
                )
            )
            sum_res = await db.execute(sum_stmt)
            total_day_spend = float(sum_res.scalar() or 0.0)

            # Update or create DailyEntry
            de_stmt = select(DailyEntry).where(
                and_(DailyEntry.user_id == uid, DailyEntry.date == d)
            )
            de_res = await db.execute(de_stmt)
            entry = de_res.scalar_one_or_none()

            if entry:
                entry.daily_spend = round(total_day_spend, 2)
            else:
                entry = DailyEntry(
                    id=uuid.uuid4(),
                    user_id=uid,
                    date=d,
                    sleep_hours=0.0,
                    sleep_quality=3,
                    steps=0,
                    screen_time_hours=0.0,
                    deep_work_hours=0.0,
                    daily_spend=round(total_day_spend, 2),
                )
                db.add(entry)
            entries_updated += 1

    # Update connector state
    c_stmt = select(DataConnector).where(
        and_(DataConnector.user_id == uid, DataConnector.connector_type == DataConnectorType.SMS_PARSER.value)
    )
    c_res = await db.execute(c_stmt)
    connector = c_res.scalar_one_or_none()
    if connector:
        connector.status = DataConnectorStatus.CONNECTED.value
        connector.last_sync_at = synced_at
        connector.total_records_synced += ingested_count
        connector.error_message = None

    log = ConnectorSyncLog(
        id=uuid.uuid4(),
        connector_id=connector.id if connector else None,
        user_id=uid,
        connector_type=DataConnectorType.SMS_PARSER.value,
        status=SyncLogStatus.SUCCESS.value,
        records_ingested=ingested_count,
        records_deduplicated=dedup_count,
        details_json=f'{{"transactions_received":{len(payload.transactions)},"ingested":{ingested_count},"dedup":{dedup_count},"affected_dates":{len(affected_dates)}}}',
    )
    db.add(log)
    await db.commit()

    return SyncResultResponse(
        success=True,
        connector_type=DataConnectorType.SMS_PARSER.value,
        records_ingested=ingested_count,
        records_deduplicated=dedup_count,
        daily_entries_updated=entries_updated,
        details={
            "transactions_processed": len(payload.transactions),
            "new_transactions_ingested": ingested_count,
            "duplicates_ignored": dedup_count,
            "days_recalculated": len(affected_dates),
        },
        synced_at=synced_at,
    )


# ============================================================================
# 5. Bank Statement CSV Parser & Ingestion
# ============================================================================

async def ingest_statement_data(
    db: AsyncSession, user_id: str, payload: StatementIngestPayload
) -> SyncResultResponse:
    """Ingests bank statement CSV or pre-parsed raw transactions."""
    uid = _to_uuid(user_id)
    items = []

    if payload.csv_content:
        parsed_dicts = parse_csv_statement_rows(payload.csv_content)
        for p in parsed_dicts:
            items.append(FinancialTransaction(
                id=uuid.uuid4(),
                user_id=uid,
                amount=p["amount"],
                category=p["category"],
                merchant=p["merchant"],
                timestamp=p["timestamp"],
                is_discretionary=p["is_discretionary"],
                external_id=p["external_id"],
                source="CSV_STATEMENT",
                notes=p["notes"],
            ))
    elif payload.raw_transactions:
        for r in payload.raw_transactions:
            items.append(FinancialTransaction(
                id=uuid.uuid4(),
                user_id=uid,
                amount=round(r.amount, 2),
                category=r.category.strip(),
                merchant=r.merchant.strip(),
                timestamp=ensure_utc(r.timestamp),
                is_discretionary=r.is_discretionary,
                external_id=r.external_id.strip(),
                source="CSV_STATEMENT",
                notes=r.notes,
            ))

    if not items:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No valid debit transactions found in bank statement."
        )

    synced_at = datetime.now(timezone.utc)
    ingested_count = 0
    dedup_count = 0
    affected_dates: set[date] = set()

    for item in items:
        # Check duplicate
        dup_stmt = select(FinancialTransaction).where(
            and_(
                FinancialTransaction.user_id == uid,
                FinancialTransaction.external_id == item.external_id,
            )
        )
        dup_res = await db.execute(dup_stmt)
        if dup_res.scalar_one_or_none():
            dedup_count += 1
            continue

        db.add(item)
        ingested_count += 1
        affected_dates.add(utc_date(item.timestamp))

    entries_updated = 0
    if payload.auto_merge_daily_entry and affected_dates:
        await db.flush()
        for d in affected_dates:
            start_dt = datetime.combine(d, time.min).replace(tzinfo=timezone.utc)
            end_dt = datetime.combine(d, time.max).replace(tzinfo=timezone.utc)
            sum_stmt = select(func.sum(FinancialTransaction.amount)).where(
                and_(
                    FinancialTransaction.user_id == uid,
                    FinancialTransaction.timestamp >= start_dt,
                    FinancialTransaction.timestamp <= end_dt,
                )
            )
            sum_res = await db.execute(sum_stmt)
            total_day_spend = float(sum_res.scalar() or 0.0)

            de_stmt = select(DailyEntry).where(
                and_(DailyEntry.user_id == uid, DailyEntry.date == d)
            )
            de_res = await db.execute(de_stmt)
            entry = de_res.scalar_one_or_none()
            if entry:
                entry.daily_spend = round(total_day_spend, 2)
            else:
                entry = DailyEntry(
                    id=uuid.uuid4(),
                    user_id=uid,
                    date=d,
                    sleep_hours=0.0,
                    sleep_quality=3,
                    steps=0,
                    screen_time_hours=0.0,
                    deep_work_hours=0.0,
                    daily_spend=round(total_day_spend, 2),
                )
                db.add(entry)
            entries_updated += 1

    # Update connector state
    c_stmt = select(DataConnector).where(
        and_(DataConnector.user_id == uid, DataConnector.connector_type == DataConnectorType.CSV_STATEMENT.value)
    )
    c_res = await db.execute(c_stmt)
    connector = c_res.scalar_one_or_none()
    if connector:
        connector.status = DataConnectorStatus.CONNECTED.value
        connector.last_sync_at = synced_at
        connector.total_records_synced += ingested_count

    log = ConnectorSyncLog(
        id=uuid.uuid4(),
        connector_id=connector.id if connector else None,
        user_id=uid,
        connector_type=DataConnectorType.CSV_STATEMENT.value,
        status=SyncLogStatus.SUCCESS.value,
        records_ingested=ingested_count,
        records_deduplicated=dedup_count,
        details_json=f'{{"total_rows_parsed":{len(items)},"ingested":{ingested_count},"dedup":{dedup_count}}}',
    )
    db.add(log)
    await db.commit()

    return SyncResultResponse(
        success=True,
        connector_type=DataConnectorType.CSV_STATEMENT.value,
        records_ingested=ingested_count,
        records_deduplicated=dedup_count,
        daily_entries_updated=entries_updated,
        details={
            "institution": payload.institution,
            "transactions_parsed": len(items),
            "new_transactions_ingested": ingested_count,
            "duplicates_ignored": dedup_count,
        },
        synced_at=synced_at,
    )


# ============================================================================
# 6. Webhook Processing (Plaid / Finvu Account Aggregator)
# ============================================================================

def verify_webhook_signature(payload_bytes: bytes, signature_header: str | None) -> bool:
    """Verifies HMAC-SHA256 signature against settings.FINANCIAL_WEBHOOK_SECRET."""
    return verify_hmac_sha256(payload_bytes, signature_header, settings.FINANCIAL_WEBHOOK_SECRET)


async def process_financial_webhook(
    db: AsyncSession,
    user_id: str,
    payload: WebhookPayload,
    raw_body: bytes,
    signature_header: str | None,
) -> SyncResultResponse:
    """
    Validates webhook signature and ingests institutional transactions from Plaid or Finvu AA.
    """
    if not verify_webhook_signature(raw_body, signature_header):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing webhook signature."
        )

    uid = _to_uuid(user_id)
    synced_at = datetime.now(timezone.utc)
    ingested_count = 0
    dedup_count = 0
    affected_dates: set[date] = set()

    for item in payload.transactions:
        amt = float(item.get("amount", 0.0))
        if amt <= 0:
            continue
        ext_id = str(item.get("transaction_id") or item.get("id") or "")
        if not ext_id:
            ext_id = hashlib.sha256(f"{item}".encode()).hexdigest()[:32]

        dup_stmt = select(FinancialTransaction).where(
            and_(FinancialTransaction.user_id == uid, FinancialTransaction.external_id == ext_id)
        )
        dup_res = await db.execute(dup_stmt)
        if dup_res.scalar_one_or_none():
            dedup_count += 1
            continue

        raw_dt = item.get("date") or item.get("timestamp")
        parsed_dt = None
        if raw_dt:
            try:
                parsed_dt = ensure_utc(datetime.fromisoformat(str(raw_dt)))
            except ValueError:
                pass
        if not parsed_dt:
            parsed_dt = datetime.now(timezone.utc)

        merchant = str(item.get("merchant_name") or item.get("name") or "Institutional Payee")[:100]
        cat, is_disc = categorize_merchant(merchant)

        tx = FinancialTransaction(
            id=uuid.uuid4(),
            user_id=uid,
            amount=round(amt, 2),
            category=str(item.get("category") or cat)[:50],
            merchant=merchant,
            timestamp=parsed_dt,
            is_discretionary=item.get("is_discretionary", is_disc),
            external_id=ext_id,
            source=f"WEBHOOK_{payload.institution.upper() if payload.institution else 'PLAID'}",
            notes=f"Auto-synced via webhook {payload.event_type}",
        )
        db.add(tx)
        ingested_count += 1
        affected_dates.add(utc_date(parsed_dt))

    entries_updated = 0
    if affected_dates:
        await db.flush()
        for d in affected_dates:
            start_dt = datetime.combine(d, time.min).replace(tzinfo=timezone.utc)
            end_dt = datetime.combine(d, time.max).replace(tzinfo=timezone.utc)
            sum_stmt = select(func.sum(FinancialTransaction.amount)).where(
                and_(
                    FinancialTransaction.user_id == uid,
                    FinancialTransaction.timestamp >= start_dt,
                    FinancialTransaction.timestamp <= end_dt,
                )
            )
            sum_res = await db.execute(sum_stmt)
            total_day_spend = float(sum_res.scalar() or 0.0)

            de_stmt = select(DailyEntry).where(
                and_(DailyEntry.user_id == uid, DailyEntry.date == d)
            )
            de_res = await db.execute(de_stmt)
            entry = de_res.scalar_one_or_none()
            if entry:
                entry.daily_spend = round(total_day_spend, 2)
            else:
                entry = DailyEntry(
                    id=uuid.uuid4(),
                    user_id=uid,
                    date=d,
                    sleep_hours=0.0,
                    sleep_quality=3,
                    steps=0,
                    screen_time_hours=0.0,
                    deep_work_hours=0.0,
                    daily_spend=round(total_day_spend, 2),
                )
                db.add(entry)
            entries_updated += 1

    c_type = DataConnectorType.PLAID.value if (payload.institution or "").upper() == "PLAID" else DataConnectorType.FINVU_AA.value
    c_stmt = select(DataConnector).where(
        and_(DataConnector.user_id == uid, DataConnector.connector_type == c_type)
    )
    c_res = await db.execute(c_stmt)
    connector = c_res.scalar_one_or_none()
    if connector:
        connector.status = DataConnectorStatus.CONNECTED.value
        connector.last_sync_at = synced_at
        connector.total_records_synced += ingested_count

    log = ConnectorSyncLog(
        id=uuid.uuid4(),
        connector_id=connector.id if connector else None,
        user_id=uid,
        connector_type=c_type,
        status=SyncLogStatus.SUCCESS.value,
        records_ingested=ingested_count,
        records_deduplicated=dedup_count,
        details_json=f'{{"event_type":"{payload.event_type}","institution":"{payload.institution}","received":{len(payload.transactions)}}}',
    )
    db.add(log)
    await db.commit()

    return SyncResultResponse(
        success=True,
        connector_type=c_type,
        records_ingested=ingested_count,
        records_deduplicated=dedup_count,
        daily_entries_updated=entries_updated,
        details={
            "event_type": payload.event_type,
            "institution": payload.institution,
            "ingested": ingested_count,
            "deduplicated": dedup_count,
        },
        synced_at=synced_at,
    )


# ============================================================================
# 7. Sync Logs Retrieval
# ============================================================================

async def get_sync_logs(
    db: AsyncSession, user_id: str, limit: int = 20
) -> list[ConnectorSyncLog]:
    uid = _to_uuid(user_id)
    stmt = (
        select(ConnectorSyncLog)
        .where(ConnectorSyncLog.user_id == uid)
        .order_by(desc(ConnectorSyncLog.created_at))
        .limit(limit)
    )
    res = await db.execute(stmt)
    return list(res.scalars().all())
