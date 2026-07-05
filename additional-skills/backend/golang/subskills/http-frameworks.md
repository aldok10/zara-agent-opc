---
type: subskill
title: "HTTP Frameworks"
---

# HTTP Frameworks

Go HTTP framework comparison and patterns. Choose based on measured needs, not hype.

## Decision Matrix

| Framework | When to Use | Performance | Stdlib Compat | Deps |
|-----------|-------------|-------------|---------------|------|
| `net/http` | Default choice since 1.22 | Good | Native | 0 |
| Chi | Complex routing, middleware groups | Good | Full (net/http) | 1 |
| Gin | Rapid prototyping, team familiarity | Very Good | Partial | Many |
| Echo | Similar to Gin, slightly cleaner API | Very Good | Partial | Many |
| Fiber | Extreme throughput (>100k rps verified) | Excellent | None (fasthttp) | Many |

## Rules

1. Start with stdlib `net/http` -- it handles path params, method routing, middleware since 1.22.
2. Upgrade to Chi only when you need: route groups, named middleware stacks, or URL param regex.
3. Choose Gin/Echo only when team velocity matters more than stdlib compatibility.
4. Choose Fiber only after benchmarking proves net/http is the bottleneck (rare).
5. Never mix frameworks in one service -- pick one and commit.
6. Middleware signature should be `func(http.Handler) http.Handler` when possible (portable).

## Patterns

### Stdlib (Go 1.22+)

```go
mux := http.NewServeMux()
mux.HandleFunc("GET /api/users/{id}", getUser)
mux.HandleFunc("POST /api/users", createUser)
mux.HandleFunc("GET /healthz", healthCheck)

// Middleware wrapping
handler := withLogging(withRecovery(mux))
```

### Chi

```go
r := chi.NewRouter()
r.Use(middleware.RequestID)
r.Use(middleware.RealIP)
r.Use(middleware.Logger)
r.Use(middleware.Recoverer)
r.Use(middleware.Timeout(30 * time.Second))

r.Route("/api/v1", func(r chi.Router) {
    r.Use(authMiddleware)
    r.Get("/users/{id}", getUser)
    r.Post("/users", createUser)
    r.Route("/admin", func(r chi.Router) {
        r.Use(adminOnly)
        r.Get("/stats", getStats)
    })
})
```

### Gin

```go
r := gin.New()
r.Use(gin.Recovery())
r.Use(ginzap.Ginzap(logger, time.RFC3339, true))

api := r.Group("/api/v1")
api.Use(authMiddleware())
{
    api.GET("/users/:id", getUser)
    api.POST("/users", createUser)
}
```

### Fiber

```go
app := fiber.New(fiber.Config{
    ReadTimeout:  5 * time.Second,
    WriteTimeout: 10 * time.Second,
    Prefork:      true, // multi-process
})
app.Use(recover.New())
app.Use(logger.New())

app.Get("/api/users/:id", getUser)
```

## Migration Path

When migrating FROM framework TO stdlib:
1. Chi handlers already use `http.Handler` -- minimal changes.
2. Gin/Echo require rewriting handler signatures (context → w, r).
3. Fiber requires complete rewrite (fasthttp is incompatible with net/http).

## Middleware Pattern (stdlib-compatible)

```go
func withRequestID(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        id := r.Header.Get("X-Request-ID")
        if id == "" {
            id = uuid.NewString()
        }
        ctx := context.WithValue(r.Context(), requestIDKey, id)
        w.Header().Set("X-Request-ID", id)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}
```

## Anti-Patterns

- Choosing Fiber for "performance" without benchmarking actual workload.
- Using Gin/Echo in new projects when stdlib 1.22+ covers the requirements.
- Framework-specific middleware that can't be reused across projects.
- Mixing net/http handlers with framework-specific handlers in same service.
- Not setting timeouts on the HTTP server regardless of framework.
- Choosing framework for routing when stdlib `{param}` syntax suffices.

## Verification

- Handler tests use `httptest` (stdlib-compatible frameworks) or framework test utils.
- Middleware chain order tested (panic recovery must be outermost).
- Route conflicts detected at startup (Chi/stdlib panic on duplicate routes).
- Framework-specific features justified with measured evidence.
