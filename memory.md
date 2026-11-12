# Project Memory

## Project Overview

LifeLens AI is a premier holistic life-tracking and behavioral telemetry mobile application built with React Native and Expo (SDK 58). It tracks 6 core domains: physical movement & steps, circadian rhythm & sleep, focused deep work, personal finance, digital screen time, and subjective wellbeing. It includes an official backend integration with Google Gemini AI for behavioral synthesis, lifestyle telemetry grounding, and predictive recovery intelligence.

The application MUST remain runnable directly through the Expo Go app during development with zero custom native binaries.

## Current Status

**Phase:** Consolidated Life Dashboard & Gemini AI Integration  
**Date:** 2026-11-12  
**Version:** 1.0.0  
**Expo SDK:** SDK 58 (Expo Go compatible)  
**React / React Native:** React 19.3.0, React Native 0.88.1  
**TypeScript:** 5.9.3 (0 errors in `npm run typecheck`)  
**Backend:** FastAPI, Python 3.12 (275 tests passing)  
**Frontend Tests:** 221 tests passing  
**Expo Go Compatible:** Yes (SDK 58 compatible, tested with web build and unit tests)  

## Tech Stack

- **Mobile Framework:** Expo ^58.0.24, Expo Router ~58.0.31
- **Runtime:** React 19.3.0, React Native 0.88.1
- **Type Checking:** TypeScript ~5.9.3 (`npm run typecheck` clean)
- **Code Quality:** ESLint ^9.39.5, Prettier ^3.9.6
- **Icons:** `@expo/vector-icons` (Ionicons)
- **Backend API:** FastAPI 0.111.0, Pydantic 2.7.1, SQLAlchemy 2.0.30
- **AI Engine:** Google Gemini REST API (`generativelanguage.googleapis.com`), `GeminiService` with grounded lifestyle telemetry and strict guardrails
- **Database / Cache:** PostgreSQL + SQLite (test), Redis 5.0.4

## Project Structure

```
lifelens/
├── app/                        # Expo Router routes
│   ├── _layout.tsx             # Root layout (Stack & Auth wrapper)
│   ├── login.tsx               # Login screen
│   ├── signup.tsx              # SignUp screen
│   ├── chat.tsx                # LifeLens AI Assistant (Gemini) chat screen
│   ├── (tabs)/                 # Main tab navigation
│   │   ├── _layout.tsx         # Floating bottom navigation
│   │   ├── home.tsx            # Consolidated First Screen Life Dashboard
│   │   ├── new-entry.tsx       # Daily manual journal / logging
│   │   ├── insights.tsx        # AI Insights & Behavioral anomalies
│   │   ├── settings.tsx        # Profile & configuration
│   │   ├── history.tsx         # Historical timeline
│   │   └── analytics.tsx       # Domain analytics & correlation matrix
│   ├── modal.tsx
│   └── +not-found.tsx
├── backend/
│   ├── app/
│   │   ├── ai/                 # Agent loop, guardrails, epistemic filters
│   │   ├── cache/              # Redis session and rate limit caches
│   │   ├── core/               # App configuration & settings
│   │   ├── database/           # Database session and models
│   │   ├── models/             # SQLAlchemy ORM models
│   │   ├── routers/            # FastAPI route controllers
│   │   └── services/           # Backend services:
│   │       ├── gemini_service.py # Official Google Gemini AI service
│   │       └── ...
│   └── tests/                  # 275 pytest unit/integration tests
├── src/
│   ├── components/
│   │   ├── dashboard/          # LifeStatsGrid, LifeScoreCard, TrendCard, AlertsModal
│   │   ├── telemetry/          # WorkoutModal, SleepTrackerModal, FocusTimerModal, TransactionModal, ScreenTimeModal
│   │   ├── assistant/          # ChatModal, ChatMessageBubble, VoiceModeModal
│   │   ├── briefings/          # DailyBriefingCard, MorningBriefingModal, WeeklyStoryModal
│   │   ├── navigation/         # FloatingTabBar (SDK 58 compatible)
│   │   └── ui/                 # Reusable Button, Card, Input, Text, Screen
│   ├── services/
│   │   ├── api.ts              # Centralized API client (Dashboard, Assistant, Telemetry)
│   │   └── ...
│   └── theme/                  # Theme tokens (colors, spacing, radius, typography)
```

## Consolidated Life Dashboard (First Screen)

The home screen (`app/(tabs)/home.tsx`) serves as the single command center for daily status:
1. **DashboardHeader:** Displays member greeting, current date, direct "Ask AI" Gemini trigger, and interactive lifestyle notification bell with unread badge.
2. **DailyBriefingCard:** Morning recovery score, circadian delta, and focus highlights with weekly review triggers.
3. **LifeScoreCard:** Overall composite score (0-100), daily delta, and 4 domain breakdown progress bars (Health, Focus, Sleep, Mind).
4. **LifeStatsGrid:** 6 vital metric cards displaying:
   - *Daily Steps & Movement:* Step count against goal (default 10k), progress bar, tap to open Workout modal.
   - *Sleep Duration & Quality:* Sleep hours, quality stars (1-5), recorded bedtime, tap to open Sleep Tracker modal.
   - *Productivity & Focus:* Deep work hours, completed tasks, focus rating, tap to open Focus Timer modal.
   - *Spending & Expenses:* Total spend, primary category, discretionary percentage, tap to open Transaction modal.
   - *Screen Time & Habits:* Total screen time hours, social media hours, late night flag, tap to open Screen Time modal.
   - *Subjective Wellbeing:* Mood rating (/10), energy level stars (/5), reflection presence, tap to open daily logger.
   - *Missing Data Handling:* Displays clean `--` and prompt pills (`+ Log`) when data has not yet been recorded. Never invents synthetic numbers.
5. **TrendCard:** Interactive 7-day / 30-day sparkline score trajectory.
6. **Explore Navigation Hub:** 4 clean quick-access cards leading to Log Today, Analytics, Insights, and History.

## Gemini AI Integration Architecture

- **Backend Service:** `backend/app/services/gemini_service.py` (`GeminiService`)
- **Key Configuration:** Reads `GEMINI_API_KEY` and `LLM_MODEL` (defaults to `gemini-1.5-flash`) from environment. Secure on backend; never exposed to React Native client.
- **Grounding Pipeline:** Formats verified telemetry (sleep, steps, active minutes, spending, deep work, mood, energy) into system instructions with an epistemic non-hallucination constraint.
- **Reliability & Timeouts:** Implements a strict 20s timeout, non-blocking fallback to deterministic synthesis, HTTP status code inspection (401, 403, 429), and streaming support.
- **Status Endpoint:** `GET /api/assistant/gemini/status` returns `{ configured, provider, model, status }`.
- **Honest Telemetry Policy:** If `GEMINI_API_KEY` is not provided, reports status as `awaiting_api_key` and provides deterministic telemetry synthesis without simulating or claiming fake credentials.

## QA Verification Results

- **TypeScript:** 0 errors (`npm run typecheck`)
- **ESLint:** 0 errors (`npm run lint`)
- **Frontend Unit & Integration Tests:** 221 tests passing (`npm test`)
- **Expo Web Production Export:** Build completed with 0 errors (`npm run build:web`)
- **Backend Test Suite:** 275 tests passing in 12.31s (`backend/.venv/bin/pytest backend/tests/ -v`)
