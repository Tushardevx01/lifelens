# AGENTS.md - AI Agent Instructions

## Project Overview

LifeLens is a mobile application built with Expo, React Native, and TypeScript.

## Before Making Changes

Before making any changes to this codebase, you MUST:

1. Read `memory.md` to understand project history and decisions
2. Read `skill.md` to understand working rules
3. Read `ARCHITECTURE.md` to understand system structure
4. Inspect the relevant source files
5. Understand the existing implementation

## After Making Changes

After making meaningful changes, you MUST:

1. Update the relevant documentation files
2. Run type checking: `npm run typecheck`
3. Run linting: `npm run lint`
4. Verify the application works as expected

## Documentation Files

| File | Purpose | When to Update |
|------|---------|----------------|
| `memory.md` | What has happened and what we decided | After architectural decisions, new features, or important changes |
| `skill.md` | How the AI should work | When development rules change |
| `ARCHITECTURE.md` | How the application is built | When architecture changes |
| `AGENTS.md` | This file - entry point for AI agents | When agent instructions change |

## Key Rules

1. **Documentation is not optional** - Always update docs after meaningful changes
2. **Understand before modifying** - Read existing code before changing it
3. **Small, focused changes** - Make minimal changes to achieve the goal
4. **Reuse existing code** - Don't duplicate what already exists
5. **TypeScript strict** - Keep types strict and avoid `any`
6. **No secrets** - Never commit API keys, tokens, or passwords
7. **Verify changes** - Run type checking and linting before completing tasks

## Development Workflow

For every task:

```
1. Read project instructions (this file)
2. Read memory.md
3. Read skill.md
4. Read ARCHITECTURE.md
5. Inspect relevant source files
6. Understand the existing implementation
7. Plan the smallest appropriate change
8. Implement the change
9. Run type checking
10. Run linting
11. Run relevant tests (if they exist)
12. Verify the application
13. Update documentation
14. Review the final diff
15. Report what changed
```

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

## Documentation Synchronization Rule

After EVERY meaningful code change, check whether any of these files need updating:

- `memory.md`
- `skill.md`
- `ARCHITECTURE.md`

If the change affects:

- Architecture
- Navigation
- Dependencies
- Features
- API behavior
- Authentication
- State management
- Data flow
- Project structure
- Development workflow
- Important decisions

Then update the relevant documentation in the same task.

Do not wait until the end of the project.

## Documentation Accuracy Rule

Documentation must describe the CURRENT state of the codebase.

Never leave documentation describing an old architecture.

Remove obsolete information instead of simply adding new information below it.

## Expo Version

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.
