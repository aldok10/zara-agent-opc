---
type: fact
title: "Observability in Distributed Systems"
---

# Observability in Distributed Systems

You can't debug a distributed system with `print` statements. Observability = traces + metrics + logs, correlated.

## Three Pillars

### Distributed Tracing

Follow a request across service boundaries. See where time is spent.

```
Trace: end-to-end journey of a request
Span: one operation within a trace (HTTP call, DB query, queue publish)
Context propagation: pass trace_id + span_id between services

Example trace:
  [API Gateway: 250ms]
    [Orders Service: 180ms]
      [Payment Service: 120ms]
      [Inventory Service: 40ms]
    [Notification Service: 15ms]
```

**OpenTelemetry**: standard SDK for instrumentation. Vendor-neutral. Export to Jaeger, Tempo, Zipkin, Datadog, etc.

### Metrics

Numerical measurements over time. Detect anomalies, set alerts, track trends.

**RED method** (request-driven services):
- Rate: requests per second
- Errors: failed requests per second
- Duration: request latency distribution (p50, p95, p99)

**USE method** (resources):
- Utilization: % of resource capacity used
- Saturation: work queued (waiting)
- Errors: error count on resource

### Structured Logs

Machine-parseable logs with context. Always structured (JSON), never printf.

```json
{
  "timestamp": "2026-01-15T10:30:00Z",
  "level": "error",
  "service": "orders",
  "trace_id": "abc123",
  "span_id": "def456",
  "correlation_id": "req-789",
  "message": "payment failed",
  "error": "timeout after 5s",
  "order_id": "ord-100"
}
```

## Correlation IDs

Single ID propagated through entire request lifecycle. Links all logs, traces, and events.

```
Implementation:
1. Generate at entry point (API gateway or first service)
2. Pass via header: X-Correlation-ID or traceparent (W3C)
3. Include in all log entries
4. Include in all published events (metadata)
5. Include in all downstream HTTP/gRPC calls
6. Store in context (Go: context.Value, Java: MDC, Node: AsyncLocalStorage)
```

**W3C Trace Context**: standard header format. `traceparent: 00-<trace-id>-<span-id>-<flags>`.

## OpenTelemetry (OTel)

Industry standard for instrumentation. Unified API for traces, metrics, logs.

```
Components:
- SDK: instrument application code
- Collector: receive, process, export telemetry data
- Exporters: send to backend (Jaeger, Prometheus, Loki, etc.)
- Auto-instrumentation: automatic spans for HTTP, gRPC, DB, etc.
```

**Collector deployment**:
- Sidecar: one collector per pod (isolation, higher resource use)
- DaemonSet: one collector per node (shared, lower overhead)
- Gateway: centralized collector (easiest to manage, single point of failure)

## Log Aggregation

Centralize logs from all services into one queryable store.

```
Pipeline:
  Service -> stdout/stderr -> Log agent (Fluent Bit) -> Log store (Loki/Elasticsearch)
                                                              |
                                                              v
                                                         Query UI (Grafana/Kibana)
```

**Rules**:
- Always log to stdout (let platform handle routing)
- Structured JSON (not free-form text)
- Include trace_id in every log entry
- Log at boundaries: incoming request, outgoing call, error, business event
- Don't log sensitive data (PII, secrets, tokens)

## Alerting Strategy

Alert on symptoms, not causes. Users care about errors, not CPU.

```
Tiers:
- P1 (page): error rate > 1%, latency p99 > 5s, service fully down
- P2 (ticket): error rate > 0.1%, latency p95 degraded, single instance down
- P3 (dashboard): elevated latency, increased error rate within SLO

SLO-based alerting:
- Define SLO: 99.9% of requests succeed within 500ms
- Alert when error budget is burning too fast
- Multi-window: fast burn (page) vs slow burn (ticket)
```

## Service Dependency Graph

Auto-generated from trace data. Shows:
- Which services call which
- Traffic volume between services
- Error rates per edge
- Latency per edge

Tools: Jaeger service map, Kiali (Istio), Grafana Tempo service graph.

## Anti-Patterns

- **Logging without correlation**: can't follow request across services.
- **Metrics without labels**: can't filter by service, endpoint, status.
- **Tracing everything**: 100% sampling at scale is expensive. Use adaptive sampling.
- **Alert fatigue**: too many alerts = alerts ignored. Be selective.
- **No runbooks**: alert fires but nobody knows what to do. Link runbook to every alert.
