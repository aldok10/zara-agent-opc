---
type: fact
title: "Keep a Changelog"
---

# Keep a Changelog

Standard format for maintaining human-readable changelogs.

## Principles

1. Changelogs are for humans, not machines
2. Every version gets an entry
3. Group changes by type
4. Versions link to diffs
5. Latest version comes first
6. Release dates use ISO 8601 (YYYY-MM-DD)
7. Follow semantic versioning

## Structure

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- New feature description

## [1.2.0] - 2026-03-15

### Added
- Feature description

### Fixed
- Bug fix description

[Unreleased]: https://github.com/org/repo/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/org/repo/compare/v1.1.0...v1.2.0
```

## Change Categories

| Category | When to use |
|----------|-------------|
| Added | New features |
| Changed | Changes to existing functionality |
| Deprecated | Features that will be removed |
| Removed | Features that were removed |
| Fixed | Bug fixes |
| Security | Vulnerability fixes |

Order: Added > Changed > Deprecated > Removed > Fixed > Security

## Writing Entries

Each entry is a complete sentence describing the user-visible change:

Good:
- "Added support for CSV export in the reports dashboard"
- "Fixed pagination returning duplicate results when items are created during traversal"
- "Deprecated the `/v1/users` endpoint in favor of `/v2/users` (removal in v3.0)"

Bad:
- "Updated dependencies" (not user-visible unless it fixes something)
- "Refactored order service" (internal -- user does not care)
- "Bug fixes" (not specific)
- "misc improvements" (meaningless)

## Semver Integration

Map changelog categories to version bumps:

| Change type | Bump | Example |
|-------------|------|---------|
| Added (backward-compatible) | MINOR | 1.1.0 -> 1.2.0 |
| Changed (breaking) | MAJOR | 1.2.0 -> 2.0.0 |
| Deprecated | MINOR | Announcement only |
| Removed (was deprecated) | MAJOR | 2.0.0 -> 3.0.0 |
| Fixed | PATCH | 1.2.0 -> 1.2.1 |
| Security | PATCH (or MINOR) | Depends on scope |

## Breaking Changes

Dedicated subsection under the version with migration instructions:

```markdown
## [2.0.0] - 2026-04-01

### Breaking Changes

- Removed `GET /v1/users` endpoint. Use `GET /v2/users` instead.
  Migration: replace `/v1/users?name=X` with `/v2/users?filter[name]=X`

### Added
- New `/v2/users` endpoint with filtering and sparse fieldsets
```

## Automation Integration

### With Conventional Commits

Map commit prefixes to categories:
- `feat:` -> Added
- `fix:` -> Fixed
- `feat!:` or `BREAKING CHANGE:` -> Breaking Changes
- `deprecate:` -> Deprecated
- `security:` or `vuln:` -> Security

### With Release Tools

| Tool | How it uses changelog |
|------|----------------------|
| release-please | Generates from conventional commits, creates PR |
| git-cliff | Template-based generation from git history |
| changesets | Per-PR changelog fragments, merged at release |
| semantic-release | Auto-generates but often needs human editing |

## Multi-Package (Monorepo)

Options:
1. Per-package CHANGELOG.md in each package directory
2. Root CHANGELOG.md with package prefixes: `[api] Added new endpoint`
3. Separate files per package at root: `CHANGELOG-api.md`, `CHANGELOG-web.md`

Recommendation: per-package changelogs with cross-references when changes span packages.

## Unreleased Section

Always maintain an Unreleased section at the top:
- Add entries as changes are merged (not at release time)
- At release: rename Unreleased to version + date, create new empty Unreleased
- Helps answer "what is in the next release?" at any time

## Anti-Patterns

1. Dumping `git log --oneline` as a changelog
2. Writing changelog only at release time (entries are forgotten)
3. "Various bug fixes and improvements" (tells user nothing)
4. Mixing internal and external changes
5. Removing old entries to "keep it short"
6. Version without a date
7. Multiple changelogs that disagree (single source of truth)
