---
type: subskill
title: "Subskill: Async & Tokio"
---

# Subskill: Async & Tokio

Tokio runtime patterns for production backend services. Spawning, cancellation, channels, shutdown.

## Runtime Configuration

```rust
#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Default: multi-threaded, worker threads = CPU cores
    // For customization:
    // tokio::runtime::Builder::new_multi_thread()
    //     .worker_threads(4)
    //     .enable_all()
    //     .build()?
    //     .block_on(async { ... })

    run().await
}
```

Use `#[tokio::main]` for most services. Custom builder only when tuning thread count or enabling specific features.

## spawn vs spawn_blocking

```rust
// Async task (I/O bound) -- runs on Tokio worker threads
let handle = tokio::spawn(async move {
    fetch_data(&url).await
});

// CPU-bound or blocking I/O -- runs on dedicated thread pool
let result = tokio::task::spawn_blocking(move || {
    compute_hash(&payload)  // CPU-intensive
}).await?;
```

Rule: if it takes >1ms of CPU without yielding, use `spawn_blocking`. Signs you're blocking: other tasks stall, latency spikes.

## select! for Racing Futures

```rust
use tokio::select;

async fn fetch_with_timeout(url: &str) -> Result<Response, AppError> {
    select! {
        result = reqwest::get(url) => {
            result.map_err(|e| AppError::Internal(e.into()))
        }
        _ = tokio::time::sleep(Duration::from_secs(5)) => {
            Err(AppError::Timeout)
        }
    }
}
```

`select!` cancels the losing branch. Ensure futures are cancel-safe or use `tokio::pin!`.

## Channels for Task Communication

```rust
use tokio::sync::mpsc;

// Bounded channel (backpressure)
let (tx, mut rx) = mpsc::channel::<Job>(100);

// Producer
tokio::spawn(async move {
    tx.send(job).await.expect("receiver dropped");
});

// Consumer
tokio::spawn(async move {
    while let Some(job) = rx.recv().await {
        process_job(job).await;
    }
});
```

| Channel | Use Case |
|---------|----------|
| `mpsc` | Many producers, one consumer (job queue) |
| `oneshot` | Single response (request-reply) |
| `broadcast` | One producer, many consumers (events) |
| `watch` | Single value, many readers (config reload) |

## Graceful Shutdown with CancellationToken

```rust
use tokio_util::sync::CancellationToken;

async fn run(token: CancellationToken) {
    let worker_token = token.child_token();

    let worker = tokio::spawn(async move {
        loop {
            select! {
                _ = worker_token.cancelled() => {
                    tracing::info!("worker shutting down");
                    break;
                }
                job = get_next_job() => {
                    process(job).await;
                }
            }
        }
    });

    // Trigger shutdown
    shutdown_signal().await;
    token.cancel();

    // Wait for workers to finish
    let _ = tokio::time::timeout(Duration::from_secs(30), worker).await;
}
```

## Timeout Pattern

```rust
use tokio::time::timeout;

async fn with_deadline<T, F: Future<Output = T>>(
    duration: Duration,
    fut: F,
) -> Result<T, AppError> {
    timeout(duration, fut)
        .await
        .map_err(|_| AppError::Timeout)
}
```

## Semaphore for Concurrency Limiting

```rust
use tokio::sync::Semaphore;
use std::sync::Arc;

let semaphore = Arc::new(Semaphore::new(10)); // max 10 concurrent

async fn limited_operation(sem: Arc<Semaphore>) -> Result<(), AppError> {
    let _permit = sem.acquire().await.map_err(|_| AppError::Internal("semaphore closed".into()))?;
    // permit auto-released on drop
    do_work().await
}
```

## Rules

1. Never `block_in_place` in library code -- it's a footgun. Use `spawn_blocking`.
2. Every spawned task should handle its own errors (log or propagate via channel).
3. Use `JoinSet` when spawning many tasks that need collective awaiting.
4. Pin futures that need to be polled across `select!` branches: `tokio::pin!(fut)`.
5. Prefer `tokio::time::Instant` over `std::time::Instant` in async code.
6. Test with `#[tokio::test]` (auto-creates runtime per test).
