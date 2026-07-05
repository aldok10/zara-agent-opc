---
type: fact
title: "Go Error Handling & Observability - Wrapping, slog, OpenTelemetry"
---

# Go Error Handling & Observability

## Error Wrapping

```go
// DO: wrap with context using %w
func GetUser(ctx context.Context, id string) (*User, error) {
    user, err := db.QueryUser(ctx, id)
    if err != nil {
        return nil, fmt.Errorf("get user %s: %w", id, err)
    }
    return user, nil
}

// DON'T: wrap without %w (breaks errors.Is/As chain)
return nil, fmt.Errorf("get user: %v", err) // loses type info

// DON'T: wrap with redundant context
return nil, fmt.Errorf("GetUser failed: error getting user: %w", err)
```

## errors.Is / errors.As

```go
// errors.Is: check for specific error value in chain
if errors.Is(err, sql.ErrNoRows) {
    return nil, ErrNotFound
}

// errors.As: extract typed error from chain
var pgErr *pgconn.PgError
if errors.As(err, &pgErr) {
    if pgErr.Code == "23505" { // unique_violation
        return ErrDuplicate
    }
}

// DON'T: compare directly
if err == sql.ErrNoRows { // breaks if err is wrapped
```

## Sentinel Errors

```go
// DO: package-level sentinel errors for expected conditions
var (
    ErrNotFound    = errors.New("not found")
    ErrConflict    = errors.New("conflict")
    ErrUnauthorized = errors.New("unauthorized")
)

// DON'T: use sentinel errors for unexpected conditions (use wrapping)
// DON'T: expose internal sentinel errors to callers (wrap at boundary)
```

## Custom Error Types

```go
// DO: custom types when callers need structured info
type ValidationError struct {
    Field   string
    Message string
}

func (e *ValidationError) Error() string {
    return fmt.Sprintf("validation: %s %s", e.Field, e.Message)
}

// Usage
func Validate(req CreateRequest) error {
    if req.Name == "" {
        return &ValidationError{Field: "name", Message: "is required"}
    }
    return nil
}

// Caller extracts details
var ve *ValidationError
if errors.As(err, &ve) {
    respondJSON(w, 422, map[string]string{"field": ve.Field, "error": ve.Message})
}
```

## Multi-Error (errors.Join)

```go
// DO: collect multiple errors (Go 1.20+)
func validateAll(req Request) error {
    var errs []error
    if req.Name == "" {
        errs = append(errs, &ValidationError{Field: "name", Message: "required"})
    }
    if req.Email == "" {
        errs = append(errs, &ValidationError{Field: "email", Message: "required"})
    }
    return errors.Join(errs...) // nil if slice is empty
}

// errors.Is works through joined errors
err := errors.Join(ErrNotFound, ErrConflict)
errors.Is(err, ErrNotFound) // true
errors.Is(err, ErrConflict) // true
```

## Error Categorization Pattern

```go
// DO: categorize at API boundary, not deep in the stack
type ErrorKind int

const (
    KindInternal ErrorKind = iota
    KindNotFound
    KindValidation
    KindConflict
    KindPermission
)

type AppError struct {
    Kind    ErrorKind
    Message string
    Err     error
}

func (e *AppError) Error() string { return e.Message }
func (e *AppError) Unwrap() error { return e.Err }

// HTTP handler maps kind to status
func errorToStatus(err error) int {
    var appErr *AppError
    if !errors.As(err, &appErr) {
        return http.StatusInternalServerError
    }
    switch appErr.Kind {
    case KindNotFound:
        return http.StatusNotFound
    case KindValidation:
        return http.StatusUnprocessableEntity
    case KindConflict:
        return http.StatusConflict
    case KindPermission:
        return http.StatusForbidden
    default:
        return http.StatusInternalServerError
    }
}
```

## slog (Structured Logging, Go 1.21+)

```go
import "log/slog"

// DO: use slog as the default structured logger
func main() {
    logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
        Level: slog.LevelInfo,
    }))
    slog.SetDefault(logger)

    slog.Info("server starting", "port", 8080, "env", "production")
}

// DO: pass logger via context
func ProcessOrder(ctx context.Context, order Order) error {
    logger := slog.Default().With("order_id", order.ID)
    logger.InfoContext(ctx, "processing order", "total", order.Total)

    if err := charge(ctx, order); err != nil {
        logger.ErrorContext(ctx, "charge failed", "err", err)
        return fmt.Errorf("process order %s: %w", order.ID, err)
    }
    return nil
}

// DO: use LogValuer for custom types
type User struct {
    ID    string
    Email string
}

func (u User) LogValue() slog.Value {
    return slog.GroupValue(
        slog.String("id", u.ID),
        // omit email for privacy
    )
}

// DON'T: log and return (double logging)
if err != nil {
    slog.Error("failed", "err", err) // logged here
    return err                        // AND logged by caller
}

// DO: log OR return, not both (log at the top, return everywhere else)
```

