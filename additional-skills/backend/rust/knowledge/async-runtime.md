---
type: fact
title: "Tokio Async Runtime Internals"
---

# Tokio Async Runtime

How Tokio works under the hood. Runtime selection, task scheduling, cooperative yielding.

## Multi-Threaded vs Current-Thread

```rust
// Multi-threaded (default with #[tokio::main])
// N worker threads (default = CPU cores), work-stealing scheduler
#[tokio::main]
async fn main() { }

// Current-thread (single-threaded, useful for tests/embedded)
#[tokio::main(flavor = "current_thread")]
async fn main() { }

// Custom configuration
let runtime = tokio::runtime::Builder::new_multi_thread()
    .worker_threads(4)         // explicit thread count
    .max_blocking_threads(512) // for spawn_blocking pool
    .enable_all()              // io + time
    .thread_name("my-worker")
    .build()?;
```

## When to Use Which

| Scenario | Runtime | Why |
|----------|---------|-----|
| Web server | Multi-threaded | Utilize all cores, handle concurrent requests |
| CLI tool | Current-thread | Simpler, less overhead |
| Tests | Current-thread | Deterministic, faster startup |
| Lambda/WASM | Current-thread | Single-threaded environment |

## Work-Stealing Scheduler

Multi-threaded runtime uses work-stealing:
1. Each worker has a local queue
2. When a worker's queue is empty, it steals from others
3. A global queue handles overflow

Implication: tasks may run on different threads across `.await` points. This is why `Send` is required for spawned tasks.

## Cooperative Scheduling

Tokio uses cooperative scheduling within each thread:
- Tasks yield at `.await` points
- A task that never awaits blocks its worker thread
- Budget system: after ~128 operations, Tokio forces a yield

```rust
// BAD: blocks the worker
async fn bad() {
    loop { /* CPU work, never yields */ }
}

// GOOD: yields periodically or uses spawn_blocking
async fn good() {
    tokio::task::spawn_blocking(|| {
        // CPU-heavy work on blocking thread pool
        heavy_computation()
    }).await.unwrap();
}
```

## Task Budgeting

Tokio tracks "budget" per task. Operations like `poll_read` decrement the budget. When exhausted, the task yields even if data is available. This prevents one task from starving others.

You rarely interact with this directly, but it explains why:
- A busy loop with channel receives eventually yields
- High-throughput streams don't block other tasks indefinitely

## spawn_blocking Thread Pool

```rust
// Default: 512 threads (configurable)
// Used for: file I/O, CPU computation, FFI calls
let result = tokio::task::spawn_blocking(move || {
    std::fs::read_to_string("large_file.txt")
}).await?;
```

The blocking pool is separate from worker threads. Exhausting it (512 blocked tasks) will cause new `spawn_blocking` calls to wait.

## Task Lifecycle

1. `tokio::spawn(future)` -> task created, placed in queue
2. Worker picks up task, polls the future
3. Future returns `Poll::Pending` -> task parked until waker fires
4. I/O ready / timer fires -> waker notifies, task re-queued
5. Future returns `Poll::Ready` -> task complete, `JoinHandle` resolves

## JoinHandle and Cancellation

```rust
let handle = tokio::spawn(async { do_work().await });

// Await result
let result = handle.await?;  // JoinError if task panicked

// Cancel by dropping
handle.abort();  // sends cancellation signal
// or just drop the handle (task continues running unless aborted!)
```

Dropping a `JoinHandle` does NOT cancel the task. You must explicitly `.abort()` or use `CancellationToken`.

## Runtime Metrics (tokio-console)

```toml
[dependencies]
console-subscriber = "0.4"
```

```rust
#[tokio::main]
async fn main() {
    console_subscriber::init();  // enables tokio-console
    // ...
}
```

Run `tokio-console` to see: active tasks, poll times, waker counts, resource utilization.

## Key Rules

1. Never block a worker thread. Use `spawn_blocking` for sync/CPU work.
2. `Send + 'static` required for spawned tasks. Use `Arc` for shared data.
3. Prefer `tokio::time` over `std::time` in async context.
4. One runtime per process. Don't nest `block_on` calls.
5. `select!` cancels the losing branch -- ensure futures are cancel-safe.
