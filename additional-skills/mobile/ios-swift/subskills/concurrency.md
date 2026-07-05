---
type: subskill
title: "Concurrency"
---

# Concurrency

## Core Concepts

- Swift concurrency uses async/await with structured task hierarchies (like structured concurrency)
- Actors protect mutable state: only one task accesses actor state at a time  -  no data races
- @MainActor ensures code runs on the main thread  -  required for UI updates
- Task groups enable parallel work with automatic child task cancellation on parent cancel
- Sendable protocol marks types safe to pass across concurrency boundaries

## Key Practices

- Mark view models as @MainActor  -  UI state updates must happen on main thread
- Use Task {} to bridge from synchronous context into async; use .task modifier in SwiftUI
- Prefer TaskGroup for parallel operations with structured cleanup over detached tasks
- Check Task.isCancelled or use Task.checkCancellation() in long-running operations
- Use actors for shared mutable state instead of locks or dispatch queues

## Common Mistakes

- Forgetting @MainActor on UI-mutating code: causes runtime warnings or data races
- Creating unstructured tasks (Task.detached) when structured alternatives exist  -  loses cancellation
- Blocking actor isolation with synchronous work: other callers queue up waiting

## When to Apply

- Any async operation: network calls, file I/O, database access in Swift
- Protecting shared state from data races without manual locking
- Parallelizing independent operations (multiple API calls, image processing)
- Migrating from completion handlers or Combine to modern Swift concurrency
