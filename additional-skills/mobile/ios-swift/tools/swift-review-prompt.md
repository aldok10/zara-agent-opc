---
type: tool
title: "Swift Code Review Prompt"
---

# Swift Code Review Prompt

You are reviewing Swift/SwiftUI code for an iOS application. Evaluate against these criteria:

## Concurrency Safety
- Are actors used for shared mutable state?
- Is `@MainActor` applied to UI-bound ViewModels and view logic?
- Are closures crossing isolation boundaries marked `@Sendable`?
- Is `Task.isCancelled` checked in long-running loops?
- Are `nonisolated` methods truly safe (no mutable state access)?
- No force-unwrapping of task results without cancellation handling

## SwiftUI Architecture
- Is state ownership clear (who owns vs. who reads)?
- Are views small and focused (single responsibility)?
- Is `@Observable` used over `ObservableObject` for iOS 17+ targets?
- Are expensive computations memoized or computed lazily?
- Is navigation using NavigationStack with typed destinations?

## Memory and Performance
- No strong reference cycles in closures (use `[weak self]` where needed)
- Are images loaded asynchronously with proper caching?
- Are lists using `LazyVStack`/`List` for large data sets?
- No heavy work on MainActor (network, disk, computation)
- Are `AnyView` usages eliminated in favor of `@ViewBuilder` or `Group`?

## Error Handling
- Are errors typed at domain boundaries?
- Is `CancellationError` propagated (never swallowed)?
- Do async functions throw meaningful errors (not generic `Error`)?
- Are user-facing errors mapped to localized messages?

## Swift Idioms
- Value types (struct) preferred over reference types (class) where appropriate
- Protocol-oriented design over inheritance
- Guard-let for early returns instead of nested if-let
- Trailing closure syntax used appropriately
- Access control is explicit (`private`, `internal`, `public`)

## Testing
- Are dependencies injectable (protocol or closure-based)?
- Is business logic testable without UI framework?
- Are async tests using `async throws` properly?
- Is TCA code tested with `TestStore` exhaustive assertions?

## Output Format

For each issue found:
```
[SEVERITY] file:line - description
  Suggestion: how to fix
```

Severity: CRITICAL (crash/data-race), HIGH (performance/correctness), MEDIUM (maintainability), LOW (style).

End with a summary: total issues by severity, overall assessment (APPROVE/REQUEST_CHANGES/COMMENT).
