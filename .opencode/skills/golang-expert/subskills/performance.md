# Subskill: Performance

> Activate when: latency, memory, allocation, GC, pprof, benchmark, hot path, escape analysis, pool, cache line, struct alignment, PGO, zero-alloc
>
> Prevents mistakes: #21, #27, #28, #39, #76, #91-#100 (100 Go Mistakes - Data Types & Optimizations)

**Senior DNA**: Stdlib first. Measure before optimize (pprof, not opinion). "It depends" - a CLI doesn't need sync.Pool. A batch job doesn't need zero-alloc JSON. Match optimization to actual workload. Delete complexity that doesn't pay for itself.

## Decision Framework

```
1. Is there measured pain?           → No → DON'T optimize (YAGNI)
2. Where is the bottleneck?          → Profile (pprof CPU/mem/mutex/block)
3. What % is parallelizable?         → Amdahl's Law check
4. What's the simplest fix?          → Gall's Law: start naive
5. Gain worth the complexity?        → Diminishing returns check
6. Can I isolate it?                 → Separation of concerns
7. Tests covering this path?         → Required for safe refactoring
```

## Profiling

```bash
# CPU
go test -bench=BenchmarkX -cpuprofile=cpu.prof
go tool pprof -http=:8080 cpu.prof

# Memory (allocation sites)
go test -bench=BenchmarkX -memprofile=mem.prof -memprofilerate=1
go tool pprof -alloc_objects mem.prof

# Production endpoint
import _ "net/http/pprof"
go http.ListenAndServe("localhost:6060", nil)

# Statistical comparison
go test -bench=. -benchmem -count=10 > old.txt
# make change
go test -bench=. -benchmem -count=10 > new.txt
benchstat old.txt new.txt

# GC trace
GODEBUG=gctrace=1 ./myapp

# Mutex contention
go tool pprof http://localhost:6060/debug/pprof/mutex

# Execution trace (scheduler, goroutine blocking)
go test -trace=trace.out ./...
go tool trace trace.out
```

## Escape Analysis

```bash
go build -gcflags='-m' ./...        # basic
go build -gcflags='-m -m' ./...     # verbose reasoning
```

What causes escape to heap:

| Pattern | Fix |
|---------|-----|
| Return `*T` | Return `T` by value |
| Assign to `interface{}` | Concrete types on hot paths |
| Closure captures address | Pass as parameter |
| `make([]T, n)` runtime n | Fixed-size `[N]T` |
| Send pointer over channel | Send value or sync.Pool |
| Store in package var | Avoid globals in hot paths |

Patterns that stay on stack:
```go
func NewThing() Thing { return Thing{X: 1} }       // value - stack
var buf [512]byte                                    // fixed array - stack
func Encode(dst []byte, src []byte) int { ... }     // caller provides buffer
```

## Memory Allocator Internals

```
Goroutine needs N bytes →
  1. Determine size class (67 classes, 8B–32KB)
  2. Check P's mcache (no lock) → ~25ns
  3. mcache full → mcentral (lock) → ~100-200ns
  4. mcentral empty → mheap (lock)
  5. mheap empty → OS (syscall)

Tiny: <16B no-pointer → packed in 16B block
Small: 16B–32KB → mcache mspan
Large: >32KB → direct from mheap
```

## sync.Pool

Use when: frequent short-lived allocs on hot paths, expensive to create.
DON'T when: objects <256 bytes, low-frequency, objects with external refs.

```go
var bufPool = sync.Pool{
    New: func() any { return &bytes.Buffer{} },
}

func Process(data []byte) []byte {
    buf := bufPool.Get().(*bytes.Buffer)
    defer func() {
        buf.Reset() // CRITICAL: reset before Put
        bufPool.Put(buf)
    }()
    buf.Write(data)
    result := make([]byte, buf.Len())
    copy(result, buf.Bytes())
    return result
}
```

Tiered pools (fasthttp pattern):
```go
var (
    smallPool = sync.Pool{New: func() any { b := make([]byte, 0, 1024); return &b }}
    largePool = sync.Pool{New: func() any { b := make([]byte, 0, 65536); return &b }}
)
```

## Zero-Allocation Patterns

