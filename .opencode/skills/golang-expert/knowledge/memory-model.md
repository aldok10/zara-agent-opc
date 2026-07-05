---
type: fact
title: "Go Memory Model - Happens-Before, Synchronization Guarantees"
---

# Go Memory Model

Source: [Go Memory Model](https://go.dev/ref/mem) (official spec, revised June 2022), Russ Cox memory model articles.

## Core Principle

```
The Go memory model specifies the conditions under which reads of a variable
in one goroutine can be guaranteed to observe values produced by writes to
the same variable in a different goroutine.

Without synchronization: NO guarantees about observation order.
With synchronization: happens-before relationships are established.
```

## Happens-Before Definition

```
If event A happens-before event B, then A is guaranteed to be observed by B.
Within a single goroutine: all statements happen-before subsequent statements.
Between goroutines: ONLY through synchronization primitives.
```

## Synchronization Guarantees

### Channel Operations

```
Rule 1: Send on channel HAPPENS-BEFORE corresponding receive completes.
Rule 2: Close of channel HAPPENS-BEFORE receive of zero value (from close).
Rule 3: Receive from unbuffered channel HAPPENS-BEFORE send completes.
Rule 4: k-th receive on channel with capacity C HAPPENS-BEFORE (k+C)-th send completes.
```

```go
// Example: channel guarantees ordering
var data int

func main() {
    done := make(chan struct{})
    go func() {
        data = 42         // (A) write
        done <- struct{}{}  // (B) send
    }()
    <-done               // (C) receive - happens after (B)
    fmt.Println(data)    // (D) guaranteed to see 42
    // Because: A hb B, B hb C (channel rule), C hb D (program order)
}
```

### sync.Mutex / sync.RWMutex

```
Rule: For any sync.Mutex (or RWMutex), call n of Unlock() HAPPENS-BEFORE call m of Lock() (m > n).
Translation: everything before Unlock() is visible to everything after the next Lock().
```

```go
var mu sync.Mutex
var data string

func writer() {
    data = "hello"   // (A)
    mu.Unlock()      // (B) - A happens-before B
}

func reader() {
    mu.Lock()        // (C) - B happens-before C (for subsequent Lock)
    _ = data         // (D) - guaranteed to see "hello"
}
```

### sync.Once

```
Rule: The completing call of f() from once.Do(f) HAPPENS-BEFORE any other Do() returns.
Translation: once.Do guarantees all goroutines see the initialized state.
```

```go
var once sync.Once
var config *Config

func getConfig() *Config {
    once.Do(func() {
        config = loadConfig() // guaranteed visible to all callers
    })
    return config // safe: once.Do establishes happens-before
}
```

### sync.WaitGroup

```
Rule: wg.Done() (or Add(-1)) HAPPENS-BEFORE wg.Wait() returns.
Translation: all work before Done() is visible after Wait().
```

### sync.Cond

```
Rule: Broadcast/Signal HAPPENS-BEFORE Wait returns.
Note: always recheck condition after Wait (spurious wakeup possible).
```

### atomic Operations (sync/atomic)

```
Go 1.19+: atomic operations participate in happens-before.
Rule: atomic write HAPPENS-BEFORE atomic read that observes the written value.
This makes atomic suitable for simple synchronization (not just visibility).
```

```go
var ready atomic.Bool
var data int

func producer() {
    data = 42           // (A)
    ready.Store(true)   // (B) - A happens-before B (program order)
}

func consumer() {
    for !ready.Load() { // (C) - when sees true, B happens-before C
        runtime.Gosched()
    }
    _ = data            // (D) - guaranteed to see 42
}
```

### Package Initialization

```
Rule: init() of imported package HAPPENS-BEFORE importing package's init().
Rule: All init() functions HAPPEN-BEFORE main.main().
Rule: init() functions in a single package run in source file order (but don't rely on this).
```

### Goroutine Creation and Exit

```
Rule: go statement (goroutine creation) HAPPENS-BEFORE goroutine execution starts.
Rule: goroutine exit does NOT happen-before any event (no implicit sync on exit).
```

```go
var data int

func main() {
    data = 42        // (A)
    go func() {      // (B) go statement - A hb B hb goroutine start
        _ = data     // guaranteed to see 42
    }()
    // But: goroutine exit has NO guarantee without explicit sync
}
```

## What Is NOT Guaranteed

### No Guarantee Without Sync

```go
// BROKEN: data race, undefined behavior
var a, b int

func f() {
    a = 1
    b = 2
}

func g() {
    print(b) // may see 2...
    print(a) // ...but NOT guaranteed to see 1 (reordering!)
}

func main() {
    go f()
    g()
}
```

### Compiler and Hardware Reordering

```
Without synchronization, the compiler and CPU are free to:
1. Reorder non-dependent memory operations
2. Cache values in registers (not flush to memory)
3. Use store buffers (write visible to local core but not others)
4. Speculative execution may observe "future" values

Go's model is DRF-SC (Data-Race-Free Sequential Consistency):
- Program free of data races → sequentially consistent behavior
- Program WITH data races → undefined behavior (not just "wrong order")
```

### Double-Checked Locking (Broken Without Atomic)

```go
// BROKEN in Go (unlike Java volatile):
var instance *Singleton

func GetInstance() *Singleton {
    if instance == nil {     // unsynchronized read - DATA RACE
        mu.Lock()
        if instance == nil {
            instance = &Singleton{}
        }
        mu.Unlock()
    }
    return instance
}

// CORRECT: use sync.Once (simplest and correct)
var once sync.Once
var instance *Singleton

func GetInstance() *Singleton {
    once.Do(func() { instance = &Singleton{} })
    return instance
}

// ALSO CORRECT: atomic.Pointer
var instance atomic.Pointer[Singleton]

func GetInstance() *Singleton {
    if p := instance.Load(); p != nil {
        return p
    }
    mu.Lock()
    defer mu.Unlock()
    if p := instance.Load(); p != nil {
        return p
    }
    p := &Singleton{}
    instance.Store(p)
    return p
}
```

## Data Race Definition

```
A data race occurs when:
1. Two goroutines access the same variable concurrently
2. At least one access is a write
3. No synchronization orders the accesses

Data races in Go = UNDEFINED BEHAVIOR (not just "wrong value").
Compiler may:
- Optimize away the read entirely
- Read a partially-written value (torn read)
- Use stale cached value indefinitely
```

## Race Detector

```bash
# Detects data races at runtime (10x slowdown, 5-10x memory)
go test -race ./...
go run -race .
go build -race -o myapp && ./myapp

# ALWAYS run in CI. Find races before production.
# False negatives possible (only detects races that execute).
# NO false positives (if reported, it's real).
```

## Practical Patterns Summary

| Need | Use | Why |
|------|-----|-----|
| One-time init | `sync.Once` | Simplest correct pattern |
| Protect mutable state | `sync.Mutex` | Clear happens-before on Lock/Unlock |
| Signal completion | Channel or `sync.WaitGroup` | Channel: with data. WG: just "done" |
| Publish config atomically | `atomic.Pointer[T]` | Lock-free reads, store establishes hb |
| Counter | `atomic.Int64` | Lock-free, correct |
| Coordinate pipeline | Channels | Ownership transfer with ordering |
| Flag/ready signal | `atomic.Bool` | Lightweight, correct since Go 1.19 |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Read shared var without sync | Use atomic or mutex |
| Assume goroutine sees latest write | Explicit sync required |
| `go func()` then immediately read result | Channel or WaitGroup to synchronize |
| String/slice shared between goroutines | Immutable or copy or mutex |
| Struct with mix of synced/unsynced fields | Protect entire struct or use atomic for each |
| Relying on "fast enough" timing | Never. Use proper synchronization |

## Memory Model vs Java/C++

| Aspect | Go | Java | C++ |
|--------|----|----|-----|
| Default | No guarantee without sync | Volatile provides visibility | Relaxed, acquire, release, seq_cst |
| Race semantics | Undefined behavior | Defined (can observe stale) | Undefined behavior |
| Atomic ordering | Single ordering (sequentially consistent) | volatile = happens-before | Multiple orderings available |
| Complexity | Simple (DRF-SC only) | Medium (JMM rules) | Complex (6 memory orderings) |

Go chose simplicity: one memory ordering for atomics (seq_cst equivalent), no relaxed mode. Trade some performance for correctness and clarity.