## zerolog vs zap vs slog

| Feature | slog (stdlib) | zerolog | zap |
|---------|--------------|---------|-----|
| Zero alloc | No | Yes | Yes (sugar: No) |
| Stdlib | Yes (1.21+) | No | No |
| JSON default | Handler choice | Yes | Yes |
| Context support | Yes | Manual | Manual |
| Sampling | No | Yes | Yes |
| Recommendation | Default choice | High-perf logging | Legacy projects |

```go
// zerolog pattern (when slog perf insufficient)
import "github.com/rs/zerolog"

logger := zerolog.New(os.Stdout).With().Timestamp().Logger()
logger.Info().Str("order_id", id).Int("total", total).Msg("order processed")

// zap pattern
import "go.uber.org/zap"

logger, _ := zap.NewProduction()
defer logger.Sync()
logger.Info("order processed", zap.String("order_id", id), zap.Int("total", total))
```

## OpenTelemetry Go SDK

```go
import (
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
    "go.opentelemetry.io/otel/sdk/resource"
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
    semconv "go.opentelemetry.io/otel/semconv/v1.24.0"
)

// Setup tracer provider
func initTracer(ctx context.Context) (func(), error) {
    exporter, err := otlptracegrpc.New(ctx)
    if err != nil {
        return nil, fmt.Errorf("create exporter: %w", err)
    }

    res := resource.NewWithAttributes(
        semconv.SchemaURL,
        semconv.ServiceName("my-service"),
        semconv.ServiceVersion("1.0.0"),
    )

    tp := sdktrace.NewTracerProvider(
        sdktrace.WithBatcher(exporter),
        sdktrace.WithResource(res),
    )
    otel.SetTracerProvider(tp)

    shutdown := func() {
        ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
        defer cancel()
        tp.Shutdown(ctx)
    }
    return shutdown, nil
}

// DO: create spans for meaningful operations
var tracer = otel.Tracer("myapp/orders")

func ProcessOrder(ctx context.Context, order Order) error {
    ctx, span := tracer.Start(ctx, "ProcessOrder")
    defer span.End()

    span.SetAttributes(
        attribute.String("order.id", order.ID),
        attribute.Int("order.items", len(order.Items)),
    )

    if err := validate(ctx, order); err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, err.Error())
        return err
    }
    return nil
}

// DON'T: create spans for trivial operations (noise)
// DON'T: put sensitive data in span attributes
```

## Prometheus Metrics

```go
import (
    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promauto"
    "github.com/prometheus/client_golang/prometheus/promhttp"
)

var (
    requestsTotal = promauto.NewCounterVec(prometheus.CounterOpts{
        Name: "http_requests_total",
        Help: "Total HTTP requests by method and status",
    }, []string{"method", "status"})

    requestDuration = promauto.NewHistogramVec(prometheus.HistogramOpts{
        Name:    "http_request_duration_seconds",
        Help:    "HTTP request duration",
        Buckets: prometheus.DefBuckets,
    }, []string{"method", "path"})
)

// Middleware
func metricsMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        rec := &statusRecorder{ResponseWriter: w, status: 200}

        next.ServeHTTP(rec, r)

        duration := time.Since(start).Seconds()
        requestsTotal.WithLabelValues(r.Method, strconv.Itoa(rec.status)).Inc()
        requestDuration.WithLabelValues(r.Method, r.URL.Path).Observe(duration)
    })
}

// Expose metrics endpoint
mux.Handle("GET /metrics", promhttp.Handler())
```

## Observability Best Practices

1. **Three pillars**: logs (what happened), traces (request flow), metrics (system health)
2. **Correlate**: include trace_id in logs via slog handler
3. **Error budget**: alert on error rate, not individual errors
4. **Cardinality**: never use unbounded values as metric labels (user IDs, request IDs)
5. **Sampling**: use head-based sampling in production (1-10% for high-traffic)

```go
// DO: correlate logs with traces
type traceHandler struct {
    slog.Handler
}

func (h *traceHandler) Handle(ctx context.Context, r slog.Record) error {
    span := trace.SpanFromContext(ctx)
    if span.SpanContext().HasTraceID() {
        r.AddAttrs(slog.String("trace_id", span.SpanContext().TraceID().String()))
    }
    return h.Handler.Handle(ctx, r)
}
```

## Key Rules

1. Wrap errors with context at every layer boundary
2. Use `%w` for wrappable errors, `%v` only when intentionally hiding internals
3. Log OR return errors, never both
4. Use slog by default; zerolog/zap only when benchmarks prove necessary
5. Put trace_id in every log line
6. Keep metric label cardinality low (< 100 unique combinations per metric)
7. Record span errors with `span.RecordError(err)` + `span.SetStatus(codes.Error, ...)`
8. Use `errors.Join` for multi-validation, not custom slice types
