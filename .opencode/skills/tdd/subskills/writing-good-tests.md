---
type: subskill
title: "Writing Good Tests"
---

# Writing Good Tests

A test verifies behavior through a public interface. It reads like a spec and survives refactoring. Anything that breaks when you change internals without changing behavior is not testing behavior.

## Characteristics

1. **Assert through public seams**: name the thing you observe (return value, thrown error, emitted event, response). Never poke internals.
2. **Read as a spec**: test name states the behavior, body shows the given/when/then. A reader learns the contract from the tests.
3. **Independent expected values**: the expected value comes from a known literal, a working example, or the spec, never from re-running the code under test.
4. **One behavior per test**: a failing test pinpoints one missing behavior. Multiple asserts are fine only when they assert one coherent behavior.

## Structure

```
func TestName(t *testing.T)          // Go: behavior in the name
describe("Name", () => { it(...) })  // TS: behavior in the it()
public function testName(): void     // PHP/Python: behavior in the name
```

Arrange (set up), Act (single action), Assert (observe the seam). Keep the Act line to one call or one event.

## Writing the assertion

- Compare against the simplest independent truth: a literal, a fixture, an invariant, a golden file, a property.
- For collections: assert the meaningful subset (has, count, order when relevant), not the whole object unless the whole matters.
- For errors: assert the error was raised and, when it matters, the kind of error, not the formatted message.

## When a test is not a good test

- It passed before the code existed (tautology or dead code path).
- It must change when you refactor internals with no behavior change (implementation-coupled).
- It is slow enough to tempt you to skip it (mock or slice instead).
- It tests a framework's behavior, not yours.

## Verification

1. Delete the implementation line; the test fails. Restore it; the test passes.
2. Rename a private field or method; the test still passes.
