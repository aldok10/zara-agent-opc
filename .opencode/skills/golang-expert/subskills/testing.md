# Subskill: Testing

> Activate when: test, bench, fuzz, mock, table-driven, coverage, TDD, assertion, fixture, helper
>
> Prevents mistakes: #82-#90 (100 Go Mistakes - Testing)

**Senior DNA**: Stdlib first (`testing`, `httptest`, `iotest`, `fstest` - no assertion library needed). "It depends" - 100% coverage on a prototype is waste. Zero tests on payment logic is negligence. Test what scares you, skip what's trivial. Match test strategy to risk level.

**Concurrency testing is mandatory**: Any code that uses goroutines, channels, mutexes, or shared state MUST be tested under concurrent conditions. Race conditions and deadlocks are production killers that only surface under load.

## Concurrency Testing Rules

**Always run with `-race`**:
```bash
go test -race -count=5 ./...  # count>1 increases race detection probability
```

### Test for Data Races

```go
func TestConcurrentMapAccess(t *testing.T) {
    m := NewSafeMap()
    var wg sync.WaitGroup

    // Writers
    for i := range 100 {
        wg.Add(1)
        go func(id int) {
            defer wg.Done()
            m.Set(fmt.Sprintf("key-%d", id), id)
        }(i)
    }

    // Readers (concurrent with writers)
    for range 100 {
        wg.Add(1)
        go func() {
            defer wg.Done()
            _ = m.Get("key-50")
        }()
    }

    wg.Wait()
}
```

### Test for Deadlocks

```go
func TestNoDeadlock(t *testing.T) {
    done := make(chan struct{})
    go func() {
        defer close(done)
        result := operationThatCouldDeadlock()
        _ = result
    }()

    select {
    case <-done:
        // OK - completed
    case <-time.After(5 * time.Second):
        t.Fatal("deadlock detected: operation did not complete within 5s")
    }
}
```

### Test for Goroutine Leaks

```go
import "go.uber.org/goleak"

func TestMain(m *testing.M) {
    goleak.VerifyTestMain(m) // fails if any goroutine leaks after tests
}

// Or per-test:
func TestWorkerPool(t *testing.T) {
    defer goleak.VerifyNone(t)
    pool := NewPool(4)
    pool.Submit(func() { /* work */ })
    pool.Shutdown()
}
```

### Test Under Contention (stress test)

```go
func TestHighContention(t *testing.T) {
    if testing.Short() {
        t.Skip("skipping stress test")
    }

    counter := NewAtomicCounter()
    var wg sync.WaitGroup
    goroutines := runtime.NumCPU() * 4

    for range goroutines {
        wg.Add(1)
        go func() {
            defer wg.Done()
            for range 10_000 {
                counter.Inc()
            }
        }()
    }

    wg.Wait()
    expected := goroutines * 10_000
    if got := counter.Value(); got != expected {
        t.Errorf("counter = %d, want %d (race condition!)", got, expected)
    }
}
```

### Test Channel Behavior

```go
func TestChannelDoesNotBlock(t *testing.T) {
    ch := make(chan int, 1)

    // Should not block
    select {
    case ch <- 42:
    default:
        t.Fatal("channel unexpectedly full")
    }

    // Should receive
    select {
    case v := <-ch:
        if v != 42 {
            t.Errorf("got %d, want 42", v)
        }
    case <-time.After(time.Second):
        t.Fatal("channel receive timed out")
    }
}
```

### Concurrency Test Checklist

- [ ] `-race` flag in CI (catches data races at runtime)
- [ ] `-count=5` or higher (races are non-deterministic - more runs = higher detection)
- [ ] Timeout on operations that could deadlock
- [ ] `goleak.VerifyNone` on tests that spawn goroutines
- [ ] Stress test with `GOMAXPROCS * N` goroutines for shared state
- [ ] Verify final state correctness after concurrent modification

## Philosophy

- Test what scares you. Skip the rest.
- Table-driven tests are idiomatic Go.
- Tests are documentation - name them clearly.
- Fuzz for edge cases. Bench for performance claims.
- No test framework needed - stdlib `testing` is sufficient.

## Table-Driven Tests

```go
func TestParse(t *testing.T) {
    tests := []struct {
        name    string
        input   string
        want    Result
        wantErr bool
    }{
        {name: "valid", input: "hello", want: Result{Value: "hello"}},
        {name: "empty", input: "", wantErr: true},
    }
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got, err := Parse(tt.input)
            if (err != nil) != tt.wantErr {
                t.Fatalf("Parse(%q) err=%v, wantErr=%v", tt.input, err, tt.wantErr)
            }
            if !tt.wantErr && got != tt.want {
                t.Errorf("Parse(%q) = %v, want %v", tt.input, got, tt.want)
            }
        })
    }
}
```

## Parallel Tests

```go
t.Run(tt.name, func(t *testing.T) {
    t.Parallel()
    // ...
})
```

## Benchmarks (Go 1.24+ B.Loop)

```go
func BenchmarkProcess(b *testing.B) {
    data := setup()
    b.ResetTimer()
    b.ReportAllocs()
    for b.Loop() {
        Process(data)
    }
}
```

```bash
go test -bench=. -benchmem -count=10 > results.txt
benchstat old.txt new.txt
```

## Fuzzing (Go 1.18+)

```go
func FuzzParse(f *testing.F) {
    f.Add("valid")
    f.Add("")
    f.Fuzz(func(t *testing.T, input string) {
        result, err := Parse(input)
        if err != nil && result != nil {
            t.Error("should not return both")
        }
    })
}
```

```bash
go test -fuzz=FuzzParse -fuzztime=30s
```

## Test Helpers

```go
func setupDB(t *testing.T) *DB {
    t.Helper()
    db, err := Open(":memory:")
    if err != nil {
        t.Fatal(err)
    }
    t.Cleanup(func() { db.Close() })
    return db
}
```

## Mocking (interface-based, no framework)

```go
type Storage interface {
    Get(ctx context.Context, id string) (*Item, error)
}

// In test file:
type mockStorage struct {
    getFn func(ctx context.Context, id string) (*Item, error)
}
func (m *mockStorage) Get(ctx context.Context, id string) (*Item, error) {
    return m.getFn(ctx, id)
}
```

## Test Artifacts (Go 1.26+)

```go
func TestReport(t *testing.T) {
    dir := t.ArtifactDir()
    path := filepath.Join(dir, "report.html")
    os.WriteFile(path, data, 0o644)
}
```

## Integration Tests (build tags)

```go
//go:build integration

func TestDBConnection(t *testing.T) { ... }
```

```bash
go test -tags=integration ./...
```

## Coverage

```bash
go test -coverprofile=cover.out ./...
go tool cover -html=cover.out
```

## Golden Rule

Test behavior, not implementation. If refactoring breaks tests without changing behavior, the tests are wrong.

## Delegates To

- **performance** - when benchmarks reveal allocation issues
- **concurrency** - when testing concurrent code (race detector)

## Examples

- `examples/testing/01-table-driven/`
- `examples/testing/02-fuzzing/`
