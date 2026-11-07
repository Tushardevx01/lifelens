"""
Shared constants for all ML modules in LifeLens AI.

Import MODELS_DIR from here — do NOT redefine it per-module.
Absolute path ensures the Celery worker (which may run from a different CWD)
always resolves to the correct /app/models directory.
"""
from pathlib import Path

# Resolves to:  <repo>/backend/models/
# Works whether running as:
#   - uvicorn (CWD = /app inside Docker)
#   - celery worker (CWD = /app inside Docker)
#   - pytest (CWD = /app/backend or wherever)
MODELS_DIR: Path = Path(__file__).resolve().parents[2] / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

