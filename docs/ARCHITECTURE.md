# Architecture

## Overview

LifeLens is a mobile application built with Expo and React Native using TypeScript. The application is designed to run in Expo Go during development and does not require custom native modules or development builds.

## Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | Expo | ~57.0.16 |
| UI Library | React Native | 0.86.2 |
| Language | TypeScript | ~6.0.3 |
| Navigation | Expo Router | ~57.0.16 |
| Animations | React Native Reanimated | 4.5.1 |
| Styling | React Native StyleSheet | Standard |

## Application Structure

```
lifelens/
├── app/                    # Expo Router routes
│   ├── _layout.tsx         # Root layout
│   ├── index.tsx           # Home screen
│   ├── (tabs)/             # Tab navigation group
│   │   ├── _layout.tsx     # Tab layout
│   │   ├── index.tsx       # First tab
│   │   └── two.tsx         # Second tab
│   ├── modal.tsx           # Modal screen
│   └── +not-found.tsx      # 404 screen
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
│   └── ARCHITECTURE.md     # This file
├── memory.md               # Project memory
├── skill.md                # AI agent rules
├── package.json
├── tsconfig.json
└── app.json
```

## Navigation Architecture

### Routes

| Route | Screen | Description |
|-------|--------|-------------|
| `/` | index.tsx | Home screen |
| `/(tabs)/` | index.tsx | Tab 1 (Home) |
| `/(tabs)/two` | two.tsx | Tab 2 |
| `/modal` | modal.tsx | Modal screen |

### Route Groups

- `(tabs)` - Tab navigation group for main app screens

### Navigation Pattern

Expo Router uses file-based routing. The navigation structure is defined by the file system:

- `app/_layout.tsx` - Root layout with Stack navigator
- `app/(tabs)/_layout.tsx` - Tab layout for main screens
- `app/modal.tsx` - Modal presentation

## Component Architecture

### UI Components

Located in `src/components/`:

- `Themed.tsx` - Theme-aware components (Text, View)
- `StyledText.tsx` - Styled text component
- `ExternalLink.tsx` - External link component
- `EditScreenInfo.tsx` - Edit screen info component

### Feature Components

Will be placed in `src/features/` as features are developed.

### Layout Components

Layout is handled by Expo Router:
- Root layout (`app/_layout.tsx`)
- Tab layout (`app/(tabs)/_layout.tsx`)

## State Management

**Approach:** React useState/useReducer (local state only)

No global state management library is currently in use. The application uses React's built-in state management capabilities.

### Future Considerations

If global state becomes necessary, evaluate:
- Zustand (recommended for simplicity)
- Jotai (for atomic state)
- React Context (for shared state)

Document any state management changes in this file.

## Data Flow

```
UI Components
    ↓
Custom Hooks
    ↓
Services (API calls)
    ↓
External APIs
```

## API Architecture

Not implemented yet. When implemented:

- API calls will be in `src/services/`
- Environment variables for API URLs
- Error handling in services layer

## Authentication

Not implemented yet. When implemented:

- Authentication flow in `src/services/auth.ts`
- Token storage using Expo SecureStore
- Protected routes in Expo Router

## Storage

Not implemented yet. When implemented:

- Expo SecureStore for sensitive data
- AsyncStorage for non-sensitive data
- Document storage for files

## Environment Configuration

Environment variables are managed through `.env` files:

```
EXPO_PUBLIC_API_URL=
```

See `.env.example` for required variables.

## Error Handling

### Current Approach

- React Error Boundaries for component errors
- Try-catch for async operations
- Expo Router error boundaries

### Future Enhancements

- Global error handling service
- Error reporting integration
- User-friendly error messages

## Security

- No secrets committed to repository
- Environment variables for sensitive configuration
- Expo Go compatible (no custom native modules)
- No hard-coded credentials

## Expo Go Compatibility

**CRITICAL:** This project MUST remain Expo Go compatible.

### Compatible Packages

All current dependencies are Expo Go compatible:
- expo (core)
- expo-router
- react-native-reanimated
- react-native-safe-area-context
- react-native-screens

### Restrictions

Do NOT add:
- Custom native modules
- Packages requiring `expo prebuild`
- Packages requiring a custom development client
- Arbitrary Android/iOS native code

If a feature requires native code, STOP and explain the limitation.

## Future Architecture Considerations

1. **Feature Organization** - As features grow, organize code by feature in `src/features/`
2. **State Management** - Evaluate if global state management is needed
3. **API Layer** - Implement proper API service layer
4. **Authentication** - Add authentication when needed
5. **Testing** - Add testing framework when needed
6. **Performance** - Optimize for production when needed

## Documentation

- `memory.md` - Project history and decisions
- `skill.md` - AI agent working rules
- `docs/ARCHITECTURE.md` - This file
