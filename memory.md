# Project Memory

## Project Overview

LifeLens is a mobile application built with Expo and React Native using TypeScript. The application MUST be runnable directly through the Expo Go app during development.

## Current Status

**Phase:** Initial Setup  
**Date:** 2026-08-24  
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

## Project Structure

```
lifelens/
├── app/                    # Expo Router routes
│   ├── _layout.tsx
│   ├── index.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx
│   │   ├── index.tsx
│   │   └── two.tsx
│   ├── modal.tsx
│   └── +not-found.tsx
├── src/
│   ├── components/         # Reusable components
│   ├── features/           # Feature-specific code
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Library utilities
│   ├── services/           # API and external services
│   ├── constants/          # App constants
│   ├── types/              # TypeScript type definitions
│   └── utils/              # Utility functions
├── assets/                 # Static assets
├── docs/                   # Documentation
│   └── ARCHITECTURE.md
├── memory.md
├── skill.md
├── package.json
├── tsconfig.json
└── app.json
```

## Current Features

- Initial project structure
- Expo Router navigation with tabs
- TypeScript configuration (strict mode)
- ESLint configuration
- Prettier configuration
- Basic home screen with tabs

## In Progress

None

## Completed

- [x] Initial project setup with Expo + TypeScript
- [x] Configured Expo Router for navigation
- [x] Set up ESLint with TypeScript support
- [x] Set up Prettier for code formatting
- [x] Created src/ directory structure
- [x] Created documentation files (memory.md, skill.md, docs/ARCHITECTURE.md)
- [x] Verified Expo Go compatibility

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

## Dependencies

### Production Dependencies

| Package | Version | Purpose | Expo Go Compatible |
|---------|---------|---------|-------------------|
| expo | ~57.0.16 | Core Expo SDK | Yes |
| expo-router | ~57.0.16 | File-based navigation | Yes |
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

**Removed:** `react-native-worklets` (not required for basic functionality)

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

1. Build the first feature screen
2. Add authentication if needed
3. Set up API services
4. Add error handling and loading states
