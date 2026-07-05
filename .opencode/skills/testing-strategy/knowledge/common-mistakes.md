---
type: fact
title: "Testing Common Mistakes - Production Lessons"
---

## Testing Implementation (Not Behavior)

| Mistake | Impact | Fix |
|---------|--------|-----|
| Testing private methods via reflection | Tests break on every refactor | Test through public API |
| Asserting internal state not observable output | Refactoring impossible | Assert on returns/side effects |
| One-to-one test-to-method mapping | Structural change cascades | Organize by behaviors/use-cases |

## Over-Mocking

| Mistake | Impact | Fix |
|---------|--------|-----|
| Mocking everything including value objects | Tests verify wiring not logic | Mock only at I/O boundaries |
| Mocks don't respect signatures/return types | False positives, runtime crashes | Typed mocks/fakes enforcing contracts |
| Repetitive mock setup across tests | Linear maintenance scaling | Test builders/factories; fakes over mocks |

## Flaky Tests

| Mistake | Impact | Fix |
|---------|--------|-----|
| Hardcoded timeouts for async code | Pass locally, fail on CI | Polling/retry waitFor patterns |
| Dependency on system clock | Fails near midnight, DST, slow CI | Inject clock abstraction |
| Dependency on external services | Intermittent network failures | Contract tests + wiremock |
| Test execution order dependency | Pass alone, fail together | Each test owns setup/teardown; randomize order |

## Shared Mutable State

| Mistake | Impact | Fix |
|---------|--------|-----|
| Shared DB fixtures without isolation | Test A mutation breaks Test B | Transaction rollback per test |
| Global/static mutable state | Fixture leakage between tests | Reset in teardown; prefer DI |
| Shared in-memory DB without scoping | Concurrent corruption | One connection per test |

## Snapshot Abuse

| Mistake | Impact | Fix |
|---------|--------|-----|
| Large serialized snapshot assertions | Any change triggers update, rubber-stamp diffs | Targeted property assertions |
| Committing updates without review | Regressions baked into approved snapshots | Treat diffs like code changes |

## Slow Test Suites

| Mistake | Impact | Fix |
|---------|--------|-----|
| Integration tests in unit suite | 20+ min CI, devs skip tests | Separate tiers (unit <5s, integration <60s) |
| Heavy fixture setup per test | CI costs balloon | Shared read-only fixtures; in-memory alternatives |
| Not parallelizing independent tests | Linear time growth | Ensure isolation then parallelize |

## Coverage as Vanity

| Mistake | Impact | Fix |
|---------|--------|-----|
| Targeting 100% without assertion quality | Assertion-free testing, false confidence | Mutation testing score alongside coverage |
| Tests solely to increase number | Trivial tests with zero value | Focus on complex logic and error paths |

## TDD Anti-Patterns

| Mistake | Impact | Fix |
|---------|--------|-----|
| Tests after code called TDD | Tests confirm implementation not specify behavior | Strict Red-Green-Refactor |
| Skipping refactor step | Code accumulates duplication | Treat refactoring as mandatory |

## E2E Brittleness

| Mistake | Impact | Fix |
|---------|--------|-----|
| Brittle CSS selectors | Any UI refactoring breaks all E2E | data-testid attributes or a11y roles |
| Testing UI for unit-testable logic | Slow, flaky, expensive | Test pyramid; push down |
| No retry for dynamic content | Fails on slow renders | waitFor/eventually patterns |

## Missing Edge Cases

| Mistake | Impact | Fix |
|---------|--------|-----|
| Only testing happy path | Crashes on null/empty/boundary | Property-based testing; boundary analysis |
| Not testing error handling | Exceptions bubble unhandled | Assert error responses and fallback |

## Test Design

| Mistake | Impact | Fix |
|---------|--------|-----|
| God tests (15 assertions) | First failure masks rest | One concept per test |
| No naming convention | Can't understand what broke | should_verb_when_condition format |
| Copy-paste test code | Changing logic touches dozens of tests | Test helpers, builders, matchers |
