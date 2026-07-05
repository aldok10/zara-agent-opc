---
type: subskill
title: "Observability-First Debugging"
---

# Observability-First Debugging

## When to Load

"I have metrics/traces/logs available" -- start with telemetry data, not code reading.

## Principle

Telemetry tells you WHERE the problem is. Code tells you WHY. Always start with where.

## Workflow

1. **Define the symptom** in observable terms (latency p99 > 500ms, error rate > 1%, specific trace ID failing)
2. **Check dashboards** for anomalies: when did it start? Correlate with deploys, config changes, traffic shifts
3. **Find the trace** -- locate a failing request's distributed trace
4. **Identify the slow/failing span** -- which service, which operation, what duration?
5. **Correlate span to code** -- use span attributes (service, operation, file/line if instrumented)
6. **Read THAT code** -- now you know exactly where to look
7. **Form hypothesis and verify** -- add a targeted log/metric if needed, reproduce

## OpenTelemetry Trace Analysis

### Reading a trace

- Root span = entry point (usually HTTP handler or message consumer)
- Child spans = downstream calls (DB queries, HTTP clients, queue publishes)
- Look for: gaps (missing instrumentation), long spans (bottleneck), error status codes

### Key attributes to check

- `http.status_code`, `rpc.grpc.status_code` -- error classification
- `db.statement` -- slow or incorrect query
- `exception.message`, `exception.stacktrace` -- error details on span events
- Custom attributes your team added (user ID, tenant, feature flag)

### Correlating trace to code

```
Span: POST /api/orders -> orderService.createOrder
  Attributes: service.name=order-svc, code.function=createOrder, code.filepath=src/orders/service.ts:47
  Duration: 2.3s
  Child spans:
    - db.query (INSERT INTO orders) -- 50ms
    - http.client (POST payment-svc/charge) -- 2.1s  <-- bottleneck
```

The trace tells you: payment service is slow. Go read payment-svc, not order-svc.

## Patterns

### Anomaly Detection

- Compare current metrics to baseline (same hour last week, rolling 7-day average)
- Spike in error rate + no deploy = external dependency issue or data-driven bug
- Gradual degradation = resource exhaustion (memory leak, connection pool, disk)

### Baseline Comparison

- Always compare to a known-good window, not absolute thresholds
- Use percentile comparison (p50/p95/p99), not averages
- Check both latency AND throughput -- latency can drop if requests are being rejected

## Anti-Patterns

- Reading code first when traces are available (wastes time guessing)
- Trusting a single metric without cross-referencing (could be measurement artifact)
- Ignoring the timeline (when did it start? what changed?)
- Adding log statements before checking existing telemetry

## Tools

- Jaeger/Tempo/Honeycomb for trace visualization
- Grafana/Datadog for metric dashboards
- Structured log search (Loki, CloudWatch Insights, Kibana)
- `otel-cli` for ad-hoc span creation during investigation
