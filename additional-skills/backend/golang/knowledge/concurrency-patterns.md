# Concurrency Patterns

Reference patterns for Go backend concurrency. Copy, adapt, combine.

## Fan-Out/Fan-In

Process N items with bounded concurrency, collect results:

```go
func processAll(ctx context.Context, items []Item, workers int) ([]Result, error) {
    g, ctx := errgroup.WithContext(ctx)
    g.SetLimit(workers)
    results := make([]Result, len(items))

    for i, item := range items {
        g.Go(func() error {
            r, err := process(ctx, item)
            if err != nil {
                return err
            }
            results[i] = r // safe: each goroutine writes to unique index
            return nil
        })
    }
    if err := g.Wait(); err != nil {
        return nil, err
    }
    return results, nil
}
```

## Pipeline

Chain stages connected by channels:

```go
func pipeline(ctx context.Context, input <-chan Raw) <-chan Processed {
    out := make(chan Processed)
    go func() {
        defer close(out)
        for raw := range input {
            select {
            case <-ctx.Done():
                return
            case out <- transform(raw):
            }
        }
    }()
    return out
}
```

## Semaphore (bounded goroutines)

```go
func withSemaphore(ctx context.Context, n int, tasks []func() error) error {
    sem := make(chan struct{}, n)
    g, ctx := errgroup.WithContext(ctx)
    for _, task := range tasks {
        sem <- struct{}{} // acquire
        g.Go(func() error {
            defer func() { <-sem }() // release
            return task()
        })
    }
    return g.Wait()
}
```

## Graceful Shutdown

```go
func run(ctx context.Context) error {
    ctx, stop := signal.NotifyContext(ctx, syscall.SIGINT, syscall.SIGTERM)
    defer stop()

    srv := &http.Server{Addr: ":8080", Handler: mux}

    g, ctx := errgroup.WithContext(ctx)
    g.Go(func() error { return srv.ListenAndServe() })
    g.Go(func() error {
        <-ctx.Done()
        shutCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
        defer cancel()
        return srv.Shutdown(shutCtx)
    })
    return g.Wait()
}
```

## Rate Limiter

```go
func rateLimitedWorker(ctx context.Context, limiter *rate.Limiter, jobs <-chan Job) error {
    for job := range jobs {
        if err := limiter.Wait(ctx); err != nil {
            return err
        }
        if err := process(ctx, job); err != nil {
            return fmt.Errorf("process job %s: %w", job.ID, err)
        }
    }
    return nil
}
```

## Context Propagation Rules

1. First param, always: `func DoThing(ctx context.Context, ...) error`
2. Never store context in structs -- pass through call chain.
3. Derive child contexts for sub-operations: `context.WithTimeout(ctx, 5*time.Second)`.
4. Check `ctx.Err()` before expensive operations in loops.
5. `context.AfterFunc(ctx, fn)` (1.21+) for cleanup on cancellation.

## Sync Primitives Quick Reference

| Primitive | Use When |
|-----------|----------|
| `errgroup.Group` | Parallel tasks, shared error, context cancellation |
| `sync.WaitGroup` | Fire-and-forget cleanup (no error needed) |
| `sync.Mutex` | Protecting shared struct fields |
| `sync.RWMutex` | Read-heavy shared data |
| `sync.Once` | One-time initialization |
| `sync.OnceValue` | Lazy init returning value (1.21+) |
| `atomic.Int64` | Single counter/flag, no other state |
| `chan struct{}` | Signaling (done, ready, stop) |
| Buffered channel | Semaphore, bounded queue |
