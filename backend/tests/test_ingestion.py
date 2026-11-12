"""
Unit tests for LifeLens Automated Ingestion & Connectors (Phase 5).
Tests:
- Bedtime parsing across formats (24h, 12h AM/PM, seconds)
- Merchant categorisation heuristics and discretionary spending tagging
- Deterministic transaction hash generation for deduplication
- HMAC-SHA256 webhook signature verification (Plaid / Finvu)
- Multi-format bank statement CSV parser (HDFC, SBI, Chase, generic)
- Error handling and edge cases
"""

import unittest

import pytest
import hmac
import hashlib
import json
from httpx import AsyncClient
from app.config import get_settings
from app.utils.ingestion_utils import (
    parse_bedtime_string,
    categorize_merchant,
    compute_deterministic_transaction_hash,
    verify_hmac_sha256,
    parse_csv_statement,
)


class TestIngestionBedtime(unittest.TestCase):
    def test_24hr_format(self):
        t = parse_bedtime_string("23:15")
        self.assertIsNotNone(t)
        self.assertEqual(t.hour, 23)
        self.assertEqual(t.minute, 15)

    def test_24hr_with_seconds(self):
        t = parse_bedtime_string("22:45:30")
        self.assertIsNotNone(t)
        self.assertEqual(t.hour, 22)
        self.assertEqual(t.minute, 45)
        self.assertEqual(t.second, 30)

    def test_12hr_format_am_pm(self):
        t_pm = parse_bedtime_string("11:30 PM")
        self.assertIsNotNone(t_pm)
        self.assertEqual(t_pm.hour, 23)
        self.assertEqual(t_pm.minute, 30)

        t_am = parse_bedtime_string("01:15 AM")
        self.assertIsNotNone(t_am)
        self.assertEqual(t_am.hour, 1)
        self.assertEqual(t_am.minute, 15)

    def test_invalid_and_empty_bedtime(self):
        self.assertIsNone(parse_bedtime_string(None))
        self.assertIsNone(parse_bedtime_string(""))
        self.assertIsNone(parse_bedtime_string("invalid-time"))
        self.assertIsNone(parse_bedtime_string("25:99"))


class TestMerchantCategorization(unittest.TestCase):
    def test_food_and_dining_discretionary(self):
        for name in ["Swiggy Order #8192", "ZOMATO RESTAURANT", "McDonald's", "Starbucks Coffee", "Blinkit grocery delivery"]:
            cat, is_disc = categorize_merchant(name)
            self.assertEqual(cat, "Food & Dining")
            self.assertTrue(is_disc)

    def test_transportation_non_discretionary(self):
        for name in ["UBER TRIP 1928", "Ola Cabs", "Shell Petrol Pump", "Indian Oil Fuel"]:
            cat, is_disc = categorize_merchant(name)
            self.assertEqual(cat, "Transportation")
            self.assertFalse(is_disc)

    def test_shopping_discretionary(self):
        for name in ["Amazon India", "Flipkart Internet", "Myntra Fashion", "Zara Store #40"]:
            cat, is_disc = categorize_merchant(name)
            self.assertEqual(cat, "Shopping")
            self.assertTrue(is_disc)

    def test_entertainment_discretionary(self):
        for name in ["Netflix.com Subscription", "Spotify Premium", "BookMyShow Movie Tickets", "Steam Games"]:
            cat, is_disc = categorize_merchant(name)
            self.assertEqual(cat, "Entertainment")
            self.assertTrue(is_disc)

    def test_utilities_non_discretionary(self):
        for name in ["Airtel Broadband Bill", "BESCOM Electricity", "Jio Prepaid Recharge"]:
            cat, is_disc = categorize_merchant(name)
            self.assertEqual(cat, "Utilities")
            self.assertFalse(is_disc)

    def test_groceries_non_discretionary(self):
        for name in ["DMart Supermarket", "BigBasket", "Nature's Basket"]:
            cat, is_disc = categorize_merchant(name)
            self.assertEqual(cat, "Groceries")
            self.assertFalse(is_disc)

    def test_healthcare_non_discretionary(self):
        for name in ["Apollo Pharmacy", "MedPlus Chemist", "Tata 1mg Lab Test"]:
            cat, is_disc = categorize_merchant(name)
            self.assertEqual(cat, "Healthcare")
            self.assertFalse(is_disc)

    def test_unknown_merchant_fallback(self):
        cat, is_disc = categorize_merchant("Random Local Vendor XYZ")
        self.assertEqual(cat, "Other")
        self.assertTrue(is_disc)


