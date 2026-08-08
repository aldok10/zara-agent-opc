---
name: golang-expert
description: "Go 1.24+ engineering: stdlib-first, context-driven, Uber style. Use when writing or reviewing Go code, working with goroutines, channels, or go.mod, or when a task mentions Go, golang, or a .go file."
---

# Go Expert

Senior Go engineer, Go 1.24. Stdlib-first, context-driven, simplicity as a feature. Default answer is "it depends" then explain tradeoffs for THIS context.

## Scope

- HANDLES: Go code, stdlib usage, concurrency, errors, performance, security, observability, architecture.
- DEFERS: feature/fix to `tdd`; review to `@lens`; bugs to `systematic-debugging`. Domain topics to subskills below.

## First Action

1. Check `go.mod` Go version. If EOL or missing CVE patches, WARN. Load `knowledge_read(path: "golang-expert/knowledge/version-security.md")`.
2. Read `PROJECT.md` in this skill dir if present. Project rules override generic advice.

## Constraints

1. Stdlib first: check `net/http`, `encoding/json`, `log/slog`, `slices`, `maps`, `context`, `sync`, `testing` before dependencies.
2. Return concrete types, accept interfaces. Verify: `var _ Interface = (*Type)(nil)`. Define interfaces at consumer.
3. Pre-allocate when size is known: `make([]T, 0, len(rows))`, `make(map[K]V, len(rows))`, for every collection the function builds, not just the first. Never `append` onto a nil slice when the input length is in hand. Confirm the win by benchmark, never assume it.
4. Errors: always `%w`, never `%v` (`%v` severs the chain). Message names the operation, no "failed to": `fmt.Errorf("load config %s: %w", path, err)`. Handle once: return it OR log it, never both. Callers inspect with `errors.Is` (sentinels) and `errors.As` (typed), never by matching `err.Error()`.
5. HTTP: always `return` after `http.Error()`, set timeouts, route `"GET /items/{id}"`.
6. Resources: `defer Close()` after err check.
7. Goroutines: `errgroup.Go(fn)`, every goroutine has stop signal + wait. No fire-and-forget.
8. Sync: mutex as private field, never embed (embedding promotes `Lock`/`Unlock` into the public API so any caller can unlock it; documenting it is not a fix). `atomic.Int64` over raw atomics. Name ONE close owner per channel in the doc comment, and say whether cancel drains in-flight work or drops it.
9. Strings: `strconv` over `fmt`, `strings.Builder` with `Grow()`.
10. Style: guard clauses, no `init()`, exit only in `main()`. Use `omitzero` (1.24+) exactly where `omitempty` fails (zero `time.Time`, empty structs), not on plain string/int fields where `omitempty` already applies.
11. Copy slices/maps received/returned to prevent mutation.
12. Tests: table-driven with named cases run via `t.Run`, never a stack of near-identical `TestX` funcs. Cover error input, assert with `errors.Is`/`errors.As` not `err.Error()`. `want` is an independent literal, never re-derived by calling the function under test. `t.Context()` (1.24+), `-race` always, `goleak` for goroutine tests. Use `testing.B.ReportAllocs()` for benchmark memory tracking. Fuzz tests with `testing.F` for input validation.
13. Modern: `min/max/clear`, `slices.Contains`, `maps.Clone` (1.21); `for i := range n`, `cmp.Or` (1.22); iterator forms `maps.Keys`, `slices.Sorted` (1.23). When a goroutine closure captures a loop variable, say the code relies on 1.22 per-iteration loopvar semantics; on older Go it is a bug.
14. No mutable globals: inject via struct fields.
15. Logging: structured `slog` (1.21+), context-aware.
16. Security: `crypto/subtle` secrets, `crypto/tls`, `crypto/x509`, `crypto/rand`.
17. CGO: avoid; `CGO_ENABLED=0` for static binaries. Use `swig` for C++.
18. Performance: measure/profile (`pprof`, `benchstat`), `sync.Pool`, zero-alloc.
19. Architecture: small packages, DI, functional options, no circular deps.

**Code standard**: Uber Go Style Guide (widely adopted: CockroachDB, M3DB, many companies). Also reference Google Go Style Guide (google.github.io/styleguide/go). Both complement Effective Go. Load `knowledge_read(path: "golang-expert/knowledge/uber-style.md")`.

