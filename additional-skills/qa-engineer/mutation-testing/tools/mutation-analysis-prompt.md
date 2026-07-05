---
type: tool
title: "Mutation Score Improvement Prompt"
---

# Mutation Score Improvement Prompt

## Purpose
Analyze survived mutants and design targeted tests to improve mutation score.

## Inputs Required
- Mutation testing report (HTML or summary)
- Source file(s) with survived mutants
- Existing test file(s) for those sources
- Current mutation score
- Target mutation score

## Analysis Steps

### 1. Identify Survived Mutants
From the mutation report, categorize survivors:

```markdown
## Survived Mutants Analysis

### By Category
| Category | Count | Example |
|----------|-------|---------|
| Boundary mutations (< → <=) | [n] | line X: `age > 18` → `age >= 18` |
| Return value | [n] | line X: `return true` → `return false` |
| Statement deletion | [n] | line X: `validate()` removed |
| Conditional | [n] | line X: `if(x)` → `if(true)` |
| Arithmetic | [n] | line X: `total + tax` → `total - tax` |

### By Risk
- High (business logic): [list lines]
- Medium (validation): [list lines]
- Low (cosmetic): [list lines]
- Equivalent (can't be killed): [list lines]
```

### 2. Classify Each Survivor

For each survived mutant, determine:
- **Killable**: write a test targeting the exact condition
- **Equivalent**: mark as excluded (same behavior)
- **Dead code**: the mutated code is unreachable → remove it
- **Trivial**: low-risk code where testing isn't worth the cost

### 3. Design Killing Tests

For each killable mutant:

```markdown
## Test Design

### Mutant: [operator] at [file:line]
- Original: `if (balance > 0)`
- Mutant: `if (balance >= 0)`
- Why it survived: no test checks the boundary (balance == 0)
- Fix: add test with balance = 0, assert different behavior

```typescript
it('rejects withdrawal when balance is exactly zero', () => {
  const account = new Account({ balance: 0 });
  expect(() => account.withdraw(1)).toThrow('Insufficient funds');
});
```
```

### 4. Batch Test Creation

Group related survivors and write focused tests:

```typescript
describe('boundary conditions', () => {
  // Kills mutant at order.ts:45 (quantity > 0 → quantity >= 0)
  it('rejects zero quantity orders', () => {
    expect(() => createOrder({ quantity: 0 })).toThrow();
  });

  // Kills mutant at order.ts:52 (total > limit → total >= limit)
  it('rejects order at exactly the limit', () => {
    expect(() => createOrder({ total: MAX_LIMIT })).toThrow();
  });

  // Kills mutant at order.ts:60 (discount < 1.0 → discount <= 1.0)
  it('rejects 100% discount', () => {
    expect(() => applyDiscount(1.0)).toThrow();
  });
});
```

### 5. Verify Improvement

```bash
# Run mutation testing again on targeted file
npx stryker run --mutate 'src/services/order.ts'

# Compare scores
echo "Before: [X]%, After: [Y]%, Delta: [+Z]%"
```

## Output Format

```markdown
## Mutation Score Improvement Plan

### Current State
- Score: [X]%
- Survived: [N] mutants
- Equivalent (excluded): [M] mutants

### Action Items
| # | File:Line | Mutant Type | Action | Test to Write |
|---|-----------|-------------|--------|---------------|
| 1 | order.ts:45 | Boundary | Kill | Test zero quantity |
| 2 | order.ts:52 | Boundary | Kill | Test exact limit |
| 3 | order.ts:70 | Return val | Kill | Assert return used |
| 4 | order.ts:88 | Arithmetic | Equivalent | Exclude |

### Tests to Add ([count])
[code snippets for each test]

### Expected Score After: [X]% → [Y]%

### Configuration Updates
- Exclude equivalent mutants: [list]
- Remove dead code at: [list lines]
```
