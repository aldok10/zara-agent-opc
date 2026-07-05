---
type: subskill
title: "Performance"
---

# Performance

Go performance optimization for backend services. Measure first, optimize second.

## Rules

1. Never optimize without profiling. `pprof` CPU and memory profiles are mandatory evidence.
2. Benchmarks with `testing.B` + `benchstat` for statistical significance (minimum 10 runs).
3. Pre-allocate slices and maps when size is known: `make([]T, 0, n)`.
4. `sync.Pool` for frequently allocated objects in hot paths (buffers, temporary structs).
5. `strings.Builder` with `Grow(n)` for string concatenation.
6. `strconv` over `fmt.Sprintf` for number-to-string conversion.
7. Avoid reflection in hot paths -- use code generation (sqlc, wire, easyjson).
8. Escape analysis: `go build -gcflags="-m -m"` to verify stack allocation.
9. Reduce allocations over micro-optimizing CPU -- GC pressure is the #1 Go perf issue.
10. Profile in production-like conditions, not synthetic benchmarks alone.

## Profiling Workflow

### CPU Profile

```go
import _ "net/http/pprof" // register handlers

// In main:
go func() { http.ListenAndServe(":6060", nil) }()
```

```bash
go tool pprof http://localhost:6060/debug/pprof/profile?seconds=30
# Interactive: top, list <func>, web (SVG graph)
```

### Memory Profile

```bash
go tool pprof http://localhost:6060/debug/pprof/heap
# (pprof) top --cum    # cumulative allocations
# (pprof) list funcName
```

### Escape Analysis

```bash
go build -gcflags="-m -l" ./... 2>&1 | grep "escapes to heap"
```

## Patterns

### sync.Pool for Buffers

```go
var bufPool = sync.Pool{
    New: func() any { return new(bytes.Buffer) },
}

func handler(w http.ResponseWriter, r *http.Request) {
    buf := bufPool.Get().(*bytes.Buffer)
    buf.Reset()
    defer bufPool.Put(buf)
    // use buf...
}
```

### Zero-Allocation JSON Encoding

```go
// Pre-allocate encoder per response (avoids reflection per-field)
func writeJSON(w http.ResponseWriter, status int, v any) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(status)
    enc := json.NewEncoder(w) // writes directly to ResponseWriter
    enc.SetEscapeHTML(false)  // avoid unnecessary escaping
    enc.Encode(v)
}
```

### Benchmark Template

```go
func BenchmarkHandler(b *testing.B) {
    srv := setupTestServer()
    req := httptest.NewRequest("GET", "/api/items", nil)

    b.ReportAllocs()
    b.ResetTimer()
    for b.Loop() { // Go 1.24+
        w := httptest.NewRecorder()
        srv.ServeHTTP(w, req)
    }
}
```

### Connection Pool Tuning

```go
db.SetMaxOpenConns(25)              // match expected concurrency
db.SetMaxIdleConns(10)              // keep warm connections
db.SetConnMaxLifetime(5*time.Minute) // rotate to balance load
db.SetConnMaxIdleTime(1*time.Minute) // release idle resources
```

## Anti-Patterns

- Optimizing without profiling data -- guessing wrong bottleneck.
- `fmt.Sprintf` in hot loops -- allocates every call.
- Interface boxing in tight loops (`any` parameter causes heap escape).
- Unbounded goroutines per request -- memory grows linearly with load.
- JSON marshal/unmarshal in hot paths without considering streaming or code-gen alternatives.
- Ignoring `b.ReportAllocs()` -- allocs/op matters more than ns/op for GC pressure.
- Using `reflect` when generics or code generation work.

## Tools

| Tool | Purpose |
|------|---------|
| `go tool pprof` | CPU, memory, goroutine, block profiles |
| `benchstat` | Statistical comparison of benchmark runs |
| `go build -gcflags="-m"` | Escape analysis |
| `go test -bench=. -benchmem` | Benchmark with allocation reporting |
| `trace` | Execution tracer for latency analysis |
| `golangci-lint` (prealloc) | Detect missing pre-allocations |

## Verification

- Benchmark shows improvement with `benchstat` (p-value <0.05)
- No regressions in existing benchmarks
- `pprof` confirms bottleneck addressed (before/after profiles)
- Escape analysis confirms hot-path allocations on stack
- Load test with realistic traffic pattern (wrk, hey, k6)
