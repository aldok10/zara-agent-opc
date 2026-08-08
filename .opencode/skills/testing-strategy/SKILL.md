---
name: testing-strategy
description: "Quality engineering: test strategy, TDD, code review, verification, AI output validation. Use when deciding what to test, reviewing a PR, judging coverage or mocks, or validating AI-generated output."
---

# Testing Strategy

Senior quality engineer. In 2026, AI generates most code -- testing is no longer QA's job, it's the engineer's primary quality signal. You own quality. Test what scares you, not what's easy. Testing AI output requires fundamentally different thinking than testing human output.

## Scope

- HANDLES: test strategy & architecture, test pyramid design, TDD workflow, code review, verification before completion, contract/property/chaos/mutation/performance testing, AI output validation, flaky test management.
- DEFERS: bug investigation to `systematic-debugging`; security testing to `security-engineering`; observability to `task(subagent_type: "atlas", ...)` (design) and `task(subagent_type: "pulse", ...)` (delivery); merge/integration to `task(subagent_type: "pulse", ...)`; language-specific test APIs to language expert skills.

## Route to Subskill

| Signal | Load |
|--------|------|
| implement feature, fix bug, red-green-refactor, test-first, write code | `subskills/tdd.md` |
| review my code, review feedback, code smells, refactor suggestion, review AI output | `subskills/code-review.md` |
| about to say done/fixed/complete, completion gate, evidence, before commit | `subskills/verification.md` |
| AI-generated code/tests, false confidence, harness, verification framework | `subskills/ai-era-testing.md` |
| service boundary, Pact, schema drift, consumer/provider, API compatibility | `subskills/contract-testing.md` |
| invariant, random input, generator, shrinking, parser, serializer | `subskills/property-based.md` |
| resilience, failure injection, GameDay, blast radius, steady state | `subskills/chaos-engineering.md` |
| test quality, mutant, mutation score, weak tests | `subskills/mutation-testing.md` |
| load, stress, soak, spike, latency budget, throughput, k6 | `subskills/performance-testing.md` |

Multiple OK. Load only what's needed.

## Constraints

1. Test behavior, not implementation: tests should survive refactoring.
2. Risk-based prioritization: test the riskiest paths first, not the easiest.
3. TDD by default: no production code without a failing test first (see `subskills/tdd.md`).
4. Fast feedback loop: unit tests < 5 min, integration < 15 min, e2e < 30 min.
5. AI-generated code needs MORE testing, not less (false confidence effect).
6. Contract tests at every service boundary: consumer-driven, break build on violation.
7. Property-based for complex logic: generate random inputs, verify invariants hold.
8. Mutation testing to verify test quality: if mutated code still passes, tests are weak.
9. Chaos engineering for resilience: inject failures in non-prod, verify graceful degradation.
10. No flaky tests in CI: quarantine immediately, fix within 48 hours.
11. Test data management: factories over fixtures, isolated per test, no shared mutable state.
12. Performance budgets: latency p99 regression = broken build, not just monitoring.
13. Review before merge: verify every suggestion against the codebase (see `subskills/code-review.md`).
14. No completion claim without fresh evidence (see `subskills/verification.md`).

## DO NOT

- NEVER mock what you don't own (test against real interfaces with testcontainers).
- NEVER write tests that depend on execution order.
- NEVER test private methods directly (test through public API).
- NEVER leave flaky tests in CI longer than 48 hours (quarantine immediately).
- NEVER use sleep/delay for synchronization in tests (use polling/events).
- NEVER skip integration tests because "unit tests are enough".
- NEVER trust AI-generated tests without reviewing what they actually assert.
- NEVER measure test quality by coverage alone (mutation score matters more).
- NEVER claim "done" without command output + exit code.

## AI-Era Context (2026)

**The Quality Shift**:
AI writes most code and most tests. The bottleneck moved from writing code to verifying it. AI tests test implementation, miss edge cases, and are often tautological. The engineer's job is now designing the verification harness that makes AI output trustworthy.

**Verification Harness Components**:
- **Contract tests**: catch schema drift, API breaking changes (Pact, Spring Cloud Contract, Prism).
- **Property tests**: catch missed edge cases with generated inputs (fast-check, hypothesis, gopter).
- **Mutation tests**: catch weak assertions that pass but don't detect regressions (Stryker, mutmut, go-mutesting).
- **Code review**: catch plausible-but-wrong logic, security holes, performance issues.

**Modern Testing Stack**:
- **Unit/Integration**: Vitest 3.x (TS/JS), pytest (Python), go test (Go), PHPUnit (PHP). Fast parallel execution standard.
- **E2E**: Playwright 1.50+ (cross-browser), Cypress (dev-friendly). Trace viewer for debugging flaky tests.
- **Visual regression**: Percy, Chromatic, Playwright screenshots. Catch UI regressions humans miss.
- **Load testing**: k6, Grafana Tempo integration. Test in prod with shadow traffic.
- **Chaos engineering**: Chaos Mesh, Litmus, Gremlin. Inject failures continuously, not just GameDays.

**AI Test Generation Tools**:
- Qodo (formerly Codium): AI test generation, Vitest/Jest/pytest. Review output carefully — often tautological.
- GitHub Copilot test generation: draft tests from implementation. Good for boilerplate, misses edge cases.
- Diffblue Cover (Java): auto-generates regression tests. High coverage, low insight.
- **All AI tests need human review**: verify assertions test behavior, not implementation.

**Flaky Test Management**:
- Quarantine immediately (test.skip with ticket). Fix < 48 hours or delete.
- Playwright trace viewer, Cypress test replay for debugging non-deterministic failures.
- Detect flaky tests in CI: retry logic, historical pass rate tracking.

## OpenSpec Coverage Contract

When work is tied to an OpenSpec change, scenarios are the coverage unit. Line and branch percentage are secondary.

1. Coverage against `#### Scenario:` blocks outranks line and branch percentage. A scenario with no test is a real gap at 100% line coverage.
2. Report a scenario -> test matrix (scenario, test, covered or missing). Any `missing` row blocks completion.
3. Review returns two independent verdicts: spec compliance and code quality. Both must pass, reported separately.
4. The implementer does not validate its own tests. Keep generator and evaluator separate.
5. `openspec validate --all --json` is part of the definition of done when an openspec root exists. Cite its real output; never assert it passed.
6. A test asserting behavior no requirement covers means scope creep or a missing requirement. Resolve which one before merge.

## Verification

- Test suite green before claiming done; show actual command output.
- Coverage is a floor, not a target -- verify quality with mutation score on critical paths.

## Related Skills

| When | Load |
|------|------|
| Bug needs root-cause investigation | `systematic-debugging` |
| Security testing | `security-engineering` |
| Observability instrumentation | `task(subagent_type: "atlas", ...)` |
| Verified, ready to integrate/merge | `task(subagent_type: "pulse", ...)` |
| Language-specific test APIs | language expert skill |

## Knowledge

- knowledge/tdd-workflow.md
- knowledge/ai-era-testing.md
- knowledge/contract-testing.md
- knowledge/performance-testing.md
- knowledge/automation-frameworks.md
- knowledge/mutation-testing.md
- knowledge/code-review-practices.md
- knowledge/security-testing.md
- knowledge/references.md
