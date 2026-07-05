# net/http Since 1.22

Enhanced stdlib HTTP routing that eliminates most framework needs.

## ServeMux Enhancements (Go 1.22+)

### Method-Based Routing

```go
mux := http.NewServeMux()
mux.HandleFunc("GET /api/users", listUsers)
mux.HandleFunc("POST /api/users", createUser)
mux.HandleFunc("GET /api/users/{id}", getUser)
mux.HandleFunc("PUT /api/users/{id}", updateUser)
mux.HandleFunc("DELETE /api/users/{id}", deleteUser)
```

### Path Parameters

```go
func getUser(w http.ResponseWriter, r *http.Request) {
    id := r.PathValue("id") // built-in since 1.22
    // ...
}
```

### Wildcard (catch-all)

```go
mux.HandleFunc("GET /files/{path...}", serveFile)
// r.PathValue("path") returns "dir/subdir/file.txt"
```

### Precedence Rules

- More specific patterns win over general ones.
- Method-specific beats method-agnostic: `GET /x` beats `/x` for GET requests.
- Longer paths beat shorter: `/api/users/{id}` beats `/api/{rest...}`.
- Exact segments beat wildcards: `/api/users/me` beats `/api/users/{id}`.

## Handler Patterns

### Handler vs HandlerFunc

```go
// HandlerFunc for simple handlers
mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
    w.WriteHeader(http.StatusOK)
})

// Handler interface for stateful handlers
type userHandler struct {
    repo UserRepository
    log  *slog.Logger
}

func (h *userHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    // ...
}
mux.Handle("GET /api/users/{id}", &userHandler{repo: repo, log: logger})
```

### Middleware as Handler Wrapper

```go
func withTimeout(d time.Duration) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            ctx, cancel := context.WithTimeout(r.Context(), d)
            defer cancel()
            next.ServeHTTP(w, r.WithContext(ctx))
        })
    }
}

// Chain
handler := withTimeout(30*time.Second)(withLogging(mux))
```

## Server Configuration (Production)

```go
srv := &http.Server{
    Addr:              ":8080",
    Handler:           handler,
    ReadTimeout:       5 * time.Second,
    ReadHeaderTimeout: 2 * time.Second,
    WriteTimeout:      10 * time.Second,
    IdleTimeout:       120 * time.Second,
    MaxHeaderBytes:    1 << 20, // 1MB
}
```

## Key Gotchas

- `http.DefaultServeMux` is global -- never use in production (shared state, no isolation).
- `http.DefaultClient` has no timeout -- always create custom client with timeouts.
- `ResponseWriter.Write` implicitly calls `WriteHeader(200)` -- set status before writing.
- `return` after error response -- without it, handler continues execution.
- Path must start with `/` for patterns. Method is optional prefix.
- `{$}` matches exact path (no trailing slash redirect): `GET /api/{$}`.
