---
type: tool
title: "Microservice Resilience Patterns"
---

# Microservice Resilience Patterns

## Purpose

Design resilience patterns for service-to-service communication. Covers circuit breakers, bulkheads, timeouts, retries, and fallbacks to prevent cascading failures in distributed systems.

## When to Use

- Service experiencing cascading failures from downstream dependency
- Designing fault tolerance for a new service integration
- Choosing between circuit breaker libraries/implementations
- Configuring timeout and retry budgets across a call chain
- Handling partial degradation gracefully

## Prompt Template

```
CONTEXT:
- Service: [calling service name and role]
- Dependency: [downstream service, database, or external API]
- Communication: [HTTP/REST | gRPC | async message | database call]
- SLA: [required availability, latency P99]
- Failure modes observed: [timeout | 5xx | connection refused | slow response]
- Traffic pattern: [steady | bursty | seasonal spikes]
- Library/framework: [Resilience4j | Polly | Hystrix | Istio | custom]

PATTERN SELECTION:
1. Circuit breaker
   - Failure threshold: [percentage or count to trip]
   - Recovery timeout: [half-open probe interval]
   - Sliding window: [count-based or time-based]
   - Fallback behavior: [cached response | default | error]

2. Bulkhead
   - Isolation type: [thread pool | semaphore | connection pool]
   - Max concurrent: [per dependency limit]
   - Queue depth: [overflow behavior]
   - Priority lanes: [critical vs non-critical traffic]

3. Timeout
   - Connection timeout: [ms]
   - Read/response timeout: [ms]
   - Overall request timeout: [ms, including retries]
   - Timeout budget: [distributed across call chain]

4. Retry
   - Retryable conditions: [5xx, timeout, connection reset]
   - Non-retryable: [4xx, business logic errors]
   - Strategy: [fixed | exponential backoff + jitter]
   - Max attempts: [count]
   - Retry budget: [percentage of total traffic]

5. Fallback
   - Cached response (with staleness indicator)
   - Degraded response (partial data)
   - Default/static response
   - Redirect to alternative service

6. Rate limiting (outbound)
   - Requests per second cap to dependency
   - Token bucket or leaky bucket
   - Queue vs reject excess

COMPOSITION:
- Order: timeout -> retry -> circuit breaker -> bulkhead
- Interaction: retry inside circuit breaker (not outside)
- Monitoring: emit events for each pattern trigger
```

## Output Format

```
## Resilience Design: [service] -> [dependency]

### Failure Analysis
| Mode | Frequency | Impact | Detection |
|------|-----------|--------|-----------|
| ... | ... | ... | ... |

### Pattern Configuration
| Pattern | Setting | Value | Rationale |
|---------|---------|-------|-----------|
| Circuit Breaker | failure threshold | ... | ... |
| Timeout | read timeout | ... | ... |
| Retry | max attempts | ... | ... |
| Bulkhead | max concurrent | ... | ... |

### Composition Order
[Diagram: request -> bulkhead -> circuit breaker -> retry -> timeout -> call]

### Fallback Strategy
- Primary: [behavior when circuit open]
- Secondary: [behavior when all retries exhausted]

### Monitoring
- Circuit state transitions (alert on OPEN)
- Retry rate (alert if > N% of traffic)
- Timeout rate by endpoint
- Bulkhead rejection count
```
