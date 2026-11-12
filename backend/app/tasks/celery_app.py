"""
Celery application setup for LifeLens AI.
Handles async ML pipeline execution.
"""

from celery import Celery
from app.config import get_settings

settings = get_settings()

celery_app = Celery(
    "lifelens",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.tasks.ml_tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_soft_time_limit=120,
    task_time_limit=180,
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    # Low-latency broker options so API dispatch never stalls HTTP requests
    broker_transport_options={
        "socket_timeout": 1.0,
        "socket_connect_timeout": 0.5,
        "max_retries": 1,
    },
    task_publish_retry=False,
    broker_connection_retry_on_startup=False,
)

# Periodic beat schedule
celery_app.conf.beat_schedule = {
    "daily-ml-refresh": {
        "task":     "app.tasks.ml_tasks.full_pipeline_for_all_users",
        "schedule": 86400,   # 24 hours
    },
    "morning-briefing-pregen": {
        "task":     "app.tasks.ml_tasks.pregenerate_morning_briefings_all_users",
        "schedule": 86400,   # Daily morning pre-generation
    },
    "weekly-review-pregen": {
        "task":     "app.tasks.ml_tasks.pregenerate_weekly_reviews_all_users",
        "schedule": 604800,  # 7 days (Sunday evening review)
    },
}
