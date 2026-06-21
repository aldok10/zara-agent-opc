# Go Gotchas & Common Mistakes

Source: [golang50shades.com](https://golang50shades.com/) + production experience.

## Beginner Level

| Gotcha | Problem | Fix |
|--------|---------|-----|
| Brace on separate line | Syntax error from auto-semicolons | Opening brace on same line |
| Unused variable | Won't compile | Use it or `_ = var` |
| Unused import | Won't compile | Remove or `_ "pkg"` |
| Variable shadowing | `:=` in new block creates new var | Use `go vet -shadow` |
| nil slice vs nil map | append to nil slice OK, write to nil map panics | Always `make(map)` |
| Array is value type | Passing array copies it | Use slices instead |
| String is bytes | `len("é")` = 3, not 1 | `utf8.RuneCountInString` |
| Map iteration order | Random every time | Sort keys if order matters |
| switch fallthrough | Cases break by default (not C) | Use `fallthrough` or multi-case |
| Range returns index first | `for v := range x` gives index | `for _, v := range x` |
| Goroutines don't wait | App exits without waiting | `sync.WaitGroup` or `errgroup` |
| Send to closed channel | Panics | Use done channel pattern |
| nil channel | Blocks forever | Use for dynamic select disable |
| Value receiver | Can't modify original | Use pointer receiver |
| Log.Fatal exits | Calls os.Exit(1) | Use for truly fatal only |
| Built-in data not sync | Maps/slices not thread-safe | Use mutex or channels |

## Intermediate Level

| Gotcha | Problem | Fix |
|--------|---------|-----|
| Response body not closed | Connection leak | `defer resp.Body.Close()` after err check |
| json.Encoder newline | Adds `\n` at end | Use `json.Marshal` if exact bytes needed |
| JSON HTML escaping | `<` becomes `\u003c` | `enc.SetEscapeHTML(false)` |
| JSON numbers → float64 | Interface unmarshal = float64 | Use `decoder.UseNumber()` or typed struct |
| Slice hidden data | Sub-slice shares backing array | `copy()` to new slice |
| Slice data corruption | Multiple append on same cap | `append(s[:n:n], ...)` (3-index slice) |
| Defer arg evaluation | Args evaluated at defer statement | Use closure for late eval |
| Defer in loop | Accumulates until func return | Extract to function or call directly |
| Failed type assertion | Returns zero + false | Always use comma-ok: `v, ok := x.(T)` |
| Goroutine leaks | Blocked on channel forever | Context cancellation + select |
| Loop var in closure | Pre-1.22: captures last value | Go 1.22+ fixes this; else shadow `v := v` |

## Advanced Level

| Gotcha | Problem | Fix |
|--------|---------|-----|
| Pointer receiver on value | Can't call pointer methods on non-addressable values | Be consistent with semantics |
| Map value field update | Can't modify struct fields in map directly | Use pointer values or reassign |
| nil interface vs nil value | `var i interface{} = (*T)(nil)` → `i != nil` is TRUE | Check concrete value |
| Stack vs heap | Compiler decides; interface/pointer/closure may escape | `go build -gcflags='-m'` |
| GOMAXPROCS | Defaults to NumCPU since Go 1.5 | Rarely need to change |
| Read/write reordering | Memory model allows reordering without sync | Use sync primitives |
| HTTP connection reuse | Default keeps connections open | Set `req.Close = true` or `DisableKeepAlives` |

## Performance Gotchas

| Gotcha | Problem | Fix |
|--------|---------|-----|
| `fmt.Sprintf` hot path | Reflection + allocation | `strconv.AppendX` |
| `time.After` in loop | Leaks timer until fire | `time.NewTimer` + `Reset` |
| String concat in loop | O(n²) allocations | `strings.Builder` with `Grow` |
| `interface{}` hot path | Prevents inlining, boxing | Concrete types |
| Missing slice prealloc | Repeated grow + copy | `make([]T, 0, n)` |
| Missing map prealloc | Repeated rehash | `make(map[K]V, n)` |
| `sync.WaitGroup` by value | Copy doesn't share counter | Pass by pointer |
| `RWMutex` many cores | RLock invalidates cache lines | atomic.Pointer or shard |
