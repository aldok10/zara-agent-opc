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

See also: `subskills/context-patterns.md` for context deep dive and structured concurrency (errgroup, wg.Go).

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

## Deadlock Detection and Debugging

### Runtime Detection

```
Go runtime detects deadlocks automatically:
"fatal error: all goroutines are asleep - deadlock!"

Only fires when ALL goroutines are blocked. If even one goroutine is
runnable (e.g., main goroutine in HTTP server), no detection occurs.
Partial deadlocks (subset of goroutines) are NOT detected by runtime.
```

### Common Deadlock Patterns

```go
// 1. Lock ordering violation (most common)
// Goroutine A: mu1.Lock() → mu2.Lock()
// Goroutine B: mu2.Lock() → mu1.Lock()
// FIX: Always acquire locks in consistent order (e.g., by address or ID)

// 2. Self-deadlock (recursive lock attempt)
func (s *Service) A() {
    s.mu.Lock()
    defer s.mu.Unlock()
    s.B() // B also tries to lock s.mu → DEADLOCK
}
// FIX: Extract shared logic into unexported helper that assumes lock held

// 3. Channel deadlock (unbuffered, same goroutine)
ch := make(chan int)
ch <- 1    // blocks forever, no other goroutine to receive
val := <-ch
// FIX: Use goroutine or buffered channel

// 4. WaitGroup misuse
var wg sync.WaitGroup
wg.Add(1)
wg.Wait() // blocks forever, nobody calls Done()
// FIX: Ensure Add/Done are balanced

// 5. Select without default on full/empty channels
ch := make(chan int, 1)
ch <- 1
ch <- 2 // blocks forever (buffer full, no receiver)
// FIX: Select with ctx.Done() or default case
```

### Debugging Deadlocks

```bash
# 1. Send SIGQUIT for goroutine dump (shows all goroutine stacks)
kill -SIGQUIT <pid>
# Or press Ctrl+\ in terminal

# 2. Set GOTRACEBACK for automatic dump on crash
GOTRACEBACK=all ./myapp

# 3. Mutex profiling (finds contention, not deadlock per se)
import _ "net/http/pprof"
go tool pprof http://localhost:6060/debug/pprof/mutex

# 4. Block profiling (where goroutines are blocking)
runtime.SetBlockProfileRate(1) // enable
go tool pprof http://localhost:6060/debug/pprof/block

# 5. Execution trace (visualize goroutine scheduling)
go test -trace=trace.out ./...
go tool trace trace.out
# Look for long blocking periods in the trace viewer
```

### Prevention Strategies

| Strategy | Implementation |
|----------|---------------|
| Consistent lock ordering | Document order, sort by address: `if &mu1 < &mu2 { mu1 first }` |
| Lock hierarchy | Assign levels to locks, never acquire lower→higher |
| Timeout on Lock | Use `TryLock()` (Go 1.18+) or context-based patterns |
| Minimize lock scope | Hold lock for shortest possible duration |
| Prefer channels over multiple locks | Channels don't have ordering problems |
| Single goroutine owns state | "Actor model": one goroutine, receive via channel |
| Detect in tests | `time.AfterFunc` + `t.Fatal("deadlock")` pattern |

### TryLock Pattern (Go 1.18+)

```go
// Non-blocking lock attempt (useful for deadlock avoidance)
if mu.TryLock() {
    defer mu.Unlock()
    // critical section
} else {
    // lock held by someone else, take alternative path
    // e.g., return stale cached value, skip operation, retry later
}
```

## Goroutine Leak Detection

A goroutine leak = goroutine that never terminates (blocked on channel, lock, or I/O forever). Accumulates memory and OS resources silently.

### Causes

| Cause | Pattern |
|-------|---------|
| Forgotten context cancel | Producer keeps sending after consumer gone |
| Unbuffered channel, no reader | `go func() { ch <- val }()` but nobody reads ch |
| Missing select with ctx.Done() | Goroutine blocked on channel without exit path |
| Infinite loop without stop signal | Background poller without cancel mechanism |
| Orphaned timer/ticker | `time.NewTicker` without `Stop()` |

### Detection with goleak (uber-go/goleak)

```go
import "go.uber.org/goleak"

// Option 1: Per-test (precise, preferred)
func TestSomething(t *testing.T) {
    defer goleak.VerifyNone(t)
    // ... test code ...
}

// Option 2: TestMain (catches all tests in package)
func TestMain(m *testing.M) {
    goleak.VerifyTestMain(m)
}

// Option 3: Ignore known goroutines (e.g., runtime, HTTP server)
func TestWithIgnores(t *testing.T) {
    defer goleak.VerifyNone(t,
        goleak.IgnoreTopFunction("net/http.(*Server).Serve"),
        goleak.IgnoreAnyFunction("database/sql.(*DB).connectionOpener"),
    )
    // ...
}
```

### Go 1.26 Built-in Leak Detector

```go
// runtime/debug.SetGoroutineLeakDetector (Go 1.26+)
// Detects goroutines that outlive their expected scope
import "runtime/debug"

func init() {
    // Enable in test/dev, not production
    debug.SetGoroutineLeakDetector(debug.GoroutineLeakDetector{
        Enabled: true,
        Threshold: 100, // warn if >100 goroutines created per second without matching exit
    })
}
```

### Prevention Patterns

```go
// Pattern 1: Always pair goroutine with stop signal
func startWorker(ctx context.Context) {
    go func() {
        for {
            select {
            case <-ctx.Done():
                return // CLEAN EXIT
            case job := <-jobs:
                process(job)
            }
        }
    }()
}

// Pattern 2: Ensure channel producers stop when consumer gone
func produce(ctx context.Context) <-chan int {
    ch := make(chan int)
    go func() {
        defer close(ch)
        for i := 0; ; i++ {
            select {
            case ch <- i:
            case <-ctx.Done():
                return // Stop producing when context cancelled
            }
        }
    }()
    return ch
}

// Pattern 3: Buffered channel for fire-once (won't block sender)
func fireOnce() <-chan Result {
    ch := make(chan Result, 1) // buffer=1, sender never blocks
    go func() {
        ch <- doWork()
        // goroutine exits regardless of whether someone reads ch
    }()
    return ch
}
```

### Runtime Monitoring

```go
// Check goroutine count in production
import "runtime"

func monitorGoroutines(ctx context.Context) {
    ticker := time.NewTicker(30 * time.Second)
    defer ticker.Stop()
    var lastCount int
    for {
        select {
        case <-ticker.C:
            count := runtime.NumGoroutine()
            if count > lastCount*2 && count > 1000 {
                slog.Warn("goroutine count spike",
                    "current", count,
                    "previous", lastCount,
                )
            }
            lastCount = count
        case <-ctx.Done():
            return
        }
    }
}

// Dump all goroutine stacks (debugging)
import "runtime/debug"
debug.SetTraceback("all") // or GOTRACEBACK=all env var
// Then send SIGQUIT to process for full dump
```

## Delegates To

- **performance** - when allocations in concurrent paths are the issue
- **observability** - when goroutine leaks need detection

## Examples

- `examples/concurrency/01-worker-pool/`
- `examples/concurrency/02-fan-in-fan-out/`
- `examples/concurrency/03-graceful-shutdown/`
- `examples/performance/04-concurrent-map/`
