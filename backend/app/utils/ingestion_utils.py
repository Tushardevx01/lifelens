import hmac
import hashlib
import csv
import io
import re
from datetime import datetime, time, timezone
from typing import Any


def parse_bedtime_string(bedtime_str: str | None) -> time | None:
    """Parses various bedtime formats into a python time object."""
    if not bedtime_str:
        return None
    for fmt in ("%H:%M", "%H:%M:%S", "%I:%M %p", "%I:%M:%S %p"):
        try:
            return datetime.strptime(bedtime_str.strip(), fmt).time()
        except ValueError:
            continue
    return None


def categorize_merchant(desc: str) -> tuple[str, bool]:
    """
    Classifies raw merchant narration into LifeLens category and discretionary flag.
    Returns (category_name, is_discretionary).
    """
    d = desc.lower()

    # Food & Dining (Discretionary)
    if any(k in d for k in ("swiggy", "zomato", "restaurant", "mcdonald", "starbucks", "cafe", "food", "domino", "blinkit", "zepto", "subway", "kfc", "burger king", "dining", "eats")):
        return "Food & Dining", True

    # Transportation (Non-Discretionary)
    if any(k in d for k in ("uber", "ola", "rapido", "metro", "fuel", "petrol", "shell", "transport", "cab", "indian oil", "bharat petroleum", "hpcl", "train", "irctc")):
        return "Transportation", False

    # Shopping (Discretionary)
    if any(k in d for k in ("amazon", "flipkart", "myntra", "zara", "apple", "retail", "store", "shopping", "uniqlo", "h&m", "nykaa", "ajio", "reliancedigital", "croma")):
        return "Shopping", True

    # Entertainment & Subscriptions (Discretionary)
    if any(k in d for k in ("netflix", "spotify", "bookmyshow", "prime", "movie", "youtube", "entertainment", "steam", "playstation", "cinema", "pvr", "inox", "hotstar")):
        return "Entertainment", True

    # Utilities & Bills (Non-Discretionary)
    if any(k in d for k in ("electricity", "water", "broadband", "airtel", "jio", "bescom", "utility", "bill", "recharge", "gas", "tneb", "cesc")):
        return "Utilities", False

    # Groceries (Non-Discretionary)
    if any(k in d for k in ("groceries", "supermarket", "dmart", "bigbasket", "instamart", "nature's basket", "reliance fresh", "more retail", "spencer")):
        return "Groceries", False

    # Healthcare (Non-Discretionary)
    if any(k in d for k in ("pharmacy", "hospital", "apollo", "medplus", "1mg", "clinic", "health", "dr ", "doctor", "diagnostics", "practo")):
        return "Healthcare", False

    return "Other", True


def compute_deterministic_transaction_hash(
    amount: float, merchant: str, timestamp_str: str, ref_number: str | None = None
) -> str:
    """Generates a stable 32-character SHA-256 hash for deduplication."""
    clean_merchant = re.sub(r"[^a-zA-Z0-9]", "", merchant.lower())
    clean_ref = (ref_number or "").strip().lower()
    date_part = timestamp_str[:10] if len(timestamp_str) >= 10 else timestamp_str
    raw_key = f"{round(float(amount), 2)}_{clean_merchant}_{date_part}_{clean_ref}"
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()[:32]


def verify_hmac_sha256(payload_bytes: bytes, signature_header: str | None, secret_key: str) -> bool:
    """Verifies HMAC-SHA256 signature against secret key with constant-time comparison."""
    if not signature_header or not secret_key:
        return False
    expected = hmac.new(
        key=secret_key.encode("utf-8"),
        msg=payload_bytes,
        digestmod=hashlib.sha256,
    ).hexdigest()
    clean_sig = signature_header.replace("sha256=", "").strip()
    return hmac.compare_digest(expected, clean_sig)


