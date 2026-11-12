from datetime import date, datetime, timezone


def get_date_range(days: int = 30) -> tuple[date, date]:
    """Get a date range from N days ago to today."""
    end = date.today()
    start = end - __import__('datetime').timedelta(days=days)
    return start, end


def ensure_utc(value: datetime) -> datetime:
    """Treat naive datetimes as UTC and convert aware ones to UTC."""
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def utc_date(value: datetime) -> date:
    """Calendar day in UTC, matching the UTC bounds used for daily rollups."""
    return ensure_utc(value).date()


def parse_date_string(date_str: str) -> date:
    """Parse a date string in YYYY-MM-DD format."""
    return datetime.strptime(date_str, "%Y-%m-%d").date()


def is_future_date(d: date) -> bool:
    """Check if a date is in the future."""
    return d > date.today()
