# Subskill: Concurrency

> Activate when: goroutine, channel, mutex, lock, race, sync, atomic, worker pool, fan-out, pipeline, context, deadlock, backpressure
>
> Prevents mistakes: #55-#74 (100 Go Mistakes - Concurrency)

**Senior DNA**: Stdlib first (`sync`, `context`, `errgroup`). "It depends" - not everything needs goroutines. A simple mutex beats a channel if you're just protecting state. Don't add concurrency until sequential is proven insufficient. Match the pattern to the workload type (CPU-bound vs I/O-bound).

## Core Principles

- Channels orchestrate; mutexes serialize.
- Don't communicate by sharing memory; share memory by communicating.
- Every goroutine MUST have a clear exit path.
- Concurrency is not parallelism.

## Mutex vs RWMutex vs Atomic

| Scenario | Use | Why |
|----------|-----|-----|
| Simple counter | `atomic.Int64` | Lock-free, ~80ns |
| Protect struct state | `sync.Mutex` | Simple, correct |
| >90% reads, <4 goroutines | `sync.RWMutex` | Read parallelism |
| >90% reads, many goroutines | `atomic.Pointer[T]` (COW) | RWMutex doesn't scale |
| Hot counter, many cores | Sharded counters | Avoid cache line bouncing |
| Config reload | `atomic.Pointer[Config]` | Lock-free reads |

**Critical**: RWMutex does NOT scale with core count. Every `RLock()` does `atomic.Add` → invalidates cache lines. Benchmark before choosing.

## Channel vs Mutex Decision

| Channels | Mutex |
|----------|-------|
| Transfer ownership | Protect internal state |
| Pipeline coordination | Guard map/slice/struct |
| Backpressure | Random access |
| Fan-out/fan-in | Trivial critical section |
| Signaling (done/cancel) | No goroutine handoff |

## Patterns

### Worker Pool
```go
func workerPool(ctx context.Context, jobs <-chan Job, results chan<- Result, n int) {
    var wg sync.WaitGroup
    for range n {
        wg.Add(1)
        go func() {
            defer wg.Done()
            for j := range jobs {
                select {
                case <-ctx.Done():
                    return
                case results <- process(j):
                }
            }
        }()
    }
    wg.Wait()
    close(results)
}
```

### Fan-Out/Fan-In
```go
func fanIn[T any](ctx context.Context, channels ...<-chan T) <-chan T {
    out := make(chan T)
    var wg sync.WaitGroup
    for _, ch := range channels {
        wg.Add(1)
        go func(c <-chan T) {
            defer wg.Done()
            for v := range c {
                select {
                case out <- v:
                case <-ctx.Done():
                    return
                }
            }
        }(ch)
    }
    go func() { wg.Wait(); close(out) }()
    return out
}
```

### errgroup (preferred over raw WaitGroup for errors)
```go
g, ctx := errgroup.WithContext(ctx)
for _, item := range items {
    item := item
    g.Go(func() error { return process(ctx, item) })
}
if err := g.Wait(); err != nil { ... }
```

### Bounded Concurrency (Semaphore)
```go
sem := make(chan struct{}, maxWorkers)
for _, item := range items {
    sem <- struct{}{}
    go func(it Item) {
        defer func() { <-sem }()
        process(it)
    }(item)
}
```

### Copy-on-Write (lock-free reads)
```go
type Config struct{ data atomic.Pointer[configData] }
func (c *Config) Load() *configData { return c.data.Load() }
func (c *Config) Update(new *configData) { c.data.Store(new) }
```

### Graceful Shutdown
```go
ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
defer stop()
// ... start server ...
<-ctx.Done()
shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
defer cancel()
srv.Shutdown(shutdownCtx)
```

## Lock Contention Reduction

### Sharded Map
```go
const numShards = 32
type ShardedMap[K comparable, V any] struct {
    shards [numShards]struct {
        sync.RWMutex
        m map[K]V
    }
}
```

### False Sharing Prevention
```go
type Counters struct {
    reads  atomic.Int64
    _      [56]byte // pad to 64-byte cache line
    writes atomic.Int64
    _      [56]byte
}
```

### Minimize Critical Section
```go
// Compute OUTSIDE lock, swap inside
result := expensiveCompute(data)
mu.Lock()
cache[key] = result
mu.Unlock()
```

## Goroutine Lifecycle Rules

1. Every goroutine has context or done channel
2. Never fire-and-forget without cancel path
3. Always offer select with ctx.Done()
4. Close channel to signal all readers

```go
// GOOD
go func() {
    select {
    case ch <- result:
    case <-ctx.Done():
    }
}()

// BAD - blocks forever if nobody reads
go func() { ch <- result }()
```

## sync.Map - When to Use

ONLY when:
1. Keys written once, read many (append-only), OR
2. Disjoint goroutines access disjoint keys

Everything else: `map + Mutex` or sharded map.

## Race Detection
```bash
go test -race ./...
go run -race .
# Always in CI/CD
```

## Common Race Pitfalls

- Map concurrent read+write → fatal (even read+one writer)
- `append()` from multiple goroutines → data race
- Check-then-act without holding lock → TOCTOU race
- Loop var capture (pre-Go 1.22) → all goroutines see last value

## Delegates To

- **performance** - when allocations in concurrent paths are the issue
- **observability** - when goroutine leaks need detection

## Examples

- `examples/concurrency/01-worker-pool/`
- `examples/concurrency/02-fan-in-fan-out/`
- `examples/concurrency/03-graceful-shutdown/`
- `examples/performance/04-concurrent-map/`
