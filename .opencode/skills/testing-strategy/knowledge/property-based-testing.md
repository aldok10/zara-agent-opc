---
type: fact
title: "Property-Based Testing - Invariants, Generators, Shrinking"
---

# Property-Based Testing

> Instead of specifying individual examples, you describe properties that must hold for ALL valid inputs. The framework generates hundreds of random inputs and finds the smallest failing case.

## Property-Based vs Example-Based

| Aspect | Example-Based | Property-Based |
|--------|--------------|----------------|
| Input selection | Manual, biased toward happy path | Random, explores edge cases |
| Coverage | Tests what you thought of | Tests what you didn't think of |
| Maintenance | One assertion per case | One property covers infinite cases |
| Debugging | Obvious failing input | Shrunk minimal counterexample |
| Best for | Known edge cases, regression | Invariant discovery, parser/codec |

Use property-based when:
- Function is pure or has clear invariants
- Input space is large (strings, lists, nested structures)
- Encode/decode or serialize/deserialize pairs exist
- You can express "for all valid X, property P holds"

## Invariant Discovery Methodology

1. **Round-trip**: `decode(encode(x)) === x` — serialization, compression, encryption
2. **Idempotence**: `f(f(x)) === f(x)` — formatting, normalization, deduplication
3. **Commutativity**: `sort(a ++ b) === sort(b ++ a)` — order-independent operations
4. **Monotonicity**: if `a > b` then `f(a) >= f(b)` — pricing, scoring
5. **Preservation**: `length(map(f, xs)) === length(xs)` — structural invariants
6. **Oracle**: compare your implementation against a known-correct (slower) reference
7. **Hard to compute, easy to verify**: factoring is hard, multiplication is easy

## fast-check (JavaScript/TypeScript)

```typescript
import fc from 'fast-check';

// Round-trip property
fc.assert(
  fc.property(fc.string(), (input) => {
    const encoded = encodeURIComponent(input);
    const decoded = decodeURIComponent(encoded);
    return decoded === input;
  })
);

// Custom generator: valid email
const emailArb = fc.tuple(
  fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')), { minLength: 1, maxLength: 20 }),
  fc.constantFrom('gmail.com', 'example.org', 'test.io')
).map(([local, domain]) => `${local}@${domain}`);

// Stateful testing: model-based
class ArrayModel {
  items: number[] = [];
  push(n: number) { this.items.push(n); }
  pop() { return this.items.pop(); }
  size() { return this.items.length; }
}

const pushCommand = fc.nat().map(n => ({
  check: () => true,
  run: (model: ArrayModel, real: number[]) => {
    model.push(n);
    real.push(n);
    expect(real.length).toBe(model.size());
  }
}));
```

### Configuration for CI

```typescript
fc.assert(property, {
  numRuns: 1000,              // default 100, increase for CI
  seed: process.env.FC_SEED   // reproducible failures
    ? parseInt(process.env.FC_SEED)
    : undefined,
  endOnFailure: true,         // stop at first failure
  verbose: fc.VerbosityLevel.VeryVerbose, // for debugging
});
```

## Hypothesis (Python)

```python
from hypothesis import given, settings, assume
from hypothesis.strategies import (
    text, integers, lists, composite, dictionaries
)

@given(text())
def test_encode_decode_roundtrip(s: str):
    assert s.encode('utf-8').decode('utf-8') == s

@given(lists(integers()))
def test_sort_idempotent(xs: list[int]):
    assert sorted(sorted(xs)) == sorted(xs)

@given(lists(integers(), min_size=1))
def test_max_in_list(xs: list[int]):
    m = max(xs)
    assert m in xs
    assert all(x <= m for x in xs)

# Custom composite strategy
@composite
def valid_user(draw):
    name = draw(text(min_size=1, max_size=50))
    age = draw(integers(min_value=0, max_value=150))
    assume(name.strip())  # filter: non-empty after strip
    return {"name": name, "age": age}

@settings(max_examples=500, deadline=None)
@given(valid_user())
def test_user_creation(user: dict):
    result = create_user(user["name"], user["age"])
    assert result.name == user["name"].strip()
```

### Hypothesis Profiles

