# LifeLens AI

> An intelligent, autonomous life-analytics ecosystem and AI life coach. LifeLens consolidates multi-domain telemetry—sleep, daily activity, focus sessions, screen time, financial expenditures, and subjective mood—into a single actionable Life Score and daily executive briefings powered by Google Gemini AI.

---

## Architecture Overview

LifeLens AI is built with a decoupled client-server architecture:

```
lifelens/
├── backend/              # Python 3.12 FastAPI backend
│   ├── app/              # FastAPI application (routers, services, ML, DB models)
│   ├── migrations/       # Alembic migrations
│   ├── notebooks/        # Data exploration, notebooks & sample datasets
│   ├── tests/            # 277 Pytest unit & integration tests
│   ├── Dockerfile        # Container specification
│   ├── requirements.txt  # Python package dependencies
│   └── seed_sample_data.py # 35-day synthetic life data generator
├── docs/                 # Engineering documentation & architecture specifications
│   ├── ARCHITECTURE.md   # System topology and domain architecture
│   ├── COMPLETION_REPORT.md # Production delivery & verification logs
│   ├── DECISIONS.md      # Engineering decisions log
│   ├── DEVICE_SETUP.md   # Wireless ADB & mobile device deployment guide
│   ├── ROADMAP.md        # Feature roadmap & future enhancements
│   ├── SKILL_SPEC.md     # Agent skills and capabilities
│   └── openapi.json      # OpenAPI 3.1 schema specification
├── frontend/             # React Native / Expo (SDK 58) Mobile & Web Application
│   ├── app/              # Expo Router filesystem routes & layouts
│   ├── assets/           # Static fonts, vectors, brand icons
│   ├── src/              # Modular application source code (components, theme, services, utils)
│   ├── test/             # 239 Node/Jest unit & regression test suites
│   ├── package.json      # Frontend dependencies & scripts
│   └── app.json          # Expo configuration manifest
├── docker-compose.yml    # Multi-container orchestration (FastAPI + Postgres + Redis)
├── Makefile              # Developer shortcuts for backend and frontend
├── package.json          # Root monorepo script runner
└── README.md             # Project documentation
```

---

## Quick Start: How to Run the Backend

The backend can be run in two modes:

### Option A: Local Python Virtual Environment (Recommended for Fast Local Dev)

Zero external database installations required. Uses SQLite (`lifelens.db`) automatically out of the box.

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Activate the virtual environment:**
   ```bash
   source .venv/bin/activate
   ```
   *(If creating a new virtual environment: `python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`)*

3. **Verify the environment variables in `backend/.env`:**
   ```env
   DATABASE_URL=sqlite+aiosqlite:///./lifelens.db
   REDIS_URL=redis://localhost:6379/0
   SECRET_KEY=change-this-to-a-256-bit-random-string
   ENVIRONMENT=development
   GEMINI_API_KEY=your_gemini_api_key_here
   LLM_MODEL=gemini-3.1-flash-lite
   ```

4. **Start the FastAPI server:**
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

5. **(Optional) Seed 35 Days of Realistic Demo Data:**
   In another terminal, populate the database with synthetic data, life scores, and trained ML models:
   ```bash
   cd backend
   .venv/bin/python seed_sample_data.py
   ```

6. **Access Interactive Documentation:**
   - Swagger / OpenAPI UI: [http://localhost:8000/docs](http://localhost:8000/docs)
   - ReDoc UI: [http://localhost:8000/redoc](http://localhost:8000/redoc)
   - Healthcheck: [http://localhost:8000/health](http://localhost:8000/health)

---

### Option B: Docker Compose (Full Stack with PostgreSQL & Redis)

Runs PostgreSQL 16, Redis 7, FastAPI (Uvicorn), and Celery workers:

1. **Start all services:**
   ```bash
   docker compose up --build
   # Or using Makefile:
   make up
   ```

2. **Run in detached mode:**
   ```bash
   docker compose up -d
   # Or using Makefile:
   make up-d
   ```

3. **Stop all services:**
   ```bash
   docker compose down
   # Or using Makefile:
   make down
   ```

---

## Quick Start: How to Run the Frontend

The mobile app runs on Expo SDK 58 inside the `frontend/` directory.

1. **Install dependencies:**
   ```bash
   cd frontend && npm install
   # Or from root:
   make install
   ```

2. **Configure your API endpoint in `frontend/.env`:**
   ```env
   EXPO_PUBLIC_API_URL=http://localhost:8000
   ```
   *(If testing on a physical phone via Expo Go, replace `localhost` with your computer's local Wi-Fi IP address, e.g., `http://10.0.60.227:8000`).*

3. **Start the Metro Bundler:**
   ```bash
   cd frontend
   npm start
   # Or directly from root:
   npm start
   ```
   - Press **`w`** to open in web browser.
   - Press **`a`** to open in Android Emulator / connected device.
   - Scan the terminal QR code with the **Expo Go** app on your phone.

---

## Automated Verification & Tests

Both frontend and backend include comprehensive test suites:

| Suite | Command | Details |
|---|---|---|
| **Frontend Tests** | `npm test` | **239 tests passing** across 35 suites |
| **Frontend Typecheck** | `npm run typecheck` | **0 errors** (`tsc --noEmit`) |
| **Frontend Linter** | `npm run lint` | **0 errors, 0 warnings** (`eslint .`) |
| **Frontend Web Build** | `npm run build:web` | Exports production web bundle cleanly |
| **Backend Tests** | `cd backend && pytest tests/ -v` | **277 Pytest tests passing** with SQLite / Postgres |

---

## Design System

The application features a warm, minimal, and premium editorial visual identity:

- **Canvas Background:** `#F7F1EF` (Soft warm off-white)
- **Primary Surface:** `#FFFFFF` (Clean elevated card)
- **Secondary Surface:** `#F1E8E3` (Subtle warm beige)
- **Primary Accent:** `#FFB98E` (Warm peach / pastel orange)
- **Dark Button:** `#66300C` (Dark roast espresso)
- **Typography:** Dark charcoal `#242424`, `#85817F` secondary, `#AAA4A1` muted.

---

## License

This project is licensed under the MIT License - see the [LICENSE](file:///home/tushardevx01/Documents/lifelens/LICENSE) file for details.
