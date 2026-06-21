# Understanding Go Mistakes — Study Guide for AI

> **INSTRUCTION**: Read this file to UNDERSTAND the reasoning, not just memorize rules.
> These mistakes are patterns that look correct but produce bugs, leaks, or poor performance.
> You must internalize the mental models so you never generate these patterns.

## How to Use This

The `bad_patterns.go` file contains annotated code showing:
1. The **BAD** pattern (what NOT to generate)
2. **WHY** it's wrong (the underlying computer science)
3. The **GOOD** pattern (what to generate instead)
4. The **mental model** (one sentence to internalize)

## The 12 Most Critical Mistakes AI Agents Make

These are ordered by frequency of AI-generated violations:

### 1. Missing `return` after `http.Error()` (#80)

**Why AI gets this wrong**: AI sees `http.Error` as "handling the error" and moves on.
**Reality**: `http.Error` is just `fmt.Fprintf` to the response. It does NOT stop execution.
**Mental model**: http.Error is printf, not throw.

### 2. Returning interfaces (#7)

**Why AI gets this wrong**: AI comes from Java/C# training data where interfaces are returned.
**Reality**: Go idiom is "accept interfaces, return structs." Callers define their own abstractions.
**Mental model**: The producer doesn't choose the abstraction. The consumer does.

### 3. Premature abstraction / interface pollution (#5, #6)

**Why AI gets this wrong**: AI creates interfaces "for testability" even with one implementation.
**Reality**: In Go, you define interfaces at the consumer site when you NEED them. Not before.
**Mental model**: Do I have 2+ implementations TODAY? No → no interface.

### 4. Not pre-allocating slices (#21)

**Why AI gets this wrong**: AI writes `var results []T` because it's shorter.
**Reality**: Every append beyond capacity copies the entire slice. Pre-alloc avoids O(n) copies.
**Mental model**: If you know the size, tell Go. `make([]T, 0, n)`.

### 5. Goroutine without exit path (#62)

**Why AI gets this wrong**: AI writes `go func() { ch <- result }()` without considering what happens if nobody reads.
**Reality**: That goroutine blocks forever = memory leak in production.
**Mental model**: Every goroutine is a contract: I start, I WILL stop.

### 6. Log AND return error (#52)

**Why AI gets this wrong**: AI adds logging "for observability" at every level.
**Reality**: Error appears in logs N times (once per layer). Handle at ONE layer.
**Mental model**: Handle or return. Never both.

### 7. defer inside loop (#35)

**Why AI gets this wrong**: AI sees "defer for cleanup" and applies it everywhere.
**Reality**: defer is function-scoped, not block-scoped. Loop = accumulate ALL defers.
**Mental model**: defer = function-scoped. For loop cleanup, extract to sub-function.

### 8. Default HTTP client (#81)

**Why AI gets this wrong**: AI uses `http.Get(url)` or `http.DefaultClient` for simplicity.
**Reality**: No timeout = one slow server hangs your goroutine forever.
**Mental model**: No timeout = no bound on resources = production incident.

### 9. String concatenation with += in loop (#39)

**Why AI gets this wrong**: `result += s` is the obvious pattern from other languages.
**Reality**: Strings are immutable. Each += copies everything. O(n²) for n appends.
**Mental model**: strings.Builder with Grow. One allocation, not n.

### 10. time.After in loop (#76)

**Why AI gets this wrong**: `case <-time.After(30*time.Second)` looks clean in select.
**Reality**: Each iteration allocates a timer that lives until it fires. Memory bomb.
**Mental model**: time.NewTimer + Reset for reusable timers in loops.

### 11. Slice sub-slice append corruption (#25)

**Why AI gets this wrong**: AI doesn't think about backing array sharing.
**Reality**: `s[1:3]` shares memory with `s`. Append to sub-slice can overwrite original.
**Mental model**: Sub-slice = shared memory. Use 3-index slice to limit capacity.

### 12. Copying sync types (#74)

**Why AI gets this wrong**: AI passes structs by value (Go default) without thinking.
**Reality**: sync.Mutex, WaitGroup contain state. Copy = independent state = race.
**Mental model**: sync types are identity, not value. Always pointer.

## Deeper Understanding: Why These Matter

### The Resource Leak Family (#35, #62, #76, #79)

All four share the same root cause: **unbounded resource lifetime**.
- #35: file descriptors held too long
- #62: goroutine memory held forever
- #76: timer allocations accumulating
- #79: network connections held open

**The principle**: Every resource acquisition must have a bounded, deterministic release.
In Go, that's: `defer` (function-scoped), `context` (cancellation), or explicit close.

### The Silent Corruption Family (#25, #69, #70, #74)

All four share the same root cause: **shared mutable state without synchronization**.
- #25: slice backing array shared between slices
- #69: append from multiple goroutines racing on backing array
- #70: mutex protects reference but not underlying data
- #74: sync type copied, creating two independent locks

**The principle**: If two pieces of code can see the same memory, they must coordinate.
The Go race detector (`-race`) catches these at runtime.

### The API Design Family (#5, #6, #7, #8, #13)

All five share the same root cause: **premature generalization**.
- #5: interface before need
- #6: interface at wrong site
- #7: returning interface (forcing abstraction on caller)
- #8: `any` (no type safety)
- #13: `util` package (no domain meaning)

**The principle**: Abstractions are discovered through use, not designed in advance.
Start concrete. Extract interface when you have 2+ consumers or 2+ implementations.

### The Performance Ignorance Family (#21, #27, #39, #91-#100)

All share the same root cause: **not understanding how the runtime works**.
- #21: slice growth copies (allocator)
- #27: map rehash copies (hash table)
- #39: string immutability copies (memory model)
- #91-#100: CPU caches, GC, stack, alignment (hardware)

**The principle**: The fastest code is the code that doesn't allocate.
Pre-size, reuse, pool. But ONLY when measured — premature optimization is also a mistake.

## How to Self-Check

Before committing Go code, ask:
1. Does every goroutine have a way to stop? (#62)
2. Does every resource have a bounded close? (#35, #79)
3. Did I return after http.Error? (#80)
4. Am I returning concrete types? (#7)
5. Did I pre-allocate for known sizes? (#21, #27)
6. Am I handling errors exactly once? (#52)
7. Are my timeouts explicit? (#81)
