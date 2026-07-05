---
type: example
title: "Stryker Mutation Testing Configuration"
---

# Stryker Mutation Testing Configuration

## Context
When you need confidence that your test suite actually catches bugs, not just achieves line coverage. Mutation testing injects small changes (mutants) into source code and verifies tests fail. Surviving mutants reveal weak test assertions.

## Code/Template

```json
// stryker.config.json
{
  "$schema": "https://raw.githubusercontent.com/stryker-mutator/stryker4s/master/stryker4s-core/src/main/resources/stryker4s-schema.json",
  "packageManager": "npm",
  "reporters": ["html", "clear-text", "progress", "dashboard"],
  "testRunner": "vitest",
  "vitest": {
    "configFile": "vitest.config.ts"
  },
  "coverageAnalysis": "perTest",
  "mutate": [
    "src/**/*.ts",
    "!src/**/*.test.ts",
    "!src/**/*.spec.ts",
    "!src/**/index.ts",
    "!src/**/*.d.ts",
    "!src/generated/**"
  ],
  "thresholds": {
    "high": 80,
    "low": 60,
    "break": 50
  },
  "incremental": true,
  "incrementalFile": ".stryker-tmp/incremental.json",
  "concurrency": 4,
  "timeoutMS": 10000,
  "timeoutFactor": 1.5,
  "mutator": {
    "excludedMutations": [
      "StringLiteral",
      "ObjectLiteral"
    ]
  },
  "ignorePatterns": [
    "dist",
    "node_modules",
    ".stryker-tmp"
  ]
}
```

```typescript
// Example: Source code with common mutation targets
// src/pricing/discount.ts
export function calculateDiscount(
  price: number,
  quantity: number,
  memberTier: 'basic' | 'gold' | 'platinum'
): number {
  if (price <= 0 || quantity <= 0) {
    return 0;
  }

  let discount = 0;

  // Boundary mutation: > vs >= vs < etc.
  if (quantity >= 10) {
    discount += 0.1;
  }
  if (quantity >= 50) {
    discount += 0.05;
  }

  // Conditional mutation: tier checks
  switch (memberTier) {
    case 'platinum':
      discount += 0.15;
      break;
    case 'gold':
      discount += 0.08;
      break;
    case 'basic':
      discount += 0.02;
      break;
  }

  // Arithmetic mutation: + vs - vs *
  const maxDiscount = 0.3;
  const finalDiscount = Math.min(discount, maxDiscount);

  return Math.round(price * quantity * (1 - finalDiscount) * 100) / 100;
}
```

```typescript
// Tests that kill mutants effectively
// src/pricing/discount.test.ts
import { describe, it, expect } from 'vitest';
import { calculateDiscount } from './discount';

describe('calculateDiscount', () => {
  // Kills boundary mutants (<=0 conditions)
  it('returns 0 for zero price', () => {
    expect(calculateDiscount(0, 5, 'basic')).toBe(0);
  });

  it('returns 0 for negative quantity', () => {
    expect(calculateDiscount(100, -1, 'basic')).toBe(0);
  });

  // Kills quantity threshold mutants (>= 10, >= 50)
  it('no volume discount below 10 units', () => {
    expect(calculateDiscount(100, 9, 'basic')).toBe(882); // only 2% member
  });

  it('applies 10% volume at exactly 10 units', () => {
    expect(calculateDiscount(100, 10, 'basic')).toBe(880); // 10% + 2% = 12%
  });

  it('applies additional 5% at 50 units', () => {
    expect(calculateDiscount(10, 50, 'basic')).toBe(415); // 10+5+2=17%
  });

  // Kills tier mutants
  it('platinum gets 15% member discount', () => {
    expect(calculateDiscount(100, 1, 'platinum')).toBe(85);
  });

  it('gold gets 8% member discount', () => {
    expect(calculateDiscount(100, 1, 'gold')).toBe(92);
  });

  // Kills max discount cap mutant
  it('caps total discount at 30%', () => {
    // platinum(15%) + qty>=50(15%) = 30% exactly at cap
    expect(calculateDiscount(100, 50, 'platinum')).toBe(3500);
  });
});
```

```bash
# CI integration - run only on changed files (incremental mode)
npx stryker run --incremental

# Full run for release validation
npx stryker run --concurrency 8

# Target specific module
npx stryker run --mutate "src/pricing/**/*.ts"
```

## Key Points
- Set `thresholds.break` to fail CI when mutation score drops below acceptable level—treats mutant survival as a real signal
- Use `incremental: true` in development to only re-test mutants for changed code; full runs on release branches
- Exclude string literals and generated code to reduce noise; focus on logic, arithmetic, and conditional mutations
