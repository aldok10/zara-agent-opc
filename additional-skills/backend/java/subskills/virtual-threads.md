# Subskill: Virtual Threads

> Activate when: using Project Loom, virtual threads, structured concurrency, dealing with pinning, or configuring Spring Boot for virtual thread execution.

## Core Principles

1. **Virtual threads are cheap.** Millions can exist simultaneously. One virtual thread per task — no pooling needed.
2. **Blocking is fine.** Virtual threads unmount from carrier threads during blocking I/O. No need for async/reactive APIs.
3. **Structured concurrency manages lifecycle.** `StructuredTaskScope` ensures subtasks complete (or cancel) before the parent continues.
4. **Pinning is the enemy.** `synchronized` blocks and native methods pin virtual threads to carrier threads — avoid them.
5. **Spring Boot 3.2+ auto-configures (3.5+ recommended).** `spring.threads.virtual.enabled=true` switches Tomcat, async tasks, and scheduling to virtual threads.

## Spring Boot Integration

```yaml
# application.yml
spring:
  threads:
    virtual:
      enabled: true  # Tomcat, @Async, @Scheduled all use virtual threads
```

What this enables:
- Tomcat request handling on virtual threads (no thread pool sizing needed)
- `@Async` methods run on virtual threads
- `@Scheduled` tasks run on virtual threads
- Spring MVC stays synchronous — but scales like reactive

## Creating Virtual Threads Directly

```java
// Simple one-off task
Thread.startVirtualThread(() -> {
    var result = httpClient.send(request, BodyHandlers.ofString());
    process(result);
});

// Executor for multiple tasks
try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
    var futures = urls.stream()
        .map(url -> executor.submit(() -> fetch(url)))
        .toList();

    var results = futures.stream()
        .map(Future::get)  // blocking is fine on virtual threads
        .toList();
}
```

## Structured Concurrency (Java 21+ preview, finalized Java 25)

```java
// Fork-join with proper lifecycle management
try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
    Subtask<User> userTask = scope.fork(() -> userService.find(userId));
    Subtask<List<Order>> ordersTask = scope.fork(() -> orderService.findByUser(userId));

    scope.join();           // wait for all
    scope.throwIfFailed();  // propagate first failure

    return new UserProfile(userTask.get(), ordersTask.get());
}
```

**ShutdownOnFailure:** Cancels remaining subtasks if any fails.
**ShutdownOnSuccess:** Returns first successful result, cancels the rest.

## Pinning — What Causes It and How to Avoid

| Cause | Problem | Fix |
|-------|---------|-----|
| `synchronized` block with blocking inside | Virtual thread pinned to carrier | Use `ReentrantLock` instead |
| Native method / JNI call | Cannot unmount | Isolate in platform thread pool |
| `Object.wait()` | Pins carrier thread | Use `LockSupport.park()` or `Condition` |

```java
// BAD — pins virtual thread
synchronized (lock) {
    connection.query(sql);  // blocking I/O inside synchronized
}

// GOOD — ReentrantLock doesn't pin
private final ReentrantLock lock = new ReentrantLock();

lock.lock();
try {
    connection.query(sql);
} finally {
    lock.unlock();
}
```

Detect pinning at runtime:
```
-Djdk.tracePinnedThreads=full   # JVM flag — logs pinning events
```

## Thread-Local Considerations

- Virtual threads support `ThreadLocal` but at high memory cost (millions of threads × per-thread storage).
- Prefer `ScopedValue` (finalized Java 25) for request-scoped data:

```java
private static final ScopedValue<UserContext> CONTEXT = ScopedValue.newInstance();

ScopedValue.runWhere(CONTEXT, currentUser, () -> {
    // CONTEXT.get() available in this scope and child virtual threads
    processRequest();
});
```

## When NOT to Use Virtual Threads

| Scenario | Why | Alternative |
|----------|-----|-------------|
| CPU-bound computation | No benefit from unmounting; wastes carriers | Platform thread pool with bounded size |
| Tight loops with no I/O | Virtual thread overhead with no gain | Regular threads or parallel streams |
| Libraries using `synchronized` internally | Pinning you can't fix | Wait for library update or use platform threads |

## Connection Pool Sizing

With virtual threads, thousands of threads may request connections simultaneously:

```yaml
spring:
  datasource:
    hikari:
      maximum-pool-size: 50      # DB connection limit still applies
      connection-timeout: 5000    # Virtual threads queue and wait — that's fine
```

Virtual threads wait (blocked) for connections — that's acceptable. But don't set pool size to 10000 thinking "virtual threads are cheap" — the database has limits.

## Monitoring

- `-Djdk.tracePinnedThreads=short` — log pinning events
- JFR events: `jdk.VirtualThreadStart`, `jdk.VirtualThreadEnd`, `jdk.VirtualThreadPinned`
- Spring Boot Actuator metrics: thread count, task execution timing

## Delegates To

- Spring Boot configuration → `subskills/spring-boot.md`
- When to use reactive instead → `subskills/reactive.md`
- JVM performance tuning → `knowledge/jvm-performance.md`