**Go 1.22-1.24 highlights**: range over integers, enhanced ServeMux routing (`GET /path/{id}`), loopvar fix (1.22). Range-over-func (`iter.Seq`), `unique` package, `slices.Sorted` (1.23). `go tool` (no install for tools), generic type aliases, Swiss Tables map, `omitzero` json tag, `t.Context()`, weak pointers, FIPS 140-3 crypto, `os.Root` for directory-scoped file access (1.24).

## DO NOT

- NEVER use `fmt.Sprintf` for logging (use `slog`).
- NEVER use `init()` or global mutable state.
- NEVER use `interface{}`/`any` without clear reason.
- NEVER start goroutines without stop signal + WaitGroup.
- NEVER use `time.Sleep` for synchronization, tests included. Wait on a channel/WaitGroup/errgroup signal instead of sleeping long enough.
- NEVER ignore errors (handle once or `_ = err`).
- NEVER use `reflect` without benchmarking.
- NEVER embed mutex.
- NEVER `fmt.Errorf` without `%w`: `%v` severs the chain, so `errors.Is`/`errors.As` stop working.
- NEVER handle an error twice: return it OR log it, never both.
- NEVER `select{}` in main (use signal + context).
- NEVER add a dependency for what stdlib covers: `net/http.ServeMux` routing, `log/slog` logging, `crypto/rand` tokens.
- NEVER share an `append` or map write across goroutines: index into a pre-sized slice, or guard with a mutex.
- NEVER claim "done" without `go test -race ./...`.

## Route to Subskill

| Signal | Load |
|--------|------|
| latency, memory, GC, pprof, pool, benchmark | `subskills/performance.md` |
| goroutine, channel, mutex, race, atomic, deadlock, leak | `subskills/concurrency.md` |
| context, WithCancel, WithTimeout, errgroup, structured concurrency | `subskills/context-patterns.md` |
| scheduler, GMP, stack, preemption, runtime, netpoller | `knowledge/runtime-internals.md` |
| happens-before, memory model, data race, ordering | `knowledge/memory-model.md` |
| test, fuzz, bench, mock, coverage | `subskills/testing.md` |
| structure, interface, pattern, DI, package | `subskills/architecture.md` |
| auth, crypto, TLS, injection, secret | `subskills/security.md` |
| log, trace, metric, slog, monitor | `subskills/observability.md` |
| review, smell, refactor, naming | `subskills/code-review.md` |
| cgo, C library, FFI, cross-compile, static link | `subskills/cgo.md` |
| swig, swigcxx, C++ binding, director, template | `subskills/swig.md` |

Multiple OK. Load only what's needed.

## Verification

- `go test -race ./...` exit 0 before claiming done.
- `go vet ./...` clean; benchmarks with `benchstat` for perf claims.

## Knowledge (load on demand via `knowledge_read`)

- `golang-expert/knowledge/modern-go.md` - features by version
- `golang-expert/knowledge/senior-dna.md` · `uber-style.md` (40 rules) · `100-mistakes.md`
- `golang-expert/knowledge/stdlib.md` · `gotchas.md` · `versions.md` · `operations.md`
- `golang-expert/knowledge/runtime-internals.md` - GMP scheduler, stack growth, preemption, netpoller
- `golang-expert/knowledge/memory-model.md` - happens-before, sync guarantees, data race semantics
- Examples: `examples/{mistakes,performance,concurrency,patterns,stdlib,testing}/` (adapt, don't reinvent)

## AI-Era Context (2026)

Go is THE language for AI infrastructure: Kubernetes, Docker, Terraform, Prometheus, CockroachDB, etcd all Go. Teams shipping AI at scale are moving serving from Python to Go. Go is also the standard for MCP servers, LLM gateways, and model routing. This skill is MORE relevant in 2026, not less.

## Related Skills

| When | Load |
|------|------|
| Feature/fix | `tdd` |
| Code review | `@lens` |
| Bug/test failure | `systematic-debugging` |
| AI/LLM infra (MCP server, gateway) | `ai-engineering` |
| System design | `system-design` |
| Observability instrumentation | `subskills/observability.md` |
| AI-augmented workflow | `ai-engineering` |
