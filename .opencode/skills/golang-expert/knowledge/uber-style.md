# Uber Go Style Guide - Detailed Explanation

Source: [github.com/uber-go/guide](https://github.com/uber-go/guide/blob/master/style.md)

Every rule below includes: what it means concretely, why it exists, and a BAD/GOOD example.

---

## 1. Never Use Pointer to Interface

**What this means**: When a function accepts an interface parameter, pass the interface directly. Do NOT pass `*MyInterface`.

**Why**: An interface is already a two-word struct internally (type pointer + data pointer). Taking a pointer to it adds an unnecessary indirection and confuses readers about whether nil means "no value" or "pointer to nil interface."

```go
// BAD - pointer to interface is almost never needed
func process(r *io.Reader) { ... }

// GOOD - pass interface by value
func process(r io.Reader) { ... }
```

---

## 2. Verify Interface Compliance at Compile Time

**What this means**: Add a package-level variable declaration that will fail to compile if your type stops satisfying an interface.

**Why**: Without this, you discover the breakage at runtime (or worse, in production) when someone passes your type to a function expecting that interface. The compiler catches it immediately with this one line.

```go
type Handler struct{ ... }

// This line does nothing at runtime.
// It ONLY exists to make the compiler check that *Handler satisfies http.Handler.
// If you remove ServeHTTP, this line produces a compile error.
var _ http.Handler = (*Handler)(nil)

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) { ... }
```

Use `(*Type)(nil)` for pointer receivers. Use `Type{}` for value receivers.

---

## 3. Zero-Value Mutex Is Ready to Use

**What this means**: You don't need to initialize a mutex. Declaring it is enough.

**Why**: `sync.Mutex` and `sync.RWMutex` are usable immediately after declaration. Calling `new(sync.Mutex)` or assigning `&sync.Mutex{}` adds an unnecessary heap allocation and implies it needs initialization (it doesn't).

```go
// BAD - unnecessary allocation
mu := new(sync.Mutex)

// GOOD - zero value works
var mu sync.Mutex
mu.Lock()
defer mu.Unlock()
```

---

## 4. Mutex Must Be a Private (Unexported) Field

**What this means**: When you put a mutex in a struct, it must be a named unexported field. Never embed `sync.Mutex` directly.

**Why**: Embedding `sync.Mutex` promotes `Lock()` and `Unlock()` to the struct's public API. Callers can then lock YOUR struct from outside, bypassing your intended synchronization design. It also leaks implementation detail into your public API.

```go
// BAD - Lock/Unlock become exported methods of SMap
type SMap struct {
    sync.Mutex
    data map[string]string
}
// Caller can do: smap.Lock() - this should be internal!

// GOOD - mutex is hidden implementation detail
type SMap struct {
    mu   sync.Mutex        // unexported, callers can't see it
    data map[string]string
}
func (m *SMap) Get(k string) string {
    m.mu.Lock()
    defer m.mu.Unlock()
    return m.data[k]
}
```

---

## 5. Copy Slices and Maps at Boundaries

**What this means**: When your function receives a slice or map that it stores, make a copy. When it returns a slice or map from internal state, return a copy.

**Why**: Slices and maps are reference types. If you store the caller's slice directly, the caller can modify your internal state from outside. If you return your internal map, the caller can mutate it and break your invariants.

```go
// BAD - stores the caller's slice directly
func (d *Driver) SetTrips(trips []Trip) {
    d.trips = trips // caller still owns this memory!
}
// After calling SetTrips, caller does trips[0] = ... → YOUR data changes

// GOOD - defensive copy on receive
func (d *Driver) SetTrips(trips []Trip) {
    d.trips = make([]Trip, len(trips))
    copy(d.trips, trips)
}

// BAD - exposes internal map directly
func (s *Stats) Counters() map[string]int {
    return s.counters // caller can mutate your internals!
}

// GOOD - defensive copy on return
func (s *Stats) Counters() map[string]int {
    s.mu.Lock()
    defer s.mu.Unlock()
    result := make(map[string]int, len(s.counters))
    for k, v := range s.counters {
        result[k] = v
    }
    return result
}
```

---

## 6. Use Defer for Cleanup

**What this means**: When you acquire a resource (lock, file, connection), immediately defer its release on the next line.

**Why**: Without defer, every return path must remember to release the resource. With 5 return paths, you need 5 `Unlock()` calls. Miss one = deadlock or leak. Defer costs ~1 nanosecond - irrelevant in any real function.

```go
// BAD - must remember unlock at every return point
func (p *Pool) Get() *Item {
    p.mu.Lock()
    if len(p.items) == 0 {
        p.mu.Unlock()  // easy to forget
        return nil
    }
    item := p.items[0]
    p.items = p.items[1:]
    p.mu.Unlock()  // duplicated
    return item
}

// GOOD - defer handles all return paths
func (p *Pool) Get() *Item {
    p.mu.Lock()
    defer p.mu.Unlock()

    if len(p.items) == 0 {
        return nil
    }
    item := p.items[0]
    p.items = p.items[1:]
    return item
}
```

**Exception**: Don't defer inside a loop - that's a different mistake (#35). Extract to a sub-function.

---

## 7. Channel Size Must Be 0 or 1

**What this means**: When you make a channel, its buffer should be 0 (unbuffered, synchronous) or 1 (single item buffer). Any other size requires written justification.

**Why**: Arbitrary buffer sizes (like `make(chan int, 64)`) mask backpressure problems. They create the illusion of async but will still block when full. If you need buffering, you should have a specific reason with math backing the chosen size.

```go
// BAD - magic number, masks backpressure
ch := make(chan Task, 64) // "ought to be enough" - no it won't

// GOOD - intentional choices
ch := make(chan Task)    // synchronous: sender blocks until receiver ready
ch := make(chan Task, 1) // handoff: exactly one pending item allowed
```

If you genuinely need larger buffers (rate limiting, batch collection), document WHY and HOW you chose the size.

---

## 8. Start Enums at One

**What this means**: When defining constants with `iota`, start from `iota + 1`, not `iota`.

**Why**: Zero is Go's default value for uninitialized variables. If your first enum value is 0, you cannot distinguish "explicitly set to first value" from "forgot to set it." Starting at 1 means zero = unset/invalid.

```go
// BAD - zero value (Add=0) is indistinguishable from "not set"
type Operation int
const (
    Add Operation = iota      // 0
    Subtract                   // 1
)
var op Operation // op == 0 == Add - is that intentional or unset?

// GOOD - zero means "invalid/unset"
type Operation int
const (
    Add Operation = iota + 1  // 1
    Subtract                   // 2
)
var op Operation // op == 0 - clearly unset, not a valid operation
```

**Exception**: When zero IS a meaningful default (e.g., `LogToStdout = 0` as the default log destination).

---

## 9. Use time.Duration and time.Time, Never int

**What this means**: Function parameters for time periods must be `time.Duration`. Parameters for points in time must be `time.Time`. Never use bare `int` or `int64` for time.

**Why**: `poll(10)` - is that seconds? Milliseconds? Nanoseconds? `poll(10 * time.Second)` is unambiguous. The type system prevents unit confusion bugs.

```go
// BAD - ambiguous units
func poll(delay int) {
    time.Sleep(time.Duration(delay) * time.Millisecond) // caller must know it's ms
}
poll(10) // 10 what?

// GOOD - self-documenting, impossible to misuse
func poll(delay time.Duration) {
    time.Sleep(delay)
}
poll(10 * time.Second) // crystal clear
```

For JSON/config where `time.Duration` can't be used directly, include the unit in the field name: `IntervalMillis`, `TimeoutSec`.

---

## 10. Handle Type Assertions with Comma-OK

**What this means**: Always use the two-return form `value, ok := x.(Type)`. Never use the single-return form `value := x.(Type)`.

**Why**: The single-return form PANICS if the assertion fails. In production, this crashes your entire process. The comma-ok form gives you a boolean to check gracefully.

```go
// BAD - panics if i is not a string
t := i.(string) // runtime panic: interface conversion

// GOOD - graceful handling
t, ok := i.(string)
if !ok {
    // handle gracefully - log, return error, use default
}
```

---

## 11. Never Panic in Production Code

**What this means**: Functions must return `error`, not call `panic()`. Only `main()` or program initialization may panic (via `log.Fatal` or `template.Must`).

**Why**: Panic kills the entire process. In a server handling thousands of requests, one bad request would crash everything. Return errors and let callers decide how to handle them.

```go
// BAD - one bad input kills the server
func parseConfig(path string) Config {
    data, err := os.ReadFile(path)
    if err != nil {
        panic(err) // crashes everything
    }
    ...
}

// GOOD - caller decides what to do
func parseConfig(path string) (Config, error) {
    data, err := os.ReadFile(path)
    if err != nil {
        return Config{}, fmt.Errorf("parse config: %w", err)
    }
    ...
}
```

**Acceptable panics**: `template.Must()` at init, `regexp.MustCompile()` for package-level regex.

---

## 12. Avoid Mutable Globals - Inject Dependencies

**What this means**: Don't use package-level variables that get reassigned. Instead, pass dependencies through struct fields or function parameters.

**Why**: Mutable globals make testing impossible without hacks, create hidden coupling, and cause race conditions in concurrent code. Dependency injection makes code testable, explicit, and safe.

```go
// BAD - mutable global, untestable without modifying global state
var _db *sql.DB

func getUser(id string) (*User, error) {
    return queryUser(_db, id) // depends on global
}

// Test requires: _db = testDB (global mutation, not parallelizable)

// GOOD - dependency injected via struct
type UserService struct {
    db *sql.DB
}

func (s *UserService) GetUser(id string) (*User, error) {
    return queryUser(s.db, id) // explicit dependency
}

// Test: svc := &UserService{db: testDB} - clean, parallel-safe
```

---

## 13. No Embedding Types in Exported Structs

**What this means**: Don't use anonymous (embedded) fields in structs that are part of your public API.

**Why**: Embedding promotes ALL methods and fields of the embedded type to the outer struct. This means:
- Adding methods to the embedded type = adding methods to YOUR type (breaking change)
- Removing methods from embedded type = breaking YOUR consumers
- You can't evolve independently

```go
// BAD - all of AbstractList's methods become part of ConcreteList's API
type ConcreteList struct {
    *AbstractList // callers can call ANY method of AbstractList
}

// GOOD - control exactly what you expose
type ConcreteList struct {
    list *AbstractList // private field
}
func (l *ConcreteList) Add(e Entity) { l.list.Add(e) }
// Only expose what you intentionally want in your API
```

---

## 14. Avoid init() Functions

**What this means**: Don't use `func init()` for setup logic. Use explicit functions called from `main()` or constructors.

**Why**: `init()` runs automatically with no control over ordering between packages. It can't return errors. It makes testing hard (state initialized before test runs). It hides dependencies.

```go
// BAD - hidden initialization, can't test, can't error
var _config Config
func init() {
    raw, _ := os.ReadFile("config.yaml") // error silently ignored!
    yaml.Unmarshal(raw, &_config)
}

// GOOD - explicit, testable, handles errors
func loadConfig(path string) (Config, error) {
    raw, err := os.ReadFile(path)
    if err != nil {
        return Config{}, fmt.Errorf("load config: %w", err)
    }
    var cfg Config
    if err := yaml.Unmarshal(raw, &cfg); err != nil {
        return Config{}, fmt.Errorf("parse config: %w", err)
    }
    return cfg, nil
}
```

**Acceptable init()**: `database/sql` driver registration, `encoding` type registration.

---

## 15. Exit Only in main()

**What this means**: Only `main()` may call `os.Exit()` or `log.Fatal()`. All other functions must return errors.

**Why**: `os.Exit` skips all deferred calls (resource cleanup). `log.Fatal` does the same. If a function deep in the call stack exits, no cleanup happens - files aren't flushed, connections aren't closed, locks aren't released.

```go
// BAD - exits deep in call stack, skips all defers
func readFile(path string) string {
    f, err := os.Open(path)
    if err != nil {
        log.Fatal(err) // skips defers in caller!
    }
    ...
}

// GOOD - errors bubble up, main() decides
func readFile(path string) (string, error) {
    f, err := os.Open(path)
    if err != nil {
        return "", err
    }
    defer f.Close()
    ...
}

func main() {
    if err := run(); err != nil {
        fmt.Fprintln(os.Stderr, err)
        os.Exit(1) // only here - all defers have run
    }
}
```

---

## 16. Always Use Field Tags on Marshaled Structs

**What this means**: Every struct field that gets serialized to JSON/YAML/etc must have an explicit tag specifying the serialized name.

**Why**: Without tags, renaming a Go field (e.g., `Name` → `Symbol`) changes the serialized output - silently breaking every client consuming your API. Tags make the serialization contract explicit and independent of Go field names.

```go
// BAD - renaming Go fields breaks serialization contract
type Stock struct {
    Price int
    Name  string  // if you rename to Symbol, JSON output changes silently
}

// GOOD - serialized names are explicit, Go names can change freely
type Stock struct {
    Price int    `json:"price"`
    Name  string `json:"name"`  // safe to rename Go field to Symbol
}
```

---

## 17. No Fire-and-Forget Goroutines

**What this means**: Every `go func()` you start must satisfy ALL of:
1. Has a mechanism to signal it to stop (context, channel, timeout)
2. Has a mechanism for the caller to WAIT for it to actually finish

**Why**: A goroutine without lifecycle control is a resource leak. It holds memory (stack), may hold locks, keeps connections open. In a long-running server, leaked goroutines accumulate until OOM.

```go
// BAD - no way to stop, no way to wait
go func() {
    for {
        flush()
        time.Sleep(time.Second)
    }
}()
// This runs forever. How do you shut down gracefully?

// GOOD - stoppable and waitable
type Flusher struct {
    stop chan struct{}
    done chan struct{}
}

func (f *Flusher) Start() {
    f.stop = make(chan struct{})
    f.done = make(chan struct{})
    go func() {
        defer close(f.done)
        ticker := time.NewTicker(time.Second)
        defer ticker.Stop()
        for {
            select {
            case <-ticker.C:
                flush()
            case <-f.stop:
                return
            }
        }
    }()
}

func (f *Flusher) Stop() {
    close(f.stop) // signal stop
    <-f.done      // wait for completion
}
```

---

## 18. Error Wrapping: Use Operation Context, Not "failed to"

**What this means**: When wrapping errors, state what operation was attempted. Don't prefix with "failed to" - that's obvious from the error existing.

**Why**: As errors propagate up the stack, each layer adds "failed to X: failed to Y: failed to Z: actual error." This is noisy and redundant. Short context reads better.

```go
// BAD - "failed to" accumulates into noise
return fmt.Errorf("failed to create new store: %w", err)
// Stack: "failed to x: failed to y: failed to create new store: connection refused"

// GOOD - just state the operation
return fmt.Errorf("new store: %w", err)
// Stack: "x: y: new store: connection refused"
```

---

## 19. Error Naming Conventions

**What this means**:
- Exported error variables: prefix `Err` → `ErrNotFound`
- Unexported error variables: prefix `err` → `errNotFound`
- Exported error types: suffix `Error` → `NotFoundError`
- Unexported error types: suffix `Error` → `resolveError`

```go
var (
    ErrBrokenLink = errors.New("link is broken")     // exported, callers match with errors.Is
    errNotFound   = errors.New("not found")          // internal use only
)

type NotFoundError struct {   // exported, callers match with errors.As
    File string
}
```

---

## 20. Style: Import Groups

**What this means**: Organize imports into 3 groups separated by blank lines: stdlib, external packages, internal packages.

```go
import (
    "context"
    "fmt"
    "time"

    "go.uber.org/zap"
    "golang.org/x/sync/errgroup"

    "github.com/myorg/myproject/internal/handler"
    "github.com/myorg/myproject/internal/repository"
)
```

---

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
