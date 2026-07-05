---
type: fact
title: "Go Testing - Table-Driven, Fuzzing, Benchmarks, Testcontainers"
---

# Go Testing Patterns

## Table-Driven Tests

```go
func TestParseAmount(t *testing.T) {
    tests := []struct {
        name    string
        input   string
        want    int64
        wantErr bool
    }{
        {name: "valid cents", input: "1234", want: 1234},
        {name: "zero", input: "0", want: 0},
        {name: "negative", input: "-100", want: -100},
        {name: "empty string", input: "", wantErr: true},
        {name: "non-numeric", input: "abc", wantErr: true},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got, err := ParseAmount(tt.input)
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
                t.Errorf("ParseAmount(%q) = %d, want %d", tt.input, got, tt.want)
            }
        })
    }
}
```

## Parallel Tests

```go
func TestFetch(t *testing.T) {
    t.Parallel() // mark top-level as parallel

    tests := []struct {
        name string
        url  string
    }{
        {name: "google", url: "https://google.com"},
        {name: "github", url: "https://github.com"},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            t.Parallel() // each subtest runs in parallel
            resp, err := http.Get(tt.url)
            if err != nil {
                t.Fatalf("GET %s: %v", tt.url, err)
            }
            resp.Body.Close()
            if resp.StatusCode != 200 {
                t.Errorf("status = %d, want 200", resp.StatusCode)
            }
        })
    }
}

// DON'T: share mutable state between parallel tests without sync
// DON'T: use t.Setenv in parallel tests (panics since Go 1.17)
```

## Benchmarks

```go
func BenchmarkSerialize(b *testing.B) {
    data := generateTestData()
    b.ResetTimer() // exclude setup from timing

    for b.Loop() { // Go 1.24+: replaces for i := 0; i < b.N; i++
        _ = serialize(data)
    }
}

// Sub-benchmarks for comparison
func BenchmarkEncode(b *testing.B) {
    sizes := []int{64, 256, 1024, 4096}
    for _, size := range sizes {
        b.Run(fmt.Sprintf("size=%d", size), func(b *testing.B) {
            data := make([]byte, size)
            b.ResetTimer()
            for b.Loop() {
                encode(data)
            }
        })
    }
}

// Memory allocation benchmarks
func BenchmarkAllocs(b *testing.B) {
    b.ReportAllocs()
    for b.Loop() {
        _ = buildResponse(testPayload)
    }
}
```

Run: `go test -bench=. -benchmem -count=6 ./... | benchstat`

## Fuzz Testing (Go 1.18+)

```go
func FuzzParseJSON(f *testing.F) {
    // Seed corpus
    f.Add([]byte(`{"name":"test"}`))
    f.Add([]byte(`{}`))
    f.Add([]byte(`null`))

    f.Fuzz(func(t *testing.T, data []byte) {
        var result map[string]any
        err := json.Unmarshal(data, &result)
        if err != nil {
            return // invalid input, skip
        }
        // Round-trip: marshal back and verify
        encoded, err := json.Marshal(result)
        if err != nil {
            t.Fatalf("Marshal failed after successful Unmarshal: %v", err)
        }
        var result2 map[string]any
        if err := json.Unmarshal(encoded, &result2); err != nil {
            t.Fatalf("round-trip failed: %v", err)
        }
    })
}
```

Run: `go test -fuzz=FuzzParseJSON -fuzztime=30s`

## Test Fixtures

```go
// testdata/ directory is ignored by go build
func TestProcess(t *testing.T) {
    input, err := os.ReadFile("testdata/input.json")
    if err != nil {
        t.Fatal(err)
    }
    // use input...
}

// t.TempDir() auto-cleaned after test
func TestWriteFile(t *testing.T) {
    dir := t.TempDir()
    path := filepath.Join(dir, "output.txt")
    if err := WriteFile(path, []byte("hello")); err != nil {
        t.Fatal(err)
    }
    got, _ := os.ReadFile(path)
    if string(got) != "hello" {
        t.Errorf("got %q, want %q", got, "hello")
    }
}
```

## Golden Files

```go
var update = flag.Bool("update", false, "update golden files")

func TestRender(t *testing.T) {
    got := render(testInput)
    golden := filepath.Join("testdata", t.Name()+".golden")

    if *update {
        os.WriteFile(golden, []byte(got), 0o644)
        return
    }

    want, err := os.ReadFile(golden)
    if err != nil {
        t.Fatal(err)
    }
    if diff := cmp.Diff(string(want), got); diff != "" {
        t.Errorf("mismatch (-want +got):\n%s", diff)
    }
}
```

