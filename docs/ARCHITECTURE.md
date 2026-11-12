# Architecture

## Overview

LifeLens AI is an AI-powered life tracking and behavioral intelligence application built with Expo (SDK 58) and React Native using TypeScript, connected to a FastAPI backend powered by Google Gemini AI. The application runs natively in Expo Go during development and does not require custom native modules or development builds.

## Technology Stack

### Mobile Frontend

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | Expo | ^58.0.24 |
| UI Library | React Native | 0.88.1 |
| Language | TypeScript | ~5.9.3 |
| Navigation | Expo Router | ~58.0.31 |
| Animations | React Native Reanimated | ^3.16.1 |
| Icons | @expo/vector-icons | ^14.0.4 (Ionicons) |
| Styling | React Native StyleSheet with Centralized Tokens | Standard |

### Backend & AI

| Layer | Technology | Description |
|-------|------------|-------------|
| Framework | FastAPI | 0.111.0 Async REST API |
| AI Integration | Google Gemini API | REST service via `GeminiService` using `gemini-1.5-flash` |
| Verification & Tests | Pytest | 275 unit, regression & guardrail tests |
| Data Layer | SQLAlchemy 2.0 + SQLite / PostgreSQL | Async ORM persistence |
| Session & Rate Cache | Redis | Invalidation and token version caching |

## Application Structure

```
lifelens/
├── app/                        # Expo Router routes
│   ├── _layout.tsx             # Root layout (Stack + Auth context)
│   ├── login.tsx               # Sign In route
│   ├── signup.tsx              # Registration route
│   ├── chat.tsx                # LifeLens AI Assistant (Gemini) route
│   ├── (tabs)/                 # Tab navigation group
│   │   ├── _layout.tsx         # Floating bottom bar (Home, Log, Insights, Profile)
│   │   ├── home.tsx            # Consolidated Life Dashboard (First Screen)
│   │   ├── new-entry.tsx       # Daily Manual Entry
│   │   ├── insights.tsx        # AI Insights & Anomalies
│   │   ├── settings.tsx        # Settings & Biometrics Profile
│   │   ├── history.tsx         # Historical timeline logs
│   │   └── analytics.tsx       # Domain analytics & correlation matrix
│   ├── modal.tsx
│   └── +not-found.tsx
├── backend/
│   ├── app/
│   │   ├── ai/                 # Agent loop, deterministic synthesis, guardrails
│   │   ├── cache/              # Redis session and rate limit caches
│   │   ├── core/               # Configuration, security, JWT
│   │   ├── database/           # DB sessions and tables
│   │   ├── models/             # SQLAlchemy ORM models
│   │   ├── routers/            # FastAPI endpoints (auth, entries, assistant, telemetry)
│   │   └── services/           # Backend services:
│   │       └── gemini_service.py # Official Google Gemini AI service
│   └── tests/                  # 275 Pytest tests
├── src/
│   ├── components/
│   │   ├── dashboard/          # LifeStatsGrid, LifeScoreCard, TrendCard, AlertsModal
│   │   ├── telemetry/          # WorkoutModal, SleepTrackerModal, FocusTimerModal, TransactionModal, ScreenTimeModal
│   │   ├── assistant/          # ChatModal, ChatMessageBubble, VoiceModeModal
│   │   ├── briefings/          # DailyBriefingCard, MorningBriefingModal, WeeklyStoryModal
│   │   ├── navigation/         # FloatingTabBar (SDK 58 compatible)
│   │   └── ui/                 # Reusable Button, Card, Input, Text, Screen
│   ├── features/
│   │   ├── auth/               # Login, SignUp screens
│   │   └── dashboard/          # Types and mock fallbacks
│   ├── services/
│   │   └── api.ts              # Centralized API client
│   └── theme/
│       ├── colors.ts           # Color tokens
│       ├── spacing.ts          # Spacing tokens
│       ├── typography.ts       # Typography tokens
│       └── radius.ts           # Radius tokens
```

## Theme Architecture

