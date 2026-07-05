---
type: fact
title: "Go Concurrency Patterns - Channels, sync, errgroup, Context"
---

# Go Concurrency Patterns

## Goroutine Lifecycle

Every goroutine must have a clear exit path. Leaked goroutines = memory leak.

```go
// DON'T: goroutine with no exit signal
go func() {
    for {
        doWork() // runs forever, no way to stop
    }
}()

// DO: goroutine with context cancellation
func worker(ctx context.Context) {
    for {
        select {
        case <-ctx.Done():
            return
        default:
            doWork()
        }
    }
}
```

## Channel Patterns

### Fan-Out (1 producer, N consumers)

```go
func fanOut(ctx context.Context, input <-chan Task, workers int) {
    for range workers {
        go func() {
            for task := range input {
                select {
                case <-ctx.Done():
                    return
                default:
                    process(task)
                }
            }
        }()
    }
}
```

### Fan-In (N producers, 1 consumer)

```go
func fanIn(ctx context.Context, channels ...<-chan Result) <-chan Result {
    out := make(chan Result)
    var wg sync.WaitGroup
    wg.Add(len(channels))

    for _, ch := range channels {
        go func() {
            defer wg.Done()
            for val := range ch {
                select {
                case out <- val:
                case <-ctx.Done():
                    return
                }
            }
        }()
    }

    go func() {
        wg.Wait()
        close(out)
    }()
    return out
}
```

### Pipeline

```go
func pipeline(ctx context.Context, input <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for v := range input {
            select {
            case out <- transform(v):
            case <-ctx.Done():
                return
            }
        }
    }()
    return out
}
```

### Worker Pool

```go
func workerPool(ctx context.Context, jobs <-chan Job, results chan<- Result, numWorkers int) {
    var wg sync.WaitGroup
    wg.Add(numWorkers)

    for range numWorkers {
        go func() {
            defer wg.Done()
            for job := range jobs {
                select {
                case <-ctx.Done():
                    return
                case results <- process(job):
                }
            }
        }()
    }

    go func() {
        wg.Wait()
        close(results)
    }()
}
```

### Bounded Concurrency (Semaphore)

```go
// DO: use a buffered channel as semaphore
sem := make(chan struct{}, maxConcurrency)

for _, item := range items {
    sem <- struct{}{} // acquire
    go func() {
        defer func() { <-sem }() // release
        process(item)
    }()
}
```

## sync Primitives

### Mutex vs RWMutex

```go
// DO: RWMutex when reads vastly outnumber writes
type Cache struct {
    mu    sync.RWMutex
    store map[string]string
}

func (c *Cache) Get(key string) (string, bool) {
    c.mu.RLock()
    defer c.mu.RUnlock()
    v, ok := c.store[key]
    return v, ok
}

func (c *Cache) Set(key, val string) {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.store[key] = val
}

// DON'T: use Mutex for read-heavy workloads (contention)
```

### sync.Once

```go
// DO: lazy initialization
type Service struct {
    once   sync.Once
    client *http.Client
}

func (s *Service) getClient() *http.Client {
    s.once.Do(func() {
        s.client = &http.Client{Timeout: 10 * time.Second}
    })
    return s.client
}

// Go 1.21+: sync.OnceValue / sync.OnceFunc
var getConfig = sync.OnceValue(func() *Config {
    cfg, err := loadConfig()
    if err != nil {
        panic(err) // only option in OnceValue
    }
    return cfg
})
```

### sync.Pool

```go
// DO: reuse expensive allocations
var bufPool = sync.Pool{
    New: func() any { return new(bytes.Buffer) },
}

func process(data []byte) {
    buf := bufPool.Get().(*bytes.Buffer)
    defer func() {
        buf.Reset()
        bufPool.Put(buf)
    }()
    buf.Write(data)
    // use buf...
}

// DON'T: store items with finalizers or pointers to large structures
```

### sync.WaitGroup

```go
// DO: add before launching goroutine
var wg sync.WaitGroup
for _, item := range items {
    wg.Add(1)
    go func() {
        defer wg.Done()
        process(item)
    }()
}
wg.Wait()

// DON'T: call wg.Add inside the goroutine (race with Wait)
```

