# Architecture

## Overview

LifeLens AI is a mobile application built with Expo and React Native using TypeScript. The application is designed to run in Expo Go during development and does not require custom native modules or development builds.

## Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | Expo | ~57.0.16 |
| UI Library | React Native | 0.86.2 |
| Language | TypeScript | ~6.0.3 |
| Navigation | Expo Router | ~57.0.16 |
| Animations | React Native Reanimated | 4.5.1 |
| Icons | @expo/vector-icons | latest |
| Styling | React Native StyleSheet | Standard |

## Application Structure

```
lifelens/
├── app/                        # Expo Router routes
│   ├── _layout.tsx             # Root layout (Stack)
│   ├── login.tsx               # Login screen route
│   ├── (tabs)/                 # Tab navigation group
│   │   ├── _layout.tsx         # Tab layout
│   │   ├── index.tsx           # Dashboard (demo home)
│   │   └── two.tsx             # Analytics placeholder
│   ├── modal.tsx               # Modal screen
│   └── +not-found.tsx          # 404 screen
├── src/
│   ├── components/
│   │   └── ui/                 # Reusable UI components
│   │       ├── Button.tsx      # Button with variants
│   │       ├── Card.tsx        # Card container
│   │       ├── Input.tsx       # Input with icons
│   │       ├── Screen.tsx      # Screen wrapper
│   │       ├── Text.tsx        # Typography component
│   │       └── index.ts        # Component exports
│   ├── features/
│   │   └── auth/
│   │       ├── LoginScreen.tsx  # Login screen component
│   │       └── index.ts         # Feature exports
│   ├── hooks/                  # Custom React hooks
│   ├── theme/
│   │   ├── colors.ts           # Color tokens
│   │   ├── spacing.ts          # Spacing tokens
│   │   ├── typography.ts       # Text styles
│   │   ├── radius.ts           # Border radius tokens
│   │   └── index.ts            # Theme exports
│   ├── constants/              # App constants
│   ├── services/               # API services (future)
│   ├── types/                  # TypeScript types (future)
│   └── utils/                  # Utility functions (future)
├── assets/                     # Static assets
├── docs/                       # Documentation
│   └── ARCHITECTURE.md         # This file
├── memory.md                   # Project memory
├── skill.md                    # AI agent rules
├── package.json
├── tsconfig.json
└── app.json
```

## Theme Architecture

### Design System

LifeLens AI uses a centralized dark/neon-green design system.

### Color Tokens

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

### Spacing Tokens

xs(4), sm(8), md(12), lg(16), xl(20), xxl(24), xxxl(32), xxxxl(40), xxxxxl(48)

### Radius Tokens

sm(6), md(10), lg(14), xl(18), xxl(24), full(9999)

### Theme Usage

```typescript
import { colors } from '@/src/theme/colors';
import { spacing } from '@/src/theme/spacing';
import { radius } from '@/src/theme/radius';
```

## Navigation Architecture

### Routes

| Route | Screen | Description |
|-------|--------|-------------|
| `/login` | login.tsx | Login screen (initial) |
| `/(tabs)/` | index.tsx | Dashboard |
| `/(tabs)/two` | two.tsx | Analytics |
| `/modal` | modal.tsx | Modal screen |

### Route Groups

- `(tabs)` - Tab navigation group for main app screens

### Navigation Pattern

Expo Router uses file-based routing. The navigation structure is defined by the file system:

- `app/_layout.tsx` - Root layout with Stack navigator
- `app/login.tsx` - Login screen
- `app/(tabs)/_layout.tsx` - Tab layout for main screens
- `app/modal.tsx` - Modal presentation

### Initial Route

The app starts at `/login`. After authentication (or demo bypass), it navigates to `/(tabs)`.

## Component Architecture

### UI Components

Located in `src/components/ui/`:

- `Screen.tsx` - SafeAreaView wrapper with keyboard handling
- `Card.tsx` - Dark card container with border
- `Button.tsx` - Primary/secondary/ghost button variants
- `Input.tsx` - Text input with icon support
- `Text.tsx` - Typography component with variants

### Feature Components

Located in `src/features/`:

- `auth/LoginScreen.tsx` - Complete login screen

### Layout Components

Layout is handled by Expo Router:
- Root layout (`app/_layout.tsx`)
- Tab layout (`app/(tabs)/_layout.tsx`)

## Login Screen Architecture

### Structure

```
LoginScreen
├── Branding (logo, title, subtitle)
├── Login Card
│   ├── Welcome Section
│   ├── Demo Button
│   ├── Divider
│   ├── Email Input
│   ├── Password Input
│   ├── Forgot Password Link
│   └── Sign In Button
└── Registration Link
```

### Animations

- Logo fade-in and slide-up
- Card fade-in and slide-up (delayed)
- Button press feedback
- Input focus state with green border

### Keyboard Handling

- KeyboardAvoidingView for iOS
- ScrollView with keyboardShouldPersistTaps
- Proper keyboard types for email/password

## State Management

**Approach:** React useState/useReducer (local state only)

No global state management library is currently in use. The application uses React's built-in state management capabilities.

### Login Screen State

```typescript
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [showPassword, setShowPassword] = useState(false);
const [loading, setLoading] = useState(false);
const [emailFocused, setEmailFocused] = useState(false);
const [passwordFocused, setPasswordFocused] = useState(false);
```

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

**Status:** UI only, no backend

The login screen provides UI for:
- Email/password login
- Demo mode bypass
- Registration (placeholder)
- Forgot password (placeholder)

When implemented:
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
- @expo/vector-icons
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

## Accessibility

### Current Implementation

- `accessibilityLabel` on all interactive elements
- `accessibilityRole` on buttons and links
- Sufficient touch targets (min 44x44)
- Semantic color usage

### Best Practices

- Test with VoiceOver (iOS) and TalkBack (Android)
- Ensure all interactive elements are accessible
- Do not rely only on color for state

## Responsive Design

### Current Approach

- `SafeAreaView` for screen boundaries
- `flex` layouts for flexibility
- `padding` for spacing (not fixed margins)
- `maxWidth` for content constraints
- `ScrollView` for overflow content
- `KeyboardAvoidingView` for keyboard

### Screen Sizes

Tested on:
- Small Android (320dp)
- Normal Android (360dp)
- iPhone (390dp)

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
