---
type: fact
title: "Observability-Driven Testing - Trace-Based Testing and Synthetic Monitoring"
---

# Observability-Driven Testing

## Core Concept

Treat testing as an observability problem. Use system telemetry (traces, metrics, logs) as test assertions rather than only checking HTTP responses or UI states.

## Trace-Based Testing

Use distributed traces to validate request flows across services:

```yaml
# Tracetest assertion example
type: Test
spec:
  name: "Checkout flow spans all services"
  trigger:
    type: http
    httpRequest:
      url: ${BASE_URL}/api/checkout
      method: POST
      body: '{"items": [{"id": "123", "qty": 1}]}'
  specs:
    - selector: span[name="OrderService.createOrder"]
      assertions:
        - attr:tracetest.span.duration < 500ms
    - selector: span[name="PaymentService.charge"]
      assertions:
        - attr:rpc.grpc.status_code = 0
    - selector: span[name="InventoryService.reserve"]
      assertions:
        - attr:inventory.reserved = true
```

## When to Use Trace-Based Testing

| Scenario | Why Traces > Traditional |
|----------|------------------------|
| Microservices integration | Validates full request path across boundaries |
| Async workflows | Follows message through queues/events |
| Performance verification | Asserts on span duration, not just response time |
| Error propagation | Verifies correct error context flows downstream |
| Data consistency | Confirms all services see/process correct data |

## Synthetic Monitoring (Production Testing)

Deploy synthetic transactions in production for continuous validation:

```javascript
// Synthetic check: runs every 5 minutes in prod
export async function syntheticCheckout() {
  const response = await fetch(`${PROD_URL}/api/health/checkout`, {
    method: 'POST',
    body: JSON.stringify({ synthetic: true, testCard: 'tok_visa' }),
  });

  // Assert on response
  assert(response.status === 200, 'Checkout health check failed');

  // Assert on trace (via observability platform)
  const trace = await getTrace(response.headers.get('x-trace-id'));
  assert(trace.duration < 2000, 'Checkout too slow in prod');
  assert(trace.spans.every(s => s.status === 'OK'), 'Span errors detected');
}
```

## Integration with Test Strategy

```
Traditional Testing (pre-deploy):
  Unit → Integration → E2E → Performance → Security

Observability-Driven (post-deploy):
  Synthetic monitoring → Trace assertions → SLO verification → Anomaly detection
```

## Key Metrics to Assert On

| Metric | Assertion | Source |
|--------|-----------|--------|
| p99 latency | < SLO threshold | Prometheus/traces |
| Error rate | < 0.1% | Metrics/logs |
| Throughput | Within expected range | Metrics |
| Span duration | < budget per service | Traces |
| Log errors | Zero unexpected patterns | Log aggregator |

## Tools

| Tool | Purpose | Integration |
|------|---------|-------------|
| Tracetest | Trace-based test assertions | OpenTelemetry, CI |
| Checkly | Synthetic monitoring | Playwright-based, alerts |
| Grafana Synthetic | Production health checks | Grafana ecosystem |
| OpenTelemetry | Instrumentation standard | Language SDKs |
| Honeycomb | Trace analysis & querying | OTLP ingest |

## Implementation Pattern

1. **Instrument**: Add OpenTelemetry to all services (traces + metrics)
2. **Baseline**: Collect normal behavior metrics (SLIs)
3. **Assert**: Write trace-based tests for critical paths
4. **Monitor**: Deploy synthetic checks for continuous prod validation
5. **Alert**: SLO breach triggers investigation (not just page)

## Anti-Patterns

- Testing only responses without checking internal flow
- No instrumentation = no observability-driven testing possible
- Synthetic checks that don't match real user behavior
- Alerting on metrics without context (single datapoint)
- Treating observability as replacement for pre-deploy testing (it's additive)