### Color Tokens (`src/theme/colors.ts`)

| Token | Hex Value | Usage |
|-------|-----------|-------|
| `background` | `#111214` | Primary app canvas |
| `surface` | `#292C31` | Cards and secondary panels |
| `surfaceElevated` | `#3A3F45` | Floating bars, modals, highlighted cards |
| `border` | `#2A2D2F` | Subtle dividing lines and borders |
| `primary` | `#B8FF3D` | Neon lime accent (LifeLens green) |
| `textPrimary` | `#FFFFFF` | Primary headers and high-contrast labels |
| `textSecondary` | `#A8ACAE` | Metric units, timestamps, subtitles |
| `textMuted` | `#6F7476` | Inactive icons, subtle footnotes |

## Consolidated Life Dashboard Architecture

The primary first screen (`app/(tabs)/home.tsx`) presents a clean, consolidated view of the user's daily life telemetry:

1. **DashboardHeader**: Displays user avatar, greeting, interactive "Ask AI" Gemini pill button, and notification bell with an unread badge indicator.
2. **DailyBriefingCard**: Summarizes morning physiological readiness, recovery score, and day outlook.
3. **LifeScoreCard**: Displays the overall normalized composite Life Score (0-100), daily change delta, and domain progress bars (Health, Focus, Sleep, Mind).
4. **LifeStatsGrid**: 6 vital metric cards displaying:
   - **Daily Steps & Locomotion**: Step count vs goal (default 10,000), percentage progress bar, tap to open Workout modal.
   - **Sleep Duration & Circadian Quality**: Hours slept, 5-star quality rating, bedtime timestamp, tap to open Sleep Tracker modal.
   - **Productivity & Focus**: Deep work hours, completed tasks count, tap to open Focus Timer modal.
   - **Daily Spending & Expenses**: Total daily expenditure, primary merchant category, discretionary ratio, tap to open Transaction modal.
   - **Screen Time & Digital Habits**: Total screen hours, social media hours, late night flag, tap to open Screen Time modal.
   - **Subjective Wellbeing**: Mood rating (out of 10), energy stars, tap to open Daily Entry logger.
5. **TrendCard**: 7-day and 30-day score trajectories.
6. **Explore Quick Actions Hub**: Direct access cards to Log Today, Analytics, Insights, and History.

### Data Flow & Fallback Guarantee

```
Backend API (FastAPI) ───► getDashboardData() [api.ts] ───► Dashboard Screen
                                     │
                             (on network error)
                                     ▼
                           Offline Fallback Cache
```

- When telemetry data is missing, cards display `--` and a "+ Log" prompt.
- Fictional or synthetic statistics are NEVER displayed as real user telemetry.

## Gemini AI Integration Architecture

### Backend Service: `GeminiService`

- Located at `backend/app/services/gemini_service.py`.
- Authenticates with Google Generative Language REST API (`https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`).
- Reads configuration from `GEMINI_API_KEY` and `LLM_MODEL` (default: `gemini-1.5-flash`).
- **Telemetry Grounding**: Converts user biometrics, sleep, transactions, focus sessions, and journal entries into structured facts in the system prompt.
- **Strict Non-Hallucination Mandate**: The AI model is strictly instructed to reference verified data points and refrain from speculating when data is absent.
- **Resilience**: Enforces a 20-second timeout, handles 401/403/429 HTTP statuses, and falls back to deterministic rule-based synthesis without blocking user workflows.
- **Status Endpoint**: `GET /api/assistant/gemini/status` exposes `{ configured, provider, model, status }`.

## Testing & Quality Assurance

- **Frontend Tests**: 221 unit & integration tests passing (`npm test`).
- **TypeScript**: Complete zero-error type safety (`npm run typecheck`).
- **Linting**: Clean ESLint run (`npm run lint`).
- **Expo Web Production Bundling**: Export succeeds with 0 errors (`npm run build:web`).
- **Backend Tests**: 275 Pytest tests passing (`backend/.venv/bin/pytest backend/tests/ -v`).
