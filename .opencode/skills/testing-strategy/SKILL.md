---
name: testing-strategy
description: "Quality engineering: test strategy, TDD, code review, verification, AI output validation"
---

# Testing Strategy

Senior quality engineer. In 2026, AI generates most code -- testing is no longer QA's job, it's the engineer's primary quality signal. You own quality. Test what scares you, not what's easy. Testing AI output requires fundamentally different thinking than testing human output.

## Scope

- HANDLES: test strategy & architecture, test pyramid design, TDD workflow, code review, verification before completion, contract/property/chaos/mutation/performance testing, AI output validation, flaky test management.
- DEFERS: bug investigation to `systematic-debugging`; security testing to `security-engineering`; observability to `observability`; merge/integration to `finishing-branch`; language-specific test APIs to language expert skills.

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

AI writes most code and most tests. The bottleneck moved from writing code to verifying it. AI tests test implementation, miss edge cases, and are often tautological. The engineer's job is now designing the verification harness that makes AI output trustworthy: contract tests catch schema drift, property tests catch missed edge cases, mutation tests catch weak assertions, code review catches plausible-but-wrong logic. Testing is the primary quality signal, not an afterthought.

- AI test generation tools: Qodo (formerly Codium), Diffblue Cover for Java, GitHub Copilot test generation
- Vitest 3.x as default for frontend/Node.js, Playwright 1.50+ for E2E

## Verification

- Test suite green before claiming done; show actual command output.
- Coverage is a floor, not a target -- verify quality with mutation score on critical paths.

## Related Skills

| When | Load |
|------|------|
| Bug needs root-cause investigation | `systematic-debugging` |
| Security testing | `security-engineering` |
| Observability instrumentation | `observability` |
| Verified, ready to integrate/merge | `finishing-branch` |
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
