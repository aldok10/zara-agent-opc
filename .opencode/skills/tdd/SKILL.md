---
name: tdd
description: "Test-Driven Development: red-green-refactor loop, test-first discipline, integration tests. Use when building a feature or fixing a bug with tests, or when the user asks for tests, TDD, or test-first work."
---

# Test-Driven Development

TDD is a red-green loop. This skill is the reference that keeps the loop honest, so the tests you write are worth keeping. Consult it before and during each cycle, not after.

A good test verifies behavior through a public interface, reads like a spec, and survives refactoring. It does not mock internals, re-derive expectations from the code under test, or slice horizontally.

## The Loop

1. **RED**: Write one failing test. It must fail for the right reason (behavior missing), not a setup error. Confirm it fails.
2. **GREEN**: Write the minimum code to pass it. Do not anticipate future tests.
3. **REFACTOR**: Improve the code without changing behavior. Refactoring is its own step; never skip it inside the loop.

One slice at a time: one seam, one test, one minimal implementation. Repeat until the behavior is complete.

## Rules of the Loop

- Red before green. Never write implementation first and test after.
- One slice per cycle. No horizontal slicing (all tests, then all code).
- Tests assert through public seams only. No implementation-coupled, tautological, or fake-passing tests.
- Run the suite after every step. No "done" without a green run.

## Seams

Before writing tests, agree the seams with the user: what public interface will we observe, and where is behavior observable without reaching into internals? No test on an un-agreed seam.

## Language Seams

Go: `_test.go` next to source. TypeScript: `*.test.ts` beside source or under `__tests__`. PHP: `tests/` mirroring src. Python: `tests/` or `_test.py` peers. Match the repo's existing convention first.

## Anti-Patterns

- **Implementation-coupled**: mocking internal collaborators, testing private methods, asserting via side channels. Breaks on refactor that changes no behavior.
- **Tautological**: `expect(add(a, b)).toBe(a + b)`. Expected value must come from an independent source of truth (known literal, working example, spec).
- **Horizontal slicing**: writing all tests then all code. Tests verify imagined behavior, not real behavior. Vertical slices only.

## Route to Subskill

| Signal | Load |
|--------|------|
| how to write good tests, public interface, assertion style | `subskills/writing-good-tests.md` |
| mocking, stubs, fakes, dependency seams | `subskills/mocking.md` |
| integration vs unit, test levels | `subskills/integration.md` |

## Verification

Before claiming done:
1. Every test ran red at least once before going green (unless trivial).
2. Suite passes: run the project's test command.
3. No anti-pattern listed above in the final tests.

## Related Skills

| When | Load |
|------|------|
| Reviewing the finished diff | `code-review` |
| Debugging a failing test's root cause | `systematic-debugging` |
| Choosing test strategy at scale | `testing-strategy` |
