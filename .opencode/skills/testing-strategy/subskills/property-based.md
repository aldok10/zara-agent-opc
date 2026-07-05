---
type: subskill
title: "Property-Based Testing"
---

# Property-Based Testing

Instead of asserting specific input/output examples, define PROPERTIES that must always hold, then let the framework generate hundreds or thousands of random inputs to try to break them.

## The Shift

Example-based test: `sort([3,1,2]) == [1,2,3]`. Tests one case you thought of.

Property-based test: "for ANY list, the output of sort is ordered and is a permutation of the input." Tests thousands of cases you didn't think of, including the nasty ones.

## Common Properties

- **Ordering**: output is always sorted.
- **Round-trip**: `deserialize(serialize(x)) == x` (identity).
- **Never crashes**: no exception for any valid input.
- **Bounds**: result is always within an expected range.
- **Invariants**: total count is conserved, balance never goes negative.
- **Idempotence**: `f(f(x)) == f(x)`.
- **Commutativity / equivalence**: two code paths produce the same result.

## Tools

- **Hypothesis** (Python)
- **fast-check** (TypeScript/JavaScript)
- **Rapid** (Go)
- **QuickCheck** (Haskell -- the original)

## Shrinking

The killer feature: when the framework finds a failing input, it automatically reduces it to the MINIMAL failing case. Instead of a 500-element list with random values, it hands you `[0, -1]`. Always read and fix the shrunk example -- it points straight at the root cause.

## When to Use

- Parsers and serializers (round-trip properties).
- Data transformations and encoders/decoders.
- Mathematical operations.
- State machines (model-based testing: apply random sequences of operations, assert invariants after each).

## When NOT to Use

- Simple CRUD with no logic.
- UI rendering.
- Side-effectful code with no clear invariant.

## Anti-Patterns

- **Properties too weak**: "doesn't crash" is barely useful; assert real invariants.
- **Generators too complex**: over-engineered custom generators become their own source of bugs.
- **Ignoring shrunk examples**: the minimal case is the gift -- reproduce it as a regression test.
- **Non-deterministic properties**: seed the RNG and pin failing seeds so failures reproduce.
