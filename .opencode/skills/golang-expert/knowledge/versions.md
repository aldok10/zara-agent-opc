# Go Version Features (1.21 → 1.26)

## Go 1.21 (August 2023)
- `min`, `max`, `clear` built-in functions
- `slices` and `maps` packages (generic)
- `log/slog` structured logging
- `cmp` package for ordered comparisons
- `testing/slogtest` package
- PGO enabled by default
- `context.AfterFunc`
- `sync.OnceFunc`, `sync.OnceValue`, `sync.OnceValues`

## Go 1.22 (February 2024)
- **Loop var per-iteration** — semantic change, no more capture bug
- **Integer range** — `for i := range 10`
- **Enhanced `net/http` routing** — `"GET /items/{id}"`, `Request.PathValue("id")`
- `math/rand/v2`
- `go/version` package
- Range-over-function iterators (preview)

## Go 1.23 (August 2024)
- **Iterators** — `iter.Seq`, `iter.Seq2`, `iter.Pull`, `iter.Pull2`
- `slices.Collect`, `slices.Chunk`, `slices.Sorted`, `slices.SortedFunc`
- `maps.All`, `maps.Keys`, `maps.Values`, `maps.Collect`
- Timer GC'd immediately if not stopped
- `unique` package (interning)
- `time.Timer` unbuffered channel

## Go 1.24 (February 2025)
- **Generic type aliases**
- `weak` package (weak pointers)
- `os.Root` (path traversal prevention)
- Faster map (Swiss tables)
- `testing.B.Loop()`
- `crypto/fips140`
- `crypto/subtle.WithDataIndependentTiming`

## Go 1.25 (August 2025)
- Green Tea GC experiment (`GOEXPERIMENT=greenteagc`)
- Improved HTTP/2 defaults
- Post-quantum TLS (experimental)

## Go 1.26 (February 2026)
- `new(expr)` — new can take expression
- Self-referencing generics
- **Green Tea GC default** — 10-40% less overhead
- `crypto/hpke` (RFC 9180)
- `simd/archsimd` (experimental, GOEXPERIMENT=simd)
- `runtime/secret` (experimental)
- Goroutine leak profile (`/debug/pprof/goroutineleak`)
- `errors.AsType[T]` — generic errors.As
- `go fix` modernizers
- Heap base randomization
- Faster cgo (~30%)
- `io.ReadAll` 2x faster
- `bytes.Buffer.Peek`
- `log/slog.NewMultiHandler`
- `reflect.Type.Fields()`, `.Methods()` iterators
- `testing.T.ArtifactDir()`
- Post-quantum TLS default
- `crypto/mlkem` 18% faster