def parse_csv_statement(csv_text: str) -> list[dict[str, Any]]:
    """
    Parses arbitrary bank statement CSVs into structured transactions.
    Supports HDFC, ICICI, SBI, Chase, Citibank, and generic statements.
    """
    f = io.StringIO(csv_text.strip())
    reader = csv.reader(f)
    rows = list(reader)
    if not rows:
        return []

    # Detect header row
    header_idx = -1
    for i, row in enumerate(rows[:20]):
        lower_cells = [c.strip().lower() for c in row]
        if any("date" in c for c in lower_cells) and (
            any("desc" in c or "narration" in c or "particulars" in c or "merchant" in c for c in lower_cells)
        ):
            header_idx = i
            break

    if header_idx == -1:
        header_idx = 0

    headers = [c.strip().lower() for c in rows[header_idx]]
    date_col = next((i for i, h in enumerate(headers) if "date" in h), 0)
    desc_col = next((i for i, h in enumerate(headers) if any(k in h for k in ("desc", "narration", "particulars", "merchant", "details"))), 1)
    debit_col = next((i for i, h in enumerate(headers) if any(k in h for k in ("debit", "withdrawal", "spent", "dr"))), None)
    amount_col = next((i for i, h in enumerate(headers) if "amount" in h), None)
    type_col = next((i for i, h in enumerate(headers) if "type" in h or "cr/dr" in h), None)

    results = []
    for row in rows[header_idx + 1:]:
        if not row or len(row) <= max(date_col, desc_col):
            continue
        raw_date = row[date_col].strip()
        raw_desc = row[desc_col].strip()
        if not raw_date or not raw_desc:
            continue

        raw_amount_str = ""
        is_debit = True

        if debit_col is not None and debit_col < len(row) and row[debit_col].strip():
            raw_amount_str = row[debit_col].strip()
        elif amount_col is not None and amount_col < len(row) and row[amount_col].strip():
            raw_amount_str = row[amount_col].strip()
            if type_col is not None and type_col < len(row):
                t_val = row[type_col].strip().lower()
                is_debit = "dr" in t_val or "debit" in t_val

        clean_amt_str = raw_amount_str.replace(",", "").replace("$", "").replace("₹", "").replace("Rs", "").strip()
        try:
            val = float(clean_amt_str)
            if val < 0:
                val = abs(val)
                is_debit = True
        except ValueError:
            continue

        if not is_debit or val <= 0:
            continue

        parsed_dt = None
        for fmt in (
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%d %H:%M",
            "%Y-%m-%dT%H:%M:%S",
            "%Y-%m-%d",
            "%d/%m/%Y %H:%M:%S",
            "%d/%m/%Y %H:%M",
            "%d/%m/%Y",
            "%d-%m-%Y %H:%M:%S",
            "%d-%m-%Y %H:%M",
            "%d-%m-%Y",
            "%d-%b-%Y %H:%M:%S",
            "%d-%b-%Y",
            "%d %b %Y",
            "%m/%d/%Y %H:%M:%S",
            "%m/%d/%Y",
        ):
            try:
                parsed_dt = datetime.strptime(raw_date, fmt).replace(tzinfo=timezone.utc)
                break
            except ValueError:
                continue

        if not parsed_dt and " " in raw_date:
            raw_date_part = raw_date.split()[0]
            for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%d-%b-%Y", "%d %b %Y", "%m/%d/%Y"):
                try:
                    parsed_dt = datetime.strptime(raw_date_part, fmt).replace(tzinfo=timezone.utc)
                    break
                except ValueError:
                    continue

        if not parsed_dt:
            # Reject invalid date rather than corrupting data with datetime.now()
            continue

        category, is_disc = categorize_merchant(raw_desc)
        ext_id = compute_deterministic_transaction_hash(val, raw_desc, parsed_dt.isoformat())

        results.append({
            "amount": val,
            "merchant": raw_desc[:100],
            "category": category,
            "timestamp": parsed_dt,
            "is_discretionary": is_disc,
            "external_id": ext_id,
            "notes": f"CSV import: {raw_desc}",
        })

    return results

