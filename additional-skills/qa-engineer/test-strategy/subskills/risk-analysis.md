# Risk-Based Testing

## Risk Matrix

Score each feature/module on two axes:

| | Low Likelihood | Medium Likelihood | High Likelihood |
|---|---|---|---|
| **High Impact** | Medium risk | High risk | Critical risk |
| **Medium Impact** | Low risk | Medium risk | High risk |
| **Low Impact** | Negligible | Low risk | Medium risk |

**Impact** = business damage if it fails (revenue loss, data corruption, security breach).
**Likelihood** = probability of failure (complexity, change frequency, team familiarity).

## FMEA for Testing

Failure Mode and Effects Analysis adapted for software:

| Component | Failure Mode | Effect | Severity (1-10) | Occurrence (1-10) | Detection (1-10) | RPN |
|-----------|-------------|--------|----------|------------|-----------|-----|
| Auth | Token not validated | Unauthorized access | 10 | 3 | 2 | 60 |
| Payment | Double charge | Revenue + trust loss | 9 | 4 | 5 | 180 |
| Search | Wrong results | User frustration | 5 | 6 | 3 | 90 |

**RPN** (Risk Priority Number) = Severity x Occurrence x Detection.
Higher RPN = more testing investment needed.
Detection score: 1 = easily caught by existing tests, 10 = no tests catch it.

## Critical Path Identification

From business requirements, identify:
1. **Revenue paths**: checkout, subscription, billing
2. **Trust paths**: auth, data privacy, account security
3. **Compliance paths**: audit logs, data retention, consent
4. **Core value paths**: the primary thing users come for

These get highest test coverage regardless of code complexity.

## Coverage Allocation by Risk Tier

| Tier | Coverage Target | Test Types | Examples |
|------|----------------|------------|----------|
| Critical | > 90% branch | Unit + Integration + E2E + Contract | Auth, payments, data integrity |
| High | > 80% branch | Unit + Integration | Core business logic, APIs |
| Medium | > 70% branch | Unit + selective integration | CRUD, standard workflows |
| Low | > 50% line | Unit only (happy path) | Admin tools, reports, settings |

## Risk-Based Regression Prioritization

When time is limited, run tests in this order:
1. Tests covering recent changes (delta risk)
2. Tests for critical paths (static risk)
3. Tests that have caught bugs before (historical risk)
4. Tests for frequently-changed code (volatility risk)
5. Everything else

Tools: test impact analysis (Launchable, Codecov Test Analytics).

## Risk Heatmap

Plot modules on: **change frequency** (x-axis) x **business impact** (y-axis).

```
High Impact │  Monitor    │  Invest Heavily
            │  (stable    │  (volatile +
            │   but critical) │   critical)
            ├─────────────┼──────────────────
Low Impact  │  Ignore     │  Refactor
            │  (stable +  │  (volatile but
            │   low value)│   low value = smell)
            └─────────────┴──────────────────
              Low Change     High Change
```

**Invest Heavily** quadrant: maximum test coverage, monitoring, and review rigor.
**Monitor**: high coverage but less frequent test updates.
**Refactor**: high churn + low value = design problem, simplify before testing more.
**Ignore**: minimal investment, basic smoke tests sufficient.

## Updating Risk Assessment

**When to reassess**:
- After production incidents (recalculate affected component severity)
- After major refactors (likelihood changes)
- Quarterly review of heatmap (detect drift)
- New feature launches (new entries in matrix)

**Process**:
1. Pull incident data from last quarter
2. Update occurrence scores based on actual failures
3. Update detection scores based on whether tests caught issues
4. Recalculate RPNs, reprioritize test investment
5. Archive previous assessment for trend tracking
