# Project Memory

## Project Overview

LifeLens AI is a mobile application built with Expo and React Native using TypeScript. The application MUST be runnable directly through the Expo Go app during development.

## Current Status

**Phase:** Dashboard Implementation  
**Date:** 2026-08-26  
**Version:** 1.0.0  
**Expo Go Compatible:** Yes

## Tech Stack

- Expo ~57.0.16
- React Native 0.86.2
- React 19.2.3
- TypeScript ~6.0.3
- Expo Router ~57.0.16
- ESLint ^9.39.5
- Prettier ^3.9.6
- @expo/vector-icons (icons)

## Project Structure

```
lifelens/
├── app/                        # Expo Router routes
│   ├── _layout.tsx             # Root layout (Stack)
│   ├── login.tsx               # Login screen route
│   ├── signup.tsx              # SignUp screen route
│   ├── (tabs)/                 # Tab navigation group
│   │   ├── _layout.tsx         # Tab layout (4 tabs)
│   │   ├── index.tsx           # Dashboard (main screen)
│   │   ├── new-entry.tsx       # New Entry placeholder
│   │   ├── history.tsx         # History placeholder
│   │   └── settings.tsx        # Settings placeholder
│   ├── modal.tsx
│   └── +not-found.tsx
├── src/
│   ├── components/
│   │   ├── ui/                 # Reusable UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Screen.tsx
│   │   │   ├── Text.tsx
│   │   │   └── index.ts
│   │   ├── dashboard/          # Dashboard-specific components
│   │   │   ├── DashboardHeader.tsx
│   │   │   ├── InsightCard.tsx
│   │   │   ├── LifeScoreCard.tsx
│   │   │   ├── ScoreBreakdown.tsx
│   │   │   ├── LifeScoreTrend.tsx
│   │   │   ├── ProductivityPrediction.tsx
│   │   │   ├── InsightsList.tsx
│   │   │   ├── BehaviouralClusters.tsx
│   │   │   ├── Correlations.tsx
│   │   │   ├── AnomalyAlerts.tsx
│   │   │   ├── DashboardSkeleton.tsx
│   │   │   ├── DashboardEmpty.tsx
│   │   │   ├── DashboardError.tsx
│   │   │   └── index.ts
│   │   └── navigation/
│   │       └── BottomNavigation.tsx
│   ├── features/
│   │   ├── auth/
│   │   │   ├── LoginScreen.tsx
│   │   │   ├── SignUpScreen.tsx
│   │   │   └── index.ts
│   │   └── dashboard/
│   │       ├── dashboard.types.ts
│   │       ├── dashboard.data.ts
│   │       ├── dashboard.utils.ts
│   │       └── index.ts
│   ├── hooks/
│   ├── theme/
│   │   ├── colors.ts
│   │   ├── spacing.ts
│   │   ├── typography.ts
│   │   ├── radius.ts
│   │   └── index.ts
│   ├── constants/
│   ├── services/
│   ├── types/
│   └── utils/
├── assets/
├── docs/
│   └── ARCHITECTURE.md
├── memory.md
├── skill.md
├── package.json
├── tsconfig.json
└── app.json
```

## Current Features

- Global dark/neon-green theme system
- Reusable UI components (Button, Input, Card, Text, Screen)
- Login screen with:
  - LifeLens AI branding (heart + pulse icon)
  - Welcome Back card
  - Explore Live Demo button
  - Email/Password inputs with icons
  - Show/hide password toggle
  - Forgot password link
  - Sign In button with loading/disabled states
  - Register link
  - Entrance animations
  - Keyboard handling
- SignUp screen with:
  - Full Name, Email, Password, Confirm Password inputs
  - Password mismatch validation
  - Terms of Service links
  - Sign Up button
  - Sign In link
- Dashboard with:
  - DashboardHeader (branding, date, notification icon)
  - InsightCard (expandable daily insight)
  - LifeScoreCard (overall score with category breakdown)
  - ScoreBreakdown (animated progress bars)
  - LifeScoreTrend (bar chart with timeframe selector)
  - ProductivityPrediction (AI prediction card)
  - InsightsList (insight summaries)
  - BehaviouralClusters (status badges)
  - Correlations (correlation cards)
  - AnomalyAlerts (warning alerts)
  - DashboardSkeleton (loading state)
  - DashboardEmpty (empty state)
  - DashboardError (error state)
- Bottom tab navigation (Dashboard, New Entry, History, Settings)
- Dark status bar

## In Progress

None

## Completed

- [x] Initial project setup with Expo + TypeScript
- [x] Configured Expo Router for navigation
- [x] Set up ESLint with TypeScript support
- [x] Set up Prettier for code formatting
- [x] Created src/ directory structure
- [x] Created documentation files
- [x] Verified Expo Go compatibility
- [x] Created global theme system (colors, spacing, typography, radius)
- [x] Created reusable UI components
- [x] Built login screen with all required sections
- [x] Built signup screen with all required sections
- [x] Set up navigation (login as initial route)
- [x] Added entrance animations
- [x] Added keyboard handling
- [x] Added @expo/vector-icons for icons
- [x] Updated all screens to use dark theme
- [x] TypeScript and ESLint validation passed
- [x] Built dashboard with 10+ sections
- [x] Created dashboard component architecture
- [x] Added bottom tab navigation
- [x] Added loading, empty, and error states
- [x] Added mock data architecture
- [x] Added dashboard animations
- [x] Premium mobile visual redesign
- [x] New typography system
- [x] New dark color system
- [x] Floating navigation
- [x] Card architecture
- [x] Current dashboard structure