```go
// Slice reuse
buf = buf[:0]

// strconv.AppendX instead of Format
buf = strconv.AppendInt(buf, int64(n), 10)
buf = time.Now().AppendFormat(buf, time.RFC3339)

// strings.Builder with Grow
var b strings.Builder
b.Grow(estimatedSize)

// Pre-allocate
results := make([]Result, 0, len(items))
m := make(map[string]int, expectedCount)

// Zero-copy string↔[]byte (unsafe, READ-ONLY)
func s2b(s string) []byte { return unsafe.Slice(unsafe.StringData(s), len(s)) }
func b2s(b []byte) string { return unsafe.String(unsafe.SliceData(b), len(b)) }
```

## GC Internals (Tri-Color Concurrent Mark-Sweep)

### Algorithm Overview

```
Go GC is a concurrent, tri-color, mark-sweep collector with write barriers.
Non-generational, non-compacting (objects don't move after allocation).

Phases:
1. Mark Setup (STW ~10-30μs)    → Enable write barrier, flip GC phase
2. Concurrent Mark              → Goroutines assist + dedicated GC workers
3. Mark Termination (STW ~10-60μs) → Drain remaining work, disable barrier
4. Concurrent Sweep             → Reclaim unmarked spans (lazy, on allocation)
```

### Tri-Color Marking

```
White = not yet visited (presumed garbage)
Grey  = visited but children not scanned
Black = visited AND all children scanned

Invariant (strong tri-color): no black object points to white object.
Write barrier enforces this during concurrent marking.

Start: all objects white, roots (stack, globals) greyed
Process: pick grey → scan its pointers → mark children grey → mark self black
Done: no grey objects left. Remaining white = garbage.
```

### Write Barrier (Hybrid, Go 1.17+)

```
Activated during mark phase. Intercepts pointer writes.

Dijkstra barrier: shade NEW pointer target (if white → grey)
Yuasa barrier: shade OLD pointer target (snapshot-at-beginning)
Go uses HYBRID: both, allowing stack writes without barrier.

Cost: ~1-2 extra instructions per pointer write during GC.
Disabled outside mark phase (zero cost when GC not running).
```

### GC Pacing (When Does GC Trigger?)

```
Goal: maintain heap growth <= GOGC% between cycles.

GOGC=100 (default):
  GC triggers when live_heap doubles since last cycle.
  e.g., last GC left 100MB live → trigger next at ~200MB total.

GOMEMLIMIT overrides:
  If approaching memory limit, GC runs more aggressively.
  Acts as soft cap, prevents OOM (but CPU cost increases).

Pacer adjusts:
  - GC CPU target: 25% during marking (tunable via gcBackgroundUtilization)
  - Goroutine assist: if allocating faster than marking, goroutines help mark
  - Overshoot protection: trigger earlier if allocation rate is high
```

### Green Tea GC (Go 1.26)

```
Default since 1.26. Replaces previous concurrent mark-sweep with:
- Lower tail latency (p99 STW < 50μs for most workloads)
- Better CPU scheduling during GC (less impact on mutator throughput)
- Improved pacing algorithm (fewer overshoot/undershoot)
- Stack-allocated slice backing stores (reduces heap pressure)

Practical: most apps see 10-40% reduction in GC-related overhead.
No config change needed, opt-out via GOEXPERIMENT=nogreentea.
```

### GC Tuning

```bash
# Higher GOGC = fewer GCs, more memory
GOGC=200 ./myapp

# GOMEMLIMIT (Go 1.19+) - THE modern answer
GOMEMLIMIT=3750MiB ./myapp  # 80% of 4GiB container

# Maximum throughput (Uber: saved 70K cores)
GOGC=off GOMEMLIMIT=3750MiB ./myapp

# Kubernetes: auto-detect cgroup
import _ "github.com/KimMachineGun/automemlimit"
```

### GC Diagnostics

```bash
# GC trace (per-cycle stats)
GODEBUG=gctrace=1 ./myapp
# Output format:
# gc 1 @0.012s 2%: 0.013+1.2+0.008 ms clock, 0.10+0.8/1.1/0+0.064 ms cpu, 4->4->1 MB, 4 MB goal, 0 MB stacks, 0 MB globals, 8 P
#                   ^^STW1  ^^concurrent  ^^STW2        ^assist/bg/idle     ^heap before->after->live
```

