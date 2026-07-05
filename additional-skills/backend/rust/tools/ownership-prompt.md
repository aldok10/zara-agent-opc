---
type: tool
title: "Rust Ownership Troubleshooting"
---

# Rust Ownership Troubleshooting

## Purpose

Diagnose and resolve Rust borrow checker errors, lifetime annotation issues, and ownership transfer problems. Provides systematic approaches to common compiler error patterns.

## When to Use

- Borrow checker errors that are unclear (E0502, E0505, E0597, E0515)
- Lifetime annotation confusion (where to add, what they mean)
- Choosing between owned, borrowed, and reference-counted types
- Restructuring code to satisfy the borrow checker
- Deciding when to use Clone, Rc, Arc, or interior mutability

## Prompt Template

```
CONTEXT:
- Rust edition: [2021 | 2024]
- Error code: [E0502 | E0505 | E0597 | E0515 | E0382 | other]
- Compiler message: [paste the error]
- Code context: [relevant function/struct, simplified]
- Intent: [what the code should accomplish]

DIAGNOSIS FRAMEWORK:
1. Identify the conflict
   - Who owns the value?
   - Who is borrowing (shared & or exclusive &mut)?
   - Where do lifetimes overlap that shouldn't?
   - Is the value moved when it's still needed?

2. Common error patterns
   - E0502: shared borrow while mutable borrow active
   - E0505: moved value still borrowed
   - E0597: value does not live long enough
   - E0515: cannot return reference to local variable
   - E0382: use after move
   - E0499: multiple mutable borrows

3. Resolution strategies (prefer top to bottom)
   - Restructure: reorder operations, split borrows, narrow scope
   - Clone: acceptable for small/infrequent data
   - Rc/Arc: shared ownership (single/multi-thread)
   - RefCell/Mutex: interior mutability (runtime borrow check)
   - Indices: store index instead of reference (common in graphs)
   - Lifetime annotations: explicit when compiler can't infer

4. Lifetime annotations
   - Function: fn foo<'a>(x: &'a str) -> &'a str
   - Struct: struct Foo<'a> { bar: &'a str }
   - Elision rules: when you can omit
   - 'static: truly lives forever or owned/leaked
   - HRTB: for<'a> when lifetime is caller-chosen

5. Smart pointer selection
   - Box<T>: single owner, heap allocation
   - Rc<T>: multiple owners, single thread
   - Arc<T>: multiple owners, multi-thread
   - Cow<'a, T>: clone-on-write, flexible ownership
   - Pin<T>: prevent moves (async, self-referential)

ANTI-PATTERNS:
- Blanket .clone() to silence borrow checker (hides real issue)
- Unnecessary Rc/Arc when restructuring would suffice
- 'static everywhere (overly restrictive)
- Unsafe to bypass borrow checker without justification
```

## Output Format

```
## Ownership Fix: [error code]

### Problem
[What the compiler is preventing and why it's correct to prevent it]

### Root Cause
[The fundamental ownership conflict]

### Solution Options
| Option | Approach | Trade-off | Recommended |
|--------|----------|-----------|-------------|
| A | ... | ... | yes/no |
| B | ... | ... | yes/no |

### Recommended Fix
[Code showing the fix with explanation comments]

### Why This Works
[Explanation of how the fix satisfies ownership rules]

### Prevention
- [Pattern to use in similar situations going forward]
```
