# TDD Workflow

NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST. Wrote code before the test? Delete it, start over.

## RED-GREEN-REFACTOR

1. **RED**: write the smallest test describing the next behavior. Run it. Watch it fail because the feature is missing (not typos/imports). Passes immediately? Wrong test, delete it.
2. **GREEN**: write the absolute minimum to pass. No extra features. Hardcode if that's all it takes. >5 lines? You skipped a test.
3. **REFACTOR** (green only): remove duplication, improve names. Run tests after every change. Break? Undo, smaller step.

One test at a time before going green. Test behavior, not implementation details.

## First Action

Before touching any file, ask: "What test would fail if this feature existed?" Create/find the test file first.

## DO NOT

- NEVER write production code before a failing test.
- NEVER skip watching the test fail (a test you didn't see fail proves nothing).
- NEVER write more than one test before going green.
- NEVER refactor while in RED.
- NEVER claim "tests pass" without showing output.
- NEVER say "just this once I'll skip TDD".

## Rationalizations (all false)

| Rationalization | Reality |
|-----------------|---------|
| "Too simple to test" | Simple code breaks: off-by-one, null, empty |
| "I'll write tests after" | Tests passing immediately prove nothing |
| "I tested manually" | No record, can't re-run, misses regressions |
| "TDD slows me down" | Faster than debugging: pay now or double later |
| "Just a refactor" | Refactors without tests are renames-and-prayers |

## When to TDD vs When Not

- **TDD**: features, bug fixes (write the failing regression test first), any logic with branches/edges.
- **Skip (ask user first)**: throwaway prototypes, generated/scaffolded code, pure config, exploratory spikes (timebox then rewrite). In doubt: write the test.

## Verification

- [ ] Watched each test fail before making it pass.
- [ ] Each green step minimal, no speculative code.
- [ ] Edge cases covered (null, empty, boundary, error).
- [ ] All tests pass (output shown).
