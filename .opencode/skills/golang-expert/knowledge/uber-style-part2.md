---
type: fact
title: "Uber Go Style Guide - Rules 21-40 & Summary"
---

# Uber Go Style Guide (Part 2: Rules 21-40)

Continuation of uber-style.md. Rules 1-20 are in that file.

## 21. Style: Struct Initialization

**What this means**:
- Always use field names (never positional)
- Omit fields that are zero value
- Use `var` for entirely-zero structs

```go
// BAD - positional, breaks if fields reorder
s := User{"Alice", 30, ""}

// GOOD - explicit field names, zero values omitted
s := User{
    Name: "Alice",
    Age:  30,
    // Email omitted - zero value ""
}

// For zero-value struct:
var s User          // GOOD
s := User{}         // also ok but var is clearer
```

---

## 22. Style: Unexported Package-Level Variables Use _ Prefix

**What this means**: Package-level variables that are NOT exported should start with underscore.

**Why**: Makes it immediately obvious that a variable is package-level (not local) and unexported (not part of API).

```go
var (
    _defaultTimeout = 30 * time.Second
    _maxRetries     = 3
)
```

---

## 23. Reduce Variable Scope

**What this means**: Declare variables as close to their use as possible. Prefer `:=` inside `if` when the variable is only needed in that scope.

```go
// BAD - err visible in wider scope than needed
err := validate(input)
if err != nil {
    return err
}

// GOOD - err scoped to the if block
if err := validate(input); err != nil {
    return err
}
```

---

## 24. Performance: strconv Over fmt

**What this means**: For converting numbers to/from strings, use `strconv` package, not `fmt.Sprintf`.

**Why**: `fmt.Sprintf` uses reflection internally. `strconv.Itoa` is a direct conversion - 5-10x faster, zero allocations for simple cases.

```go
// BAD - reflection overhead
s := fmt.Sprintf("%d", n)

// GOOD - direct conversion
s := strconv.Itoa(n)

// Even better for hot paths - append to existing buffer
buf = strconv.AppendInt(buf, int64(n), 10)
```

---

## 25. Be Consistent

**What this means**: If a codebase already uses a pattern, follow that pattern even if you personally prefer a different one. Consistency within a project trumps individual preference.

**Why**: Inconsistency forces readers to context-switch between styles. It increases cognitive load. When reviewing code, "why is this different?" is a distraction from actual logic.

**Concrete**: If the project uses `errgroup` for parallel work, don't introduce a hand-rolled WaitGroup pattern. If the project wraps errors with `%w`, don't start using `%v`. Match what exists.

---

## 26. Group Similar Declarations

**What this means**: Constants, variables, and type declarations should be grouped by logical relationship using parenthesized blocks.

```go
// BAD - scattered declarations
const maxRetries = 3
const defaultTimeout = 30 * time.Second
var ErrTimeout = errors.New("timeout")
var ErrNotFound = errors.New("not found")

// GOOD - grouped by purpose
const (
    maxRetries     = 3
    defaultTimeout = 30 * time.Second
)

var (
    ErrTimeout  = errors.New("timeout")
    ErrNotFound = errors.New("not found")
)
```

Don't group unrelated declarations. Each group should represent one concept.

---

## 27. Import Aliasing

**What this means**: Use import aliases only when there's a naming conflict between packages. The alias should be a shortened or descriptive name.

```go
import (
    "net/http"

    nettrace "golang.org/x/net/trace" // alias needed: conflicts with runtime/trace
)
```

Don't alias for convenience. `import mongodriver "go.mongodb.org/mongo-driver"` is wrong - use the default package name.

---

## 28. Function Naming

**What this means**: Follow Go conventions for function names. Names should describe what the function DOES, not how.

- Getters: `Name()` not `GetName()` (Go convention - no `Get` prefix)
- Setters: `SetName(n)` (setter IS prefixed with Set)
- Predicates: `IsValid()`, `HasChildren()`, `CanRetry()`
- Constructors: `New()` or `NewTypeName()`

---

## 29. Function Ordering in Files

**What this means**: Functions should appear in a logical order within a file:
1. Exported functions first
2. Then unexported helpers
3. Group by receiver (all methods of type A together)
4. Within a group: rough call-order (function appears before its callees)