```go
// runtime/metrics (Go 1.16+) - preferred over runtime.ReadMemStats
import "runtime/metrics"

func collectGCMetrics() {
    samples := []metrics.Sample{
        {Name: "/gc/cycles/total:gc-cycles"},
        {Name: "/gc/heap/goal:bytes"},
        {Name: "/gc/heap/live:bytes"},
        {Name: "/gc/pauses:seconds"},           // histogram of STW pauses
        {Name: "/gc/gogc:percent"},
        {Name: "/gc/gomemlimit:bytes"},
        {Name: "/memory/classes/total:bytes"},
        {Name: "/memory/classes/heap/objects:bytes"},
        {Name: "/memory/classes/heap/unused:bytes"},
        {Name: "/memory/classes/heap/stacks:bytes"},
        {Name: "/sched/goroutines:goroutines"},
        {Name: "/sched/latencies:seconds"},     // scheduling latency histogram
    }
    metrics.Read(samples)
    // Process samples...
}
```

### GC Optimization Strategies

| Strategy | When | Impact |
|----------|------|--------|
| Reduce allocations | Always first step | Fewer objects = less mark work |
| `GOGC=off + GOMEMLIMIT` | High throughput services | Batch GC, fewer cycles |
| `sync.Pool` | Hot path allocs | Reuse across GC cycles |
| Value semantics | Small structs | Stack, not heap |
| Arena (experimental) | Batch-then-discard | Mass free without GC scan |
| Ballast (pre-GOMEMLIMIT) | Legacy Go <1.19 | Fake live heap delays trigger |
| Reduce pointer density | Large data structures | Less mark work per object |
| `[]byte` over `string` | Mutable text processing | Fewer allocations |

### Finalizers and Weak References

```go
// runtime.SetFinalizer - run function when object becomes unreachable
// WARNING: delays GC collection (object survives 1+ extra cycle)
// WARNING: no guaranteed execution order, no guaranteed timing
runtime.SetFinalizer(obj, func(o *MyType) { o.cleanup() })

// weak package (Go 1.24+) - weak pointer that doesn't prevent GC
import "weak"
wp := weak.Make(&obj)
// Later:
if strong := wp.Value(); strong != nil {
    // Object still alive, use it
}
// Use for: caches, canonicalization maps, observer patterns
```

## Struct Alignment

```go
// BAD: 32 bytes (50% padding)
type Bad struct {
    a bool; b float64; c bool; d float64
}
// GOOD: 18 bytes
type Good struct {
    b float64; d float64; a bool; c bool
}
```

```bash
go vet -fieldalignment ./...
fieldalignment -fix ./...
```

## Compiler Awareness

- **Inlining**: ~80 AST nodes budget. Keep hot funcs small.
- **BCE**: `_ = s[len(s)-1]` before loop eliminates bounds checks.
- **Check**: `go build -gcflags='-m=2' ./...`

## PGO (Profile-Guided Optimization)

Available since Go 1.21 (stable). Compiler uses production CPU profile to optimize hot paths: more aggressive inlining, devirtualization, better register allocation.

### Full Workflow

```bash
# Step 1: Collect profile from production (30-60s, representative load)
curl -o default.pgo http://prod-server:6060/debug/pprof/profile?seconds=30

# Alternative: collect during benchmark
go test -bench=. -cpuprofile=default.pgo ./...

# Step 2: Place profile in main package directory
cp default.pgo cmd/myapp/default.pgo
# Convention: file named "default.pgo" in main package dir = auto-detected

# Step 3: Build with PGO (automatic if default.pgo exists)
go build ./cmd/myapp/
# Or explicit:
go build -pgo=./cpu.pgo ./cmd/myapp/

# Step 4: Measure improvement
go test -bench=. -benchmem -count=10 > without_pgo.txt
go build -pgo=./default.pgo && go test -bench=. -benchmem -count=10 > with_pgo.txt
benchstat without_pgo.txt with_pgo.txt

# Step 5: Commit profile to repo, rebuild in CI
git add cmd/myapp/default.pgo
```

### What PGO Optimizes

| Optimization | How |
|-------------|-----|
| Hot function inlining | Raises inline budget for frequently-called funcs |
| Devirtualization | Interface calls → direct calls when profile shows single impl |
| Block layout | Branch prediction hints from profile data |
| Register allocation | Prioritize hot variables |

### Best Practices

- Re-collect profile periodically (code changes shift hot paths)
- Profile under representative production load (not synthetic)
- Typical improvement: 2-14% CPU reduction (free performance)
- Combine multiple profiles: `go tool pprof -proto a.pgo b.pgo > merged.pgo`
- PGO does NOT help: I/O bound apps, GC-bound apps, memory-bound apps

## Pointer/Value Semantics

