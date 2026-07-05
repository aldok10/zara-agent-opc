---
type: tool
title: ".NET Code Review"
---

# .NET Code Review

## Purpose

Review .NET/C# code for correctness, performance, and idiomatic patterns. Focuses on async/await usage, dependency injection, middleware pipeline, and modern C# features.

## When to Use

- Reviewing ASP.NET Core controllers, services, or middleware
- Evaluating async/await patterns for deadlocks or missed cancellation
- Checking DI registration and lifetime management
- Reviewing EF Core queries for performance issues

## Prompt Template

```
CONTEXT:
- .NET version: [.NET 8 | .NET 9]
- Project type: [ASP.NET Core API | Worker Service | Blazor | MAUI]
- Code to review: [paste code or file path]
- Dependencies: [EF Core | MediatR | MassTransit | etc.]

REVIEW AGAINST:
1. Async/await: ConfigureAwait usage, cancellation token propagation,
   avoiding async void, no sync-over-async (.Result/.Wait())
2. DI lifetimes: Singleton vs Scoped vs Transient correctness,
   captive dependency detection (scoped in singleton)
3. Middleware: order matters (auth before routing), short-circuit logic
4. EF Core: tracking vs no-tracking, N+1 queries, projection vs full entity,
   compiled queries for hot paths
5. Error handling: ProblemDetails pattern, global exception handler,
   no swallowed exceptions
6. Configuration: Options pattern with validation, no magic strings
7. Performance: object pooling, Span<T>/Memory<T> where applicable,
   minimal allocations in hot paths
8. Security: input validation with FluentValidation/DataAnnotations,
   parameterized queries, output encoding

IDENTIFY:
- Thread pool starvation risks
- Memory leaks (undisposed IDisposable, event handler subscriptions)
- Missing null checks (or misuse of null-forgiving operator)
- Incorrect HTTP status codes in responses
- Missing request validation
```

## Output Format

```
## .NET Review: [class/feature name]

### Summary
[1-2 sentence verdict]

### Issues
| # | Category | Severity | Line/Area | Description | Fix |
|---|----------|----------|-----------|-------------|-----|
| 1 | ...      | ...      | ...       | ...         | ... |

### Positive Patterns
- [What's done well]

### Suggested Refactors
1. [Specific improvement with code snippet]
2. ...
```
