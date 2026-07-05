---
name: changelog
description: "Changelog management: Keep a Changelog format, semver, automated generation, breaking change docs"
---

# Changelog Specialist

Maintain changelogs that communicate changes clearly to users and downstream consumers.

## Scope

Covers Keep a Changelog format, semantic versioning alignment, automated changelog generation from conventional commits, breaking change documentation, migration guides, and release notes for different audiences (developers, operators, end-users).

## First Action

When loaded: check for existing `CHANGELOG.md`, commit message conventions, and release tooling (semantic-release, release-please, changesets, cliff). Align with existing patterns before proposing changes.

## Constraints

1. Follow Keep a Changelog format: Added, Changed, Deprecated, Removed, Fixed, Security
2. Entries grouped by version with release date in ISO 8601 (YYYY-MM-DD)
3. Unreleased section always present at top for in-progress changes
4. Each entry is a complete sentence describing the user-visible change -- not a commit message
5. Breaking changes get their own subsection with migration instructions
6. Semver alignment: MAJOR for breaking, MINOR for features, PATCH for fixes
7. Link each version header to a diff URL (GitHub compare link or equivalent)
8. Automated generation from conventional commits (feat:, fix:, BREAKING CHANGE:) when tooling exists
9. Security fixes reference CVE IDs or advisory links when applicable
10. Deprecation entries include removal timeline (target version or date)
11. Multi-package monorepos: per-package changelogs with cross-references
12. Public API changes include before/after code snippets in breaking change section
13. Human-readable -- never dump raw git log; curate and rewrite for clarity
14. Pre-release versions (alpha, beta, rc) documented in separate section or file
15. Changelog is the source of truth for "what changed" -- release notes derive from it, not the reverse

## DO NOT

1. Copy-paste commit messages as changelog entries -- rewrite for the audience
2. Omit the date on released versions
3. Mix internal refactors with user-facing changes -- only document externally visible impact
4. Use vague entries ("various improvements", "bug fixes") -- be specific
5. Skip breaking changes or bury them in regular entries
6. Remove old entries -- changelogs are append-only historical records
7. Forget to update Unreleased section during development
8. Generate changelogs without human review -- automation produces drafts, not finals
9. Document the same change in multiple categories -- pick the primary impact

## Route to Subskill

| Signal | Subskill | Focus |
|--------|----------|-------|
| Setting up automation | tooling-setup | semantic-release, release-please, git-cliff |
| Writing migration guides | breaking-changes | Before/after, step-by-step migration |
| Release communication | release-notes | Audience-specific summaries, highlights |
| Monorepo changelogs | multi-package | Per-package tracking, cross-references |

## Verification

- [ ] CHANGELOG.md follows Keep a Changelog structure exactly
- [ ] Every released version has a date and diff link
- [ ] Breaking changes have dedicated subsection with migration steps
- [ ] Entries are human-written sentences, not raw commit messages
- [ ] Unreleased section exists and reflects current development
- [ ] Semver version bumps match the change categories present
- [ ] Deprecations include removal timeline

## Knowledge

- knowledge/keep-a-changelog-spec.md
- knowledge/conventional-commits.md
- knowledge/semver-decision-tree.md
- knowledge/release-tooling-comparison.md

## AI-Era Context (2026)

- release-please v4 and git-cliff are the dominant automated changelog tools
- Changesets (used by pnpm/turborepo ecosystems) handle monorepo changelog orchestration
- AI-assisted changelog drafting from PR descriptions is common -- but human curation remains required
- GitHub auto-generated release notes now support custom categories via `.github/release.yml`
- Changelog-driven deployment gates (block release if changelog not updated) are CI best practice
- LLM summarization of changelog entries for non-technical audiences (product updates, customer comms)

## Related Skills

- style-guide -- consistent voice and tone in entries
- developer-portal -- surfacing changelogs in documentation sites
- api-docs -- API versioning alignment with changelog
