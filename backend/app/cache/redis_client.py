import time
import redis
import json
import logging
from typing import Any
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_redis_instance: redis.Redis | None = None
_last_failure_time: float = 0.0
_CIRCUIT_BREAKER_COOLDOWN_SEC: float = 5.0


def get_redis_client() -> redis.Redis | None:
    """
    Get or initialize Redis connection with circuit-breaker protection.
    If Redis was recently determined unreachable, fails fast (0ms) within cooldown window.
    """
    global _redis_instance, _last_failure_time
    now = time.monotonic()

    # Fast return existing connection if healthy
    if _redis_instance is not None:
        return _redis_instance

    # Circuit breaker: don't retry if failed recently
    if now - _last_failure_time < _CIRCUIT_BREAKER_COOLDOWN_SEC:
        return None

    try:
        client = redis.Redis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=0.5,
            socket_timeout=1.0,
            retry_on_timeout=False,
        )
        client.ping()
        _redis_instance = client
        _last_failure_time = 0.0
        return _redis_instance
    except Exception as e:
        _last_failure_time = now
        _redis_instance = None
        logger.debug(f"Redis not available ({e}); circuit open for {_CIRCUIT_BREAKER_COOLDOWN_SEC}s")
        return None


def mark_redis_failure():
    """Explicitly trip the circuit breaker on runtime connection drop."""
    global _redis_instance, _last_failure_time
    _redis_instance = None
    _last_failure_time = time.monotonic()


class _RedisProxy:
    def __getattr__(self, name: str):
        client = get_redis_client()
        if client is None:
            raise redis.ConnectionError("Redis is not currently available.")
        return getattr(client, name)

    def __bool__(self) -> bool:
        return get_redis_client() is not None


class _RedisAvailableProxy:
    def __bool__(self) -> bool:
        return get_redis_client() is not None


redis_client = _RedisProxy()
REDIS_AVAILABLE = _RedisAvailableProxy()


def get_cached(key: str) -> Any | None:
    """Get a value from Redis cache. Returns None if cache miss or Redis unavailable."""
    client = get_redis_client()
    if not client:
        return None
    try:
        val = client.get(key)
        return json.loads(val) if val else None
    except Exception as e:
        mark_redis_failure()
        logger.debug(f"Redis get error: {e}")
        return None


def set_cached(key: str, value: Any, ttl: int = 3600) -> None:
    """Set a value in Redis cache with TTL (seconds)."""
    client = get_redis_client()
    if not client:
        return
    try:
        client.setex(key, ttl, json.dumps(value, default=str))
    except Exception as e:
        mark_redis_failure()
        logger.debug(f"Redis set error: {e}")


def invalidate_user_cache(user_id: str) -> None:
    """
    Delete all cache keys for a specific user.
    Uses non-blocking SCAN instead of KEYS * to protect Redis production performance.
    """
    client = get_redis_client()
    if not client:
        return
    try:
        pattern = f"*:{user_id}*"
        # Non-blocking scan iterator
        keys_to_delete = []
        for key in client.scan_iter(match=pattern, count=100):
            keys_to_delete.append(key)
            if len(keys_to_delete) >= 100:
                client.delete(*keys_to_delete)
                keys_to_delete.clear()
        if keys_to_delete:
            client.delete(*keys_to_delete)
    except Exception as e:
        mark_redis_failure()
        logger.debug(f"Redis cache invalidation error: {e}")
