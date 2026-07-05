---
type: fact
title: "Test Pyramid - Layer Decisions and Tradeoffs"
---

# Test Pyramid - Decisions and Tradeoffs

## Backend: Test Pyramid (Fowler/Google)

```
      /  E2E  \        10% - critical user journeys only
     /----------\
    / Integration \    20% - DB, HTTP, message queues
   /----------------\
  /      Unit        \  70% - pure logic, validators, domain
```

**When to use:** Compute-heavy backends, domain logic, data processing pipelines.

## Frontend: Testing Trophy (Kent C. Dodds)

```
      /   E2E   \       5% - critical flows (login, checkout)
     /  Unit     \     20% - pure functions, reducers
    /--------------\
   /  Integration   \  60% - components with interactions
  /------------------\
 /  Static Analysis   \  15% - TypeScript, ESLint (free)
```

**When to use:** UI-heavy apps, glue code, frontend applications.

## Decision Matrix

| Factor | Pyramid (Unit-heavy) | Trophy (Integration-heavy) |
|--------|---------------------|---------------------------|
| Business logic heavy | Yes | No |
| Lots of external integrations | No | Yes |
| Computation/algorithms | Yes | No |
| UI interactions | No | Yes |
| Data transformations | Yes | No |
| Service orchestration | No | Yes |

## Layer Boundaries

**Unit tests:**
- Pure functions (no I/O, no side effects)
- Domain logic, validators, transformers
- Fast (<1ms per test), no setup required
- Mock: nothing (or interfaces at constructor boundary)

**Integration tests:**
- Database queries (use testcontainers)
- HTTP handlers with real middleware
- Message queue consumers
- Mock: only external services you don't own

**E2E tests:**
- Critical user journeys (5-10 max)
- Full stack running (containers or staging)
- Mock: nothing (real everything)
- Slow but high confidence

## Common Mistakes

1. **All E2E**: slow, flaky, expensive, hard to debug
2. **All unit**: fast but misses integration bugs ("it works in isolation")
3. **No integration**: unit tests pass but system breaks at boundaries
4. **Testing framework code**: testing that React renders a component (React's job)
5. **Testing private methods**: breaks on refactor, test through public API
