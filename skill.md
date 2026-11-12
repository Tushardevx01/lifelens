# Agent Skills

## Project Rules

1. Before making changes, read `memory.md`, `skill.md`, and `docs/ARCHITECTURE.md`.
2. After making meaningful changes, update `memory.md`, `skill.md`, and `docs/ARCHITECTURE.md`.
3. The application MUST remain Expo Go compatible (Expo SDK 58 / React Native 0.88).
4. Do not introduce native dependencies that require custom prebuilds or development clients.
5. Store all third-party API keys (e.g., Google Gemini) exclusively on the backend; never expose them to React Native client code.
6. When data is missing, display `--` with a clear logging action. Never inject or display fake statistics as real user telemetry.

## Coding Standards

- Use TypeScript strictly across all frontend code (`npm run typecheck` must pass with 0 errors).
- Follow existing naming conventions and design token exports.
- Keep components focused and small; decompose complex dashboard logic into reusable feature cards.
- Centralize all API client endpoints and helper methods in `src/services/api.ts`.
- Ensure backend test coverage with pytest (`backend/.venv/bin/pytest backend/tests/ -v`).

## Design Language Rules

**LifeLens AI uses a dark/neon-green design system.**

### Colors (`src/theme/colors.ts`)
- Background: `#111214`
- Surface: `#292C31`
- Surface Elevated: `#3A3F45`
- Primary: `#B8FF3D` (neon lime-green)
- Text Primary: `#FFFFFF`
- Text Secondary: `#A8ACAE`
- Text Muted: `#6F7476`
- Border: `#2A2D2F`

### Design Principles
- Modern, minimal, premium fintech / health tech aesthetic.
- Numbers and metrics prominently displayed with high legibility.
- Flat cards with subtle 1px border strokes; avoid visual clutter and duplicate elements.
- Predictable navigation: every screen, modal, and sub-feature must be accessible in 1-2 taps from Home.

## Consolidated Life Dashboard Rules

- The first screen (`app/(tabs)/home.tsx`) must serve as a comprehensive life dashboard.
- Display the 6 core life telemetry domains via `LifeStatsGrid`:
  1. Steps & physical movement
  2. Sleep duration & circadian quality
  3. Productivity & deep work hours
  4. Daily spending & discretionary split
  5. Screen time & late-night app usage
  6. Subjective wellbeing (mood & energy)
- Each card must support direct interaction to open the corresponding tracking modal (`WorkoutModal`, `SleepTrackerModal`, `FocusTimerModal`, `TransactionModal`, `ScreenTimeModal`).
- Telemetry changes must trigger immediate dashboard data refresh via `loadData()`.

## Gemini AI Integration Rules

- Implement LLM functionality through the backend service `backend/app/services/gemini_service.py`.
- Configure model via `GEMINI_API_KEY` and `LLM_MODEL` in backend environment.
- Format structured lifestyle telemetry grounding with a strict non-hallucination mandate.
- Never forge or mock credentials; report unconfigured state as `awaiting_api_key` and fall back gracefully to deterministic rule-based synthesis.
- Enforce safety guardrails against medical diagnosis, crisis self-harm, and speculative financial advice.

## Expo Go Compatibility (SDK 58)

- All packages must be compatible with Expo SDK 58 and React 19.
- Verified compatible packages:
  - `expo` (^58.0.24)
  - `expo-router` (~58.0.31)
  - `react-native` (0.88.1)
  - `@expo/vector-icons`
  - `react-native-safe-area-context`
  - `expo-status-bar`
  - `expo-linear-gradient`
  - `expo-haptics`
  - `expo-secure-store`
