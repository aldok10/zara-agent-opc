---
type: fact
title: "Error Patterns"
---

# Error Patterns

Go error handling: wrapping, sentinel, custom types, and boundary strategies.

## Error Wrapping (fmt.Errorf + %w)

```go
func (s *service) GetUser(ctx context.Context, id int64) (*User, error) {
    user, err := s.repo.FindByID(ctx, id)
    if err != nil {
        return nil, fmt.Errorf("get user %d: %w", id, err)
    }
    return user, nil
}
```

Wrap with operation context, not "failed to" prefix (redundant -- it's an error).

## Sentinel Errors

```go
var (
    ErrNotFound    = errors.New("not found")
    ErrConflict    = errors.New("conflict")
    ErrForbidden   = errors.New("forbidden")
    ErrValidation  = errors.New("validation")
)

// Check with errors.Is (traverses wrap chain)
if errors.Is(err, ErrNotFound) {
    http.Error(w, "not found", http.StatusNotFound)
    return
}
```

## Custom Error Types

```go
type ValidationError struct {
    Field   string
    Message string
}

func (e *ValidationError) Error() string {
    return fmt.Sprintf("validation: %s: %s", e.Field, e.Message)
}

// Check with errors.As
var ve *ValidationError
if errors.As(err, &ve) {
    // access ve.Field, ve.Message
}
```

## Multi-Error (errors.Join)

```go
func validate(u *User) error {
    var errs []error
    if u.Name == "" {
        errs = append(errs, &ValidationError{Field: "name", Message: "required"})
    }
    if u.Email == "" {
        errs = append(errs, &ValidationError{Field: "email", Message: "required"})
    }
    return errors.Join(errs...)
}
```

## Error Boundary Pattern

Handle errors at boundaries (HTTP handler, gRPC method), not in business logic:

```go
// Service layer: wrap and return
func (s *svc) Process(ctx context.Context, id string) error {
    item, err := s.repo.Get(ctx, id)
    if err != nil {
        return fmt.Errorf("process %s: %w", id, err)
    }
    return nil
}

// Handler layer: map to HTTP status
func (h *handler) Process(w http.ResponseWriter, r *http.Request) {
    err := h.svc.Process(r.Context(), r.PathValue("id"))
    if err == nil {
        w.WriteHeader(http.StatusNoContent)
        return
    }
    switch {
    case errors.Is(err, ErrNotFound):
        http.Error(w, "not found", http.StatusNotFound)
    case errors.Is(err, ErrValidation):
        http.Error(w, err.Error(), http.StatusBadRequest)
    default:
        h.log.Error("process failed", "error", err)
        http.Error(w, "internal error", http.StatusInternalServerError)
    }
}
```

## Rules

1. Wrap with `%w` + context (what operation, what input).
2. Handle once: either log OR return, never both.
3. Sentinel for expected domain errors (`ErrNotFound`, `ErrConflict`).
4. Custom types when caller needs structured access to error data.
5. Map to transport errors at boundaries only.
6. Never expose internal error messages to clients.
7. Use `errors.Join` (1.20+) for collecting multiple validation errors.
8. `errors.Is` checks value equality through wraps. `errors.As` extracts typed errors.
