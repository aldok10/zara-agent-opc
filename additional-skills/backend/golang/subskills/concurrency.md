---
type: subskill
title: "Concurrency"
---

# Concurrency

Go concurrency patterns for backend services. Safe, structured, observable.

## Rules

1. Every goroutine must have a clear owner and stop signal (context or done channel).
2. Use `errgroup.Group` for parallel tasks needing shared error + context cancellation.
3. `sync.WaitGroup` only when errors don't matter (fire-and-forget cleanup).
4. Channel direction in signatures: `chan<-` send-only, `<-chan` receive-only.
5. Buffered channels as semaphores for bounded concurrency: `sem := make(chan struct{}, n)`.
6. Never select on nil channel without understanding blocking semantics.
7. `context.AfterFunc` (1.21+) for cleanup on cancellation -- replaces goroutine+select.
8. `sync.OnceValue`/`sync.OnceValues` (1.21+) for lazy initialization.
9. Mutex protects data, not code. Keep critical sections minimal.
10. `atomic` types (`atomic.Int64`, `atomic.Bool`) for single-value shared state.

## Patterns

### Worker Pool (bounded concurrency)

```go
func processItems(ctx context.Context, items []Item, workers int) error {
    g, ctx := errgroup.WithContext(ctx)
    g.SetLimit(workers)
    for _, item := range items {
        g.Go(func() error {
            return process(ctx, item)
        })
    }
    return g.Wait()
}
```

### Fan-Out/Fan-In

```go
func fanOut(ctx context.Context, input <-chan Job, workers int) <-chan Result {
    results := make(chan Result, workers)
    g, ctx := errgroup.WithContext(ctx)
    for range workers {
        g.Go(func() error {
            for job := range input {
                select {
                case <-ctx.Done():
                    return ctx.Err()
                case results <- process(job):
                }
            }
            return nil
        })
    }
    go func() {
        g.Wait()
        close(results)
    }()
    return results
}
```

### Graceful Shutdown with In-Flight Tracking

```go
func serve(ctx context.Context, srv *http.Server) error {
    errCh := make(chan error, 1)
    go func() { errCh <- srv.ListenAndServe() }()

    select {
    case err := <-errCh:
        return err
    case <-ctx.Done():
        shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
        defer cancel()
        return srv.Shutdown(shutdownCtx)
    }
}
```

### Rate Limiter (token bucket)

```go
func rateLimited(ctx context.Context, limiter *rate.Limiter, fn func() error) error {
    if err := limiter.Wait(ctx); err != nil {
        return fmt.Errorf("rate limit: %w", err)
    }
    return fn()
}
```

## Anti-Patterns

- Fire-and-forget goroutines in handlers -- leaks on shutdown, lost errors.
- `time.Sleep` in retry loops -- use `time.After` or exponential backoff with jitter.
- Sharing memory without synchronization -- even "read-only" maps during concurrent writes.
- Closing channels from receiver side -- only sender closes.
- Goroutine per request without bounds -- OOM under load.
- `sync.Mutex` in hot path when `atomic` or channel would suffice.

## Race Detection

Always run with `-race` in CI:
```bash
go test -race -count=1 ./...
```

Use `go vet -vettool=$(which shadow)` to catch shadowed variables in goroutine closures.

## Verification

- `go test -race ./...` passes
- No goroutine leaks: use `goleak.VerifyMain(m)` or `goleak.VerifyTestMain`
- Context cancellation propagates within reasonable time (test with short timeout)
- Worker pools respect `GOMAXPROCS` -- don't over-subscribe CPU-bound tasks
- Channels are drained or contexts cancelled on shutdown path
