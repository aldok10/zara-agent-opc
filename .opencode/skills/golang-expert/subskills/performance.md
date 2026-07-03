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

## GC Tuning

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
- **PGO**: `curl -o default.pgo http://prod:6060/debug/pprof/profile?seconds=30` → place in main package → 2-14% free improvement.
- **Check**: `go build -gcflags='-m=2' ./...`

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
