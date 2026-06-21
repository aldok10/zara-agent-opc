# Go Standard Library & Patterns Reference

> Load this file when you need stdlib API details, idiomatic patterns, or version-specific features.

## Standard Library Packages

### Core

| Package | API |
|---------|-----|
| `fmt` | `Printf`, `Sprintf`, `Errorf` (%w wrapping) |
| `errors` | `New`, `Is`, `As`, `Unwrap`, `Join` (1.20+), `AsType` (1.26+) |
| `io` | `Reader`, `Writer`, `ReadAll`, `Copy`, `Pipe`, `LimitReader`, `MultiReader` |
| `io/fs` | `FS`, `WalkDir`, `ReadFile`, `ReadDir`, `Sub`, `ValidPath` |
| `os` | `Open`, `Create`, `ReadFile`, `WriteFile`, `MkdirAll`, `Getenv`, `DirFS`, `ReadDir` |
| `os/exec` | `Command`, `CommandContext`, `LookPath` |
| `os/signal` | `Notify`, `NotifyContext` (cancel cause since 1.26) |
| `path/filepath` | `Walk`, `WalkDir`, `Glob`, `Rel`, `Abs`, `EvalSymlinks` |
| `strconv` | `Itoa`, `Atoi`, `FormatInt`, `ParseInt`, `AppendInt` |
| `strings` | `Cut`, `CutPrefix`, `CutSuffix`, `Builder`, `Contains`, `Split`, `Join`, `Clone` (1.20+) |
| `bytes` | Same as strings for `[]byte`, `Buffer`, `Buffer.Peek` (1.26+) |
| `math` | `Abs`, `Max`, `Min`, `Round`, `Pi` |
| `math/rand/v2` | `Int`, `IntN`, `Float64`, `Shuffle` (1.22+) |
| `cmp` | `Compare`, `Less`, `Or` (1.21+) |
| `reflect` | `TypeOf`, `ValueOf`, `.Fields()`, `.Methods()` iterators (1.26+) |
| `encoding/json` | `Marshal`, `Unmarshal`, `Encoder`, `Decoder`, `RawMessage`, `Valid` |
| `encoding/binary` | `LittleEndian`, `BigEndian`, `Read`, `Write`, `Uvarint` |
| `embed` | `//go:embed` (1.16+) |

### Networking

| Package | API |
|---------|-----|
| `net` | `Dial`, `Listen`, `Conn`, `ParseIP`, `SplitHostPort` |
| `net/http` | `Client`, `ServeMux`, `Handler`, routing `"GET /items/{id}"` (1.22+), `PathValue` |
| `net/http/httptest` | `NewServer`, `ResponseRecorder`, `NewRequest` |
| `net/http/pprof` | `/debug/pprof/` endpoints, `goroutineleak` (1.26+) |
| `net/url` | `Parse`, `URL`, `Values`, `QueryEscape` |
| `net/netip` | `Addr`, `Prefix`, `AddrPort` |

### Concurrency

| Package | API |
|---------|-----|
| `sync` | `Mutex`, `RWMutex`, `WaitGroup`, `Once`, `Pool`, `Map`, `OnceFunc` (1.21+) |
| `sync/atomic` | `Int64`, `Bool`, `Pointer[T]`, `Load`, `Store`, `CompareAndSwap` |
| `context` | `Background`, `WithCancel`, `WithTimeout`, `WithCancelCause` (1.20+), `AfterFunc` (1.21+) |

### Crypto

| Package | API |
|---------|-----|
| `crypto/rand` | Secure random bytes |
| `crypto/sha256` | `Sum256`, `New` |
| `crypto/hmac` | `New`, `Equal` |
| `crypto/tls` | `Config`, post-quantum default (1.26+) |
| `crypto/hpke` | Hybrid Public Key Encryption (1.26+) |
| `crypto/mlkem` | Post-quantum KEM (1.26+) |
| `crypto/fips140` | FIPS 140-3 mode (1.24+) |

### Testing & Profiling

| Package | API |
|---------|-----|
| `testing` | `T`, `B`, `F`, `Run`, `Parallel`, `Helper`, `Cleanup`, `B.Loop()` (1.24+), `ArtifactDir` (1.26+) |
| `runtime` | `NumCPU`, `NumGoroutine`, `GOMAXPROCS`, `GC`, `ReadMemStats`, `KeepAlive` |
| `runtime/pprof` | `StartCPUProfile`, `WriteHeapProfile` |
| `runtime/trace` | `Start`, `Stop`, `Task`, `Region` |
| `log/slog` | Structured (1.21+): `Info`, `Warn`, `Error`, `With`, `NewMultiHandler` (1.26+) |

### Containers (1.21+)

| Package | API |
|---------|-----|
| `slices` | `Sort`, `Delete`, `Compact`, `Collect`, `Chunk` (1.23+), `Backwards` |
| `maps` | `Clone`, `Keys`, `Values`, `All`, `Collect` (1.23+) |
| `iter` | `Seq`, `Seq2`, `Pull` (1.23+) |
| `unique` | Value canonicalization (1.23+) |
| `weak` | Weak pointers (1.24+) |

---

## Go Version Features

