from typing import Optional
from fastapi import APIRouter, Depends, Query, status, Header, Request, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.utils.db_route import CommitRoute
from app.utils.security import get_current_user
from app.cache.redis_client import invalidate_user_cache
from app.schemas.ingestion import (
    HealthIngestPayload,
    UsageIngestPayload,
    SmsIngestPayload,
    StatementIngestPayload,
    WebhookPayload,
    ConnectorResponse,
    ConnectorToggleRequest,
    SyncResultResponse,
)
from app.services import ingestion_service

router = APIRouter(route_class=CommitRoute)


# ============================================================================
# 1. Connectors Configuration & Status
# ============================================================================

@router.get(
    "/connectors",
    response_model=list[ConnectorResponse],
    summary="List all data connectors and their current synchronization status",
)
async def list_connectors(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """
    Returns statuses for Apple Health, Google Health Connect, Android UsageStats,
    Local SMS Parser, Plaid, Finvu AA, and CSV statement ingestion.
    """
    return await ingestion_service.get_or_create_connectors(db, user_id)


@router.post(
    "/connectors/{connector_type}/toggle",
    response_model=ConnectorResponse,
    summary="Enable or disable a specific data connector",
)
async def toggle_connector_status(
    connector_type: str,
    data: ConnectorToggleRequest,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """Toggle enabled status of an ingestion connector."""
    return await ingestion_service.toggle_connector(
        db, user_id, connector_type, data.is_enabled
    )


# ============================================================================
# 2. Health Data Ingestion (HealthKit / Health Connect)
# ============================================================================

@router.post(
    "/health",
    response_model=SyncResultResponse,
    status_code=status.HTTP_200_OK,
    summary="Ingest sleep, steps, active calories and resting heart rate",
)
async def ingest_health(
    payload: HealthIngestPayload,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """
    Automated endpoint for Apple Health & Google Health Connect background workers.
    Normalizes sleep intervals and daily totals, updating DailyEntry automatically.
    """
    result = await ingestion_service.ingest_health_data(db, user_id, payload)
    invalidate_user_cache(user_id)
    return result


# ============================================================================
# 3. Device Screen Time & App Usage Ingestion (UsageStatsManager / Screen Time)
# ============================================================================

@router.post(
    "/usage",
    response_model=SyncResultResponse,
    status_code=status.HTTP_200_OK,
    summary="Ingest per-app foreground intervals, screen time and late-night usage",
)
async def ingest_usage(
    payload: UsageIngestPayload,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """
    Automated endpoint for Android UsageStatsManager bridge and iOS Screen Time parser.
    Identifies circadian late-night phone usage and updates DailyEntry metrics.
    """
    result = await ingestion_service.ingest_device_usage_data(db, user_id, payload)
    invalidate_user_cache(user_id)
    return result


# ============================================================================
# 4. Financial SMS Ingestion (UPI & Bank Transaction Alerts)
# ============================================================================

@router.post(
    "/financial/sms",
    response_model=SyncResultResponse,
    status_code=status.HTTP_200_OK,
    summary="Ingest on-device parsed SMS transactions with deterministic deduplication",
)
async def ingest_sms(
    payload: SmsIngestPayload,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """
    Privacy-first endpoint: receives structured transaction metadata parsed locally on-device.
    Deduplicates via external_id hash and recalculates DailyEntry.daily_spend.
    """
    result = await ingestion_service.ingest_sms_transactions(db, user_id, payload)
    invalidate_user_cache(user_id)
    return result


# ============================================================================
# 5. Bank Statement CSV Ingestion
# ============================================================================

@router.post(
    "/financial/statement",
    response_model=SyncResultResponse,
    status_code=status.HTTP_200_OK,
    summary="Upload and parse bank statement CSV / JSON data",
)
async def ingest_statement(
    payload: StatementIngestPayload,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """
    Parses bank statements (HDFC, SBI, ICICI, Chase, generic CSV) into structured transactions.
    """
    result = await ingestion_service.ingest_statement_data(db, user_id, payload)
    invalidate_user_cache(user_id)
    return result


# ============================================================================
# 6. Webhooks (Plaid & Finvu Account Aggregator)
# ============================================================================

@router.post(
    "/financial/webhook",
    response_model=SyncResultResponse,
    status_code=status.HTTP_200_OK,
    summary="Receive transactions webhook from Plaid or Finvu Account Aggregator",
)
async def ingest_webhook(
    request: Request,
    payload: WebhookPayload,
    db: AsyncSession = Depends(get_db),
    user_id: Optional[str] = Query(None),
    x_lifelens_user_id: Optional[str] = Header(None),
    x_webhook_signature: Optional[str] = Header(None),
):
    """
    Webhook handler for direct account aggregators with HMAC-SHA256 signature verification.
    Does not require interactive user Bearer token; validates via HMAC signature and target user ID.
    """
    target_user_id = user_id or x_lifelens_user_id or (str(payload.user_id) if payload.user_id else None)
    if not target_user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Target user ID must be provided in webhook payload, header, or query param."
        )
    raw_body = await request.body()
    result = await ingestion_service.process_financial_webhook(
        db, target_user_id, payload, raw_body, x_webhook_signature
    )
    invalidate_user_cache(target_user_id)
    return result


# ============================================================================
# 7. Sync Logs & On-Demand Sync
# ============================================================================

@router.get(
    "/logs",
    summary="Retrieve recent audit logs of automated synchronization events",
)
async def list_sync_logs(
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """Audit log of sync history showing ingested vs deduplicated records."""
    logs = await ingestion_service.get_sync_logs(db, user_id, limit=limit)
    return [
        {
            "id": log.id,
            "connector_id": log.connector_id,
            "connector_type": log.connector_type,
            "status": log.status,
            "records_ingested": log.records_ingested,
            "records_deduplicated": log.records_deduplicated,
            "details": log.details_json,
            "error_message": log.error_message,
            "created_at": log.created_at,
        }
        for log in logs
    ]


@router.post(
    "/sync",
    summary="Trigger an immediate on-demand synchronization pass across all enabled connectors",
)
async def trigger_on_demand_sync(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """Simulates/triggers sync across active connectors."""
    connectors = await ingestion_service.get_or_create_connectors(db, user_id)
    active_types = [c.connector_type for c in connectors if c.is_enabled]
    return {
        "status": "triggered",
        "active_connectors": active_types,
        "message": f"Sync queued for {len(active_types)} active connectors.",
    }

