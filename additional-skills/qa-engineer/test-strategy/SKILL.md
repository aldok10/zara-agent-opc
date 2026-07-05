# Subskill: Test Strategy

> Activate when: test plan, pyramid, trophy, coverage allocation, risk matrix, test types, layer boundary, ISTQB, test approach
>
> Prevention > detection. Risk-based allocation. Pyramid for backends, trophy for frontends.

## Philosophy

- Risk drives coverage: high-impact paths get redundant multi-layer coverage.
- Pyramid (backend): 70% unit, 20% integration, 10% E2E.
- Trophy (frontend): static analysis > integration > unit > E2E.
- Coverage is a floor, not a target. Mutation score validates actual quality.
- Every bug gets a regression test BEFORE the fix.

## Risk Matrix

| Risk Level | Coverage Strategy | Example |
|---|---|---|
| Critical (payment, auth) | Unit + integration + E2E + contract + monitoring | Checkout flow, login |
| High (core features) | Unit + integration + E2E | User registration, search |
| Medium (supporting) | Unit + integration | Profile settings, notifications |
| Low (utilities, formatting) | Unit only | Date formatting, string helpers |

## Test Pyramid Ratios

**Backend services:**
- Unit (70%): pure logic, validators, transformers, domain rules
- Integration (20%): DB queries, HTTP clients, message handlers
- E2E (10%): critical user journeys only (5-10 paths max)

**Frontend apps (testing trophy):**
- Static analysis (base): TypeScript, ESLint, no runtime cost
- Integration (largest): component interactions, API calls, routing
- Unit (medium): pure functions, reducers, transformers
- E2E (small): critical flows (login, checkout, onboarding)

## Coverage Allocation

| Tier | Branch Coverage | Mutation Score | Test Types |
|---|---|---|---|
| Critical paths | >90% | >80% | Unit + Integration + E2E + Contract |
| Core features | >80% | >70% | Unit + Integration + E2E |
| Supporting code | >70% | >60% | Unit + Integration |
| Utilities | >50% | N/A | Unit |

## Metrics That Matter

1. **Defect escape rate**: bugs found in production / total bugs (target: <5%)
2. **MTTR (mean time to repair)**: how fast bugs are fixed once found
3. **Test stability rate**: % of test runs that are deterministic (target: >99%)
4. **Mutation score**: % of mutants killed (target: >80% critical)
5. **Feedback time**: how fast CI gives results (target: unit <5min, integration <15min)

## Test Planning Template

1. Identify critical paths (from product/business risk)
2. Map to test pyramid layers
3. Define coverage thresholds per tier
4. Choose tools per layer
5. Define data strategy (factories, hermetic, seeded)
6. Set CI pipeline structure (parallel, staged)
7. Define flaky test policy (quarantine, SLA)

## Decision Tree

- New service → characterization tests first if legacy, pyramid if greenfield
- Microservices → contract tests at boundaries mandatory
- Data pipeline → property-based testing for edge cases
- Critical flow → redundant coverage (multi-layer defense in depth)
- Frontend-heavy → testing trophy, integration-first
- Backend-heavy → test pyramid, unit-first

## Anti-Patterns

- Testing implementation details (breaks on refactor)
- 100% coverage as goal (diminishing returns past 80%)
- E2E for everything (slow, flaky, expensive)
- No integration tests ("unit tests pass but system breaks")
- Single metric for quality (coverage alone means nothing)

## AI-Era Context (2026)

Risk-based testing is essential since AI generates most code -- the question shifts from "do we have tests?" to "do our tests catch real defects?" Mutation score as a quality gate validates that AI-generated test suites actually detect faults, not just achieve line coverage. AI helps with test impact analysis (mapping code changes to affected tests) and test prioritization (run highest-risk tests first in CI). The strategy layer must account for AI-generated code having different defect profiles than human-written code: more pattern errors, fewer typos, more subtle logic gaps.

## Knowledge

- `subskills/coverage-metrics.md` -- coverage types and threshold guidance
- `subskills/risk-analysis.md` -- risk-based test allocation
- `subskills/test-planning.md` -- test plan structure and review
- `subskills/test-pyramid.md` -- pyramid vs trophy, layer allocation

## Delegates To

- **mutation-testing** when validating test quality
- **performance-testing** when load/latency budgets needed
- **chaos-engineering** when resilience coverage needed
- **api-testing** when contract testing at boundaries
