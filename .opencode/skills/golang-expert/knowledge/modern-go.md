# Modern Go Features by Version

Source: [JetBrains/go-modern-guidelines](https://github.com/JetBrains/go-modern-guidelines)

Use ALWAYS the modern pattern. Never use the outdated pattern when the project's Go version supports the modern one.

## Go 1.18+
- `any` instead of `interface{}`
- `strings.Cut` / `bytes.Cut` instead of Index+slice

## Go 1.19+
- `atomic.Bool` / `atomic.Int64` / `atomic.Pointer[T]` instead of raw `atomic.Store/Load`
- `fmt.Appendf(buf, ...)` instead of `[]byte(fmt.Sprintf(...))`

## Go 1.20+
- `strings.Clone(s)` to release shared backing memory
- `strings.CutPrefix` / `CutSuffix` instead of HasPrefix+TrimPrefix
- `errors.Join(err1, err2)` to combine multiple errors
- `context.WithCancelCause` + `context.Cause(ctx)`

## Go 1.21+
- `min(a, b)` / `max(a, b)` builtins instead of if/else
- `clear(m)` to delete all map entries
- `slices.Contains`, `slices.SortFunc`, `slices.Compact`, `slices.Reverse`, `slices.Clone`
- `maps.Clone`, `maps.Copy`, `maps.DeleteFunc`
- `sync.OnceFunc` / `sync.OnceValue` instead of sync.Once + wrapper
- `context.AfterFunc(ctx, cleanup)`
- `cmp.Compare`, `cmp.Or`

## Go 1.22+
- `for i := range n` instead of `for i := 0; i < n; i++`
- Loop vars safe for goroutine capture (per-iteration copy)
- `cmp.Or(a, b, "default")` - first non-zero value
- HTTP routing: `mux.HandleFunc("GET /api/{id}", h)` + `r.PathValue("id")`
- `reflect.TypeFor[T]()` instead of `reflect.TypeOf((*T)(nil)).Elem()`

## Go 1.23+
- `maps.Keys(m)` / `maps.Values(m)` return iterators
- `slices.Collect(iter)` - build slice from iterator
- `slices.Sorted(iter)` - collect + sort in one step
- `time.Tick` is safe (GC recovers unreferenced tickers since 1.23)
- `iter.Seq` / `iter.Seq2` range-over-function iterators

## Go 1.24+
- **`t.Context()`** instead of `context.WithCancel(context.Background())` in tests - ALWAYS
- **`omitzero`** instead of `omitempty` for time.Duration, time.Time, structs, slices, maps in JSON tags
- **`b.Loop()`** instead of `for i := 0; i < b.N; i++` in benchmarks - ALWAYS
- **`strings.SplitSeq`** / `strings.FieldsSeq` instead of `strings.Split` when iterating in for-range
- Generic type aliases: `type MySlice[T any] = []T`
- `weak` package (weak pointers)
- `os.Root` (path traversal prevention)

## Go 1.25+
- **`wg.Go(fn)`** instead of `wg.Add(1)` + `go func() { defer wg.Done(); ... }()` - ALWAYS
- Green Tea GC experiment
- Improved HTTP/2 defaults

## Go 1.26+
- **`new(val)`** - returns pointer to any value: `new(30)` → `*int`, `new(true)` → `*bool`
  ```go
  // ALWAYS: cfg := Config{Timeout: new(30), Debug: new(true)}
  // NEVER:  t := 30; cfg := Config{Timeout: &t}
  ```
- **`errors.AsType[T](err)`** instead of `errors.As(err, &target)` - ALWAYS
  ```go
  // ALWAYS: if pe, ok := errors.AsType[*os.PathError](err); ok { ... }
  // NEVER:  var pe *os.PathError; if errors.As(err, &pe) { ... }
  ```
- Self-referencing generics
- Green Tea GC default (10-40% less overhead)
- `crypto/hpke`, `simd/archsimd` (experimental)
- `io.ReadAll` 2x faster
- `log/slog.NewMultiHandler`
- `reflect.Type.Fields()` / `.Methods()` iterators
- `testing.T.ArtifactDir()`
- Post-quantum TLS default

## Quick Decision Table

| Old Pattern | Modern (use this) | Since |
|-------------|-------------------|-------|
| `interface{}` | `any` | 1.18 |
| `atomic.StoreInt32` | `atomic.Int32` typed | 1.19 |
| `strpos := strings.Index; s[:strpos]` | `before, _, _ := strings.Cut(s, sep)` | 1.18 |
| `if a > b { return a }; return b` | `max(a, b)` | 1.21 |
| `sort.Slice(s, func...)` | `slices.SortFunc(s, func...)` | 1.21 |
| `for i := 0; i < n; i++` | `for i := range n` | 1.22 |
| `ctx, cancel := context.WithCancel(ctx)` in tests | `ctx := t.Context()` | 1.24 |
| `json:",omitempty"` on structs/time | `json:",omitzero"` | 1.24 |
| `for _, p := range strings.Split(s, ",")` | `for p := range strings.SplitSeq(s, ",")` | 1.24 |
| `for i := 0; i < b.N; i++` | `for b.Loop()` | 1.24 |
| `wg.Add(1); go func() { defer wg.Done()... }()` | `wg.Go(func() { ... })` | 1.25 |
| `t := val; ptr := &t` | `ptr := new(val)` | 1.26 |
| `var e *T; errors.As(err, &e)` | `e, ok := errors.AsType[*T](err)` | 1.26 |
