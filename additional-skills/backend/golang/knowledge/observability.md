---
type: fact
title: "Observability"
---

# Observability

OpenTelemetry, structured logging, metrics, and distributed tracing for Go backends.

## Structured Logging (slog)

### Setup

```go
func newLogger(level string) *slog.Logger {
    var lvl slog.Level
    lvl.UnmarshalText([]byte(level))

    opts := &slog.HandlerOptions{
        Level:     lvl,
        AddSource: lvl == slog.LevelDebug,
    }
    handler := slog.NewJSONHandler(os.Stdout, opts)
    return slog.New(handler)
}
```

### Context-Aware Logging

```go
func withLogger(ctx context.Context, logger *slog.Logger) context.Context {
    return context.WithValue(ctx, loggerKey, logger)
}

func logFromCtx(ctx context.Context) *slog.Logger {
    if l, ok := ctx.Value(loggerKey).(*slog.Logger); ok {
        return l
    }
    return slog.Default()
}

// In middleware: enrich with request ID
logger = logger.With("request_id", requestID, "method", r.Method, "path", r.URL.Path)
ctx = withLogger(r.Context(), logger)
```

### Log Levels

| Level | Use |
|-------|-----|
| Debug | Development, detailed flow |
| Info | Normal operations (request served, job completed) |
| Warn | Recoverable issues (retry, degraded) |
| Error | Failures needing attention (unhandled error, dependency down) |

## OpenTelemetry Tracing

### Provider Setup

```go
func initTracer(ctx context.Context, serviceName string) (func(), error) {
    exporter, err := otlptracegrpc.New(ctx)
    if err != nil {
        return nil, fmt.Errorf("create exporter: %w", err)
    }
    tp := sdktrace.NewTracerProvider(
        sdktrace.WithBatcher(exporter),
        sdktrace.WithResource(resource.NewWithAttributes(
            semconv.SchemaURL,
            semconv.ServiceNameKey.String(serviceName),
        )),
    )
    otel.SetTracerProvider(tp)
    otel.SetTextMapPropagator(propagation.TraceContext{})
    return func() { tp.Shutdown(context.Background()) }, nil
}
```

### HTTP Middleware (otelhttp)

```go
handler := otelhttp.NewHandler(mux, "server",
    otelhttp.WithMessageEvents(otelhttp.ReadEvents, otelhttp.WriteEvents),
)
```

### Manual Spans

```go
func (s *service) ProcessOrder(ctx context.Context, orderID string) error {
    ctx, span := otel.Tracer("service").Start(ctx, "ProcessOrder")
    defer span.End()
    span.SetAttributes(attribute.String("order.id", orderID))

    if err := s.validate(ctx, orderID); err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, err.Error())
        return err
    }
    return nil
}
```

## Metrics (Prometheus)

```go
var (
    httpRequestsTotal = promauto.NewCounterVec(prometheus.CounterOpts{
        Name: "http_requests_total",
        Help: "Total HTTP requests",
    }, []string{"method", "path", "status"})

    httpRequestDuration = promauto.NewHistogramVec(prometheus.HistogramOpts{
        Name:    "http_request_duration_seconds",
        Help:    "HTTP request latency",
        Buckets: prometheus.DefBuckets,
    }, []string{"method", "path"})
)
```

### Metrics Middleware

```go
func withMetrics(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        ww := &statusWriter{ResponseWriter: w, status: 200}
        next.ServeHTTP(ww, r)
        duration := time.Since(start).Seconds()
        httpRequestsTotal.WithLabelValues(r.Method, r.URL.Path, strconv.Itoa(ww.status)).Inc()
        httpRequestDuration.WithLabelValues(r.Method, r.URL.Path).Observe(duration)
    })
}
```

## Health Checks

```go
mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
    w.WriteHeader(http.StatusOK) // liveness: process is running
})

mux.HandleFunc("GET /readyz", func(w http.ResponseWriter, r *http.Request) {
    if err := db.PingContext(r.Context()); err != nil {
        http.Error(w, "db unavailable", http.StatusServiceUnavailable)
        return
    }
    w.WriteHeader(http.StatusOK) // readiness: dependencies healthy
})
```

## Key Practices

1. Correlate logs and traces with shared `trace_id` field in log output.
2. RED metrics for every service: Rate, Errors, Duration.
3. USE metrics for resources: Utilization, Saturation, Errors (DB pool, goroutines).
4. Alert on symptoms (latency, error rate), not causes (CPU).
5. Structured logs in JSON for machine parsing. Human-readable for dev.
6. Never log sensitive data (tokens, passwords, PII).
