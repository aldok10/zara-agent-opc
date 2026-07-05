---
type: subskill
title: "Verification"
---

# Verification

How to verify AI-generated code. "I approve this" = "I own this in production."

## Verification hierarchy (check in order)

1. **Type-check / compile**  --  minimum bar, catches ~60% of nonsense
2. **Existing tests pass**  --  regression gate
3. **New tests for new code**  --  AI generates them, then YOU verify the tests
4. **Security scan**  --  SAST: semgrep, gosec, bandit
5. **Architecture fit**  --  does this pattern belong in this codebase?
6. **Edge cases**  --  null, empty, max int, unicode, concurrent access
7. **Performance**  --  benchmark if on a performance-sensitive path

## Don't read every line

Use test-driven verification. If tests are comprehensive, implementation details matter less  --  the behavior is pinned.

## BUT verify the tests

AI-generated tests may:
- Test implementation instead of behavior
- Miss edge cases
- Be tautological (assert what the code just did)

Read the tests more carefully than the code. Weak tests give false confidence.

## Trust calibration by domain

- **High trust (spot-check)**: CRUD, serialization, config, formatting
- **Medium trust (careful review)**: business logic, data transformation, API contracts
- **Zero trust (thorough audit)**: auth, payments, encryption, PII handling, deletions

## Red flags in AI output

- Overly complex solution for a simple problem
- Import of an unfamiliar library
- Hardcoded values
- Missing error handling
- Commented-out code
- TODO left behind

## Tooling

CI gates (all tests + lint + SAST), mutation testing (test quality), property-based testing (edge case coverage).

## Key principle

If you can't explain it, don't approve it. Approval is ownership.

## Anti-patterns

- Rubber-stamping
- Only checking the happy path
- Skipping the security scan
- Trusting tests without reading them
