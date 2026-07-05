# Subskill: Context & Structured Concurrency

> Activate when: context, WithCancel, WithTimeout, WithValue, errgroup, structured concurrency, wg.Go, scope

## Context Deep Dive

### Internals

```
context.Context is an interface with 4 methods:
- Deadline() (deadline time.Time, ok bool)
- Done() <-chan struct{}
- Err() error (nil, Canceled, or DeadlineExceeded)
- Value(key any) any

Tree structure: child contexts derive from parent.
Cancel propagates DOWN (parent cancel -> all children cancelled).
Values propagate UP (child can read parent's values).
```

### Context Types

| Constructor | Purpose | Cancel? |
|-------------|---------|---------|
| `context.Background()` | Root, never cancelled | No |
| `context.TODO()` | Placeholder during refactor | No |
| `context.WithCancel(parent)` | Manual cancellation | Yes (call cancel func) |
| `context.WithTimeout(parent, d)` | Auto-cancel after duration | Yes (auto + manual) |
| `context.WithDeadline(parent, t)` | Auto-cancel at specific time | Yes (auto + manual) |
| `context.WithValue(parent, k, v)` | Attach request-scoped data | Inherits parent |
| `context.WithoutCancel(parent)` (1.21+) | Values without cancel propagation | No |
| `context.AfterFunc(ctx, f)` (1.21+) | Run f when ctx done | Inherits parent |

### Best Practices

```go
// 1. First parameter, named ctx
func DoWork(ctx context.Context, input Input) (Output, error) { ... }

// 2. NEVER store context in struct (request-scoped, not object-scoped)
// BAD:
type Server struct { ctx context.Context }
// GOOD:
func (s *Server) Handle(ctx context.Context) { ... }

// 3. Always check ctx.Err() or select on ctx.Done() in long operations
func longOperation(ctx context.Context) error {
    for i := range bigSlice {
        if ctx.Err() != nil {
            return ctx.Err()
        }
        process(bigSlice[i])
    }
    return nil
}

// 4. Always call cancel (even if timeout would fire)
ctx, cancel := context.WithTimeout(parent, 5*time.Second)
defer cancel() // ALWAYS defer cancel to release resources

// 5. Use context.WithValue sparingly (request ID, auth token, trace span)
// NEVER for function parameters or optional configs
type ctxKey struct{} // unexported type prevents collisions
ctx = context.WithValue(ctx, ctxKey{}, requestID)

// 6. context.AfterFunc for cleanup (Go 1.21+)
stop := context.AfterFunc(ctx, func() {
    conn.Close() // called when ctx is done
})
defer stop() // cancel AfterFunc if we finish normally
```

### Anti-Patterns

| Anti-Pattern | Problem | Fix |
|-------------|---------|-----|
| `context.Background()` in library code | Ignores caller's cancellation | Accept ctx parameter |
| Store ctx in struct field | Mixes request-scope with object lifetime | Pass as argument |
| Pass `context.TODO()` in production | No cancellation, no deadline | Wire proper context |
| Ignore ctx in loops | Long operation can't be cancelled | Check `ctx.Err()` periodically |
| Use ctx.Value for dependencies | Hides deps, untestable | Use constructor injection |
| Derive ctx from wrong parent | Cancel wrong scope | Map context tree to logical scope |
| Forget `defer cancel()` | Timer goroutine leaks until parent cancel | Always defer cancel |

### Context Cancellation Propagation

```go
// Cascade: parent cancel cascades to ALL children
parent, cancelParent := context.WithCancel(context.Background())
child1, _ := context.WithTimeout(parent, 5*time.Second)
child2, _ := context.WithCancel(parent)

cancelParent() // child1 AND child2 both cancelled immediately

// Isolation: WithoutCancel (Go 1.21+) breaks propagation
isolated := context.WithoutCancel(parent)
// isolated carries parent's values but NOT cancellation
// Use for: background cleanup that should finish even if request cancelled
```

## Structured Concurrency (Go 1.25+)

### Concept

```
Structured concurrency = goroutine lifetime is bounded by a scope.
No goroutine outlives its parent scope. All are waited on.
Prevents: orphan goroutines, leak, missing error handling.

Go doesn't enforce this at language level, but patterns achieve it:
- errgroup (stdlib-adjacent, most common)
- sync.WaitGroup.Go() (Go 1.25+, simpler API)
- Manual WaitGroup discipline
```

### sync.WaitGroup.Go (Go 1.25+)

```go
// Before 1.25: manual Add/Done
var wg sync.WaitGroup
for _, item := range items {
    wg.Add(1)
    go func() {
        defer wg.Done()
        process(item)
    }()
}
wg.Wait()

// Go 1.25+: wg.Go (safer, no Add/Done mismatch possible)
var wg sync.WaitGroup
for _, item := range items {
    wg.Go(func() {
        process(item)
    })
}
wg.Wait()
```

### errgroup Patterns (Advanced)

```go
import "golang.org/x/sync/errgroup"

// Pattern 1: Bounded concurrency with errgroup
g, ctx := errgroup.WithContext(ctx)
g.SetLimit(10) // max 10 concurrent goroutines

for _, url := range urls {
    url := url
    g.Go(func() error {
        return fetch(ctx, url)
    })
}
if err := g.Wait(); err != nil {
    // First error returned, ctx cancelled for others
}

// Pattern 2: Pipeline stages with errgroup
func pipeline(ctx context.Context, input []int) ([]int, error) {
    g, ctx := errgroup.WithContext(ctx)

    // Stage 1: produce
    ch1 := make(chan int, len(input))
    g.Go(func() error {
        defer close(ch1)
        for _, v := range input {
            select {
            case ch1 <- v:
            case <-ctx.Done():
                return ctx.Err()
            }
        }
        return nil
    })

    // Stage 2: transform
    ch2 := make(chan int, len(input))
    g.Go(func() error {
        defer close(ch2)
        for v := range ch1 {
            select {
            case ch2 <- v * 2:
            case <-ctx.Done():
                return ctx.Err()
            }
        }
        return nil
    })

    // Stage 3: collect
    var results []int
    g.Go(func() error {
        for v := range ch2 {
            results = append(results, v)
        }
        return nil
    })

    if err := g.Wait(); err != nil {
        return nil, err
    }
    return results, nil
}

// Pattern 3: Scatter-gather with timeout
func scatterGather(ctx context.Context, queries []Query) ([]Result, error) {
    ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
    defer cancel()

    g, ctx := errgroup.WithContext(ctx)
    results := make([]Result, len(queries))

    for i, q := range queries {
        i, q := i, q
        g.Go(func() error {
            r, err := execute(ctx, q)
            if err != nil {
                return err
            }
            results[i] = r // safe: each goroutine writes to unique index
            return nil
        })
    }

    if err := g.Wait(); err != nil {
        return nil, err
    }
    return results, nil
}
```

### Structured Concurrency Rules

```
1. Every goroutine belongs to a scope (WaitGroup, errgroup, or parent context).
2. Scope waits for ALL goroutines before returning.
3. Cancellation propagates to all goroutines in scope.
4. Errors bubble up from any goroutine to the scope owner.
5. No goroutine outlives its parent function.
```
