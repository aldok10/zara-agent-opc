# Coverage Metrics

## Coverage Types: What Actually Matters

| Metric | Measures | Value | Limitation |
|--------|----------|-------|------------|
| **Line** | Lines executed | Low - easily gamed | Doesn't check branches |
| **Branch** | Decision paths taken | Medium - catches missed conditions | Doesn't verify correctness |
| **Function** | Functions called | Low - coarse granularity | Function called != tested |
| **Mutation** | Tests that catch injected bugs | High - real quality signal | Expensive to compute |

**Priority**: Mutation score > Branch coverage > Line coverage > Function coverage.

## Mutation Testing

The real quality indicator. Injects faults (mutants) into code:
- Change `>` to `>=`, `+` to `-`, `true` to `false`
- If tests still pass: mutant survived = weak test
- **Mutation score** = killed mutants / total mutants

Tools: Stryker (JS/TS), PIT (Java), mutmut (Python), go-mutesting (Go).

Target: > 80% mutation score on critical paths. Accept lower elsewhere (expensive to run).

## Defect Escape Rate

```
Escape Rate = Production Bugs / (Production Bugs + Bugs Caught in Testing)
```

- < 5%: excellent testing effectiveness
- 5-15%: acceptable for most teams
- > 15%: testing strategy needs overhaul

Track by component to identify weak spots. Escaped bug = add test retroactively.

## Test Stability Rate

```
Stability = Deterministic Runs / Total Runs (over 30 days)
```

- > 99%: healthy suite
- 95-99%: some flaky tests, quarantine and fix
- < 95%: suite is unreliable, team ignores failures

Flaky test = worse than no test (erodes trust in suite).

## Coverage Thresholds by Tier

| Tier | Branch Target | Mutation Target | Enforcement |
|------|---------------|-----------------|-------------|
| Critical (auth, payments) | > 90% | > 80% | CI blocks merge |
| Standard (business logic) | > 75% | > 60% | CI warns |
| Low-risk (admin, config) | > 50% | N/A | Advisory only |
| Generated/vendor code | Excluded | Excluded | Not measured |

**Rule**: never enforce 100% coverage. It incentivizes bad tests written to hit numbers.

## Metrics That Mislead

- **100% line coverage with no assertions**: code runs but nothing verified
- **High coverage on getters/setters**: tests the language, not your logic
- **Coverage on trivial code**: config loading, boilerplate, wiring
- **Coverage without mutation**: proves execution, not correctness
- **Aggregate numbers**: 80% overall can hide 20% on critical paths

## Dashboard Design

### Track (actionable)
- Mutation score on critical paths (weekly trend)
- Defect escape rate (monthly)
- Test stability rate (daily)
- Coverage delta on PRs (per-change, not absolute)
- Test execution time (regression detection)

### Ignore (vanity)
- Overall line coverage percentage
- Total number of tests
- Coverage on generated/vendor code
- Absolute coverage without context

### Alerts
- Coverage drops > 5% on single PR: block merge
- Mutation score drops below threshold: notify team
- Flaky test detected (failed then passed same commit): auto-quarantine
- Test suite time increases > 20%: investigate
