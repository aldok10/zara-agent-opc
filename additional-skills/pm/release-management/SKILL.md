---
name: release-management
description: "Release management: progressive delivery, feature flags, versioning"
---

# Release Management

## Scope

Progressive delivery, feature flags, versioning, rollback, release trains. From code-complete to production-verified.

## Core Principles

1. Deploy != release. Deploy=technical artifact placement. Release=business decision to expose.
2. Feature flags for progressive rollout: %traffic, segment, region.
3. Trunk-based development: commit to trunk at least daily. Feature branches <1 day ideal, 2 days max with acknowledged risk.
4. Semantic versioning for APIs and libraries. Conventional commits drive version bumps.
5. Release notes auto-generated from conventional commits.
6. Rollback plan defined BEFORE every release. No plan = no ship.
7. Canary deploys: progressive stages (e.g., 1% > 5% > 25% > 100%), monitor at each. No single standard progression; adapt to risk profile.
8. No Friday deploys without on-call agreement and rollback owner (team convention, not industry standard).
9. Feature flags cleaned up promptly after full rollout (team policy, e.g., within 2-4 sprints). Flag debt = tech debt.
10. Release trains for coordinated multi-team releases. Single-team = continuous deploy.

## DO NOT

1. Release without rollback plan and rollback owner assigned.
2. Skip canary stages for "low risk" changes. All changes carry risk.
3. Leave feature flags permanent. Flags without cleanup date = debt.
4. Deploy database migrations that cannot be reversed in the same release.
5. Coordinate releases via Slack/email. Use release train process or don't coordinate.

## Route to Subskill

| Signal | Subskill |
|--------|----------|
| Flag rollout, targeting, cleanup | `subskills/feature-flags.md` |
| Version bump, changelog, breaking change | `subskills/semantic-versioning.md` |
| Incident, revert, rollback decision | `subskills/rollback-strategies.md` |
| Multi-team coordination, cadence | `subskills/release-trains.md` |

## Decision Matrix

| Situation | Action |
|-----------|--------|
| Single feature, single team | Feature flag + canary deploy |
| Breaking API change | Major version bump + deprecation period |
| Incident in production | Flag off (seconds) or rollback (minutes) |
| 3+ teams shipping same product | Release train with cut dates |
| Database schema change | Expand-contract pattern, never destructive |
| Hotfix needed | Branch from release tag, cherry-pick forward |

## Verification

- [ ] Rollback plan documented with owner and trigger criteria
- [ ] Feature flag exists with kill switch for new behavior
- [ ] Canary metrics baseline captured before ramp
- [ ] Release notes generated from commits since last release
- [ ] Flag cleanup ticket created with sprint target
- [ ] No permanent flags without explicit exception approval

## AI-Era Context (2026)

Semantic-release is fully automated -- versioning, changelogs, and release notes generated from conventional commits without human intervention. Feature flag lifecycle is AI-managed: stale flags auto-detected, cleanup tickets auto-created, and gradual rollout percentages suggested from canary metrics. AI monitors error budgets during rollout and recommends halt/proceed. Rollback decisions remain human-owned due to business impact assessment that requires judgment beyond metrics.

## Knowledge

- `knowledge/flag-lifecycle.md` -- feature flag states and cleanup policy
- `knowledge/versioning-rules.md` -- semantic versioning and release cadence