## errgroup

```go
import "golang.org/x/sync/errgroup"

// DO: bounded errgroup with context
func fetchAll(ctx context.Context, urls []string) ([]Response, error) {
    g, ctx := errgroup.WithContext(ctx)
    g.SetLimit(10) // max 10 concurrent

    results := make([]Response, len(urls))
    for i, url := range urls {
        g.Go(func() error {
            resp, err := fetch(ctx, url)
            if err != nil {
                return fmt.Errorf("fetch %s: %w", url, err)
            }
            results[i] = resp // safe: each goroutine writes unique index
            return nil
        })
    }

    if err := g.Wait(); err != nil {
        return nil, err
    }
    return results, nil
}
```

## singleflight (Cache Stampede Prevention)

```go
import "golang.org/x/sync/singleflight"

var group singleflight.Group

func getData(ctx context.Context, key string) ([]byte, error) {
    v, err, _ := group.Do(key, func() (any, error) {
        return expensiveFetch(ctx, key)
    })
    if err != nil {
        return nil, err
    }
    return v.([]byte), nil
}
```

## Context Propagation

```go
// DO: always pass context as first param
func ProcessOrder(ctx context.Context, order Order) error {
    ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
    defer cancel()

    // propagate to downstream calls
    if err := validateOrder(ctx, order); err != nil {
        return err
    }
    return saveOrder(ctx, order)
}

// DO: use context.WithCancelCause (Go 1.20+)
ctx, cancel := context.WithCancelCause(parentCtx)
cancel(fmt.Errorf("user cancelled request"))
// later:
cause := context.Cause(ctx) // "user cancelled request"

// DO: use context.AfterFunc (Go 1.21+) for cleanup on cancel
stop := context.AfterFunc(ctx, func() {
    conn.Close()
})
defer stop()

// DON'T: store context in a struct
// DON'T: pass nil context (use context.Background() or context.TODO())
```

## Race Detector

```bash
# Always run tests with race detector in CI
go test -race ./...

# Build with race detector for integration tests
go build -race -o myapp .
```

## Common Deadlock Patterns

```go
// DEADLOCK: unbuffered channel, single goroutine
ch := make(chan int)
ch <- 1  // blocks forever, nobody reads
val := <-ch

// DEADLOCK: lock ordering inconsistency
// goroutine 1: Lock(A) then Lock(B)
// goroutine 2: Lock(B) then Lock(A)
// FIX: always acquire locks in the same order

// DEADLOCK: WaitGroup Add after Wait
var wg sync.WaitGroup
go func() {
    wg.Add(1) // might run after wg.Wait()
    defer wg.Done()
}()
wg.Wait()
```

## Structured Concurrency (Go 1.24+)

Go 1.24 doesn't add explicit structured concurrency primitives, but the pattern is achieved with errgroup:

```go
// Structured: child goroutines bound to parent lifetime
func structured(ctx context.Context) error {
    g, ctx := errgroup.WithContext(ctx)

    g.Go(func() error { return taskA(ctx) })
    g.Go(func() error { return taskB(ctx) })

    // All children finish or error before this returns
    return g.Wait()
}

// Combined with SetLimit for bounded structured concurrency
func boundedStructured(ctx context.Context, items []Item) error {
    g, ctx := errgroup.WithContext(ctx)
    g.SetLimit(runtime.GOMAXPROCS(0))

    for _, item := range items {
        g.Go(func() error {
            return processItem(ctx, item)
        })
    }
    return g.Wait()
}
```

## Key Rules

1. Never start a goroutine without knowing how it stops
2. Prefer `errgroup` over raw `sync.WaitGroup` + error channels
3. Use `-race` in CI, always
4. Channel direction in signatures: `<-chan` (receive), `chan<-` (send)
5. Close channels from the sender side only
6. Prefer `context.WithTimeout` over `time.After` in select (avoids timer leak)
7. Use `sync.OnceValue` (Go 1.21+) over manual `sync.Once` + stored result
8. Use `g.SetLimit(n)` instead of manual semaphore with errgroup
