# Architecture

This document describes the system architecture and technical decisions for the LifeLens application.

## Application Architecture

```
UI
 ↓
Screens / Routes
 ↓
Components / Hooks
 ↓
Services
 ↓
API / External Services
 ↓
Backend / Database
```

## Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | Expo | ~57.0.16 |
| UI Library | React Native | 0.86.2 |
| Language | TypeScript | ~6.0.3 |
| Navigation | Expo Router | ~57.0.16 |
| Animations | React Native Reanimated | 4.5.1 |

## Project Structure

```
project-root/
│
├── app/                    # Expo Router routes
│   ├── _layout.tsx         # Root layout
│   ├── index.tsx           # Home screen
│   ├── (tabs)/             # Tab navigation group
│   │   ├── _layout.tsx     # Tab layout
│   │   ├── index.tsx       # First tab
│   │   └── two.tsx         # Second tab
│   ├── modal.tsx           # Modal screen
│   └── +not-found.tsx      # 404 screen
│
├── components/             # Reusable components
│   ├── ui/                 # UI primitives (Button, Input, etc.)
│   ├── common/             # Common components
│   └── layout/             # Layout components
│
├── hooks/                  # Custom React hooks
├── services/               # API and external services
├── lib/                    # Library utilities
├── utils/                  # Utility functions
├── types/                  # TypeScript type definitions
├── constants/              # App constants (colors, etc.)
├── config/                 # Configuration
├── assets/                 # Static assets (images, fonts)
├── docs/                   # Documentation
│
├── memory.md               # Project memory and decisions
├── skill.md                # AI agent working rules
├── ARCHITECTURE.md         # This file
├── AGENTS.md               # AI agent entry point
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
└── .env.example            # Environment variables template
```

## Navigation

### Routes

| Route | Screen | Description |
|-------|--------|-------------|
| `/` | index.tsx | Home screen |
| `/(tabs)/` | index.tsx | Tab 1 (Home) |
| `/(tabs)/two` | two.tsx | Tab 2 |
| `/modal` | modal.tsx | Modal screen |

### Route Groups

- `(tabs)` - Tab navigation group

### Protected Routes

None implemented yet.

### Public Routes

All routes are currently public.

### Deep Linking

Not implemented yet.

## State Management

**Approach:** React useState/useReducer (local state only)

No global state management library is currently in use. The application uses React's built-in state management capabilities.

If global state becomes necessary, evaluate:
- Zustand (recommended for simplicity)
- Jotai (for atomic state)
- Redux Toolkit (for complex state)

## Data Layer

### API Client

Not implemented yet.

### Request Handling

Not implemented yet.

### Response Handling

Not implemented yet.

### Caching

Not implemented yet.

### Persistence

Not implemented yet.

### Offline Behavior

Not implemented yet.

## Authentication

### Authentication Provider

Not implemented yet.

### Login Flow

Not implemented yet.

### Session Handling

Not implemented yet.

### Token Storage

Not implemented yet.

### Protected Routes

Not implemented yet.

### Logout Behavior

Not implemented yet.

## Component Architecture

### UI Components

Basic UI components from the template:
- `Themed.tsx` - Theme-aware components
- `StyledText.tsx` - Styled text component
- `ExternalLink.tsx` - External link component

### Feature Components

None implemented yet.

### Layout Components

Layout is handled by Expo Router:
- Root layout (`app/_layout.tsx`)
- Tab layout (`app/(tabs)/_layout.tsx`)

### Shared Components

Will be placed in `components/common/` and `components/ui/`.

## Error Handling

### API Requests

Not implemented yet.

### Screens

Basic error boundary provided by Expo Router.

### Forms

Not implemented yet.

### Authentication

Not implemented yet.

### Unexpected Application Failures

Handled by React's error boundary system.

## Configuration

### Environment Variables

See `.env.example` for required variables.

### TypeScript

Strict mode is enabled in `tsconfig.json`.

### ESLint

ESLint is configured with TypeScript support.

### Prettier

Prettier is configured for consistent code formatting.

## Build and Deployment

### Development

```bash
npm start          # Start Expo dev server
npm run android    # Start on Android
npm run ios        # Start on iOS
npm run web        # Start on web
```

### Production

Build process not configured yet.

## Security Considerations

- Environment variables are used for sensitive configuration
- `.env` files are gitignored
- No secrets are committed to the repository

## Performance Considerations

- React Native Reanimated is used for smooth animations
- React Native Screens provides native screen optimization
- Expo provides optimized builds for production

## Testing

Testing framework not configured yet.

## Documentation

- `memory.md` - Project history and decisions
- `skill.md` - AI agent working rules
- `ARCHITECTURE.md` - This file
- `AGENTS.md` - AI agent entry point
