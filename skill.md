# Skill: How to Work on This Project

## Overview

This file defines how AI coding agents should work on the LifeLens project.

## Rules

### 1. Understand Before Modifying

Before making any changes:

1. Read `memory.md` to understand project history and decisions
2. Read `skill.md` (this file) to understand working rules
3. Read `ARCHITECTURE.md` to understand system structure
4. Inspect the relevant source files
5. Understand the existing implementation
6. Plan the smallest appropriate change

### 2. Code Quality

- Prefer small, focused changes
- Reuse existing components and utilities
- Do not duplicate logic
- Keep TypeScript strict and properly typed
- Avoid `any` unless there is a documented reason
- Follow existing naming conventions
- Keep business logic outside UI components when appropriate

### 3. Security

- Do not hard-code secrets
- Do not commit API keys, tokens, or passwords
- Use environment variables for sensitive configuration
- Never put secrets in documentation files

### 4. Dependencies

- Do not introduce dependencies without justification
- Every dependency must have a clear reason to exist
- Check if existing dependencies can solve the problem first

### 5. Testing and Verification

- Test or verify changes before considering them complete
- Run type checking: `npm run typecheck`
- Run linting: `npm run lint`
- Verify the application works as expected

### 6. Documentation

- Update documentation after meaningful architectural or behavioral changes
- Never silently change an existing architectural decision
- If an architectural decision must change, document the reason in `memory.md`

### 7. Git

- Make focused commits
- Use conventional commit messages:
  - `feat:` for new features
  - `fix:` for bug fixes
  - `refactor:` for code refactoring
  - `docs:` for documentation changes
  - `chore:` for maintenance tasks
- Do not commit generated files unless intentionally required
- Never remove or rewrite existing Git history unless explicitly requested

### 8. File Organization

- Keep components in `components/`
- Keep custom hooks in `hooks/`
- Keep services/API calls in `services/`
- Keep utility functions in `utils/`
- Keep type definitions in `types/`
- Keep constants in `constants/`
- Keep configuration in `config/`

### 9. Component Guidelines

- Build reusable UI primitives where appropriate
- Keep components focused and not too large
- If a screen becomes complex, extract components, hooks, or services
- Do not over-engineer simple features

### 10. Error Handling

- Handle errors gracefully
- Provide meaningful error messages
- Implement loading states where appropriate
- Implement empty states where appropriate

## Workflow

For every task:

1. Read project instructions
2. Read `memory.md`
3. Read `skill.md`
4. Read `ARCHITECTURE.md`
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

## Documentation Synchronization

After EVERY meaningful code change, check whether any of these files need updating:

- `memory.md`
- `skill.md`
- `ARCHITECTURE.md`
- `AGENTS.md`

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