### Go 1.21 (Aug 2023)
`min`, `max`, `clear` builtins · `slices`/`maps` packages · `log/slog` · PGO default · `context.AfterFunc` · `sync.OnceFunc`

### Go 1.22 (Feb 2024)
Loop var per-iteration fix · `for i := range 10` · HTTP routing `"GET /items/{id}"` · `math/rand/v2` · `go/version`

### Go 1.23 (Aug 2024)
Iterators `iter.Seq`/`Seq2` · `slices.Collect`/`Chunk` · `maps.All`/`Collect` · Timer GC · `unique` package

### Go 1.24 (Feb 2025)
Generic type aliases · `weak` package · `os.Root` · Swiss table maps · `B.Loop()` · `crypto/fips140`

### Go 1.25 (Aug 2025)
Green Tea GC experiment · HTTP/2 defaults · Post-quantum TLS experimental

### Go 1.26 (Feb 2026)
`new(expr)` · Self-ref generics · **Green Tea GC default** (10-40% less overhead) · `crypto/hpke` · `simd/archsimd` · `runtime/secret` · `errors.AsType` · `go fix` modernizers · Goroutine leak profile · Faster cgo (30%) · `io.ReadAll` 2x faster · `bytes.Buffer.Peek` · `slog.NewMultiHandler` · `reflect` iterators · `testing.ArtifactDir` · Post-quantum TLS default

---

## Idiomatic Patterns

### Error Handling
```go
// Wrap with context
if err != nil {
    return fmt.Errorf("get user %s: %w", id, err)
}

// Sentinel errors
var ErrNotFound = errors.New("not found")

// Custom error types + errors.AsType (1.26+)
nf, ok := errors.AsType[*NotFoundError](err)

// Multiple errors
errors.Join(err1, err2)
```

### Functional Options
```go
type Option func(*Server)
func WithTimeout(d time.Duration) Option { return func(s *Server) { s.timeout = d } }
func NewServer(addr string, opts ...Option) *Server { ... }
```

### HTTP Routing (1.22+)
```go
mux.HandleFunc("GET /users/{id}", getUser)
func getUser(w http.ResponseWriter, r *http.Request) {
    id := r.PathValue("id")
}
```

### Iterator (1.23+)
```go
for v := range slices.Backwards(slice) { ... }
results := slices.Collect(myIterator)
```

### Worker Pool
```go
func workerPool(ctx context.Context, jobs <-chan Job, results chan<- Result, n int) {
    var wg sync.WaitGroup
    for range n {
        wg.Add(1)
        go func() {
            defer wg.Done()
            for j := range jobs {
                select {
                case <-ctx.Done(): return
                case results <- process(j):
                }
            }
        }()
    }
    wg.Wait()
    close(results)
}
```

### Graceful Shutdown
```go
ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
defer stop()
// start server...
<-ctx.Done()
srv.Shutdown(context.WithTimeout(context.Background(), 10*time.Second))
```

### errgroup
```go
g, ctx := errgroup.WithContext(ctx)
for _, item := range items {
    item := item
    g.Go(func() error { return process(ctx, item) })
}
if err := g.Wait(); err != nil { ... }
```

---

## Project Structure

```
myproject/
├── cmd/            # Entry points (thin main.go)
├── internal/       # Private packages
│   ├── domain/     # Business types & logic
│   ├── handler/    # Transport layer
│   └── repository/ # Data access
├── pkg/            # Public shared (optional)
├── migrations/
├── go.mod
└── Makefile
```

Rules: `internal/` = safe to refactor · `cmd/` = thin · Tests next to code · Don't over-structure early

---

## Performance

```bash
go build -gcflags='-m' ./...         # escape analysis
go test -bench=. -benchmem -count=10 # benchmarks
go tool pprof -http=:8080 cpu.prof   # profiling
GODEBUG=gctrace=1 ./myapp            # GC trace
```

Tips: Pre-allocate slices · `sync.Pool` for hot paths · Struct field alignment (largest→smallest) · `strings.Builder` with `Grow()` · PGO (`default.pgo`) · Green Tea GC (1.26+) · `B.Loop()` for benchmarks · Always `-race` in CI

---

## Tooling

```bash
go test ./... -race -count=1    # test with race detector
go test -fuzz=FuzzName          # fuzzing
go vet ./...                    # static analysis
go fix ./...                    # modernizers (1.26+)
go test -artifacts ./...        # test artifacts (1.26+)
golangci-lint run               # meta-linter
```

---

## Pitfalls

- `init()` overuse → explicit init functions
- Channels when mutex simpler → mutex for state, channels for coordination
- `defer` in loops → extract to sub-function
- `sync.Map` everywhere → plain `map + Mutex` usually faster
- Stringly-typed errors → sentinel errors or custom types
- Embedding `sync.Mutex` exported → private field
- Default HTTP client → ALWAYS set timeouts

---

## Go Proverbs

- Clear is better than clever
- A little copying is better than a little dependency
- The bigger the interface, the weaker the abstraction
- Make the zero value useful
- Don't communicate by sharing memory; share memory by communicating
- Errors are values
- Channels orchestrate; mutexes serialize
