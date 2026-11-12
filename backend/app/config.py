from pathlib import Path
from functools import lru_cache

try:
    from pydantic_settings import BaseSettings
except ImportError:
    class BaseSettings:  # type: ignore
        def __init__(self, **kwargs):
            for k, v in kwargs.items():
                setattr(self, k, v)

_BACKEND_DIR = Path(__file__).resolve().parent.parent
_ENV_FILE = _BACKEND_DIR / ".env"

_DEV_JWT_SECRET = "change-this-to-a-256-bit-random-string"
_DEV_WEBHOOK_SECRET = "lifelens_webhook_secret_key_2026"


class Settings(BaseSettings):
    """Application settings loaded from environment variables / .env file."""

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://lifelens:lifelens_secret@localhost:5432/lifelens_db"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Auth
    SECRET_KEY: str = _DEV_JWT_SECRET
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days

    # App
    ENVIRONMENT: str = "development"
    APP_NAME: str = "LifeLens AI"
    API_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # CORS
    FRONTEND_URL: str = "http://localhost:5173"

    # AI & LLM Companion Settings
    GEMINI_API_KEY: str | None = None
    OPENAI_API_KEY: str | None = None
    ANTHROPIC_API_KEY: str | None = None
    LLM_PROVIDER: str = "auto"
    LLM_MODEL: str = "gemini-1.5-pro"

    # Automated Ingestion & Webhooks
    FINANCIAL_WEBHOOK_SECRET: str = _DEV_WEBHOOK_SECRET

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Development/test may use the documented placeholder; any deployed
        # environment must supply real secrets explicitly.
        if self.ENVIRONMENT.lower() not in ("development", "testing", "test"):
            if self.SECRET_KEY in ("", _DEV_JWT_SECRET) or len(self.SECRET_KEY) < 32:
                raise ValueError(
                    "SECRET_KEY must be set to a random value of at least 32 characters "
                    "when ENVIRONMENT is not development/testing."
                )
            if self.FINANCIAL_WEBHOOK_SECRET in ("", _DEV_WEBHOOK_SECRET) or len(self.FINANCIAL_WEBHOOK_SECRET) < 32:
                raise ValueError(
                    "FINANCIAL_WEBHOOK_SECRET must be set to a random value of at least "
                    "32 characters when ENVIRONMENT is not development/testing."
                )

    model_config = {
        "env_file": (str(_ENV_FILE), ".env"),
        "env_file_encoding": "utf-8",
        "extra": "ignore"
    }


@lru_cache()
def get_settings() -> Settings:
    return Settings()