**Why**: A reader should be able to read top-to-bottom and understand the public API first, then drill into details.

```go
// File layout:
// 1. type definition
// 2. constructor (New...)
// 3. exported methods
// 4. unexported methods
// 5. standalone unexported helpers

type Server struct { ... }

func NewServer(opts ...Option) *Server { ... }
func (s *Server) Start() error { ... }
func (s *Server) Stop() error { ... }

func (s *Server) handleRequest(r *http.Request) { ... }
func (s *Server) logError(err error) { ... }
```

---

## 30. Avoid Naked Parameters

**What this means**: When a function call has multiple boolean or integer arguments, use named constants, comment annotations, or wrapper types to clarify what each argument means.

```go
// BAD - what do these booleans mean?
printInfo("foo", true, true)

// GOOD - use comments for built-in functions
printInfo("foo", true /* isLocal */, true /* done */)

// BETTER - use named types/constants
printInfo("foo", LocalPrinter, DoneStatus)
```

---

## 31. Use Raw String Literals for Regex and Complex Strings

**What this means**: Use backtick strings (`` ` ``) when the string contains backslashes, quotes, or multi-line content.

```go
// BAD - escaping makes regex unreadable
re := regexp.MustCompile("\\d+\\.\\d+\\.\\d+")

// GOOD - raw string, no escaping needed
re := regexp.MustCompile(`\d+\.\d+\.\d+`)
```

---

## 32. Map Initialization

**What this means**: Choose map initialization style based on intent:
- `make(map[K]V)` - for maps you'll fill programmatically
- `map[K]V{...}` - for maps with known initial content
- `make(map[K]V, n)` - when you know the expected size

```go
// Map populated programmatically
m := make(map[string]int)

// Map with known initial entries (literal)
m := map[string]int{
    "one": 1,
    "two": 2,
}

// Map with known size (avoids rehashing)
m := make(map[string]int, len(input))
```

---

## 33. Initializing Struct References

**What this means**: When you need a pointer to a struct, use `&T{}` inline. Don't create a value then take its address separately.

```go
// BAD - unnecessary intermediate variable
val := T{Name: "foo"}
ptr := &val

// GOOD - direct pointer construction
ptr := &T{Name: "foo"}

// Also ok for zero-value pointer:
ptr := new(T)
// or
ptr := &T{}
```

---

## 34. Format Strings Outside Printf

**What this means**: If you define a format string used by Printf-style functions, declare it as a `const`.

**Why**: Makes format strings grep-able, reusable, and prevents accidental modification.

```go
// BAD - format string hidden in call
log.Printf("user %s logged in at %s", user, time.Now())

// GOOD for reused format strings - declared as const
const logFmt = "user %s logged in at %s"
log.Printf(logFmt, user, time.Now())
```

---

## 35. Naming Printf-style Functions

**What this means**: If you write custom Printf-style functions, suffix them with `f` so the compiler can check format strings.

```go
// Named with f suffix - enables compiler format checking
func Warnf(format string, args ...any) { ... }
func Errorf(format string, args ...any) { ... }

// Add //go:noinline or compiler directive for format check:
// Also works with go vet if function signature matches printf conventions
```

---

## 36. Test Tables (Uber Pattern)

**What this means**: Use table-driven tests with named test cases as the default testing pattern.

```go
tests := []struct {
    name string
    give string
    want int
}{
    {name: "empty", give: "", want: 0},
    {name: "single", give: "a", want: 1},
}

for _, tt := range tests {
    t.Run(tt.name, func(t *testing.T) {
        got := Len(tt.give)
        if got != tt.want {
            t.Errorf("Len(%q) = %d, want %d", tt.give, got, tt.want)
        }
    })
}
```

Fields should be named `give`/`want` (or `input`/`expected`) for clarity. Always use `t.Run` with the test name for sub-tests.

---

## 37. Functional Options Pattern

**What this means**: For functions/constructors with many optional parameters, use the functional options pattern instead of config structs or parameter explosion.

```go
type Option func(*options)

type options struct {
    timeout time.Duration
    retries int
}

func WithTimeout(d time.Duration) Option {
    return func(o *options) { o.timeout = d }
}

func WithRetries(n int) Option {
    return func(o *options) { o.retries = n }
}

func Connect(addr string, opts ...Option) (*Conn, error) {
    o := options{timeout: 30 * time.Second, retries: 3} // defaults
    for _, opt := range opts {
        opt(&o)
    }
    ...
}
```

**Why over config struct**: Zero value is always valid, backwards-compatible to add new options, self-documenting at call site.

---

## 38. Linting

**What this means**: Use `golangci-lint` with at minimum these linters enabled:
- `go vet` - correctness
- `errcheck` - unchecked errors
- `goimports` - import formatting
- `golint` / `revive` - style

Configure in `.golangci.yml` at project root. Run in CI as a required check.

---

## 39. No Goroutines in init()

**What this means**: Never start goroutines from `init()` functions.

**Why**: `init()` runs before `main()`. Goroutines started there have no lifecycle management - no way to stop, no way to detect if they panic, no way to wait for them. They leak by design.

```go
// BAD - goroutine started in init, can never be stopped
func init() {
    go backgroundSync() // runs forever, no shutdown path
}

// GOOD - start from main with lifecycle control
func main() {
    ctx, cancel := context.WithCancel(context.Background())
    defer cancel()
    go backgroundSync(ctx)
    ...
}
```

---

## 40. Local Variable Declarations

**What this means**: Use `:=` for local variables with initial values. Use `var` when the zero value is meaningful or when the type isn't obvious.

```go
// Use := when initializing with a value
s := "hello"
n := computeCount()

// Use var when zero value is intentional
var buf bytes.Buffer  // zero Buffer is ready to use
var total int         // will accumulate in loop

// Use var when type needs to be explicit
var elapsed time.Duration  // clearer than elapsed := time.Duration(0)
```

---

## Summary: All 40 Rules At a Glance

| # | Rule | One-line |
|---|------|----------|
| 1 | No pointer to interface | Interfaces are already pointers internally |
| 2 | Verify interface compliance | `var _ I = (*T)(nil)` at package level |
| 3 | Zero-value mutex | Don't allocate, just declare |
| 4 | Mutex private field | Never embed sync.Mutex in exported struct |
| 5 | Copy at boundaries | Defensive copy slices/maps in and out |
| 6 | Defer for cleanup | Readability > nanosecond cost |
| 7 | Channel size 0 or 1 | Other sizes need justification |
| 8 | Enums start at 1 | Zero = unset sentinel |
| 9 | time.Duration/Time | Never bare int for time |
| 10 | Comma-ok type assert | Single return panics |
| 11 | Don't panic | Return errors in all non-main functions |
| 12 | No mutable globals | Inject dependencies via structs |
| 13 | No embedding public | Leaks implementation, breaks evolution |
| 14 | No init() | Explicit initialization functions |
| 15 | Exit in main() only | All others return errors |
| 16 | Field tags on marshaled | `json:"name"` always |
| 17 | No fire-and-forget goroutines | Stop signal + wait required |
| 18 | Error wrap context | Operation name, not "failed to" |
| 19 | Error naming | Err prefix vars, Error suffix types |
| 20 | Import groups | stdlib / external / internal |
| 21 | Struct init with field names | Never positional |
| 22 | _ prefix unexported globals | `_defaultTimeout` |
| 23 | Reduce variable scope | Declare at point of use |
| 24 | strconv over fmt | 5-10x faster for number conversion |
| 25 | Be consistent | Match existing project patterns |
| 26 | Group declarations | Related consts/vars in () blocks |
| 27 | Import alias only on conflict | Don't alias for convenience |
| 28 | Function naming | No Get prefix, Set prefix, Is/Has/Can |
| 29 | Function order | Exported first, grouped by receiver |
| 30 | No naked parameters | Comment or name booleans/ints |
| 31 | Raw strings for regex | Backticks avoid escape hell |
| 32 | Map init style | make for dynamic, literal for static |
| 33 | Struct pointer init | `&T{}` directly, not value then & |
| 34 | Printf format as const | Grep-able, reusable |
| 35 | Printf-style func naming | Suffix with f (Warnf, Errorf) |
| 36 | Table-driven tests | give/want fields, t.Run with name |
| 37 | Functional options | For constructors with many params |
| 38 | Use golangci-lint | errcheck + vet + imports in CI |
| 39 | No goroutines in init | No lifecycle = guaranteed leak |
| 40 | var vs := | := for values, var for zero-value intent |
