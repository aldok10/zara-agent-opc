---
type: tool
title: "Property-Based Testing Prompt"
---

# Property-Based Testing Prompt

You are helping design property-based tests: discovering invariants, building generators, and writing shrinkable test cases.

## Input

**System under test:** {{function | module | API endpoint}}
**Language/framework:** {{python_hypothesis | typescript_fast-check | haskell_quickcheck | rust_proptest}}
**Domain:** {{describe the data/behavior being tested}}
**Known edge cases:** {{list any already known}}

## Invariant Discovery Process

### Step 1: Identify Properties

For any function `f(input) -> output`, ask:

1. **Round-trip**: Can we reverse the operation? `decode(encode(x)) == x`
2. **Idempotency**: Does applying twice equal applying once? `f(f(x)) == f(x)`
3. **Commutativity**: Does order matter? `f(a, b) == f(b, a)`
4. **Associativity**: Does grouping matter? `f(f(a, b), c) == f(a, f(b, c))`
5. **Identity**: Is there a no-op input? `f(x, identity) == x`
6. **Invariant preservation**: What must always be true about the output?
7. **Monotonicity**: Does more input mean more output? `a <= b => f(a) <= f(b)`
8. **Size relationships**: `len(filter(xs)) <= len(xs)`
9. **Oracle comparison**: Is there a simpler (slower) implementation to compare against?
10. **No-crash**: At minimum, does it handle all valid inputs without exceptions?

### Step 2: Categorize by Type

| Input Type | Common Properties |
|-----------|-------------------|
| Numeric | Overflow, underflow, negative, zero, NaN, Infinity |
| String | Empty, unicode, null bytes, very long, RTL, injection chars |
| Collection | Empty, single element, duplicates, sorted/unsorted, very large |
| Time/Date | Leap year, DST transitions, epoch, far future, timezone edge |
| Graph/Tree | Cycles, disconnected, single node, deeply nested |

### Step 3: Define Generators

```python
# Python (Hypothesis)
from hypothesis import given, strategies as st

# Composite generator for domain objects
@st.composite
def orders(draw):
    items = draw(st.lists(
        st.builds(OrderItem,
            name=st.text(min_size=1, max_size=100),
            price=st.decimals(min_value=0.01, max_value=10000, places=2),
            quantity=st.integers(min_value=1, max_value=999)
        ),
        min_size=1, max_size=50
    ))
    return Order(items=items, created=draw(st.datetimes()))
```

```typescript
// TypeScript (fast-check)
import fc from "fast-check";

const orderArb = fc.record({
  items: fc.array(
    fc.record({
      name: fc.string({ minLength: 1, maxLength: 100 }),
      price: fc.float({ min: 0.01, max: 10000, noNaN: true }),
      quantity: fc.integer({ min: 1, max: 999 }),
    }),
    { minLength: 1, maxLength: 50 }
  ),
  created: fc.date(),
});
```

## Property Test Patterns

### Pattern 1: Encode/Decode Round-Trip

```python
@given(st.binary())
def test_compress_decompress_roundtrip(data):
    assert decompress(compress(data)) == data
```

### Pattern 2: Oracle (Model-Based)

```python
@given(st.lists(st.integers()))
def test_sort_matches_reference(xs):
    assert my_sort(xs) == sorted(xs)  # compare against known-good
```

### Pattern 3: Invariant After Mutation

```python
@given(orders())
def test_total_never_negative(order):
    assert order.calculate_total() >= 0

@given(orders(), st.integers(min_value=1))
def test_discount_never_exceeds_total(order, discount_pct):
    assume(discount_pct <= 100)
    discounted = order.apply_discount(discount_pct)
    assert discounted.total <= order.total
    assert discounted.total >= 0
```

### Pattern 4: Symmetry

```python
@given(st.dictionaries(st.text(), st.integers()))
def test_serialize_keys_preserved(d):
    result = deserialize(serialize(d))
    assert set(result.keys()) == set(d.keys())
```

### Pattern 5: Metamorphic (Input Transformation -> Predictable Output Change)

```python
@given(st.lists(st.integers(), min_size=1))
def test_adding_element_increases_length(xs):
    new_element = 42
    assert len(xs + [new_element]) == len(xs) + 1
```

## Generator Design Principles

1. **Cover the domain boundaries**: min/max values, empty states, exactly-at-limit
2. **Shrinking matters**: use built-in strategies that shrink well; avoid `flatmap` when `map` works
3. **Assume sparingly**: `assume(condition)` filters; too much filtering = slow tests
4. **Explicit over random**: if you know edge cases, add `@example(edge_case)` explicitly
5. **Custom generators for custom types**: compose from base strategies, not from raw randomness
6. **Reproducibility**: seed-based; always log the failing seed

## Output Format

```
## Properties Identified
1. [property name]: [invariant statement]
   - Type: [round-trip | oracle | invariant | symmetry | metamorphic]
   - Generator needed: [description]

## Generators
[code for custom generators]

## Test Cases
[property-based test code]

## Edge Cases to Add as Explicit Examples
- [case]: [why it matters]

## Limitations
- [properties that cannot be tested this way]
- [generator constraints]
```

## Rules

- Properties must be universally true, not just true for sampled inputs.
- If you find yourself writing `assert result == expected_specific_value`, that is an example-based test, not a property.
- Prefer many simple properties over one complex property.
- Flaky property tests indicate a bug in the property definition, not in the system.
- Always check that the generator can actually produce the edge cases you care about.
