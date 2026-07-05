# Changelog Format

Keep a Changelog principles, semantic versioning alignment, and writing effective release notes.

## When to Load

- Writing or reviewing changelog entries
- Establishing changelog conventions for a project
- Aligning release notes with semantic versioning
- Deciding what to include vs exclude

## Key Concepts

**Keep a Changelog** -- Standard format. Sections: Added, Changed, Deprecated, Removed, Fixed, Security. Newest version at top. Unreleased section for upcoming changes.

**Semantic Versioning Alignment** -- MAJOR (breaking changes), MINOR (Added/Deprecated), PATCH (Fixed/Security). Changelog sections map directly to version bumps.

**Audience** -- Write for consumers of the software, not contributors. Focus on impact, not implementation details. "API responses now include pagination metadata" not "refactored response builder".

**Unreleased Section** -- Accumulate changes as they merge. Tag converts Unreleased to a version header. Always keep an empty Unreleased section ready.

## Patterns

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.1.0] - 2024-03-15

### Added
- Webhook retry configuration with exponential backoff
- `GET /v2/events` endpoint for paginated event history

### Fixed
- Rate limiter incorrectly counting cached responses
- Connection pool exhaustion under sustained load

## [2.0.0] - 2024-02-01

### Changed
- Authentication switched from API keys to OAuth 2.0 (BREAKING)
- Response envelope now uses `data` field instead of `result`

### Removed
- `GET /v1/legacy-export` endpoint (deprecated since 1.8.0)
```

## Gotchas

- Do not include every commit -- group related changes into one meaningful entry
- Avoid internal jargon: "fixed race condition in mutex pool" means nothing to consumers
- Date format must be ISO 8601 (YYYY-MM-DD), not locale-dependent
- Missing comparison links at file bottom break navigation in many renderers
- Backfilling changelogs from git log produces noise -- curate manually

## Verification

- Every entry answers: "What changed for the user?"
- Breaking changes are marked clearly and appear in a MAJOR version
- No duplicate entries across sections
- Links at bottom of file point to valid comparison URLs
- Unreleased section exists and is empty after a release
