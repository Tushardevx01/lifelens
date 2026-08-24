# Project Memory

## Project Purpose

LifeLens is a mobile application built with Expo and React Native using TypeScript.

## Current Status

**Phase:** Initial Setup  
**Date:** 2026-08-24  
**Version:** 1.0.0

## Implemented Features

- [x] Initial project structure
- [x] Expo Router navigation setup
- [x] TypeScript configuration
- [x] ESLint configuration
- [x] Prettier configuration
- [x] Environment variable support

## Planned Features

- Feature 1: TBD
- Feature 2: TBD
- Feature 3: TBD

## Technical Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Framework | Expo + React Native | Cross-platform mobile development |
| Language | TypeScript | Type safety and better developer experience |
| Navigation | Expo Router | File-based routing, SEO-friendly |
| Linting | ESLint | Industry standard for JavaScript/TypeScript |
| Formatting | Prettier | Consistent code formatting |

## Dependencies

### Production Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| expo | ~57.0.16 | Core Expo SDK |
| expo-router | ~57.0.16 | File-based navigation |
| react | 19.2.3 | React library |
| react-native | 0.86.2 | React Native framework |
| react-native-reanimated | 4.5.1 | Animations |
| react-native-safe-area-context | ~5.7.0 | Safe area handling |
| react-native-screens | ~4.26.0 | Native screen optimization |

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

## Navigation Structure

```
app/
├── _layout.tsx          # Root layout
├── index.tsx            # Home/landing screen
├── (tabs)/
│   ├── _layout.tsx      # Tab layout
│   ├── index.tsx        # First tab (home)
│   └── two.tsx          # Second tab
├── modal.tsx            # Modal screen
└── +not-found.tsx       # 404 screen
```

## Important Commands

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

## Environment Configuration

Required environment variables (see `.env.example`):

```
EXPO_PUBLIC_API_URL=
```

## Known Issues

None at this time.

## Known Limitations

None at this time.

## Recent Changes

### 2026-08-24

- Initial project setup with Expo + TypeScript
- Configured Expo Router for navigation
- Set up ESLint with TypeScript support
- Set up Prettier for code formatting
- Created project directory structure (hooks, services, lib, utils, types, config, docs)
- Created documentation files (memory.md, skill.md, ARCHITECTURE.md, AGENTS.md)
- Added npm scripts for linting, formatting, and type checking
- Verified project with type checking and linting (1 warning, 0 errors)
