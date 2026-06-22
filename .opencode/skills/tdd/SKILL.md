---
name: tdd
description: Use when implementing any feature or bugfix, before writing implementation code. Enforces RED-GREEN-REFACTOR discipline with zero tolerance for code-before-test.
triggers:
  - implement feature
  - fix bug
  - add functionality
  - write code
  - new endpoint
  - new function
---

# TDD Discipline

## The Iron Law

**NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST.**

Write code before test? Delete it. Start over. No exceptions.
This is not a suggestion. This is the operating constraint.

---

## RED-GREEN-REFACTOR

### RED — Write ONE Failing Test

1. Write the smallest test that describes the next behavior
2. Run it. Watch it **fail**
3. Confirm it fails because the feature is missing — not because of typos, imports, or syntax

If the test passes immediately: you wrote the wrong test. Delete it.

### GREEN — Write the SIMPLEST Code to Pass

1. Write the absolute minimum code to make the test green
2. No extra features. No "while I'm here." No clever abstractions
3. Hardcode if that's all it takes. Triangulate with more tests later

If you're writing more than ~5 lines: you probably skipped a test.

### REFACTOR — Clean Up (Green Only)

1. Only after tests are green
2. Remove duplication, improve names, extract helpers
3. Run tests after every change — stay green
4. If tests break: undo, try smaller step

---

## Verification Protocol

Every cycle:
- [ ] Watched test fail (RED confirmed)
- [ ] Watched test pass (GREEN confirmed)
- [ ] Refactored without breaking tests

**Never skip watching the failure.** A test you didn't see fail proves nothing.

---

## Anti-Patterns (NEVER Do These)

- NEVER write production code before a failing test
- NEVER skip watching the test fail
- NEVER write more than one test before going green
- NEVER test implementation details instead of behavior
- NEVER say "just this once I'll skip TDD"
- NEVER claim "tests pass" without showing output
- NEVER refactor while in RED phase
- NEVER proceed with failing tests

---

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Too simple to test" | Simple code breaks. Off-by-one, null, empty string. |
| "I'll write tests after" | Tests that pass immediately prove nothing about correctness. |
| "I already tested manually" | No record, can't re-run, won't catch regressions. |
| "TDD will slow me down" | TDD is faster than debugging. You pay now or pay double later. |
| "This is just a refactor" | Refactors without tests are renames-and-prayers. |
| "The test is obvious" | Then it takes 30 seconds to write. Do it. |
| "I know this works" | Prove it. In code. That runs automatically. |

---

## Red Flags — STOP and Start Over

If any of these happen, delete the production code and restart the cycle:

- Wrote production code before a failing test
- Test passed immediately without new production code
- Can't explain in one sentence why the test failed
- Said "just this once" or "I'll come back to it"
- Wrote more than one test before going green
- Test is testing implementation details instead of behavior

---

## Verification Checklist (Before Moving On)

- [ ] Every public function/method has at least one test
- [ ] Watched each test fail before making it pass
- [ ] Each green step was minimal — no speculative code
- [ ] All tests pass
- [ ] Edge cases covered (null, empty, boundary, error paths)
- [ ] Tests describe behavior, not implementation

---

## Exceptions (Ask User First)

These may skip TDD — but confirm explicitly:

- Throwaway prototypes (will be deleted)
- Generated/scaffolded code (tested at integration level)
- Pure config files (no logic to test)
- Exploratory spikes (timebox, then rewrite with TDD)

If in doubt: write the test.

---

## Workflow Integration

1. Before touching any file, ask: "What test would fail if this feature existed?"
2. Create/find the test file first
3. Write the test. Run it. See red.
4. Write minimal code. Run it. See green.
5. Clean up. Run tests. Stay green.
6. Repeat until feature is complete.

## Related Knowledge (load on demand)

- `knowledge_passage(query: "test driven development")` — TDD practices article
- `knowledge_index(section: "testing")` — browse all testing articles
- `knowledge_passage(query: "testing practices continuous integration")` — when choosing testing approach

## Related Skills

| When | Load |
|------|------|
| Test fails unexpectedly | `systematic-debugging` |
| Implementation complete | `verification-before-completion` |