## Known Issues

None at this time.

## Important Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Framework | Expo + React Native | Cross-platform mobile development, Expo Go compatibility |
| Language | TypeScript | Type safety and better developer experience |
| Navigation | Expo Router | File-based routing, works with Expo Go |
| Styling | React Native StyleSheet | Standard styling system, Expo Go compatible |
| State Management | React useState/useReducer | Simple, no additional dependencies needed |
| Directory Structure | src/ layout | Separates app routes from source code |
| Theme | Centralized theme system | Consistent design tokens, easy to maintain |
| Icons | @expo/vector-icons | Expo Go compatible, no native modules needed |
| Design Language | Dark + Neon Green | Premium, modern, AI-focused aesthetic |

## Design Tokens

### Colors

| Token | Value | Usage |
|-------|-------|-------|
| background | #080908 | App background |
| surface | #111311 | Card backgrounds |
| surfaceSecondary | #171917 | Secondary surfaces |
| border | #292D29 | Borders |
| primary | #B8FF00 | Neon green accent |
| primaryBright | #C8FF2C | Bright accent |
| primaryMuted | rgba(184, 255, 0, 0.15) | Subtle green |
| text | #F5F5F5 | Primary text |
| textSecondary | #929792 | Secondary text |
| textMuted | #5F645F | Muted text |

### Spacing

xs(4), sm(8), md(12), lg(16), xl(20), xxl(24), xxxl(32), xxxxl(40), xxxxxl(48)

### Radius

sm(6), md(10), lg(14), xl(18), xxl(24), full(9999)

## Dependencies

### Production Dependencies

| Package | Version | Purpose | Expo Go Compatible |
|---------|---------|---------|-------------------|
| expo | ~57.0.16 | Core Expo SDK | Yes |
| expo-router | ~57.0.16 | File-based navigation | Yes |
| expo-vector-icons | latest | Icons | Yes |
| react | 19.2.3 | React library | Yes |
| react-native | 0.86.2 | React Native framework | Yes |
| react-native-reanimated | 4.5.1 | Animations | Yes |
| react-native-safe-area-context | ~5.7.0 | Safe area handling | Yes |
| react-native-screens | ~4.26.0 | Native screen optimization | Yes |

### Dev Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| typescript | ~6.0.3 | TypeScript compiler |
| eslint | ^9.39.5 | Code linting |
| prettier | ^3.9.6 | Code formatting |
| @typescript-eslint/eslint-plugin | ^8.67.0 | TypeScript ESLint rules |
| @typescript-eslint/parser | ^8.67.0 | TypeScript ESLint parser |
| eslint-config-expo | ^57.0.1 | Expo ESLint config |
| eslint-plugin-react | ^7.37.5 | React ESLint rules |
| eslint-plugin-react-hooks | ^7.1.1 | React hooks ESLint rules |

## Environment Variables

Required environment variables (see `.env.example`):

```
EXPO_PUBLIC_API_URL=
```

## Expo Go Compatibility

All dependencies in this project are compatible with Expo Go. No custom native modules or development builds are required.

## Commands

```bash
# Development
npm start              # Start Expo dev server
npm run android        # Start on Android
npm run ios            # Start on iOS
npm run web            # Start on web

# Code Quality
npm run lint           # Run ESLint
npm run lint:fix       # Fix ESLint issues
npm run format         # Format code with Prettier
npm run format:check   # Check formatting
npm run typecheck      # Run TypeScript compiler
```

## Last Changes

### 2026-08-26 (Dashboard)

- Created dashboard feature structure (types, mock data, utils)
- Created 13 dashboard components (Header, InsightCard, LifeScoreCard, ScoreBreakdown, LifeScoreTrend, ProductivityPrediction, InsightsList, BehaviouralClusters, Correlations, AnomalyAlerts, Skeleton, Empty, Error)
- Created BottomNavigation component with 4 tabs
- Built main Dashboard screen with all sections
- Set up (tabs) route group with bottom tabs
- Created placeholder routes (new-entry, history, settings)
- Added loading, empty, and error states
- Added mock data architecture
- Added dashboard animations (staggered fade-in)
- TypeScript and ESLint validation passed

### 2026-08-26 (Auth)

- Created global theme system (colors, spacing, typography, radius)
- Created reusable UI components (Button, Input, Card, Text, Screen)
- Built login screen with all required sections
- Built signup screen with all required sections
- Set up navigation with login as initial route
- Added entrance animations using React Native Animated API
- Added keyboard handling with KeyboardAvoidingView
- Added @expo/vector-icons for icons (heart, pulse, mail, lock, eye, etc.)
- Updated all screens to use dark/neon-green theme
- Created dashboard and analytics placeholder screens
- Updated documentation

### 2026-08-24

- Initial project setup with Expo + TypeScript
- Configured Expo Router for navigation
- Set up ESLint with TypeScript support
- Set up Prettier for code formatting
- Created src/ directory structure
- Created documentation files (memory.md, skill.md, docs/ARCHITECTURE.md)
- Removed react-native-worklets for Expo Go compatibility
- Verified all dependencies are Expo Go compatible

## Next Recommended Steps

1. Implement real authentication flow
2. Add forgot password screen
3. Connect dashboard to real API
4. Implement new entry screen
5. Implement history screen
6. Implement settings screen
7. Add data persistence
8. Add push notifications
