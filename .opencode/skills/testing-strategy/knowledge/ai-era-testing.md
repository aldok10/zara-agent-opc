---
type: fact
title: "AI-Era Testing"
---
# AI-Era Testing

## The Problem with AI-Generated Tests

AI-generated tests often suffer from:

- **Hollow assertions**: tests that pass but verify nothing meaningful
- **Tautological tests**: testing that the code does what it does (not what it should)
- **Missing edge cases**: happy path coverage without boundary testing
- **Implementation coupling**: tests that mirror the implementation rather than verify behavior

```typescript
// HOLLOW: this tests nothing meaningful
test('processOrder works', async () => {
  const result = await processOrder(mockOrder);
  expect(result).toBeDefined(); // So what? null would fail too
});

// MEANINGFUL: verifies actual business logic
test('processOrder applies 10% discount for orders over $100', async () => {
  const order = { items: [{ price: 120, qty: 1 }] };
  const result = await processOrder(order);
  expect(result.total).toBe(108); // 120 - 10% = 108
  expect(result.discount).toBe(12);
});
```

## Mutation Testing as Verification

Mutation testing modifies your code and checks if tests catch the change. If a mutation survives (tests still pass), your tests are weak.

### Stryker (JavaScript/TypeScript)

```json
// stryker.conf.json
{
  "mutator": {
    "excludedMutations": ["StringLiteral"]
  },
  "testRunner": "vitest",
  "reporters": ["html", "clear-text", "progress"],
  "coverageAnalysis": "perTest",
  "thresholds": { "high": 80, "low": 60, "break": 50 }
}
```

```bash
npx stryker run
```

### PIT (Java)

```xml
<plugin>
  <groupId>org.pitest</groupId>
  <artifactId>pitest-maven</artifactId>
  <configuration>
    <targetClasses>com.myapp.service.*</targetClasses>
    <targetTests>com.myapp.service.*Test</targetTests>
    <mutationThreshold>80</mutationThreshold>
  </configuration>
</plugin>
```

### Common Surviving Mutations

| Mutation | Meaning | Fix |
|----------|---------|-----|
| Changed `>` to `>=` | Boundary not tested | Add test at exact boundary |
| Removed method call | Side effect not verified | Assert the effect |
| Changed return value | Return value not checked | Add assertion on result |
| Negated condition | Branch not tested | Add test for both branches |

## Property-Based Testing

Instead of specific examples, define properties that must always hold.

### fast-check (TypeScript)

```typescript
import fc from 'fast-check';

// Property: sorting is idempotent
test('sort(sort(arr)) === sort(arr)', () => {
  fc.assert(
    fc.property(fc.array(fc.integer()), (arr) => {
      const sorted = arr.slice().sort((a, b) => a - b);
      const doubleSorted = sorted.slice().sort((a, b) => a - b);
      expect(doubleSorted).toEqual(sorted);
    })
  );
});

// Property: serialization roundtrip
test('parse(serialize(x)) === x', () => {
  fc.assert(
    fc.property(fc.record({
      id: fc.uuid(),
      name: fc.string(),
      age: fc.integer({ min: 0, max: 150 }),
    }), (user) => {
      const serialized = serialize(user);
      const deserialized = parse(serialized);
      expect(deserialized).toEqual(user);
    })
  );
});

// Property: transfer preserves total balance
test('transfer preserves total balance', () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 0, max: 10000 }),
      fc.integer({ min: 0, max: 10000 }),
      fc.integer({ min: 0, max: 10000 }),
      (balanceA, balanceB, amount) => {
        fc.pre(amount <= balanceA); // precondition
        const totalBefore = balanceA + balanceB;
        const [newA, newB] = transfer(balanceA, balanceB, amount);
        expect(newA + newB).toBe(totalBefore);
      }
    )
  );
});
```

### Hypothesis (Python)

```python
from hypothesis import given, strategies as st

@given(st.lists(st.integers()))
def test_sort_preserves_length(lst):
    assert len(sorted(lst)) == len(lst)

@given(st.lists(st.integers(), min_size=1))
def test_sort_first_is_minimum(lst):
    assert sorted(lst)[0] == min(lst)
```

## Independent Oracle Principle

Verify AI-generated output against an independent source of truth.

```typescript
// AI generates an optimized function
// Verify against naive but obviously correct implementation

function naiveCalculateDiscount(items: Item[]): number {
  let total = 0;
  for (const item of items) {
    total += item.price * item.qty;
  }
  if (total > 100) return total * 0.1;
  return 0;
}

test('optimized discount matches naive implementation', () => {
  fc.assert(
    fc.property(
      fc.array(fc.record({ price: fc.integer({ min: 1, max: 1000 }), qty: fc.integer({ min: 1, max: 10 }) })),
      (items) => {
        expect(optimizedCalculateDiscount(items)).toBe(naiveCalculateDiscount(items));
      }
    )
  );
});
```

## Human Review Gates for AI-Generated Code

### Review Checklist

- [ ] Does each test have a meaningful assertion (not just `toBeDefined`)?
- [ ] Are edge cases covered (empty input, null, max values, concurrent access)?
- [ ] Do test names describe behavior, not implementation?
- [ ] Is there at least one negative test (what should NOT happen)?
- [ ] Run mutation testing -- do all critical mutations get caught?
- [ ] Does the test fail when the implementation is wrong? (Invert logic and check)

### Verification Harness Design

```typescript
// Wrap AI-generated functions with contract verification
function withContracts<T extends (...args: any[]) => any>(
  fn: T,
  precondition: (...args: Parameters<T>) => boolean,
  postcondition: (result: ReturnType<T>, ...args: Parameters<T>) => boolean
): T {
  return ((...args: Parameters<T>) => {
    if (!precondition(...args)) {
      throw new Error(`Precondition violated: ${JSON.stringify(args)}`);
    }
    const result = fn(...args);
    if (!postcondition(result, ...args)) {
      throw new Error(`Postcondition violated: result=${JSON.stringify(result)}`);
    }
    return result;
  }) as T;
}

// Usage
const safeTransfer = withContracts(
  transfer,
  (from, to, amount) => amount >= 0 && from.balance >= amount,
  (result, from, to, amount) => {
    const totalBefore = from.balance + to.balance;
    return result.from.balance + result.to.balance === totalBefore;
  }
);
```

## Testing AI Outputs in Production

```typescript
// Shadow testing: run AI output alongside known-good implementation
async function shadowTest(input: Request) {
  const [aiResult, baselineResult] = await Promise.all([
    aiService.process(input),
    baselineService.process(input),
  ]);

  if (!deepEqual(aiResult, baselineResult)) {
    logger.warn({
      event: 'ai_divergence',
      input: sanitize(input),
      aiResult,
      baselineResult,
    });
    metrics.increment('ai.divergence');
  }

  return baselineResult; // Always serve baseline in shadow mode
}
```