class TestDeduplicationHash(unittest.TestCase):
    def test_deterministic_hash_equality(self):
        h1 = compute_deterministic_transaction_hash(450.00, "Swiggy", "2026-11-07T12:00:00Z", "REF123456")
        h2 = compute_deterministic_transaction_hash(450.0, "swiggy", "2026-11-07T12:00:00Z", "ref123456")
        self.assertEqual(h1, h2)
        self.assertEqual(len(h1), 32)

    def test_hash_distinguishes_different_amounts_or_merchants(self):
        h1 = compute_deterministic_transaction_hash(450.00, "Swiggy", "2026-11-07T12:00:00Z")
        h2 = compute_deterministic_transaction_hash(451.00, "Swiggy", "2026-11-07T12:00:00Z")
        h3 = compute_deterministic_transaction_hash(450.00, "Zomato", "2026-11-07T12:00:00Z")
        self.assertNotEqual(h1, h2)
        self.assertNotEqual(h1, h3)


class TestWebhookSignatureVerification(unittest.TestCase):
    def setUp(self):
        self.secret = "test_super_secret_key_12345"
        self.payload = b'{"event":"TRANSACTIONS_SYNC","count":5}'

    def test_valid_signature_with_and_without_prefix(self):
        import hmac
        import hashlib
        valid_hex = hmac.new(self.secret.encode(), self.payload, hashlib.sha256).hexdigest()

        self.assertTrue(verify_hmac_sha256(self.payload, valid_hex, self.secret))
        self.assertTrue(verify_hmac_sha256(self.payload, f"sha256={valid_hex}", self.secret))

    def test_tampered_payload_rejected(self):
        import hmac
        import hashlib
        valid_hex = hmac.new(self.secret.encode(), self.payload, hashlib.sha256).hexdigest()
        tampered = b'{"event":"TRANSACTIONS_SYNC","count":999}'

        self.assertFalse(verify_hmac_sha256(tampered, valid_hex, self.secret))

    def test_missing_or_empty_signature_rejected(self):
        self.assertFalse(verify_hmac_sha256(self.payload, None, self.secret))
        self.assertFalse(verify_hmac_sha256(self.payload, "", self.secret))
        self.assertFalse(verify_hmac_sha256(self.payload, "invalid_sig", self.secret))


class TestCsvStatementParser(unittest.TestCase):
    def test_standard_hdfc_style_csv(self):
        sample_csv = """Date,Narration,Withdrawal Amount,Deposit Amount,Closing Balance
04/11/2026,UPI-SWIGGY-12345678,450.00,,12000.00
05/11/2026,SALARY DEPOSIT,,75000.00,87000.00
06/11/2026,UBER TRIP BANGALORE,280.50,,86719.50
"""
        txs = parse_csv_statement(sample_csv)
        self.assertEqual(len(txs), 2)  # Only debits parsed
        self.assertEqual(txs[0]["amount"], 450.0)
        self.assertEqual(txs[0]["category"], "Food & Dining")
        self.assertTrue(txs[0]["is_discretionary"])

        self.assertEqual(txs[1]["amount"], 280.5)
        self.assertEqual(txs[1]["category"], "Transportation")
        self.assertFalse(txs[1]["is_discretionary"])

    def test_chase_us_style_csv(self):
        sample_csv = """Transaction Date,Description,Category,Type,Amount
2026-11-04,STARBUCKS STORE #124,Food,Debit,-6.50
2026-11-05,PAYROLL CREDIT,Income,Credit,2500.00
2026-11-06,AMAZON.COM RETAIL,Shopping,Debit,-45.99
"""
        txs = parse_csv_statement(sample_csv)
        self.assertEqual(len(txs), 2)
        self.assertEqual(txs[0]["amount"], 6.50)
        self.assertEqual(txs[0]["category"], "Food & Dining")
        self.assertEqual(txs[1]["amount"], 45.99)
        self.assertEqual(txs[1]["category"], "Shopping")

    def test_empty_and_garbage_csv_handled_safely(self):
        self.assertEqual(parse_csv_statement(""), [])
        self.assertEqual(parse_csv_statement("Header1,Header2\n1,2"), [])

    def test_timestamp_in_csv_parsed_accurately(self):
        sample_csv = """Date,Narration,Withdrawal Amount
05/11/2026 14:30:00,UPI-SWIGGY-12345678,450.00
"""
        txs = parse_csv_statement(sample_csv)
        self.assertEqual(len(txs), 1)
        self.assertEqual(txs[0]["timestamp"].day, 5)
        self.assertEqual(txs[0]["timestamp"].month, 11)
        self.assertEqual(txs[0]["timestamp"].year, 2026)

    def test_invalid_date_row_safely_skipped(self):
        sample_csv = """Date,Narration,Withdrawal Amount
INVALID_DATE,UPI-SWIGGY-12345678,450.00
05/11/2026,UPI-SWIGGY-87654321,200.00
"""
        txs = parse_csv_statement(sample_csv)
        self.assertEqual(len(txs), 1)
        self.assertEqual(txs[0]["amount"], 200.0)

    def test_deterministic_hash_integer_and_float_parity(self):
        h1 = compute_deterministic_transaction_hash(500, "Starbucks", "2026-11-08T10:00:00Z", "REF123")
        h2 = compute_deterministic_transaction_hash(500.0, "Starbucks", "2026-11-08T10:00:00Z", "REF123")
        self.assertEqual(h1, h2)


