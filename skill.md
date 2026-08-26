# Agent Skills

## Project Rules

1. Before making changes, read `memory.md`, `skill.md`, and `docs/ARCHITECTURE.md`
2. After making meaningful changes, update the relevant documentation
3. The application MUST remain Expo Go compatible
4. Do not introduce native dependencies without explicit approval
5. Keep changes focused and minimal

## Coding Standards

- Use TypeScript for all code
- Follow existing naming conventions
- Keep code simple and readable
- Do not over-engineer solutions
- Prefer composition over inheritance
- Keep components focused and small

## TypeScript Rules

- Use strict TypeScript
- Prefer `type` or `interface` over `any`
- Avoid unnecessary type assertions
- Keep shared types in `src/types/`
- Feature-specific types should stay close to their feature

## Design Language Rules

**LifeLens AI uses a dark/neon-green design system.**

### Colors

- Background: `#080908` (almost black)
- Surface: `#111311` (dark cards)
- Primary: `#B8FF00` (neon lime-green)
- Text: `#F5F5F5` (white)
- Text Secondary: `#929792` (muted gray)
- Border: `#292D29` (subtle dark gray)

### Design Principles

- Dark backgrounds with high contrast
- Neon green accent for interactive elements
- Rounded cards with subtle borders
- Clean spacing and strong visual hierarchy
- Premium, modern, minimal appearance
- AI/data-focused aesthetic

### Theme Usage

- Always import from `@/src/theme/colors` for colors
- Use centralized theme tokens, never hard-code colors
- Use `@/src/theme/spacing` for spacing values
- Use `@/src/theme/radius` for border radius
- Use `@/src/theme/typography` for text styles

## React Native Rules

- Use React Native's standard styling system
- Keep components focused and small
- Avoid putting large amounts of UI logic in route files
- Extract complex logic into custom hooks
- Handle loading and error states

## Expo Rules

- Use Expo packages when available
- Prefer Expo SDK packages over third-party alternatives
- Follow Expo Router conventions for navigation
- Use Expo's environment variable approach

## Expo Go Restrictions

**CRITICAL:** This project MUST run in Expo Go.

Before adding a package:

1. Verify it works with Expo Go
2. Check Expo SDK compatibility
3. Do NOT install packages requiring native modules
4. Do NOT install packages requiring `expo prebuild`
5. Do NOT install packages requiring a custom development client

If a feature cannot be implemented using Expo Go, STOP and explain the limitation.

**Expo Go Compatible Packages:**
- expo-image
- expo-router
- expo-camera
- expo-location
- expo-notifications
- expo-secure-store
- expo-file-system
- @expo/vector-icons

## Component Rules

- Build reusable components in `src/components/ui/`
- Keep components focused on a single responsibility
- Extract complex UI into smaller components
- Handle loading, error, and empty states
- Use the theme system for all colors and spacing

## Dashboard Rules

- Dashboard components go in `src/components/dashboard/`
- Dashboard feature code goes in `src/features/dashboard/`
- Keep mock data separate from UI components
- Use strongly typed mock data (dashboard.types.ts)
- Dashboard sections: Header, Insight, LifeScore, Breakdown, Trend, Prediction, Insights, Clusters, Correlations, Anomalies
- Charts must use View-based implementation (no external chart libraries)
- Use Animated API for progress bars and fade-in animations
- Dashboard must have loading (skeleton), empty, and error states

## State Management Rules

- Start with React state (useState, useReducer)
- Use Context for shared state when needed
- Use custom hooks for reusable state logic
- Do NOT install Redux, Zustand, or Jotai unless absolutely necessary
- Document state management decisions in ARCHITECTURE.md

## API Rules

- Keep API calls in `src/services/`
- Do NOT put API calls in UI components
- Use environment variables for API URLs
- Never hard-code secrets or tokens
- Handle errors appropriately

## Accessibility Rules

- Add `accessibilityLabel` to all interactive elements
- Add `accessibilityRole` to buttons and links
- Ensure sufficient touch targets (min 44x44)
- Do not rely only on color to communicate state
- Support screen readers

## Responsive Layout Rules

- Use `SafeAreaView` for screen boundaries
- Use `flex` for layouts, not fixed heights
- Use `padding` instead of hard-coded margins
- Use `maxWidth` for content constraints
- Use `ScrollView` or `KeyboardAvoidingView` where appropriate
- Do not hard-code iPhone-specific dimensions

## Error Handling

- Do not silently ignore errors
- Provide meaningful error messages
- Handle loading states
- Handle empty states
- Log errors appropriately

## Testing Rules

- Run type checking before completing tasks
- Run linting before completing tasks
- Verify the application starts correctly
- Test changes in Expo Go when possible

## Documentation Rules

- Update `memory.md` after meaningful changes
- Update `skill.md` when rules change
- Update `docs/ARCHITECTURE.md` when architecture changes
- Keep documentation accurate and current
- Do not leave stale documentation

## Git Rules

- Make focused, meaningful commits
- Do not modify unrelated files
- Do not delete functionality without permission
- Use clear commit messages
- Do not commit secrets or sensitive data

## Things Agents Must Not Do

1. Do NOT introduce native dependencies that break Expo Go
2. Do NOT overwrite entire projects unnecessarily
3. Do NOT delete files without checking their purpose
4. Do NOT replace working architecture without justification
5. Do NOT install random packages
6. Do NOT hard-code secrets
7. Do NOT invent backend APIs
8. Do NOT claim features are complete without verification
9. Do NOT leave documentation describing outdated architecture
10. Do NOT skip the documentation update step

## Workflow

For every task:

1. Understand the request
2. Inspect the existing implementation
3. Check memory.md
4. Check skill.md
5. Check docs/ARCHITECTURE.md
6. Plan the smallest correct change
7. Implement the change
8. Run validation (typecheck, lint)
9. Verify Expo Go compatibility
10. Update documentation
11. Review the final diff
12. Report what changed

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
