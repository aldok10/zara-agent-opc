# Subskill: Architecture

> Activate when: project structure, interface design, pattern, DI, clean arch, module, package, SOLID, dependency, abstraction, composition
>
> Prevents mistakes: #1-#16 (100 Go Mistakes — Code & Project Organization)

**Senior DNA**: Stdlib first (`net/http` routing, `encoding/json`, `log/slog` — no framework needed). "It depends" — a 500-line CLI doesn't need hexagonal architecture. A 3-person team doesn't need microservices. Start as flat as possible, add structure when pain is real. Every abstraction must earn its existence through repeated use.

## Philosophy

- Start as modular monolith. Split when proven necessary.
- Accept interfaces, return structs.
- The bigger the interface, the weaker the abstraction.
- Every abstraction must earn its existence through proven need.
- Packages should be organized by domain, not by type.

## Project Structure (2026)

```
myproject/
├── cmd/                  # Entry points (thin main.go)
│   ├── api/
│   └── worker/
├── internal/             # Private — not importable externally
│   ├── domain/           # Core business types & logic
│   ├── handler/          # HTTP/gRPC transport layer
│   ├── repository/       # Data access
│   └── service/          # Use cases / application logic
├── pkg/                  # Public shared libraries (optional)
├── migrations/
├── go.mod
└── Makefile
```

**Rules**:
- `internal/` prevents external imports — safe to refactor
- `cmd/` only `main.go` — thin entry, wire dependencies
- Tests next to code: `handler_test.go` beside `handler.go`
- Avoid `golang-standards/project-layout` — it's NOT official
- Don't over-structure before you need it

## Interface Design

```go
// Small interfaces (1-2 methods)
type Reader interface { Read(p []byte) (n int, err error) }
type Closer interface { Close() error }

// Compose when needed
type ReadCloser interface { Reader; Closer }

// Define at consumer site, not producer
// This keeps packages decoupled
```

**Rules**:
- Interface with >3 methods = probably too big
- Define interfaces where they're consumed, not where they're implemented
- Don't create interfaces for a single implementation

## Dependency Injection (explicit, no framework)

```go
// In internal/service/
type UserService struct {
    repo UserRepository  // interface
    log  *slog.Logger
}

func NewUserService(repo UserRepository, log *slog.Logger) *UserService {
    return &UserService{repo: repo, log: log}
}

// In cmd/api/main.go — wire everything
func main() {
    db := database.Connect(cfg.DSN)
    repo := repository.NewUserRepo(db)
    svc := service.NewUserService(repo, logger)
    handler := handler.NewUserHandler(svc)
    // ...
}
```

## Functional Options

```go
type Option func(*Server)
func WithTimeout(d time.Duration) Option { return func(s *Server) { s.timeout = d } }
func NewServer(addr string, opts ...Option) *Server {
    s := &Server{addr: addr, timeout: 30 * time.Second}
    for _, opt := range opts { opt(s) }
    return s
}
```

## Error Handling Architecture

```go
// Domain errors (in internal/domain/)
var (
    ErrNotFound = errors.New("not found")
    ErrConflict = errors.New("already exists")
)

// Custom types for structured errors
type ValidationError struct { Field, Message string }
func (e *ValidationError) Error() string { ... }

// Wrap at boundaries with context
return fmt.Errorf("get user %s: %w", id, err)

// Handle at transport layer (HTTP handler)
if errors.Is(err, domain.ErrNotFound) {
    http.Error(w, "not found", 404)
}
```

## Middleware Pattern

```go
type Middleware func(http.Handler) http.Handler

func Chain(h http.Handler, mw ...Middleware) http.Handler {
    for i := len(mw) - 1; i >= 0; i-- {
        h = mw[i](h)
    }
    return h
}
```

## HTTP Routing (Go 1.22+)

```go
mux := http.NewServeMux()
mux.HandleFunc("GET /users/{id}", getUser)
mux.HandleFunc("POST /users", createUser)
mux.HandleFunc("DELETE /users/{id}", deleteUser)

func getUser(w http.ResponseWriter, r *http.Request) {
    id := r.PathValue("id")
}
```

## Iterator Pattern (Go 1.23+)

```go
func (db *DB) Users(ctx context.Context) iter.Seq2[*User, error] {
    return func(yield func(*User, error) bool) {
        rows, err := db.QueryContext(ctx, "SELECT ...")
        if err != nil { yield(nil, err); return }
        defer rows.Close()
        for rows.Next() {
            var u User
            if err := rows.Scan(&u.ID, &u.Name); err != nil {
                if !yield(nil, err) { return }
                continue
            }
            if !yield(&u, nil) { return }
        }
    }
}
```

## When NOT to Abstract

- Single implementation → no interface needed
- "Just in case" flexibility → YAGNI
- Wrapping stdlib for no reason → unnecessary indirection
- Generic before 3 concrete uses → premature abstraction

---

## Production Patterns

### Main Structure (always)
```go
func main() {
    if err := run(); err != nil {
        fmt.Fprintln(os.Stderr, err)
        os.Exit(1)
    }
}

func run() error {
    ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
    defer stop()

    // init dependencies
    // start server
    // wait for signal
    // graceful shutdown
}
```

### Health Checks (K8s/production)
```go
mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
    w.WriteHeader(http.StatusOK)
})
mux.HandleFunc("GET /readyz", func(w http.ResponseWriter, r *http.Request) {
    if err := db.PingContext(r.Context()); err != nil {
        http.Error(w, "not ready", http.StatusServiceUnavailable)
        return
    }
    w.WriteHeader(http.StatusOK)
})
```

### Structured Errors + slog Integration
```go
// Domain error with structured data
type AppError struct {
    Code    string // machine-readable: "user.not_found"
    Message string // human-readable
    Err     error  // wrapped cause
}

func (e *AppError) Error() string { return e.Message }
func (e *AppError) Unwrap() error { return e.Err }

// Log with context at handler boundary (not deep in the stack)
func handleErr(w http.ResponseWriter, r *http.Request, err error) {
    var appErr *AppError
    if errors.As(err, &appErr) {
        slog.WarnContext(r.Context(), "request failed",
            "error_code", appErr.Code,
            "error", appErr.Message,
            "request_id", middleware.RequestID(r.Context()),
        )
        http.Error(w, appErr.Message, codeToHTTP(appErr.Code))
        return
    }
    slog.ErrorContext(r.Context(), "unexpected error", "error", err)
    http.Error(w, "internal error", http.StatusInternalServerError)
}
```

### Dependency Wiring (production main)
```go
func run() error {
    cfg := config.Load()

    db, err := database.Connect(cfg.DatabaseURL)
    if err != nil { return fmt.Errorf("connect db: %w", err) }
    defer db.Close()

    userRepo := repository.NewUserRepo(db)
    userSvc := service.NewUserService(userRepo)
    handler := handler.New(userSvc)

    srv := &http.Server{
        Addr:         cfg.Addr,
        Handler:      handler.Routes(),
        ReadTimeout:  5 * time.Second,
        WriteTimeout: 10 * time.Second,
        IdleTimeout:  120 * time.Second,
    }

    go func() { /* start server */ }()
    // graceful shutdown...
}
```

---

## Delegates To

- **testing** — when architecture needs test strategy
- **performance** — when architecture decisions affect performance
- **security** — when dependency boundaries affect attack surface

## Examples

- `examples/patterns/01-error-handling/`
- `examples/patterns/02-functional-options/`
- `examples/stdlib/01-http-routing-122/`
