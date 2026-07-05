---
type: fact
title: "Virtual threads internals: continuations, carriers, pinning, scheduling"
---

# Virtual Threads Internals

## Architecture

```
┌─────────────────────────────────────────────┐
│              JVM Runtime                     │
├─────────────────────────────────────────────┤
│  Virtual Thread 1  │  Virtual Thread 2  │...│  (millions possible)
├─────────────────────────────────────────────┤
│  Continuation 1    │  Continuation 2    │...│  (stack snapshots)
├─────────────────────────────────────────────┤
│  Carrier Thread 1  │  Carrier Thread 2  │...│  (= ForkJoinPool workers)
├─────────────────────────────────────────────┤
│              OS Threads (few)               │
└─────────────────────────────────────────────┘
```

## How It Works

1. **Virtual thread starts** → JVM assigns it to a carrier thread (from `ForkJoinPool`).
2. **Virtual thread blocks** (I/O, sleep, lock) → JVM unmounts its continuation from the carrier.
3. **Carrier is free** → picks up another virtual thread's continuation.
4. **I/O completes** → virtual thread's continuation re-mounted on any available carrier.

The key insight: blocking a virtual thread does NOT block the underlying OS thread.

## Continuations

A continuation is the saved execution state (stack frames, local variables) of a virtual thread.

- **Mount:** Continuation loaded onto carrier thread, execution resumes.
- **Yield:** Continuation saved, carrier thread freed.
- **Resume:** Continuation re-mounted (possibly different carrier).

This is cooperative scheduling at the JVM level — no OS context switch needed.

## Carrier Thread Pool

Default: `ForkJoinPool.commonPool()` sized to `Runtime.availableProcessors()`.

```
-Djdk.virtualThreadScheduler.parallelism=N    # Override carrier count
-Djdk.virtualThreadScheduler.maxPoolSize=256  # Max carriers (default 256)
```

Carrier threads are platform (OS) threads. Their count is small and fixed.

## Pinning

When a virtual thread cannot unmount from its carrier:

### Cause 1: `synchronized` with blocking

```java
// PINNED — carrier thread blocked
synchronized (lock) {
    socket.read();  // blocking I/O inside synchronized = pinned
}
```

The `synchronized` keyword uses OS-level monitors that prevent continuation yielding.

### Cause 2: Native/JNI methods

Native code doesn't understand continuations — virtual thread stays pinned until native call returns.

### Why pinning matters

If all carrier threads are pinned, no virtual threads can make progress. Effectively a thread pool exhaustion scenario.

### Detection

```
-Djdk.tracePinnedThreads=short   # Log pinning with short stack
-Djdk.tracePinnedThreads=full    # Full stack trace

# JFR event
jdk.VirtualThreadPinned
```

### Fix: Replace synchronized with ReentrantLock

```java
private final ReentrantLock lock = new ReentrantLock();

public void safeOperation() {
    lock.lock();
    try {
        socket.read();  // NOT pinned — ReentrantLock allows unmounting
    } finally {
        lock.unlock();
    }
}
```

## Memory Model

Each virtual thread has its own stack, but it's:
- **Heap-allocated** (not OS stack)
- **Growable** (starts small, grows as needed)
- **GC-managed** (collected when thread completes)

Typical memory per idle virtual thread: ~1-2 KB (vs ~1 MB for platform thread).

## Thread-Local Storage

Virtual threads support `ThreadLocal` but:
- Millions of threads × ThreadLocal storage = high memory
- Inherited thread-locals copy on each virtual thread creation

Prefer `ScopedValue` (finalized Java 25):
```java
static final ScopedValue<RequestContext> CTX = ScopedValue.newInstance();

ScopedValue.runWhere(CTX, context, () -> {
    // Available in this scope and all called methods
    handleRequest();
});
```

## Scheduling

- **Work-stealing** within the `ForkJoinPool` — idle carriers steal work from busy ones.
- **No priority scheduling** — virtual threads are FIFO within the pool.
- **No preemption** — a CPU-bound virtual thread holds its carrier until it yields (blocks or completes).

This means CPU-bound work starves other virtual threads. Use platform threads for CPU-intensive tasks.

## Integration Points

| Library/Framework | Status | Notes |
|-------------------|--------|-------|
| Spring Boot 3.2+ | Full support | `spring.threads.virtual.enabled=true` |
| JDBC (HikariCP) | Works | Virtual threads wait for connections normally |
| Netty | Partial | Event loop model — virtual threads for handlers only |
| Hibernate/JPA | Works | But watch for `synchronized` in older versions |
| gRPC-Java | Works | Configure virtual thread executor |
| Apache HttpClient 5 | Works | Uses non-pinning I/O |

## Debugging

Virtual threads appear in thread dumps but with `VirtualThread` prefix:
```
"VirtualThread[#42]/runnable@ForkJoinPool-1-worker-3"
```

JFR events for monitoring:
- `jdk.VirtualThreadStart` / `jdk.VirtualThreadEnd`
- `jdk.VirtualThreadPinned`
- `jdk.VirtualThreadSubmitFailed` (scheduler overwhelmed)
