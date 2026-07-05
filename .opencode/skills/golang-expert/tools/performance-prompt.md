# Go Performance Analysis Prompt

Use this prompt when analyzing Go code for performance issues.

## Analysis Checklist

### Allocations
- Hot paths avoid heap allocations (use stack-friendly patterns)
- Slice pre-allocation with `make([]T, 0, expectedCap)` when size is known or estimable
- String concatenation in loops uses `strings.Builder`, not `+` or `fmt.Sprintf`
- Pointer vs value receiver chosen based on struct size (>64 bytes = pointer)
- `sync.Pool` for frequently allocated/freed objects in hot paths
- Interface boxing avoided in tight loops (causes heap escape)

### Goroutine Leaks
- Every goroutine has a termination condition (context cancel, channel close, or done signal)
- Unbuffered channels have matching sender/receiver lifecycle
- `select` with `ctx.Done()` in long-running goroutines
- No goroutines spawned in loops without lifecycle management
- `runtime.NumGoroutine()` checked in tests for leak detection

### Lock Contention
- `sync.RWMutex` used when reads dominate writes
- Lock scope minimized (lock, do work, unlock -- no I/O under lock)
- No nested locks (deadlock risk)
- `sync/atomic` for simple counters and flags instead of mutex
- Consider sharding (per-key locks) for high-contention maps
- `sync.Map` only when keys are stable and contention is measured

### Hot Paths
- Profile before optimizing (`pprof` CPU + memory profiles)
- Benchmark with `testing.B` and `b.ReportAllocs()`
- Avoid reflection in hot paths (use code generation or type switches)
- Minimize interface method calls in tight loops (devirtualization)
- Buffer I/O with `bufio.Reader`/`bufio.Writer` for repeated small reads/writes
- JSON encoding: consider `encoding/json/v2` or code-gen marshalers for high-throughput

## Prompt Template

```
Analyze this Go code for performance:
1. Allocations: heap escapes, unnecessary copies, missing pre-allocation
2. Goroutine leaks: missing exit conditions, orphaned goroutines, unbounded spawning
3. Lock contention: over-broad lock scope, wrong mutex type, I/O under lock
4. Hot paths: reflection in loops, unprofilied assumptions, unbuffered I/O

For each finding: state the location, estimated impact (high/medium/low), and the recommended fix.
Recommend profiling commands where applicable (`go test -bench`, `go tool pprof`).
```