# ============================================================================
# API Route Integration Tests (Phase 5)
# ============================================================================


@pytest.mark.asyncio
async def test_ingest_health_api_route(client: AsyncClient, auth_headers: dict):
    payload = {
        "date": "2026-11-07",
        "source": "APPLE_HEALTH",
        "sleep_hours": 7.5,
        "sleep_quality": 4,
        "sleep_bedtime": "23:30",
        "steps": 8200,
        "active_minutes": 45,
        "calories_burned": 320,
        "resting_heart_rate": 62.0,
        "auto_merge_daily_entry": True,
    }
    res = await client.post("/api/ingestion/health", json=payload, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["connector_type"] == "APPLE_HEALTH"
    assert data["daily_entries_updated"] == 1


@pytest.mark.asyncio
async def test_ingest_usage_api_route(client: AsyncClient, auth_headers: dict):
    now_iso = "2026-11-07T23:30:00Z"
    payload = {
        "date": "2026-11-07",
        "device_platform": "ANDROID",
        "total_screen_time_hours": 3.5,
        "social_media_hours": 1.2,
        "unlock_count": 42,
        "sessions": [
            {
                "app_name": "Instagram",
                "app_category": "SOCIAL_MEDIA",
                "duration_minutes": 45,
                "start_time": now_iso,
                "is_late_night": True,
            }
        ],
        "auto_merge_daily_entry": True,
    }
    res = await client.post("/api/ingestion/usage", json=payload, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["connector_type"] == "DEVICE_USAGE"


@pytest.mark.asyncio
async def test_ingest_sms_api_route(client: AsyncClient, auth_headers: dict):
    h = compute_deterministic_transaction_hash(350.0, "Swiggy", "2026-11-07", "REF9876")
    payload = {
        "device_platform": "ANDROID",
        "auto_merge_daily_entry": True,
        "transactions": [
            {
                "amount": 350.0,
                "merchant": "Swiggy",
                "category": "Food & Dining",
                "timestamp": "2026-11-07T13:00:00Z",
                "is_discretionary": True,
                "external_id": h,
                "currency": "INR",
                "notes": "SMS Debit alert",
            }
        ],
    }
    res = await client.post("/api/ingestion/financial/sms", json=payload, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["records_ingested"] == 1


@pytest.mark.asyncio
async def test_ingest_statement_api_route(client: AsyncClient, auth_headers: dict):
    csv_content = """Date,Narration,Withdrawal Amount
05/11/2026 14:30:00,UPI-SWIGGY-12345678,450.00
"""
    payload = {
        "csv_content": csv_content,
        "auto_merge_daily_entry": True,
    }
    res = await client.post("/api/ingestion/financial/statement", json=payload, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["records_ingested"] == 1


@pytest.mark.asyncio
async def test_ingest_webhook_without_user_token(client: AsyncClient, test_user):
    settings = get_settings()
    payload_dict = {
        "event_type": "TRANSACTIONS_SYNC",
        "institution": "PLAID",
        "user_id": str(test_user.id),
        "transactions": [
            {
                "id": "plaid_tx_998877",
                "amount": 125.0,
                "name": "Blue Bottle Coffee",
                "date": "2026-11-07T09:00:00Z",
                "category": "Food & Dining",
                "is_discretionary": True,
            }
        ],
    }
    raw_body = json.dumps(payload_dict).encode("utf-8")
    sig = hmac.new(settings.FINANCIAL_WEBHOOK_SECRET.encode(), raw_body, hashlib.sha256).hexdigest()

    # NOTE: No Authorization header passed! Webhook relies strictly on HMAC signature and user_id in payload
    res = await client.post(
        "/api/ingestion/financial/webhook",
        content=raw_body,
        headers={
            "Content-Type": "application/json",
            "x-webhook-signature": f"sha256={sig}",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["records_ingested"] == 1


@pytest.mark.asyncio
async def test_connectors_management_and_logs(client: AsyncClient, auth_headers: dict):
    # List connectors
    res = await client.get("/api/ingestion/connectors", headers=auth_headers)
    assert res.status_code == 200
    connectors = res.json()
    assert len(connectors) >= 1

    # Toggle connector
    toggle_res = await client.post(
        "/api/ingestion/connectors/APPLE_HEALTH/toggle",
        json={"is_enabled": False},
        headers=auth_headers,
    )
    assert toggle_res.status_code == 200
    assert toggle_res.json()["is_enabled"] is False

    # List logs
    logs_res = await client.get("/api/ingestion/logs?limit=10", headers=auth_headers)
    assert logs_res.status_code == 200


if __name__ == "__main__":
    unittest.main()

