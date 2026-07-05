---
type: tool
title: "Go Code Review"
---

# Go Code Review

## Purpose

Review Go code for correctness, concurrency safety, and idiomatic patterns. Focuses on goroutine lifecycle, error handling, stdlib-first approach, and interface design.

## When to Use

- Reviewing Go services, handlers, or packages
- Evaluating goroutine/channel patterns for leaks or races
- Checking error handling and context propagation
- Validating interface design and package boundaries

## Prompt Template

```
CONTEXT:
- Go version: [1.22+ | 1.23+]
- Project type: [HTTP service | CLI | library | gRPC service]
- Code to review: [paste code or file path]
- Key dependencies: [stdlib-only | chi | sqlx | gRPC | etc.]

REVIEW AGAINST:
1. Concurrency: goroutine lifecycle (who starts, who stops), context cancellation,
   WaitGroup/errgroup usage, no goroutine leaks
2. Error handling: wrapped errors with %w, sentinel vs type errors,
   errors.Is/As usage, no silently discarded errors
3. Context: propagation through call chain, timeout/deadline management,
   context.Value only for request-scoped cross-cutting data
4. Interfaces: accept interfaces return structs, small interfaces (1-3 methods),
   defined at consumer not producer
5. Resource management: defer for cleanup, proper Close() on readers/connections,
   sync.Pool for allocation-heavy paths
6. Testing: table-driven tests, test helpers with t.Helper(),
   no exported test utilities
7. Package design: minimal public API, internal/ for non-exported,
   avoid circular dependencies
8. Performance: avoid unnecessary allocations, pre-size slices/maps,
   strings.Builder for concatenation, sync.Once for init

IDENTIFY:
- Data races (shared state without mutex/channel)
- Goroutine leaks (no cancellation path)
- Nil pointer dereference risks
- Missing context propagation
- Error handling that loses context
- Overuse of empty interface (any)
```

## Output Format

```
## Go Review: [package/file name]

### Summary
[1-2 sentence verdict]

### Issues
| # | Category | Severity | Line/Area | Description | Fix |
|---|----------|----------|-----------|-------------|-----|
| 1 | ...      | ...      | ...       | ...         | ... |

### Concurrency Assessment
- [Goroutine lifecycle: safe/leak-risk]
- [Shared state: protected/unprotected]

### Positive Patterns
- [What follows Go idioms well]

### Suggested Changes
1. [Specific improvement]
2. ...
```