```python
from hypothesis import settings, HealthCheck

settings.register_profile("ci", max_examples=1000, deadline=500)
settings.register_profile("dev", max_examples=50, deadline=200)
settings.register_profile("debug", max_examples=10,
    suppress_health_check=[HealthCheck.too_slow])

# Usage: pytest --hypothesis-profile=ci
```

## gopter/rapid (Go)

```go
// rapid: modern property-based testing for Go
import "pgregory.net/rapid"

func TestSortedSliceInvariant(t *testing.T) {
    rapid.Check(t, func(t *rapid.T) {
        xs := rapid.SliceOf(rapid.Int()).Draw(t, "xs")
        sort.Ints(xs)

        for i := 1; i < len(xs); i++ {
            if xs[i-1] > xs[i] {
                t.Fatalf("not sorted at index %d: %d > %d", i, xs[i-1], xs[i])
            }
        }
    })
}

func TestMapRoundtrip(t *testing.T) {
    rapid.Check(t, func(t *rapid.T) {
        key := rapid.String().Draw(t, "key")
        val := rapid.Int().Draw(t, "val")

        m := make(map[string]int)
        m[key] = val

        got, ok := m[key]
        if !ok || got != val {
            t.Fatalf("roundtrip failed for key=%q val=%d", key, val)
        }
    })
}
```

## QuickCheck (Haskell/Erlang)

The original property-based testing library. Key concepts that all others inherited:

- **Arbitrary typeclass**: auto-derive generators for your types
- **Shrinking**: find minimal counterexample by reducing input size
- **Labels/coverage**: ensure generated inputs hit important branches

```haskell
prop_reverse :: [Int] -> Bool
prop_reverse xs = reverse (reverse xs) == xs

prop_sort_ordered :: [Int] -> Bool
prop_sort_ordered xs = let sorted = sort xs
                       in and (zipWith (<=) sorted (tail sorted))
```

Erlang's PropEr and QuickCheck (Quviq) excel at stateful/concurrent system testing.

## Generator Composition

Build complex generators from simple ones:

1. **Primitives**: int, float, string, bool, bytes
2. **Collections**: list, set, dict, tuple with size control
3. **Combinators**: `oneOf`, `frequency`, `filter`, `map`
4. **Recursive**: trees, JSON, nested structures with depth bounds
5. **Domain**: build from your types (valid email, valid order, valid SQL)

Pattern: start with the simplest generator that covers your type, then constrain with `assume`/`filter`. If rejection rate is high (>50%), build a generator that only produces valid values.

## Shrinking Algorithms

When a test fails, the framework finds the minimal reproduction:

1. **Binary shrinking**: for numbers, try 0, then halve toward 0
2. **List shrinking**: remove elements, then shrink remaining elements
3. **String shrinking**: reduce length, then simplify characters (toward 'a')
4. **Structural shrinking**: shrink each field independently

Automatic shrinking (Hypothesis, rapid) derives shrinkers from generators. Manual shrinking (classic QuickCheck) requires explicit `shrink` function per type.

Shrinking is what makes property-based testing practical for debugging—instead of a 500-char failing string, you get the 3-char minimal case.

## Stateful / Model-Based Testing

Test stateful systems by comparing against a simplified model:

1. Define a model (simplified in-memory version of your system)
2. Generate sequences of commands (push, pop, get, put, delete)
3. Execute commands against both model and real system
4. Assert model and real system stay in sync after every command

Catches: ordering bugs, state corruption, race conditions (with concurrent command generation).

## When Property-Based > Example-Based

- Parsers and serializers (round-trip is the killer app)
- Data structure operations (sorted/balanced invariants)
- Mathematical functions (commutativity, associativity)
- State machines (model-based testing)
- Codec/compression (decompress(compress(x)) == x)
- API contracts (response schema always valid for any valid request)

## CI Integration

```yaml
# GitHub Actions
- name: Property tests
  run: pytest tests/property/ --hypothesis-profile=ci
  env:
    HYPOTHESIS_SEED: ${{ github.run_id }}  # reproducible per run

# On failure, print seed for local repro
- name: Print seed on failure
  if: failure()
  run: echo "Repro with HYPOTHESIS_SEED=${{ github.run_id }}"
```

Pin seeds in CI for reproducibility. On failure, the seed reproduces the exact counterexample locally. After fixing, remove the pin to continue exploring new inputs.
