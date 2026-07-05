---
type: subskill
title: "Coroutines"
---

# Coroutines

## Core Concepts

- Kotlin coroutines provide structured concurrency: child coroutines are bound to parent scope lifecycle
- Dispatchers control execution context: Main (UI), IO (blocking), Default (CPU-intensive)
- Suspension points (suspend functions) yield control without blocking threads
- Structured concurrency ensures no leaked coroutines: when scope cancels, all children cancel
- Flow is the reactive stream primitive: cold, cancellable, and backpressure-aware

## Key Practices

- Use `viewModelScope` in ViewModels, `lifecycleScope` in Activities/Fragments  -  never create global scopes
- Switch dispatchers at the repository layer: `withContext(Dispatchers.IO)` for disk/network
- Use `StateFlow` for UI state and `SharedFlow` for one-shot events
- Handle cancellation: check `isActive` in long loops, use `ensureActive()` at suspension points
- Prefer `async/await` for parallel operations, sequential `suspend` calls for dependent operations

## Common Mistakes

- Using `GlobalScope`: coroutines outlive their intended lifecycle, causing leaks and crashes
- Catching `CancellationException`: breaks structured concurrency's cancellation propagation
- Blocking the Main dispatcher with `runBlocking`  -  freezes the UI thread

## When to Apply

- Any asynchronous operation in Android: network calls, database queries, file I/O
- Managing UI state that depends on multiple async data sources
- Replacing callback-based APIs with sequential suspend functions
- Building reactive data pipelines with Flow (search-as-you-type, live updates)
