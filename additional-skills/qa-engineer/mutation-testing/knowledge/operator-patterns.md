---
type: fact
title: "Mutation Operators and Equivalent Mutants"
---

# Mutation Operators and Equivalent Mutants

## What is Mutation Testing?

Mutation testing evaluates test quality by introducing small code changes (mutants) and checking if tests detect them. If a test fails when a mutant is introduced, the mutant is "killed." If tests still pass, the mutant "survived"  -  indicating a test gap.

**Mutation Score** = Killed Mutants / Total Mutants × 100%

## Mutation Operator Categories

### Arithmetic Operators
| Original | Mutant | Name |
|----------|--------|------|
| `a + b` | `a - b` | AOR (Arithmetic Operator Replacement) |
| `a * b` | `a / b` | AOR |
| `a % b` | `a * b` | AOR |
| `a++` | `a--` | UOI (Unary Operator Insertion) |

### Relational Operators
| Original | Mutant | Name |
|----------|--------|------|
| `a > b` | `a >= b` | ROR (Relational Operator Replacement) |
| `a == b` | `a != b` | ROR |
| `a <= b` | `a < b` | ROR |
| `a >= b` | `a > b` | ROR (boundary) |

### Conditional Operators
| Original | Mutant | Name |
|----------|--------|------|
| `a && b` | `a \|\| b` | COR (Conditional Operator Replacement) |
| `!a` | `a` | COR (negation removal) |
| `if (cond)` | `if (true)` | COR |
| `if (cond)` | `if (false)` | COR |

### Return Value Mutations
| Original | Mutant | Name |
|----------|--------|------|
| `return x` | `return 0` | RVR |
| `return x` | `return null` | RVR |
| `return true` | `return false` | BooleanMutator |
| `return ""` | `return "mutated"` | StringMutator |
| `return []` | `return [null]` | ArrayMutator |

### Statement Mutations
| Original | Mutant | Name |
|----------|--------|------|
| `doSomething()` | `` (removed) | Statement Deletion |
| `break` | `` (removed) | Break/Continue Removal |
| `throw err` | `` (removed) | Exception Removal |

### Assignment Mutations
| Original | Mutant | Name |
|----------|--------|------|
| `x = a + b` | `x = a - b` | Assignment Replacement |
| `x += 1` | `x -= 1` | Compound Assignment |

## Equivalent Mutants

An equivalent mutant produces the same observable behavior as the original code. No test can detect it because it's functionally identical.

### Common Equivalent Mutant Patterns

```typescript
// Original
function clamp(val: number, min: number, max: number) {
  if (val < min) return min;
  if (val > max) return max;
  return val;
}

// Equivalent mutant (when val == min, both return min)
function clamp(val: number, min: number, max: number) {
  if (val <= min) return min;  // Mutant: < → <=
  if (val > max) return max;
  return val;
}
// When val == min: original returns val (which IS min), mutant returns min. Same result.
```

### Why Equivalent Mutants Are a Problem
- They inflate the denominator (total mutants)
- They appear as "survived" but can't be killed
- Manual review needed to identify them
- Typically 5-15% of all mutants are equivalent

### Detecting Equivalent Mutants
1. **Compiler optimization**: if the compiler produces identical bytecode, likely equivalent
2. **Constraint analysis**: if the mutated condition can never trigger differently
3. **Pattern recognition**: tools mark suspected equivalents
4. **Manual review**: last resort for borderline cases

### Dealing with Equivalent Mutants
- Mark them as excluded in configuration
- Don't chase 100% mutation score (90-95% is excellent)
- Focus on "survived" mutants in critical business logic
- Use `// Stryker disable next-line` or equivalent for known equivalents

## High-Value Mutations to Focus On

| Priority | Operator Type | Why |
|----------|--------------|-----|
| High | Conditional boundary (< → <=) | Off-by-one errors |
| High | Return value (true → false) | Logic inversions |
| High | Statement deletion | Verifies side effects tested |
| Medium | Arithmetic | Calculation correctness |
| Medium | Negation removal | Boolean logic coverage |
| Low | String mutations | Often cosmetic |
| Low | Constant replacement | May be equivalent |

## Interpreting Results

| Mutation Score | Interpretation |
|----------------|----------------|
| > 90% | Excellent test coverage and quality |
| 80-90% | Good, review survivors for real gaps |
| 60-80% | Significant test gaps exist |
| < 60% | Tests provide little confidence |

### What to Do with Survivors
1. Is it an equivalent mutant? → Mark as excluded
2. Is it in dead code? → Remove the dead code
3. Is it in critical logic? → Write a test to kill it
4. Is it in trivial code? → Assess risk, may be acceptable
