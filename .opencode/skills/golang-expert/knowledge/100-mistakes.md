# 100 Go Mistakes - AI Guard Rails

Source: [100go.co](https://100go.co) by Teiva Harsanyi (Manning, 2022)

When writing Go code, NEVER make these mistakes. This is your pre-flight checklist.

## Code & Project Organization (#1-#16)

| # | Mistake | Rule |
|---|---------|------|
| 1 | Variable shadowing | Never redeclare with `:=` in inner block when outer var intended |
| 2 | Unnecessary nesting | Guard clause + early return. Happy path aligned left |
| 3 | Misusing init functions | Use explicit initialization functions, not `init()` |
| 4 | Overusing getters/setters | Not idiomatic Go. Export fields directly unless encapsulation needed |
| 5 | Interface pollution | Discover abstractions, don't create them prematurely |
| 6 | Interface on producer side | Define interfaces at consumer site, not where implemented |
| 7 | Returning interfaces | Return concrete types, accept interfaces |
| 8 | `any` says nothing | Only use when truly accepting any type (json.Marshal, etc.) |
| 9 | Premature generics | Use generics only for proven need, not "just in case" |
| 10 | Type embedding problems | Don't embed to promote fields that should remain hidden |
| 11 | Not using functional options | Use for flexible, backwards-compatible configuration |
| 12 | Project misorganization | Organize by domain, not by type. Don't over-structure early |
| 13 | Utility packages | Never name packages `util`, `common`, `shared`, `helper` |
| 14 | Package name collisions | Avoid variables named same as packages (`context`, `http`) |
| 15 | Missing documentation | Document all exported elements. Start comment with element name |
| 16 | Not using linters | Use `golangci-lint`. Run `go vet`, race detector in CI |

## Data Types (#17-#29)

| # | Mistake | Rule |
|---|---------|------|
| 17 | Octal literal confusion | Use `0o` prefix for octal. `010` = 8, not 10 |
| 18 | Integer overflow silent | Go doesn't panic on overflow. Check manually for critical math |
| 19 | Float comparison | Never `==` floats. Use delta: `math.Abs(a-b) < epsilon` |
| 20 | Slice len vs cap | Understand: len = current size, cap = backing array size |
| 21 | Inefficient slice init | Pre-allocate: `make([]T, 0, n)` when size known |
| 22 | nil vs empty slice | `nil` and `[]T{}` behave same for most ops but marshal differently |
| 23 | Checking slice empty | Use `len(s) == 0`, NOT `s == nil` |
| 24 | Slice copy wrong | `copy(dst, src)` - dst must be pre-sized, not zero-length |
| 25 | Append side effects | `append` may mutate shared backing array. Use 3-index slice `s[:n:n]` |
| 26 | Slice memory leaks | Sub-slice holds entire backing array. `copy()` to release |
| 27 | Inefficient map init | Pre-size: `make(map[K]V, n)` to avoid rehashing |
| 28 | Maps never shrink | Maps don't release memory on delete. Replace with new map if needed |
| 29 | Comparing values | Use `reflect.DeepEqual` or `cmp.Equal` for structs with slices/maps |

## Control Structures (#30-#35)

| # | Mistake | Rule |
|---|---------|------|
| 30 | Range copies elements | Range copies value. Use index or pointer for large structs |
| 31 | Range evaluates once | Channel/array arg evaluated once at start, not per iteration |
| 32 | Pointer in range | `&v` in range gives same address each iteration (pre-1.22) |
| 33 | Map iteration assumptions | Order is random. No insert-during-iteration guarantees |
| 34 | Break in for-select | `break` exits select, not for. Use labeled break or return |
| 35 | Defer in loop | Defers accumulate until function return. Extract to sub-function |

## Strings (#36-#41)

| # | Mistake | Rule |
|---|---------|------|
| 36 | Rune concept | `rune` = unicode code point. `byte` = single byte. They differ |
| 37 | String iteration | `for range s` iterates runes. `for i` iterates bytes |
| 38 | Trim vs TrimPrefix | `strings.Trim` removes CHARACTER SET. `TrimPrefix` removes prefix |
| 39 | String concatenation | Use `strings.Builder` with `Grow()` in loops, never `+=` |
| 40 | Useless conversions | `[]byte(s)` allocates. Avoid in map lookups (compiler optimizes `m[string(b)]`) |
| 41 | Substring memory leak | Substring shares backing. Use `strings.Clone()` (1.20+) to release |

## Functions & Methods (#42-#47)

| # | Mistake | Rule |
|---|---------|------|
| 42 | Receiver type | Value: immutable, small. Pointer: mutation, large, shared resource |
| 43 | Named results | Use for doc clarity on same-type returns. Don't overuse |
| 44 | Named result side effects | Naked return with named results can shadow. Be explicit |
| 45 | Returning nil receiver | `return nil` in interface-returning func can give non-nil interface |
| 46 | Filename as input | Accept `io.Reader` not `string` filename. Enables testing |
| 47 | Defer evaluation | Defer args evaluated immediately. Receiver captured at defer time |

## Error Management (#48-#54)

| # | Mistake | Rule |
|---|---------|------|
| 48 | Panicking | Panic only for programmer errors. Return errors for recoverable |
| 49 | When to wrap | Wrap (`%w`) when callers need `errors.Is/As`. Don't wrap if hiding source |
| 50 | Error type comparison | Use `errors.As`, never type assertion directly on wrapped errors |
| 51 | Error value comparison | Use `errors.Is`, never `==` on wrapped errors |
| 52 | Handling error twice | Don't log AND return. Handle once at appropriate layer |
| 53 | Not handling error | Never `_ = fn()` without explicit comment explaining why |
| 54 | Defer error ignored | Handle errors from `defer Close()`: `defer func() { err = f.Close() }()` |

## Concurrency: Foundations (#55-#60)

| # | Mistake | Rule |
|---|---------|------|
| 55 | Concurrency ≠ parallelism | Concurrency = structure. Parallelism = execution. Don't conflate |
| 56 | Concurrency always faster | NOT true. Overhead exists. Benchmark. Consider workload type |
| 57 | Channel vs mutex | Channel = transfer ownership, pipeline. Mutex = protect state |
| 58 | Data race vs race condition | Data race = concurrent unsync access. Race condition = timing bug. Both dangerous |
| 59 | Workload type matters | CPU-bound: workers = GOMAXPROCS. I/O-bound: can exceed |
| 60 | Context misuse | Use for cancellation/deadline/tracing. NOT for passing business data |

## Concurrency: Practice (#61-#74)

| # | Mistake | Rule |
|---|---------|------|
| 61 | Inappropriate context | Don't pass request context to background work that should outlive request |
| 62 | Goroutine without stop | EVERY goroutine must have exit path (context, done channel) |
| 63 | Loop var in goroutine | Pre-1.22: shadow `v := v`. 1.22+: fixed, but be aware |
| 64 | Select non-deterministic | Multiple ready cases → random choice. Don't assume order |
| 65 | Not using `chan struct{}` | Use `chan struct{}` for signaling (zero-size, clear intent) |
| 66 | Not using nil channels | nil channel blocks forever. Useful for dynamic select disable |
| 67 | Wrong channel size | Unbuffered = sync. Buffered(1) = handoff. Buffered(N) = pool |
| 68 | String formatting races | `fmt.Sprintf("%v", x)` calls `String()` - can race if x is concurrent |
| 69 | Append data race | Concurrent `append` = data race on backing array. Always sync |
| 70 | Mutex with slices/maps | Protect the DATA, not just the reference. Slice header copy ≠ safe |
| 71 | WaitGroup misuse | Always `Add` before `go`. Never pass WaitGroup by value |
| 72 | Forgetting sync.Cond | sync.Cond exists for broadcast/signal patterns (rare but useful) |
| 73 | Not using errgroup | Use `errgroup.WithContext` for goroutine error propagation |
| 74 | Copying sync type | NEVER copy Mutex, WaitGroup, Cond. Pass by pointer |

## Standard Library (#75-#81)

| # | Mistake | Rule |
|---|---------|------|
| 75 | Wrong time duration | `time.After(3)` = 3 nanoseconds! Use `3 * time.Second` |
| 76 | time.After memory leak | Leaks until timer fires. Use `time.NewTimer` + `Reset` in loops |
| 77 | JSON handling | Embedded structs, time format, interface unmarshal → float64 |
| 78 | SQL mistakes | `Close` rows, use context, handle `sql.ErrNoRows`, prepared stmts |
| 79 | Not closing resources | Always close: `resp.Body`, `sql.Rows`, `os.File`. Defer after err check |
| 80 | Missing return after http.Error | `http.Error` doesn't stop handler. ALWAYS `return` after |
| 81 | Default HTTP client/server | Set timeouts! Default has no timeout = resource exhaustion |

## Testing (#82-#90)

| # | Mistake | Rule |
|---|---------|------|
| 82 | Not categorizing tests | Use build tags, `-short`, env vars to separate unit/integration |
| 83 | No race flag | ALWAYS `go test -race` in CI |
| 84 | Not using parallel/shuffle | `t.Parallel()` + `-shuffle=on` catches hidden dependencies |
| 85 | Not table-driven | Table-driven is idiomatic. Always use for multiple cases |
| 86 | Sleeping in tests | Never `time.Sleep`. Use channels, conditions, or polling |
| 87 | Time API in tests | Inject time source. Don't depend on wall clock |
| 88 | Not using httptest/iotest | stdlib has great test utilities. Use them |
| 89 | Inaccurate benchmarks | `b.ResetTimer()`, avoid dead code elimination, use `b.Loop()` (1.24+) |
| 90 | Missing test features | Know: subtests, cleanup, TempDir, Setenv, helpers |

## Optimizations (#91-#100)

| # | Mistake | Rule |
|---|---------|------|
| 91 | CPU cache ignorance | Sequential > random access. Keep hot data contiguous |
| 92 | False sharing | Pad hot atomics to 64-byte cache lines in concurrent code |
| 93 | Instruction-level parallelism | CPU pipelines benefit from independent operations in sequence |
| 94 | Data alignment | Order struct fields largest→smallest. Use `fieldalignment` |
| 95 | Stack vs heap confusion | Use `go build -gcflags='-m'`. Return values not pointers |
| 96 | Not reducing allocations | sync.Pool, API redesign (accept dst buffer), compiler hints |
| 97 | Not relying on inlining | Keep hot functions small (<80 nodes). Check with `-gcflags='-m'` |
| 98 | Not using diagnostics | pprof (CPU/mem/mutex/block), execution tracer, benchstat |
| 99 | GC misunderstanding | GOGC, GOMEMLIMIT. Fewer allocations = fewer GC cycles |
| 100 | Go in Docker/K8s | Set GOMAXPROCS to container CPU. Use GOMEMLIMIT for cgroup |
