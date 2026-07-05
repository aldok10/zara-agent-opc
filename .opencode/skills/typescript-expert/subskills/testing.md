---
type: subskill
title: "Subskill: Testing TypeScript"
---

# Subskill: Testing TypeScript

## Framework choice

- **Vitest**: default for most. Fast (esbuild), Jest-compatible API, native ESM/TS, great DX, `expectTypeOf` for type-level tests built in.
- **node:test**: zero-dep, built into Node. Good for libs that don't want a test dep. Pair with `tsx`/native TS.
- **bun:test**: if you're on Bun. Fast, Jest-ish.
- Avoid Jest for new TS/ESM projects unless the ecosystem forces it; the ESM story is painful.

## Test behavior, not implementation

```typescript
import { describe, it, expect } from "vitest";

describe("parseAmount", () => {
  it("parses valid decimal", () => {
    expect(parseAmount("12.50")).toEqual({ ok: true, value: 1250 });
  });
  it("rejects negative", () => {
    const r = parseAmount("-1");
    expect(r.ok).toBe(false);
  });
});
```
Assert on the contract (inputs -> outputs), not private internals. Refactors shouldn't break tests if behavior is unchanged.

## Type-level testing (for public type APIs)

```typescript
import { expectTypeOf } from "vitest";
expectTypeOf<Awaited<Promise<number>>>().toEqualTypeOf<number>();
expectTypeOf(parseAmount).returns.toMatchTypeOf<{ ok: boolean }>();
```
Or `tsd` for standalone. Essential when you ship types as an API surface: a type regression is as real as a runtime one.

## Mocking discipline

- Mock at boundaries (network, fs, clock), not internal functions.
- `vi.fn()`, `vi.spyOn()`, `vi.mock()`. Reset between tests (`vi.restoreAllMocks()` in `afterEach`).
- Fake timers for time-dependent logic: `vi.useFakeTimers()`.
- Inject dependencies (constructor/params) so tests pass fakes without monkey-patching. DI beats mocking frameworks.

## Coverage

- `vitest --coverage` (v8 or istanbul). Aim high on logic, don't chase 100% on glue.
- Coverage measures lines executed, NOT correctness. A test with no assertions has coverage and zero value. Assert.

## Determinism (no flaky tests)

- Control randomness (seed or inject), mock time, isolate state (fresh fixtures per test).
- Async: await everything, no dangling promises, use `vi.waitFor` for eventual conditions.
- Parallel-safe: no shared mutable global; each test owns its data.

## The senior test-review lens

- Does this test fail if the behavior breaks? (Mutation-test mentally.)
- Does it test the contract or the implementation?
- Would it survive a legitimate refactor?
- Are the assertions specific (`toEqual(exact)`) not vague (`toBeTruthy()`)?
