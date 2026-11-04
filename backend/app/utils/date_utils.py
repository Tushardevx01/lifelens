from datetime import date, datetime
from typing import Optional


def get_date_range(days: int = 30) -> tuple[date, date]:
    """Get a date range from N days ago to today."""
    end = date.today()
    start = end - __import__('datetime').timedelta(days=days)
    return start, end


def parse_date_string(date_str: str) -> date:
    """Parse a date string in YYYY-MM-DD format."""
    return datetime.strptime(date_str, "%Y-%m-%d").date()


def is_future_date(d: date) -> bool:
    """Check if a date is in the future."""
    return d > date.today()
