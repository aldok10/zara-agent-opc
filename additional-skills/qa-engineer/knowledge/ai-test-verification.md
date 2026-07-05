---
type: fact
title: "AI Test Verification - Validating AI-Generated Test Quality"
---

# Verifying AI-Generated Test Quality

## The Problem (2026)

AI generates most tests. The failure mode: tests compile and pass but assert nothing meaningful (tautological tests). 64% of LLM-generated test errors are assertion errors -- they test what IS, not what SHOULD BE.

## Tautological Test Detection

A test is tautological when it derives expected values from the implementation instead of requirements:

```typescript
// TAUTOLOGICAL (bad) - mirrors implementation
test('calculateTax', () => {
  const result = calculateTax(100, 0.2);
  expect(result).toBe(100 * 0.2); // just repeating the code
});

// MEANINGFUL (good) - derives from requirements
test('calculateTax applies 20% rate', () => {
  expect(calculateTax(100, 0.2)).toBe(20); // known answer
  expect(calculateTax(0, 0.2)).toBe(0);     // edge: zero
  expect(calculateTax(-1, 0.2)).toThrow();  // edge: negative
});
```

## Verification Checklist for AI-Generated Tests

1. **Independent oracle**: expected values from requirements/spec, not code
2. **Edge cases present**: null, empty, boundary, error, concurrent
3. **Assertions on behavior**: not just "didn't throw" but correct output
4. **Mutation survives?**: run Stryker -- if tests pass with mutants, they're hollow
5. **No mirror logic**: test doesn't duplicate SUT logic to compute expected
6. **Failure message meaningful**: if it fails, can you understand what broke?
7. **Actually exercises code path**: trace through, does it hit the intended branch?

## AI Test Smells

| Smell | Detection | Fix |
|-------|-----------|-----|
| Mirror logic | Expected = reimplementation | Use hardcoded known values |
| Happy path only | No error/edge cases | Add boundary + error tests |
| Weak assertion | `expect(result).toBeDefined()` | Assert specific values |
| Over-mocking | Everything mocked, nothing real | Test with real deps where possible |
| Tautological | Expected derived from SUT | Independent oracle from spec |
| Copy-paste | Same structure, different names | Review intent per test |

## Workflow: AI Generates, Human Verifies

1. AI generates test (fast, broad coverage)
2. Run mutation testing (automated quality check)
3. If mutation score <80%: flag for human review
4. Human reviews: intent alignment, oracle independence, edge cases
5. Fix weak tests: strengthen assertions, add edges
6. Promote to CI suite only after verification

## Tools for Verification

- **Stryker/PIT/mutmut**: mutation score reveals hollow assertions
- **Coverage with mutation**: high coverage + low mutation score = tautological
- **Diff review**: compare test logic to SUT logic (should be different)
- **Property-based**: generate random inputs, verify invariants (can't be tautological)
