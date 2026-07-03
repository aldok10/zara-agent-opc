---
name: tdd
description: RED-GREEN-REFACTOR discipline, test before implementation
triggers:
  - implement feature
  - fix bug
  - add functionality
  - write code
  - new endpoint
  - new function
---

# TDD Discipline

NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST. Wrote code before test? Delete it. Start over. No exceptions.

## Scope

- HANDLES: RED-GREEN-REFACTOR cycle, test-first discipline, behavior testing.
- DEFERS: unexpected test failure to `systematic-debugging`; completion checks to `verification-before-completion`.

## First Action

Before touching any file, ask: "What test would fail if this feature existed?" Create/find the test file first.

## Constraints

1. RED: write the smallest test describing the next behavior. Run it. Watch it fail because the feature is missing (not typos/imports). Passes immediately? Wrong test, delete it.
2. GREEN: write the absolute minimum to pass. No extra features. Hardcode if that's all it takes. >5 lines? You skipped a test.
3. REFACTOR (green only): remove duplication, improve names. Run tests after every change. Break? Undo, smaller step.
4. One test at a time before going green.
5. Test behavior, not implementation details.

## DO NOT

- NEVER write production code before a failing test.
- NEVER skip watching the test fail (a test you didn't see fail proves nothing).
- NEVER write more than one test before going green.
- NEVER test implementation details instead of behavior.
- NEVER say "just this once I'll skip TDD".
- NEVER claim "tests pass" without showing output.
- NEVER refactor while in RED.
- NEVER proceed with failing tests.

## Rationalizations (all false)

| Rationalization | Reality |
|-----------------|---------|
| "Too simple to test" | Simple code breaks: off-by-one, null, empty |
| "I'll write tests after" | Tests passing immediately prove nothing |
| "I tested manually" | No record, can't re-run, misses regressions |
| "TDD slows me down" | Faster than debugging: pay now or double later |
| "Just a refactor" | Refactors without tests are renames-and-prayers |
| "The test is obvious" | Then it takes 30 seconds. Do it. |

## Workflow

1. Find/create test file.
2. Write test, run, see RED.
3. Write minimal code, run, see GREEN.
4. Clean up, run tests, stay green.
5. Repeat until feature complete.

## Verification

- [ ] Watched each test fail before making it pass.
- [ ] Each green step minimal, no speculative code.
- [ ] All tests pass (output shown).
- [ ] Edge cases covered (null, empty, boundary, error).
- [ ] Tests describe behavior, not implementation.

## Exceptions (ask user first)

Throwaway prototypes, generated/scaffolded code, pure config, exploratory spikes (timebox then rewrite). In doubt: write the test.

## Related Skills

| When | Load |
|------|------|
| Test fails unexpectedly | `systematic-debugging` |
| Implementation complete | `verification-before-completion` |

## Knowledge (load on demand)

- `knowledge_passage(query: "test driven development")` · `knowledge_index(section: "testing")`
