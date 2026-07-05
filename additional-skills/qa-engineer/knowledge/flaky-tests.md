---
type: fact
title: "Flaky Tests - Detection, Quarantine, Root Cause Taxonomy"
---

# Flaky Tests - Management Guide

## Definition

A test that passes and fails on the same code commit without any changes. ~25% of CI failures in large systems are flaky (Microsoft research).

## Detection

1. **Same-SHA reruns**: if pass/fail flips without code change = flaky
2. **Statistical**: track pass rate over last N runs (< 100% = potentially flaky)
3. **Quarantine signal**: 3+ failures in 7 days without correlated code change

## Root Cause Taxonomy

| Category | Root Cause | Fix |
|----------|-----------|-----|
| Timing | Race condition, async not awaited | Explicit waits, polling, events |
| Timing | System clock dependency | Mock time, use relative |
| Ordering | Test depends on execution order | Isolate, independent setup |
| State | Shared mutable state between tests | Hermetic test data |
| State | Database not reset between tests | Transaction rollback, truncate |
| Network | External service flaky/slow | Mock external, retry |
| Network | DNS resolution intermittent | Use IPs in test, mock |
| Resource | Port conflict | Random port allocation |
| Resource | File system race | Temp directories per test |
| Environment | Docker container startup timing | Health check waits |
| Environment | Different OS behavior (CI vs local) | Containerize tests |

## Quarantine Process

1. **Detect**: automated flake detection flags test
2. **Quarantine**: move to quarantine tag/suite (still runs, doesn't block)
3. **Triage**: within 24h, assign owner + categorize root cause
4. **Fix**: within 48h for critical-path tests, 1 week for others
5. **Verify**: run 50x without failure before promoting back
6. **Delete**: if not fixed in 2 weeks and not critical, delete the test

## Prevention (Code Review Gate)

- [ ] No `sleep()` / `waitForTimeout()` without explicit condition
- [ ] No shared state without isolation mechanism
- [ ] No implicit ordering dependency
- [ ] Deterministic test data (factories, not random)
- [ ] Network calls mocked (external services)
- [ ] Timeouts reasonable (not too tight, not infinite)
- [ ] CI environment matches documented requirements

## Metrics

- **Flake rate**: flaky failures / total failures (target: <5%)
- **MTTR (flake)**: mean time from detection to fix
- **Quarantine size**: number of quarantined tests (target: <1% of suite)
- **Developer impact**: blocked PRs due to flakes per week
