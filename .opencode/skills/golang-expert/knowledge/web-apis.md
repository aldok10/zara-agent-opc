# Go Web APIs

## net/http Patterns (Go 1.22+)

### Enhanced ServeMux Routing
```go
mux := http.NewServeMux()

mux.HandleFunc("GET /users", listUsers)
mux.HandleFunc("GET /users/{id}", getUser)
mux.HandleFunc("POST /users", createUser)
mux.HandleFunc("PUT /users/{id}", updateUser)
mux.HandleFunc("DELETE /users/{id}", deleteUser)

mux.HandleFunc("GET /posts/{postID}/comments/{commentID}", getComment)
```

### Path Parameters
```go
func getUser(w http.ResponseWriter, r *http.Request) {
    id := r.PathValue("id")
    // use id
}
```

### Wildcard and Precedence
```go
mux.HandleFunc("GET /files/{path...}", serveFile)    // catches /files/a/b/c
mux.HandleFunc("GET /files/special", specialHandler) // more specific wins
mux.HandleFunc("GET /{$}", indexHandler)             // exact match on /
```

### Server Configuration
```go
srv := &http.Server{
    Addr:         ":8080",
    Handler:      mux,
    ReadTimeout:  5 * time.Second,
    WriteTimeout: 10 * time.Second,
    IdleTimeout:  120 * time.Second,
}
```

## Middleware Patterns

### Middleware Signature
```go
type Middleware func(http.Handler) http.Handler
```

### Chain Pattern
```go
func Chain(h http.Handler, middlewares ...Middleware) http.Handler {
    for i := len(middlewares) - 1; i >= 0; i-- {
        h = middlewares[i](h)
    }
    return h
}

handler := Chain(mux, logging, recovery, auth)
```

### Logging Middleware
```go
func Logging(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        wrapped := &responseWriter{ResponseWriter: w, status: 200}
        next.ServeHTTP(wrapped, r)
        slog.Info("request",
            "method", r.Method,
            "path", r.URL.Path,
            "status", wrapped.status,
            "duration", time.Since(start),
        )
    })
}
```

### Recovery Middleware
```go
func Recovery(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        defer func() {
            if err := recover(); err != nil {
                slog.Error("panic recovered", "error", err, "stack", debug.Stack())
                http.Error(w, "internal server error", http.StatusInternalServerError)
            }
        }()
        next.ServeHTTP(w, r)
    })
}
```

### Auth Middleware
```go
func Auth(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        token := r.Header.Get("Authorization")
        claims, err := validateToken(token)
        if err != nil {
            http.Error(w, "unauthorized", http.StatusUnauthorized)
            return
        }
        ctx := context.WithValue(r.Context(), userKey, claims)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}
```

## Context Propagation

### Passing Context Through Handlers
```go
func getUser(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()
    user, err := db.GetUser(ctx, r.PathValue("id"))
    if err != nil {
        if errors.Is(err, context.Canceled) {
            return // client disconnected
        }
        writeError(w, err)
        return
    }
    writeJSON(w, http.StatusOK, user)
}
```

### Request-Scoped Values
```go
type contextKey string

const userKey contextKey = "user"

func UserFromContext(ctx context.Context) (*User, bool) {
    u, ok := ctx.Value(userKey).(*User)
    return u, ok
}
```

### Timeout Per Request
```go
func withTimeout(timeout time.Duration) Middleware {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            ctx, cancel := context.WithTimeout(r.Context(), timeout)
            defer cancel()
            next.ServeHTTP(w, r.WithContext(ctx))
        })
    }
}
```

## Request Validation and Error Responses

### JSON Decode with Validation
```go
func decodeJSON[T any](r *http.Request) (T, error) {
    var v T
    dec := json.NewDecoder(r.Body)
    dec.DisallowUnknownFields()
    if err := dec.Decode(&v); err != nil {
        return v, fmt.Errorf("decode: %w", err)
    }
    return v, nil
}
```

### Error Response Pattern
```go
type APIError struct {
    Status  int    `json:"-"`
    Code    string `json:"code"`
    Message string `json:"message"`
}

func (e APIError) Error() string { return e.Message }

func writeError(w http.ResponseWriter, err error) {
    var apiErr APIError
    if errors.As(err, &apiErr) {
        writeJSON(w, apiErr.Status, apiErr)
        return
    }
    writeJSON(w, http.StatusInternalServerError, APIError{
        Code:    "internal_error",
        Message: "an unexpected error occurred",
    })
}
```

### JSON Response Helper
```go
func writeJSON(w http.ResponseWriter, status int, v any) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(status)
    json.NewEncoder(w).Encode(v)
}
```

## Popular Routers

### Chi (Lightweight, idiomatic)
```go
r := chi.NewRouter()
r.Use(middleware.Logger, middleware.Recoverer)
r.Route("/api/v1", func(r chi.Router) {
    r.Use(authMiddleware)
    r.Get("/users/{id}", getUser)
    r.Post("/users", createUser)
})
```

### Standard Library (Go 1.22+)
- Now supports method-based routing and path parameters
- No external dependency needed for most APIs
- Chi still useful for route groups and sub-routers
- For simple APIs, stdlib is sufficient

## gRPC-Go

### Service Definition (proto)
```protobuf
service UserService {
    rpc GetUser(GetUserRequest) returns (User);
    rpc ListUsers(ListUsersRequest) returns (stream User);
}
```

### Interceptors (Middleware for gRPC)
```go
srv := grpc.NewServer(
    grpc.ChainUnaryInterceptor(
        loggingInterceptor,
        authInterceptor,
        recoveryInterceptor,
    ),
    grpc.ChainStreamInterceptor(
        streamLoggingInterceptor,
    ),
)
```

### Unary Interceptor Example
```go
func loggingInterceptor(
    ctx context.Context,
    req any,
    info *grpc.UnaryServerInfo,
    handler grpc.UnaryHandler,
) (any, error) {
    start := time.Now()
    resp, err := handler(ctx, req)
    slog.Info("grpc",
        "method", info.FullMethod,
        "duration", time.Since(start),
        "error", err,
    )
    return resp, err
}
```

### Streaming
```go
func (s *server) ListUsers(req *pb.ListUsersRequest, stream pb.UserService_ListUsersServer) error {
    users, err := s.repo.List(stream.Context())
    if err != nil {
        return status.Error(codes.Internal, "failed to list users")
    }
    for _, u := range users {
        if err := stream.Send(u); err != nil {
            return err
        }
    }
    return nil
}
```
