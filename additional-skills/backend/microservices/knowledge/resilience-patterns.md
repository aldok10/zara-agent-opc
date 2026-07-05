# Resilience Patterns

Patterns for handling failure in distributed systems. Assume everything will fail; design for graceful degradation.

## Circuit Breaker

Prevent cascading failures by failing fast when downstream is unhealthy.

```
States:
  CLOSED  -> requests flow normally, failures counted
  OPEN    -> requests fail immediately (no call to downstream)
  HALF-OPEN -> allow limited requests to test recovery

Transitions:
  CLOSED -> OPEN: failure count exceeds threshold in window
  OPEN -> HALF-OPEN: after timeout period expires
  HALF-OPEN -> CLOSED: probe request succeeds
  HALF-OPEN -> OPEN: probe request fails
```

**Configuration**:
- Failure threshold: 5 failures in 30 seconds (tune to SLA)
- Open duration: 30-60 seconds (allow downstream to recover)
- Half-open probes: 1-3 requests (test before full traffic)
- What counts as failure: 5xx, timeouts, connection refused (not 4xx)

## Bulkhead

Isolate failure domains. One slow/failing component doesn't exhaust all resources.

**Types**:
- **Thread pool isolation**: each dependency gets own thread pool. Exhaustion is local.
- **Semaphore isolation**: limit concurrent calls per dependency. Lighter than threads.
- **Process isolation**: separate processes/containers per dependency.

**Implementation**: limit concurrency per downstream. Queue excess with timeout. Reject when queue full.

## Retry with Backoff

Transient failures recover with retry. Permanent failures don't. Distinguish between them.

```
Strategy:
- Retry only on transient errors (503, timeout, connection reset)
- Do NOT retry on 4xx (client error, won't fix itself)
- Exponential backoff: 100ms, 200ms, 400ms, 800ms...
- Add jitter: ± random(0, backoff/2) to prevent thundering herd
- Max retries: 3-5 (not infinite)
- Total timeout: bound total retry time (e.g., 5s max)
```

**Retry budget**: limit total retries across all instances. If 20% of requests are retries, stop retrying (system is overloaded).

## Timeout

Every network call needs a timeout. No exceptions.

```
Types:
- Connection timeout: how long to establish connection (1-5s)
- Request timeout: how long to wait for response (varies by SLA)
- Overall timeout: total time budget for operation (context deadline)

Rules:
- Inner timeouts < outer timeouts (inner call can't exceed parent's budget)
- Propagate deadline via context (Go: context.WithTimeout)
- On timeout: treat as failure, trigger circuit breaker count
- Never use infinite timeout (default in most HTTP clients!)
```

## Fallback

When primary path fails, provide degraded but functional response.

**Strategies**:
- Cache: return stale cached data (better than nothing)
- Default: return sensible default value
- Alternative service: call backup provider
- Graceful degradation: disable non-critical feature
- Queue for later: accept write, process when dependency recovers

## Rate Limiter

Protect services from being overwhelmed.

**Algorithms**:
- Token bucket: allows bursts up to bucket size, refills at steady rate.
- Sliding window: count requests in rolling time window.
- Leaky bucket: smooth output regardless of burst input.

**Application**:
- Per-client rate limiting (API gateway)
- Per-service rate limiting (self-protection)
- Global rate limiting (distributed, e.g., Redis-based)

## Combining Patterns

Patterns compose. Typical call chain:

```
Request -> Rate Limiter -> Bulkhead -> Circuit Breaker -> Timeout -> Retry -> Call
```

Order matters:
1. Rate limiter: reject excess load before it enters system
2. Bulkhead: isolate this call from others
3. Circuit breaker: fail fast if downstream is known-bad
4. Timeout: bound the wait time
5. Retry: try again on transient failure (within timeout)

## Anti-Patterns

- **Retry without backoff**: thundering herd, makes outage worse.
- **Retry on all errors**: retrying 400 Bad Request is pointless.
- **No timeout**: threads/goroutines leak, connection pools exhaust.
- **Circuit breaker on wrong granularity**: per-endpoint, not per-host.
- **Fallback hides failures**: still alert on fallback activation.
