---
type: subskill
title: "Test Pyramid"
---

# Test Pyramid

## Pyramid vs Trophy: Decision Framework

| Factor | Pyramid (Google) | Trophy (Kent C. Dodds) |
|--------|-----------------|----------------------|
| Backend/infra heavy | Preferred | Less applicable |
| Frontend/UI heavy | Less applicable | Preferred |
| Microservices | Adapted (add contract layer) | N/A |
| Monolith | Classic fit | Works for web monoliths |
| Team maturity | Any | Requires integration test skill |

**Rule**: if your system has more logic than UI, use pyramid. If it's mostly UI composition, use trophy.

## Layer Boundaries

### Unit Tests (base - most numerous)
- Pure functions, business logic, calculations
- Single module in isolation, dependencies mocked
- Speed: < 10ms each, run on every save
- Catches: logic errors, edge cases, regressions

### Integration Tests (middle)
- Module interactions, database queries, API handlers
- Real dependencies where practical (testcontainers, in-memory DB)
- Speed: < 1s each, run on commit/PR
- Catches: wiring errors, query bugs, serialization issues

### Contract Tests (microservices addition)
- API compatibility between services
- Consumer-driven contracts (Pact, Spring Cloud Contract)
- Speed: seconds, run on PR
- Catches: breaking changes between services before deploy

### E2E Tests (top - fewest)
- Critical user journeys only (login, checkout, signup)
- Real browser/client, production-like environment
- Speed: 10-60s each, run pre-deploy
- Catches: deployment issues, environment config, full-stack bugs

## Cost/Speed/Confidence Tradeoffs

| Layer | Speed | Cost to Write | Cost to Maintain | Confidence |
|-------|-------|---------------|------------------|------------|
| Unit | Fastest | Low | Low | Low (isolated) |
| Integration | Medium | Medium | Medium | Medium-High |
| E2E | Slowest | High | Very High | Highest |

**Optimization**: maximize integration tests for best confidence-per-dollar.

## Frontend vs Backend Differences

**Backend pyramid**:
- Heavy unit layer (business logic, domain models)
- Integration: DB queries, HTTP handlers, message consumers
- E2E: API smoke tests, critical workflows

**Frontend trophy**:
- Light unit layer (utilities, pure transforms only)
- Heavy integration: component + hooks + state together
- E2E: critical user flows in real browser
- Static analysis counts as base layer (TypeScript, ESLint)

## Common Anti-Patterns

### Ice Cream Cone (inverted pyramid)
- Too many E2E, few unit tests
- Slow CI, flaky tests, expensive maintenance
- Symptom: "tests are slow and unreliable"

### Hourglass
- Many unit + many E2E, missing integration layer
- Units pass but system fails when wired together
- Symptom: "all tests pass but prod is broken"

### Cupcake
- Duplicate coverage across layers (same scenario at every level)
- Wasted effort, slow suite, no additional confidence
- Symptom: "one change breaks 50 tests"

## Migration: Ice Cream Cone to Pyramid

1. **Stop**: no new E2E tests for non-critical paths
2. **Identify**: which E2E tests cover logic testable at unit level
3. **Extract**: write unit tests for that logic, delete redundant E2E
4. **Fill middle**: add integration tests for module interactions
5. **Quarantine**: move flaky E2E to nightly, not blocking CI
6. **Measure**: track test execution time and flake rate weekly
7. **Iterate**: target 70% unit, 20% integration, 10% E2E ratio
