# Subskill: Reactive (WebFlux)

> Activate when: using Spring WebFlux, Project Reactor, R2DBC, handling backpressure, or deciding between reactive and virtual threads.

## Core Principles

1. **Non-blocking end-to-end.** One blocking call defeats the purpose. Every layer must be reactive.
2. **Backpressure is the killer feature.** When data production outpaces consumption, reactive handles it gracefully.
3. **`Mono` = 0 or 1 result. `Flux` = 0 to N results.** The types encode async semantics.
4. **Nothing happens until you subscribe.** Reactive streams are lazy — assembling a pipeline doesn't execute it.
5. **Virtual threads are simpler for most cases.** Use reactive only when backpressure, streaming, or SSE are required.

## When Reactive vs Virtual Threads

| Scenario | Choice | Why |
|----------|--------|-----|
| REST API with database calls | Virtual threads | Simpler code, blocking is fine |
| WebSocket streaming | Reactive | Continuous data flow, backpressure |
| Server-Sent Events | Reactive | Infinite stream semantics |
| File processing pipeline | Reactive | Backpressure prevents OOM |
| High-throughput event processing | Reactive | Bounded memory, operator composition |
| Typical CRUD service | Virtual threads | No benefit from reactive complexity |
| Fan-out to multiple APIs | Either | Virtual threads with structured concurrency OR reactive zip |

## WebFlux Controller

```java
@RestController
@RequestMapping("/api/events")
public class EventController {

    private final EventRepository repository;
    private final Sinks.Many<Event> eventSink;

    @GetMapping(produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<Event> streamEvents() {
        return eventSink.asFlux()
            .onBackpressureBuffer(1000, BufferOverflowStrategy.DROP_OLDEST);
    }

    @GetMapping("/{id}")
    public Mono<ResponseEntity<Event>> getEvent(@PathVariable String id) {
        return repository.findById(id)
            .map(ResponseEntity::ok)
            .defaultIfEmpty(ResponseEntity.notFound().build());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<Event> createEvent(@Valid @RequestBody Event event) {
        return repository.save(event)
            .doOnSuccess(saved -> eventSink.tryEmitNext(saved));
    }
}
```

## R2DBC (Reactive Database Access)

```java
public interface OrderRepository extends ReactiveCrudRepository<Order, Long> {

    @Query("SELECT * FROM orders WHERE status = :status")
    Flux<Order> findByStatus(String status);

    @Query("SELECT * FROM orders WHERE user_id = :userId ORDER BY created_at DESC LIMIT :limit")
    Flux<Order> findRecentByUser(Long userId, int limit);
}
```

```yaml
spring:
  r2dbc:
    url: r2dbc:postgresql://localhost:5432/app
    username: app
    password: ${DB_PASSWORD}
```

## Operator Patterns

```java
// Fan-out: call multiple services in parallel
Mono<UserProfile> profile = Mono.zip(
    userService.findById(id),
    orderService.countByUser(id),
    preferenceService.getPreferences(id)
).map(tuple -> new UserProfile(tuple.getT1(), tuple.getT2(), tuple.getT3()));

// Retry with backoff
Mono<Response> resilient = externalClient.call()
    .retryWhen(Retry.backoff(3, Duration.ofMillis(100))
        .filter(ex -> ex instanceof TimeoutException));

// Rate limiting with Flux
Flux<Item> rateLimited = items.delayElements(Duration.ofMillis(50));

// Windowing for batch processing
Flux<List<Event>> batches = eventStream
    .bufferTimeout(100, Duration.ofSeconds(1));  // batch of 100 or every 1s
```

## Error Handling

```java
return repository.findById(id)
    .switchIfEmpty(Mono.error(new NotFoundException("Order not found: " + id)))
    .flatMap(order -> processOrder(order))
    .onErrorResume(PaymentException.class, ex ->
        Mono.just(Order.failed(ex.getMessage())))
    .timeout(Duration.ofSeconds(5));
```

## Testing Reactive Code

```java
@Test
void shouldStreamEvents() {
    Flux<Event> events = Flux.just(
        new Event("1", "created"),
        new Event("2", "updated")
    );

    StepVerifier.create(events)
        .expectNextMatches(e -> e.type().equals("created"))
        .expectNextMatches(e -> e.type().equals("updated"))
        .verifyComplete();
}

@Test
void shouldHandleBackpressure() {
    Flux<Integer> fast = Flux.range(1, 1000);

    StepVerifier.create(fast.onBackpressureDrop(), 10)
        .expectNextCount(10)
        .thenCancel()
        .verify();
}
```

## Backpressure Strategies

| Strategy | Behavior | Use When |
|----------|----------|----------|
| `onBackpressureBuffer(n)` | Buffer up to n items | Temporary bursts, bounded memory |
| `onBackpressureDrop()` | Drop excess items | Latest-value semantics (metrics, UI) |
| `onBackpressureLatest()` | Keep only most recent | Real-time dashboards |
| `onBackpressureError()` | Error on overflow | Fail-fast, strict processing |

## Anti-Patterns

| Wrong | Right | Why |
|-------|-------|-----|
| `.block()` in reactive chain | Use operators, propagate Mono/Flux | Defeats non-blocking |
| Reactive for CRUD with no streaming | Virtual threads + blocking | Unnecessary complexity |
| Mixing WebFlux and MVC in same app | Choose one | Confusing runtime behavior |
| Unbounded `buffer()` | `bufferTimeout()` or `onBackpressureBuffer(n)` | OOM risk |
| `subscribe()` inside a controller | Return Mono/Flux from handler | Framework manages subscription |

## Delegates To

- Virtual threads (when reactive isn't needed) → `subskills/virtual-threads.md`
- Testing reactive streams → `subskills/testing-java.md`
- Spring Boot WebFlux config → `subskills/spring-boot.md`
