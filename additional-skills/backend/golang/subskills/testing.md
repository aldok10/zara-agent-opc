# Testing

Go testing patterns for backend services. Fast, reliable, comprehensive.

## Rules

1. Table-driven tests with `t.Run` subtests -- named cases, parallel where safe.
2. `t.Context()` (1.24+) for test context -- auto-cancelled when test ends.
3. `t.Parallel()` by default unless test uses shared mutable state.
4. Always run with `-race` in CI: `go test -race -count=1 ./...`.
5. Golden files for complex output (JSON responses, rendered templates).
6. `testcontainers-go` for integration tests needing real databases/services.
7. Test behavior, not implementation -- don't test private functions directly.
8. Mocks via interfaces at consumer site -- `mockgen` or hand-written.
9. Fuzzing (`testing.F`) for parsers, validators, serialization code.
10. `httptest.NewServer` for HTTP handler tests -- full request/response cycle.

## Patterns

### Table-Driven Tests

```go
func TestParseID(t *testing.T) {
    t.Parallel()
    tests := []struct {
        name    string
        input   string
        want    int64
        wantErr bool
    }{
        {name: "valid", input: "42", want: 42},
        {name: "negative", input: "-1", want: -1},
        {name: "empty", input: "", wantErr: true},
        {name: "overflow", input: "99999999999999999999", wantErr: true},
    }
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            t.Parallel()
            got, err := parseID(tt.input)
            if tt.wantErr {
                if err == nil {
                    t.Fatal("expected error, got nil")
                }
                return
            }
            if err != nil {
                t.Fatalf("unexpected error: %v", err)
            }
            if got != tt.want {
                t.Errorf("got %d, want %d", got, tt.want)
            }
        })
    }
}
```

### HTTP Handler Test

```go
func TestGetUser(t *testing.T) {
    repo := &mockUserRepo{users: map[int64]*User{1: {ID: 1, Name: "Alice"}}}
    handler := NewUserHandler(repo)

    req := httptest.NewRequest("GET", "/users/1", nil)
    req.SetPathValue("id", "1") // Go 1.22+ path params
    w := httptest.NewRecorder()

    handler.GetUser(w, req)

    if w.Code != http.StatusOK {
        t.Fatalf("status = %d, want 200", w.Code)
    }
    var got User
    json.NewDecoder(w.Body).Decode(&got)
    if got.Name != "Alice" {
        t.Errorf("name = %q, want %q", got.Name, "Alice")
    }
}
```

### Testcontainers Integration

```go
func TestUserRepository(t *testing.T) {
    if testing.Short() {
        t.Skip("skipping integration test")
    }
    ctx := t.Context()
    pgContainer, err := postgres.Run(ctx, "postgres:16",
        postgres.WithDatabase("testdb"),
        testcontainers.WithWaitStrategy(
            wait.ForLog("ready to accept connections").WithOccurrence(2),
        ),
    )
    t.Cleanup(func() { pgContainer.Terminate(context.Background()) })
    if err != nil {
        t.Fatal(err)
    }
    connStr, _ := pgContainer.ConnectionString(ctx)
    // Run migrations, test repository...
}
```

### Golden Files

```go
func TestRenderResponse(t *testing.T) {
    got := renderResponse(testData)
    golden := filepath.Join("testdata", t.Name()+".golden")
    if *update {
        os.WriteFile(golden, got, 0o644)
        return
    }
    want, _ := os.ReadFile(golden)
    if !bytes.Equal(got, want) {
        t.Errorf("output mismatch; run with -update to refresh golden files")
    }
}
```

### Fuzzing

```go
func FuzzParseJSON(f *testing.F) {
    f.Add([]byte(`{"name":"test"}`))
    f.Add([]byte(`{}`))
    f.Fuzz(func(t *testing.T, data []byte) {
        var v Item
        err := json.Unmarshal(data, &v)
        if err != nil {
            return // invalid input is expected
        }
        // Re-marshal and verify round-trip
        out, err := json.Marshal(v)
        if err != nil {
            t.Fatalf("marshal failed: %v", err)
        }
        var v2 Item
        if err := json.Unmarshal(out, &v2); err != nil {
            t.Fatalf("round-trip failed: %v", err)
        }
    })
}
```

## Anti-Patterns

- Testing implementation details (private methods, internal state).
- `time.Sleep` in tests -- use channels, conditions, or `Eventually` helpers.
- Shared test state without `t.Parallel()` awareness.
- Ignoring `-race` flag -- data races are undefined behavior.
- Over-mocking: mocking the thing you're testing.
- Tests that pass in isolation but fail together (shared global state).
- No `-count=1` in CI (cached results hide flaky tests).

## Test Organization

```
pkg/
  handler.go
  handler_test.go       # unit tests (fast, no external deps)
  handler_int_test.go   # integration tests (build tag or testing.Short)
  testdata/             # golden files, fixtures
```

## Verification

- `go test -race -count=1 ./...` passes
- Coverage >80% on handlers and service layer
- Integration tests tagged and runnable separately
- Fuzzing corpus checked in (`testdata/fuzz/`)
- No flaky tests (run 3x in CI with `-count=3`)
