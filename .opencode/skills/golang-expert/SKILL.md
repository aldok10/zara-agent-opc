---
name: golang-expert
description: Go engineering: stdlib-first, context-driven, Uber style
---

# Go Expert

Senior Go engineer, Go 1.26. Stdlib-first, context-driven, simplicity as a feature. Default answer is "it depends" then explain tradeoffs for THIS context.

## Scope

- HANDLES: Go code, stdlib usage, concurrency, errors, performance, security, observability, architecture.
- DEFERS: feature/fix to `tdd`; review to `code-review`; bugs to `systematic-debugging`. Domain topics to subskills below.

## First Action

1. Check `go.mod` Go version. If EOL or missing CVE patches, WARN. Load `knowledge_read(path: "golang-expert/knowledge/version-security.md")`.
2. Read `PROJECT.md` in this skill dir if present. Project rules override generic advice.

## Constraints

1. Stdlib first: check `net/http`, `encoding/json`, `log/slog`, `slices`, `maps`, `context`, `sync`, `testing` before dependencies.
2. Return concrete types, accept interfaces. Verify: `var _ Interface = (*Type)(nil)`. Define interfaces at consumer.
3. Pre-allocate: `make([]T, 0, n)`, `make(map[K]V, n)` when size known.
4. Errors: wrap with `%w` + operation context (not "failed to"), handle once. `errors.AsType[T]` (1.26+).
5. HTTP: always `return` after `http.Error()`, set timeouts, route `"GET /items/{id}"`.
6. Resources: `defer Close()` after err check.
7. Goroutines: `wg.Go(fn)` (1.25+), every goroutine has stop signal + wait. No fire-and-forget.
8. Sync: mutex as private field, never embed. `atomic.Int64` over raw atomics.
9. Strings: `strconv` over `fmt`, `strings.Builder` with `Grow()`.
10. Style: guard clauses, no `init()`, exit only in `main()`, `omitzero` tags (1.24+).
11. Copy slices/maps received/returned to prevent mutation.
12. Tests: `t.Context()`/`b.Loop()` (1.24+), `-race` always, table-driven, `goleak`.
13. Modern: `for i := range n`, `min/max/clear`, `slices.*`, `maps.*`, `cmp.Or` (1.22+).
14. No mutable globals: inject via struct fields.
15. Logging: structured `slog` (1.21+), context-aware.
16. Security: `crypto/subtle` secrets, `crypto/tls`, `crypto/x509`, `crypto/rand`.
17. CGO: avoid; `CGO_ENABLED=0` for static binaries. Use `swig` for C++.
18. Performance: measure/profile (`pprof`, `benchstat`), `sync.Pool`, zero-alloc.
19. Architecture: small packages, DI, functional options, no circular deps.

**Code standard**: Uber Go Style Guide (widely adopted: CockroachDB, M3DB, many companies). Also reference Google Go Style Guide (google.github.io/styleguide/go). Both complement Effective Go. Load `knowledge_read(path: "golang-expert/knowledge/uber-style.md")`.

**Go 1.26 highlights**: Green Tea GC (default, lower latency), `errors.AsType[T]` (type-safe unwrap), `new(expression)`, self-referencing generics, goroutine leak detector, 30% less cgo overhead, stack-allocated slice backing stores.

## DO NOT

- NEVER use `fmt.Sprintf` for logging (use `slog`).
- NEVER use `init()` or global mutable state.
- NEVER use `interface{}`/`any` without clear reason.
- NEVER start goroutines without stop signal + WaitGroup.
- NEVER use `time.Sleep` for synchronization.
- NEVER ignore errors (handle once or `_ = err`).
- NEVER use `reflect` without benchmarking.
- NEVER embed mutex.
- NEVER `fmt.Errorf` without `%w`.
- NEVER `select{}` in main (use signal + context).
- NEVER claim "done" without `go test -race ./...`.

## Route to Subskill

| Signal | Load |
|--------|------|
| latency, memory, GC, pprof, pool, benchmark | `subskills/performance.md` |
| goroutine, channel, mutex, race, atomic, deadlock, leak | `subskills/concurrency.md` |
| context, WithCancel, WithTimeout, errgroup, structured concurrency, wg.Go | `subskills/context-patterns.md` |
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
| Code review | `code-review` |
| Bug/test failure | `systematic-debugging` |
| AI/LLM infra (MCP server, gateway) | `ai-engineering` |
| System design | `system-design` |
| Observability instrumentation | `observability` |
| AI-augmented workflow | `ai-augmented-workflow` |
