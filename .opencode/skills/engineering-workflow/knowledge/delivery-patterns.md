---
type: fact
title: "Delivery Patterns"
---
# Delivery Patterns

## CI/CD Pipeline Design

A well-designed pipeline catches problems early and ships confidently.

**Standard stages (in order):**

1. **Lint** -- Static analysis, formatting, style checks. Fast, catches obvious issues.
2. **Test** -- Unit tests, then integration tests. Fail fast on unit tests.
3. **Build** -- Compile, bundle, create artifacts. Only if lint+test pass.
4. **Deploy** -- Push to staging, then production. Gated by approval or auto-promote.

**Principles:**
- Fast feedback: lint in <30s, unit tests in <2min, full pipeline in <10min
- Deterministic: same commit always produces same result
- Isolated: tests don't depend on external state or each other
- Cached: don't rebuild what hasn't changed (dependencies, layers)

**Pipeline anti-patterns:**
- Tests that pass locally but fail in CI (environment differences)
- Manual steps in the middle of automation
- Deploying without running tests
- Pipeline that takes >15 minutes (developers stop waiting)
- Shared mutable state between pipeline runs

**Branch strategy integration:**
- Trunk-based: CI runs on every push to main, deploy on green
- Feature branches: CI runs on PR, merge only when green
- Release branches: CI + deploy to staging, promote to prod manually

## Feature Flags

Decouple deployment from release. Ship code dark, enable for users gradually.

**Types:**
- **Release flags** -- Temporary. Hide incomplete features. Remove after launch.
- **Ops flags** -- Kill switches. Disable features under load. Keep indefinitely.
- **Experiment flags** -- A/B tests. Route % of traffic. Remove after decision.
- **Permission flags** -- Enable for specific users/orgs. Long-lived.

**Progressive rollout:**
1. Internal only (dogfood)
2. 1% of users (canary)
3. 10% of users (early adopters)
4. 50% (watch metrics)
5. 100% (general availability)
6. Remove the flag (critical -- flag debt is real)

**Implementation tips:**
- Flags should default to OFF (safe if flag service is down)
- Log flag evaluations for debugging
- Set expiry dates on release flags
- Track flag count -- if it exceeds 20 active flags, clean up
- Test both flag states in CI

## Code Review Best Practices

**As an author:**
- Keep PRs small (<400 lines of diff, ideally <200)
- Write a clear description: what, why, how to test
- Self-review before requesting others
- Respond to feedback within 24 hours
- Don't take it personally -- it's about the code

**As a reviewer:**
- Review within 24 hours (don't block teammates)
- Distinguish: must-fix vs nit vs suggestion
- Ask questions rather than making demands
- Approve with nits (don't block on style)
- Test the change mentally: what could go wrong?

**What to look for:**
- Correctness: does it do what it claims?
- Edge cases: nulls, empty collections, concurrent access
- Security: injection, auth bypass, data exposure
- Performance: N+1 queries, unnecessary allocations
- Maintainability: naming, structure, test coverage

**PR description template:**
```
## What
One-sentence summary of the change.

## Why
Context: what problem this solves or what feature it enables.

## How
Brief description of the approach. Link to design doc if relevant.

## Testing
How was this tested? What should reviewers verify?
```

## Definition of Done

A shared checklist that prevents "it works on my machine" syndrome.

**Minimum bar:**
- Code reviewed and approved
- Tests pass in CI (unit + integration)
- No lint/typecheck errors
- Deployed to staging and manually verified
- Monitoring/alerting in place for new paths
- Documentation updated (API docs, runbooks)

**Extended (for larger features):**
- Feature flag in place for gradual rollout
- Rollback plan documented and tested
- Performance benchmarked (latency, throughput)
- Security review completed
- On-call team briefed on new failure modes

## DORA Metrics

Four metrics that correlate with high-performing engineering teams.

**Deployment Frequency** -- How often you ship to production.
- Elite: multiple times per day
- High: once per day to once per week
- Medium: once per week to once per month
- Low: less than once per month

**Lead Time for Changes** -- From commit to production.
- Elite: less than one hour
- High: one day to one week
- Low: more than one month

**Mean Time to Recovery (MTTR)** -- How fast you fix production incidents.
- Elite: less than one hour
- High: less than one day
- Low: more than one week

**Change Failure Rate** -- % of deployments causing incidents.
- Elite: 0-15%
- High: 16-30%
- Low: 46-60%

**How to improve each:**
- Deployment frequency: smaller PRs, feature flags, trunk-based dev
- Lead time: faster CI, auto-deploy, reduce review bottlenecks
- MTTR: better monitoring, runbooks, progressive rollout (fast rollback)
- Change failure rate: better tests, code review, staging environments

**Tracking tips:**
- Automate measurement (don't rely on manual reporting)
- Review monthly with the team
- Set targets one tier above current (don't jump to elite)
- Celebrate improvements, investigate regressions
