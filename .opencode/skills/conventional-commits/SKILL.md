---
name: conventional-commits
description: Conventional Commits format for standardized, machine-readable commit messages. Load when committing, writing commit messages, or setting up commit conventions.
---
# Conventional Commits

## Format

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

## Types

| Type | When | SemVer |
|------|------|--------|
| `feat` | New feature for users | MINOR |
| `fix` | Bug fix for users | PATCH |
| `refactor` | Code change (no feature, no fix) | - |
| `perf` | Performance improvement | PATCH |
| `test` | Adding/fixing tests | - |
| `docs` | Documentation only | - |
| `style` | Formatting, whitespace (no logic) | - |
| `chore` | Maintenance, deps, tooling | - |
| `ci` | CI/CD pipeline changes | - |
| `build` | Build system, external deps | - |
| `revert` | Reverting a previous commit | - |

## Rules

1. Description: imperative mood, lowercase, no period, max 72 chars
2. Scope: optional, identifies area affected (e.g., `auth`, `api`, `db`)
3. Body: separated by blank line, explains WHY not WHAT (code shows what)
4. Breaking changes: `!` after type OR `BREAKING CHANGE:` in footer

## Examples

```
feat(auth): add JWT refresh token rotation

fix(db): prevent connection pool exhaustion under load

refactor!: rename getUserName to getUsername across API

chore(deps): update go modules to latest patch versions

feat(api): add pagination to /users endpoint

BREAKING CHANGE: response shape changed from array to {data, meta}
```

## Anti-Patterns

- `fix: fix` — meaningless, describe WHAT was fixed
- `update stuff` — not conventional format
- `feat: add feature and fix bug and refactor` — one concern per commit
- Scope overload: `feat(auth/db/api)` — pick the primary area

## Scope Discovery

Detect scope from changed files:
- `src/auth/*` → `auth`
- `cmd/server/*` → `server`
- `internal/db/*` → `db`
- `*.test.*` → likely `test` type, not scope
- Multiple areas → use the most impactful one, or omit scope

## Commit Size

- One logical change per commit
- If description needs "and", split into two commits
- Fixups during review: squash before merge
- Migrations + code change: separate commits (rollback safety)

## Related Skills

| When | Load |
|------|------|
| Git operations (rebase, conflicts) | `git-expert` |
| Branch ready to integrate | `finishing-branch` |

## Voice Integration

Commit messages follow conventional format strictly — but the **body** is where natural voice applies. When writing commit bodies: lead with the punchline (why this matters), vary sentence length, no banned AI words ("robust", "comprehensive", "facilitate"). Write like you'd explain to a teammate, not a press release. Friend test: would a dev say this in a PR description? Indonesian particles fine in internal/personal repos.