| Type | Use |
|------|-----|
| Built-in (int, string) | Always value |
| Slice, map, chan | Always value (reference internally) |
| Small struct (<128 bytes, no mutation) | Value |
| Large struct (>128 bytes) | Pointer |
| Shared resource (DB, File) | Pointer |

## Key Numbers

| Metric | Value |
|--------|-------|
| Stack allocation | ~1-2ns |
| Heap (fast, mcache) | ~25ns |
| Heap (slow, mcentral) | ~100-200ns |
| sync.Pool Get/Put | ~20-50ns |
| GC STW (Go 1.22+) | 10-100μs |
| Green Tea GC (1.26) | 10-40% less overhead |
| Cache line miss | ~100ns |

## Arena Allocator (Experimental)

> `arena` package: Go 1.20+ experimental (`GOEXPERIMENT=arenas`). Batch allocate, mass free without GC scanning.

### Concept

```
Normal Go: each object individually tracked by GC. Free = mark as unreachable, wait for GC sweep.
Arena: allocate many objects in contiguous region. Free = discard entire region instantly (O(1)).
No individual object tracking. No GC mark work for arena objects.
```

### When to Use

| Good Fit | Bad Fit |
|----------|---------|
| Request-scoped data (HTTP handler) | Long-lived objects |
| Batch processing (parse → process → discard) | Objects shared across goroutines |
| Compiler/parser temporary AST nodes | Objects with finalizers |
| Serialization buffers | Objects that escape request lifetime |

### Usage Pattern

```go
//go:build goexperiment.arenas

import "arena"

func handleRequest(w http.ResponseWriter, r *http.Request) {
    a := arena.NewArena()
    defer a.Free() // ALL allocations freed instantly, zero GC work

    // Allocate in arena
    node := arena.New[ASTNode](a)
    node.Type = "expression"

    // Allocate slice in arena
    items := arena.MakeSlice[Item](a, 0, 1000)

    // Process using arena-allocated data...
    result := process(node, items)

    // After Free(): all arena memory returned to OS
    // NO GC scan needed for any of these objects
}
```

### Tradeoffs

| Pro | Con |
|-----|-----|
| Zero GC overhead for arena objects | Experimental, API may change |
| O(1) bulk free | Objects can't outlive arena |
| Reduces GC pause time for batch workloads | Panic if accessed after Free() |
| Cache-friendly (contiguous allocation) | Needs `GOEXPERIMENT=arenas` build tag |
| Good for request-scoped workloads | Can't mix arena/heap objects carelessly |

### Relationship to Other Patterns

```
sync.Pool: recycle individual objects across GC cycles (hot path reuse)
Arena: batch allocate, batch free (request-scoped, no GC involvement)
Stack allocation: automatic, function-scoped (smallest lifetime)
GOMEMLIMIT: control GC frequency (all heap objects)

Complementary, not competing. Use stack for small/local,
arena for batch/request, pool for hot reuse, heap for everything else.
```

### Current Status (2026)

Experimental since Go 1.20. Not yet stable API. Production use at discretion.
CockroachDB and similar projects use internal arena patterns (manual, pre-dating the package).
If API stabilizes, expected to become standard for high-throughput servers.

## Anti-Patterns

| Bad | Good |
|-----|------|
| `fmt.Sprintf` on hot path | `strconv.AppendX` |
| `interface{}` in hot loop | Concrete types |
| `time.After` in loop | `time.NewTimer` + `Reset` |
| `defer` inside loop | Direct call or extract func |
| `ioutil.ReadAll` on large body | `bufio.Scanner` / streaming |
| `json.Unmarshal` hot path | `gjson`, `easyjson`, code-gen |

## Production Lessons

| Project | Pattern |
|---------|---------|
| fasthttp | Pool everything, `[]byte` not string, worker pools |
| CockroachDB | Per-range latches, admission control |
| etcd | Pure state machine (no I/O in core) |
| Uber | `GOGC=off + GOMEMLIMIT`, 70K cores saved |
| Prometheus | Append-only WAL, mmap, compressed timestamps |
| valyala | bytebufferpool (calibrating, don't pool outliers) |

## Delegates To

- **observability** - when profiling setup is needed
- **concurrency** - when contention is the bottleneck
- **architecture** - when redesign is needed for performance

## Examples

- `examples/performance/01-escape-analysis/` - stack vs heap with benchmarks
- `examples/performance/02-sync-pool/` - correct pool patterns
- `examples/performance/03-zero-alloc/` - buffer reuse, append patterns
- `examples/performance/04-concurrent-map/` - sharded vs sync.Map vs mutex
