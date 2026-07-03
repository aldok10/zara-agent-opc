# Subskill: Observability

> Activate when: log, trace, metric, pprof, slog, OpenTelemetry, alert, monitor, debug, goroutine leak
>
> Prevents mistakes: #75-#81, #98 (100 Go Mistakes - Standard Library & Diagnostics)

**Senior DNA**: Stdlib first (`log/slog`, `net/http/pprof`, `runtime/trace`, `runtime/metrics` - enough for most services). "It depends" - a background worker needs different observability than a user-facing API. Don't instrument everything; instrument what helps you debug production incidents. Structured logging always; printf debugging never.

## Philosophy

- You can't optimize what you can't measure.
- Instrument first, act on data.
- Logs for humans. Metrics for dashboards. Traces for debugging.
- Structured logging always. Printf debugging never (in production).

## Structured Logging (slog - Go 1.21+)

```go
logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
    Level: slog.LevelInfo,
}))

// Context-aware logging
logger.InfoContext(ctx, "request handled",
    "method", r.Method,
    "path", r.URL.Path,
    "status", status,
    "duration", time.Since(start),
)

// With persistent fields
reqLogger := logger.With("request_id", requestID, "user_id", userID)
reqLogger.Info("processing order", "order_id", orderID)
```

### Multi-handler (Go 1.26+)
```go
handler := slog.NewMultiHandler(
    slog.NewJSONHandler(os.Stdout, nil),   // stdout for humans
    slog.NewJSONHandler(logFile, nil),       // file for archival
)
```

## Profiling (pprof)

```go
import _ "net/http/pprof"

go http.ListenAndServe("localhost:6060", nil)
```

```bash
# CPU (30 second sample)
go tool pprof http://localhost:6060/debug/pprof/profile?seconds=30

# Memory (heap allocations)
go tool pprof http://localhost:6060/debug/pprof/heap

# Goroutines (find leaks)
go tool pprof http://localhost:6060/debug/pprof/goroutine

# Mutex contention
go tool pprof http://localhost:6060/debug/pprof/mutex

# Block (channel/mutex wait time)
go tool pprof http://localhost:6060/debug/pprof/block

# Goroutine leak detection (Go 1.26+ experimental)
go tool pprof http://localhost:6060/debug/pprof/goroutineleak

# Web UI
go tool pprof -http=:8080 cpu.prof
```

## Execution Tracing

```go
import "runtime/trace"

f, _ := os.Create("trace.out")
trace.Start(f)
defer trace.Stop()
```

```bash
go tool trace trace.out
# Shows: goroutine scheduling, GC events, network blocking, syscalls
```

## Runtime Metrics (Go 1.16+)

```go
import "runtime/metrics"

// Read specific metrics
descs := []metrics.Sample{
    {Name: "/gc/cycles/total:gc-cycles"},
    {Name: "/memory/classes/heap/objects:bytes"},
    {Name: "/sched/goroutines:goroutines"}, // Go 1.26+
}
metrics.Read(descs)
```

## GC Tracing

```bash
GODEBUG=gctrace=1 ./myapp 2>&1 | head -20
# gc 1 @0.004s 1%: 0.038+0.45+0.003 ms clock, ...
# Shows: GC number, wall time, CPU%, pause times, heap sizes
```

## Health Checks

```go
mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
    w.WriteHeader(http.StatusOK)
    fmt.Fprint(w, "ok")
})

mux.HandleFunc("GET /readyz", func(w http.ResponseWriter, r *http.Request) {
    if err := db.PingContext(r.Context()); err != nil {
        http.Error(w, "not ready", http.StatusServiceUnavailable)
        return
    }
    fmt.Fprint(w, "ready")
})
```

## Request Tracing Middleware

```go
func TracingMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        requestID := r.Header.Get("X-Request-ID")
        if requestID == "" {
            requestID = uuid.NewString()
        }

        ctx := context.WithValue(r.Context(), ctxKeyRequestID, requestID)
        w.Header().Set("X-Request-ID", requestID)

        rec := &statusRecorder{ResponseWriter: w, status: 200}
        next.ServeHTTP(rec, r.WithContext(ctx))

        slog.Info("request",
            "request_id", requestID,
            "method", r.Method,
            "path", r.URL.Path,
            "status", rec.status,
            "duration_ms", time.Since(start).Milliseconds(),
        )
    })
}
```

## Benchmark Methodology

```bash
# Statistical benchmarks
go test -bench=. -benchmem -count=10 > results.txt
benchstat old.txt new.txt

# Escape analysis check
go build -gcflags='-m' ./...

# Race detection
go test -race ./...
```

## Delegates To

- **performance** - when profiling reveals optimization opportunities
- **security** - when audit logging is needed

## Examples

- `examples/stdlib/03-slog-structured-logging/`
