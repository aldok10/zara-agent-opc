---
type: tool
title: "Rust Code Review"
---

# Rust Code Review

## Purpose

Review Rust code for correctness, safety, and idiomatic patterns. Focuses on ownership semantics, lifetime annotations, unsafe usage justification, and error handling.

## When to Use

- Reviewing Rust services, libraries, or CLI tools
- Evaluating ownership/borrowing patterns for correctness
- Auditing unsafe blocks for soundness
- Checking error handling and trait design

## Prompt Template

```
CONTEXT:
- Rust edition: [2021 | 2024]
- Project type: [web service | CLI | library | embedded | systems]
- Framework: [Axum | Actix | Tokio | none]
- Code to review: [paste code or file path]
- Key crates: [serde | tokio | sqlx | etc.]

REVIEW AGAINST:
1. Ownership: appropriate use of references vs owned data,
   Clone only when necessary, Cow for read-mostly data,
   Arc/Rc only for shared ownership
2. Lifetimes: minimize explicit annotations, lifetime elision rules followed,
   no unnecessary 'static, proper lifetime bounds on structs
3. Error handling: thiserror for library errors, anyhow for applications,
   no unwrap() in library code, ? propagation, error context
4. Unsafe: minimal unsafe surface, documented invariants,
   safety comments on every unsafe block, no UB
5. Concurrency: Send/Sync bounds correct, no data races,
   proper use of Mutex/RwLock (avoid poisoning issues),
   async cancellation safety
6. API design: builder pattern for complex construction,
   newtype for type safety, sealed traits for extensibility control
7. Performance: avoid unnecessary allocations, iterator chains over collect,
   #[inline] only where measured, zero-copy parsing where possible
8. Clippy compliance: all default lints pass, pedantic where appropriate,
   allow only with documented reason

IDENTIFY:
- Potential undefined behavior in unsafe blocks
- Memory leaks (reference cycles with Rc, forgotten futures)
- Deadlock potential (lock ordering, async mutex held across await)
- API unsoundness (safe function that can trigger UB)
- Unnecessary Clone/allocation in hot paths
- Missing Send/Sync bounds for async contexts
```

## Output Format

```
## Rust Review: [crate/module name]

### Summary
[1-2 sentence verdict]

### Issues
| # | Category | Severity | Line/Area | Description | Fix |
|---|----------|----------|-----------|-------------|-----|
| 1 | ...      | ...      | ...       | ...         | ... |

### Safety Assessment
- [Unsafe blocks: count, justified/unjustified]
- [Soundness: sound/potential-UB]

### Ownership Patterns
- [Appropriate/over-cloned/lifetime-issues]

### Positive Patterns
- [What follows Rust idioms well]

### Suggested Changes
1. [Specific improvement]
2. ...
```
