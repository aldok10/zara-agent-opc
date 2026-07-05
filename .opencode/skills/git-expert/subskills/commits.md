---
type: subskill
title: "Conventional Commits"
---

# Conventional Commits

Standardized, machine-readable commit messages: `<type>(<scope>): <description>`.

## First Action

Check `git status` and detect scope from changed file paths before writing the message.

## Format

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

## Types

| Type | When | SemVer |
|------|------|--------|
| `feat` | New feature | MINOR |
| `fix` | Bug fix | PATCH |
| `perf` | Performance | PATCH |
| `refactor` | Code change (no feat/fix) | - |
| `test` | Tests | - |
| `docs` | Docs only | - |
| `style` | Formatting (no logic) | - |
| `chore` | Maintenance, deps, tooling | - |
| `ci` | CI/CD pipeline | - |
| `build` | Build system, external deps | - |
| `revert` | Reverting a commit | - |

## Constraints

1. Description: imperative mood, lowercase, no period, max 72 chars.
2. Scope: optional, identifies area (`auth`, `api`, `db`). Multiple areas → pick primary or omit.
3. Body: blank-line separated, explains WHY not WHAT.
4. Breaking: `!` after type OR `BREAKING CHANGE:` footer.
5. One logical change per commit. Description needs "and" → split.
6. Migrations + code = separate commits (rollback safety).

## DO NOT

- NEVER `fix: fix` (describe WHAT).
- NEVER `update stuff` (not conventional).
- NEVER `feat: add feature and fix bug` (one concern per commit).
- NEVER scope overload `feat(auth/db/api)`.
- NEVER commit without checking `git status`.
- NEVER past tense (use imperative).
- NEVER end description with a period or exceed 72 chars.
- NEVER claim "done" without running tests before commit.

## Examples

```
feat(auth): add JWT refresh token rotation
fix(db): prevent connection pool exhaustion under load
refactor!: rename getUserName to getUsername across API
chore(deps): update go modules to latest patch versions

BREAKING CHANGE: response shape changed from array to {data, meta}
```

## Voice (commit body only)

Format stays strict; body applies natural voice: lead with why, vary sentence length, no banned AI words (robust/comprehensive/facilitate). Friend test: would a dev say this in a PR? Indonesian particles fine in internal/personal repos.

## Verification

- Description ≤72 chars, imperative, lowercase, no trailing period.
- Type matches the actual change; one concern per commit.
- Tests run before committing.