Run: `go test -run TestRender -update` to regenerate.

## httptest

```go
func TestHandler(t *testing.T) {
    // Setup
    svc := NewService(mockDB)
    handler := NewHandler(svc)

    // Request
    body := strings.NewReader(`{"name":"test"}`)
    req := httptest.NewRequest(http.MethodPost, "/items", body)
    req.Header.Set("Content-Type", "application/json")
    rec := httptest.NewRecorder()

    // Act
    handler.ServeHTTP(rec, req)

    // Assert
    if rec.Code != http.StatusCreated {
        t.Errorf("status = %d, want %d", rec.Code, http.StatusCreated)
    }

    var resp Item
    if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
        t.Fatal(err)
    }
    if resp.Name != "test" {
        t.Errorf("name = %q, want %q", resp.Name, "test")
    }
}

// Test server for client testing
func TestClient(t *testing.T) {
    srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
    }))
    defer srv.Close()

    client := NewAPIClient(srv.URL)
    resp, err := client.GetStatus(context.Background())
    if err != nil {
        t.Fatal(err)
    }
    if resp.Status != "ok" {
        t.Errorf("status = %q, want %q", resp.Status, "ok")
    }
}
```

## Testcontainers-go

```go
import (
    "github.com/testcontainers/testcontainers-go"
    "github.com/testcontainers/testcontainers-go/modules/postgres"
)

func TestWithPostgres(t *testing.T) {
    if testing.Short() {
        t.Skip("skipping integration test")
    }

    ctx := context.Background()
    pgContainer, err := postgres.Run(ctx,
        "postgres:16-alpine",
        postgres.WithDatabase("testdb"),
        postgres.WithUsername("test"),
        postgres.WithPassword("test"),
        testcontainers.WithWaitStrategy(
            wait.ForLog("database system is ready").WithOccurrence(2),
        ),
    )
    testcontainers.CleanupContainer(t, pgContainer)
    if err != nil {
        t.Fatal(err)
    }

    connStr, err := pgContainer.ConnectionString(ctx, "sslmode=disable")
    if err != nil {
        t.Fatal(err)
    }

    db, err := sql.Open("pgx", connStr)
    if err != nil {
        t.Fatal(err)
    }
    defer db.Close()

    // Run migrations and test...
    repo := NewUserRepo(db)
    // ...
}
```

## Mocking with Interfaces

```go
// DON'T: mock everything, use real implementations where possible
// DO: define small interfaces at the consumer

// In the package that uses it:
type UserStore interface {
    GetUser(ctx context.Context, id string) (*User, error)
}

// Test double:
type mockUserStore struct {
    getFunc func(ctx context.Context, id string) (*User, error)
}

func (m *mockUserStore) GetUser(ctx context.Context, id string) (*User, error) {
    return m.getFunc(ctx, id)
}

func TestGetProfile(t *testing.T) {
    store := &mockUserStore{
        getFunc: func(_ context.Context, id string) (*User, error) {
            if id == "123" {
                return &User{ID: "123", Name: "Alice"}, nil
            }
            return nil, ErrNotFound
        },
    }

    svc := NewProfileService(store)
    profile, err := svc.GetProfile(context.Background(), "123")
    if err != nil {
        t.Fatal(err)
    }
    if profile.Name != "Alice" {
        t.Errorf("name = %q, want %q", profile.Name, "Alice")
    }
}
```

## Coverage

```bash
# Generate coverage
go test -coverprofile=coverage.out ./...

# View in browser
go tool cover -html=coverage.out

# Check minimum coverage (CI gate)
go test -coverprofile=coverage.out ./...
COVERAGE=$(go tool cover -func=coverage.out | grep total | awk '{print $3}' | tr -d '%')
if (( $(echo "$COVERAGE < 80" | bc -l) )); then
    echo "Coverage $COVERAGE% is below 80%"
    exit 1
fi
```

## Testing Best Practices

1. **Test behavior, not implementation** - test public API, not internal functions
2. **Use `t.Helper()`** in assertion helpers for correct line reporting
3. **Use `google/go-cmp`** over `reflect.DeepEqual` for readable diffs
4. **Skip slow tests**: `if testing.Short() { t.Skip("...") }`
5. **Use build tags** for integration tests: `//go:build integration`
6. **Never sleep in tests** - use channels, conditions, or polling with deadline
7. **Clean up with `t.Cleanup()`** - runs LIFO after test completes
8. **Run with `-race`** in CI: `go test -race ./...`
9. **Test error paths** - errors are part of the contract
10. **Keep test packages separate** for black-box testing: `package foo_test`
