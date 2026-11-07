.PHONY: up up-d down build logs api-shell db-shell test migrate upgrade worker expo

# ── Docker (backend infra) ────────────────────────────────────────────────────

# Start all backend services (db, redis, api, worker, beat, seeder)
up:
	docker compose up --build

# Start detached
up-d:
	docker compose up --build -d

# Stop all services
down:
	docker compose down

# Rebuild without cache
build:
	docker compose build --no-cache

# Stream logs
logs:
	docker compose logs -f

# Shell into the API container
api-shell:
	docker compose exec api bash

# Connect to PostgreSQL
db-shell:
	docker compose exec db psql -U lifelens -d lifelens_db

# Run tests inside the api container
test:
	docker compose exec api pytest tests/ -v

# Run tests locally (requires venv with requirements installed)
test-local:
	cd backend && pytest tests/ -v

# Generate Alembic migration  —  usage: make migrate MSG="add foo table"
migrate:
	docker compose exec api alembic revision --autogenerate -m "$(MSG)"

# Apply all pending migrations
upgrade:
	docker compose exec api alembic upgrade head

# Celery worker locally
worker:
	cd backend && celery -A app.tasks.celery_app.celery_app worker --loglevel=info

# ── Expo frontend ─────────────────────────────────────────────────────────────

# Install Expo deps
install:
	npm install

# Start Expo dev server (mobile + web)
expo:
	npx expo start

# Web only
web:
	npx expo start --web

# Android
android:
	npx expo run:android

# iOS
ios:
	npx expo run:ios

