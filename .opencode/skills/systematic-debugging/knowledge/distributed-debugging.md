---
type: fact
title: "Distributed Systems Debugging"
---
# Distributed Systems Debugging

## Trace Correlation Across Services

### OpenTelemetry Context Propagation

```typescript
import { trace, context, propagation } from '@opentelemetry/api';

// Injecting trace context into outgoing request
async function callDownstream(url: string, data: unknown) {
  const span = trace.getActiveSpan();
  const headers: Record<string, string> = {};
  propagation.inject(context.active(), headers);

  const response = await fetch(url, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  span?.setAttribute('http.status_code', response.status);
  return response;
}
```

### Correlation ID Pattern

```go
// Middleware to extract/generate correlation ID
func correlationMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        corrID := r.Header.Get("X-Correlation-ID")
        if corrID == "" {
            corrID = uuid.New().String()
        }
        ctx := context.WithValue(r.Context(), correlationKey, corrID)
        w.Header().Set("X-Correlation-ID", corrID)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}
```

### Finding the Failing Span

```bash
# Query traces by error status
# Jaeger API
curl "http://jaeger:16686/api/traces?service=order-service&tags=error%3Dtrue&limit=20"

# Tempo/Grafana query
{ status = error } | resource.service.name = "payment-service"
```

## Boundary Instrumentation Pattern

Instrument at every service boundary (ingress/egress):

```typescript
// Wrap every external call with timing + error tracking
async function instrumentedCall<T>(
  name: string,
  target: string,
  fn: () => Promise<T>
): Promise<T> {
  const span = tracer.startSpan(`${name} -> ${target}`);
  const start = performance.now();

  try {
    const result = await fn();
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (err) {
    span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
    span.recordException(err as Error);
    throw err;
  } finally {
    const duration = performance.now() - start;
    span.setAttribute('duration_ms', duration);
    span.end();
    metrics.histogram('external_call_duration', duration, { name, target });
  }
}
```

## Log Analysis for Multi-Service Bugs

### Structured Log Query Pattern

```bash
# Find all logs for a single request across services
# Using structured logging (JSON) with correlation ID

# Loki query
{namespace="production"} |= "corr-id-abc123" | json | level="error"

# CloudWatch Insights
fields @timestamp, @message, service, level
| filter correlationId = "corr-id-abc123"
| sort @timestamp asc
```

### Timeline Reconstruction

```
timestamp           service          event
─────────────────────────────────────────────────────────
10:00:00.100       api-gateway      request received
10:00:00.105       api-gateway      auth check passed
10:00:00.110       order-service    order.create started
10:00:00.250       order-service    inventory check → inventory-service
10:00:00.260       inventory-service received request
10:00:05.260       inventory-service TIMEOUT connecting to redis  ← ROOT CAUSE
10:00:05.270       order-service    received 504 from inventory
10:00:05.275       api-gateway      returned 500 to client
```

## Common Distributed System Failure Modes

### 1. Cascading Failures

One service fails, causing upstream services to exhaust resources waiting.

Diagnosis:
- Check thread pool/connection pool exhaustion
- Look for increasing latency followed by errors
- Identify the first service that started failing

Fix: Circuit breakers, bulkheads, timeouts at every boundary.

### 2. Split Brain / Consistency Issues

```bash
# Check: is data different across replicas?
# Query each replica directly and compare
curl http://replica-1:8080/api/resource/123
curl http://replica-2:8080/api/resource/123
# If different: check replication lag, network partitions
```

### 3. Thundering Herd

Cache expires, all instances hit the database simultaneously.

Diagnosis:
- Spike in DB connections/queries at exact same timestamp
- Cache miss rate spikes to 100% then recovers

Fix: Cache stampede protection (singleflight), jittered expiry.

### 4. Retry Storms

Retries amplify load on already-failing service.

Diagnosis:
- Request rate at failing service is N times expected (N = retry count)
- Load increases after first error, not before

Fix: Exponential backoff with jitter, retry budgets.

```go
// Retry budget: allow max 10% of requests to be retries
type RetryBudget struct {
    mu       sync.Mutex
    requests int64
    retries  int64
    ratio    float64 // max retry ratio (e.g., 0.1)
}

func (rb *RetryBudget) CanRetry() bool {
    rb.mu.Lock()
    defer rb.mu.Unlock()
    if rb.requests == 0 {
        return true
    }
    return float64(rb.retries)/float64(rb.requests) < rb.ratio
}
```

### 5. Clock Skew

Services disagree on time, causing ordering issues.

Diagnosis:
- Events appear out of order in logs
- TTL-based logic behaves unexpectedly
- Token validation fails intermittently

Fix: NTP sync, use logical clocks (vector/Lamport) for ordering.

### 6. Poison Messages

One bad message causes consumer to crash/restart in a loop.

Diagnosis:
- Consumer restarts repeatedly
- Same message offset/ID in logs before each crash
- Message queue lag increases

Fix: Dead letter queue, poison pill detection after N retries.

## Tools Reference

| Tool | Purpose | When to Use |
|------|---------|-------------|
| Jaeger/Tempo | Distributed tracing | Request path analysis, latency breakdown |
| Grafana | Metrics visualization | Trend analysis, correlation across services |
| Loki/CloudWatch | Log aggregation | Event reconstruction, error searching |
| kubectl logs/stern | Pod-level logs | Quick local debugging |
| tcpdump/Wireshark | Network analysis | Connection issues, DNS problems |
| pprof | Go profiling | CPU/memory issues in Go services |
| async-profiler | JVM profiling | CPU/allocation in Java services |

## Debugging Checklist for Distributed Issues

- [ ] Identify which service first showed errors (find patient zero)
- [ ] Correlate with recent deployments or config changes
- [ ] Check resource utilization (CPU, memory, connections, file descriptors)
- [ ] Verify network connectivity between services
- [ ] Check DNS resolution (stale entries after deployments)
- [ ] Review circuit breaker states
- [ ] Check for clock skew between nodes
- [ ] Verify service discovery is returning healthy endpoints
- [ ] Check for resource leaks (goroutines, connections, file handles)
- [ ] Review recent scaling events (up or down)
