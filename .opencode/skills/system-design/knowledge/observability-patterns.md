# Observability Patterns

Monitoring, tracing, logging, and alerting for distributed systems.

## Beyond Three Pillars

The "three pillars" framing (logs, metrics, traces) is misleading because it implies they're independent. In practice, they're interconnected signals that must correlate:

- A trace contains spans. Spans generate metrics (duration, error rate). Spans link to log entries via trace ID.
- An alert fires on a metric. Investigation starts with the metric, drills into traces for that time window, then reads logs for specific spans.
- Correlation is the actual value. Isolated signals are just data.

### Signals taxonomy

| Signal | Cardinality | Retention | Cost model |
|--------|-------------|-----------|------------|
| Metrics | Low (aggregated) | Long (months) | Per time-series |
| Logs | High (per event) | Medium (weeks) | Per GB ingested |
| Traces | Medium (sampled) | Short (days) | Per span |
| Profiles | Low | Short | Per profile |
| Events | Medium | Medium | Per event |

## OpenTelemetry

Vendor-neutral observability framework. The standard for instrumentation.

### Components

| Component | Role |
|-----------|------|
| SDK | Instrument application code (auto + manual) |
| API | Stable interface for creating signals |
| Collector | Receive, process, export telemetry |
| OTLP | Wire protocol (gRPC + HTTP/protobuf) |
| Semantic Conventions | Standardized attribute names |

### SDK setup (Node.js example)

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({ url: 'http://collector:4317' }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({ url: 'http://collector:4317' }),
  }),
  instrumentations: [getNodeAutoInstrumentations()],
  serviceName: 'payment-service',
});

sdk.start();
```

### Collector pipeline

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 5s
    send_batch_size: 1024
  memory_limiter:
    check_interval: 1s
    limit_mib: 512
  tail_sampling:
    policies:
      - name: errors
        type: status_code
        status_code: { status_codes: [ERROR] }
      - name: slow
        type: latency
        latency: { threshold_ms: 1000 }
      - name: probabilistic
        type: probabilistic
        probabilistic: { sampling_percentage: 10 }

exporters:
  otlp/tempo:
    endpoint: tempo:4317
    tls:
      insecure: true
  prometheusremotewrite:
    endpoint: http://mimir:9009/api/v1/push
  loki:
    endpoint: http://loki:3100/loki/api/v1/push

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, tail_sampling, batch]
      exporters: [otlp/tempo]
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [prometheusremotewrite]
```

### Semantic conventions

Standardized attribute names across all services:

| Attribute | Example |
|-----------|---------|
| `service.name` | `payment-service` |
| `service.version` | `1.2.3` |
| `http.request.method` | `POST` |
| `http.response.status_code` | `200` |
| `db.system` | `postgresql` |
| `db.operation.name` | `SELECT` |
| `messaging.system` | `kafka` |

Use conventions consistently. Custom attributes use reverse-domain notation: `com.company.custom_attr`.

## Grafana LGTM Stack

| Tool | Signal | Storage |
|------|--------|---------|
| **L**oki | Logs | Label-indexed, chunks in object storage |
| **G**rafana | Visualization | Dashboards, alerting, correlation |
| **T**empo | Traces | Object storage, no index required |
| **M**imir | Metrics | Prometheus-compatible, horizontally scaled |

### Why this stack

- Open-source (AGPLv3 for Grafana, Apache 2.0 for others).
- Horizontally scalable (microservices mode).
- Object storage backend (S3/GCS/MinIO) -- cheap at scale.
- Native correlation between signals in Grafana UI.
- Compatible with existing Prometheus/Loki/Jaeger tooling.

### Loki design philosophy

- Index labels only, not log content (unlike Elasticsearch).
- Cheap to operate (no full-text indexing).
- LogQL for querying: `{service="payment"} |= "error" | json | status >= 500`.
- Tradeoff: complex queries are slower than Elasticsearch.

### Tempo design philosophy

- No index at all. Search by trace ID directly in object storage.
- TraceQL for search: `{span.http.status_code >= 500 && duration > 1s}`.
- Cheap storage, slower search (tradeoff vs Jaeger).

## SLOs (Service Level Objectives)

### Specification

| Term | Definition | Example |
|------|-----------|---------|
| SLI | Measurable indicator of service health | 99.5% of requests < 200ms |
| SLO | Target value for an SLI | 99.9% availability over 30 days |
| Error budget | Allowed failure (1 - SLO) | 0.1% = 43.2 min/month downtime |
| SLA | Contractual commitment (business) | 99.95% with financial penalty |

### Choosing SLIs

Good SLIs measure user-facing behavior:
- **Availability**: successful responses / total responses
- **Latency**: % of requests faster than threshold
- **Correctness**: % of responses with correct data
- **Freshness**: % of data updated within threshold

Bad SLIs: CPU usage, memory, internal queue depth (symptoms, not user impact).

### Error budgets

```
Monthly error budget at 99.9% SLO = 0.1% * 30 days * 24 hours * 60 min = 43.2 minutes

Current burn: 15 minutes consumed, 28.2 remaining.
```

When budget is exhausted: freeze deployments, focus on reliability work.

### Burn-rate alerts

Standard alert: "SLO violated" fires too late (month end).

Burn-rate alert: "at current error rate, you'll exhaust the budget in X hours."

Multi-window burn rate (Google SRE approach):

| Alert | Burn rate | Long window | Short window | Action |
|-------|-----------|-------------|--------------|--------|
| Page | 14.4x | 1h | 5min | Wake someone up |
| Page | 6x | 6h | 30min | Urgent investigation |
| Ticket | 3x | 1d | 2h | Fix this week |
| Ticket | 1x | 3d | 6h | Track and address |

Both windows must be burning for the alert to fire (reduces false positives).

## Structured Logging

### JSON logs

```json
{
  "timestamp": "2024-03-15T10:30:00.123Z",
  "level": "error",
  "message": "payment processing failed",
  "service": "payment-service",
  "trace_id": "abc123def456",
  "span_id": "789ghi",
  "user_id": "usr_12345",
  "payment_id": "pay_67890",
  "error": "insufficient_funds",
  "duration_ms": 234
}
```

### Correlation IDs

Every request gets a unique ID propagated through all services:

```
X-Request-ID: req_abc123
```

Log it in every service. Link to trace ID. Enables: "show me all logs for this user's failed checkout."

### Log levels

| Level | Use |
|-------|-----|
| ERROR | Actionable failure requiring attention |
| WARN | Degraded state, not yet failing |
| INFO | Significant business events (order placed, user signed up) |
| DEBUG | Detailed technical flow (disabled in production) |

Rule: if you wouldn't investigate an ERROR log at 3am, it's not an ERROR.

## Distributed Tracing

### Context propagation

W3C Trace Context standard: `traceparent` header propagated across service boundaries.

```
traceparent: 00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01
             version-trace_id-parent_id-flags
```

All services extract and inject this header. OTel SDKs handle this automatically.

### Sampling strategies

| Strategy | Description | When to use |
|----------|-------------|-------------|
| Head sampling | Decide at trace start (fixed %) | Low overhead, misses interesting traces |
| Tail sampling | Decide after trace completes | Catches errors/slow, requires collector buffer |
| Priority sampling | Always sample errors/high-priority | Critical path visibility |
| Rate limiting | N traces per second per service | Cost control |

Tail sampling in the OTel Collector is the best balance: keep all errors and slow traces, sample N% of healthy ones.

## Cost Management

Observability costs grow with traffic. Control without losing visibility.

### Tail sampling (traces)

Keep: all errors, all slow requests, N% of everything else. Reduces trace volume 10-50x with minimal signal loss.

### Metrics cardinality control

High-cardinality labels (user ID, request ID) create millions of time-series:

- Never use unbounded values as metric labels.
- Use histograms for latency (not per-request metrics).
- Drop unused labels in the collector.
- Set cardinality limits in Mimir/Prometheus.

### Log volume management

- Sample verbose logs (DEBUG/INFO) at the collector level.
- Drop known-noisy log lines via Loki pipeline stages.
- Set per-tenant ingestion limits.
- Use log-to-metric conversion for high-volume patterns (count errors, don't store each log).

### Cost heuristics

- Traces: $2-5 per million spans (cloud providers).
- Logs: $0.50-2 per GB ingested.
- Metrics: $0.10-0.30 per active time-series per month.

Self-hosted LGTM stack on object storage: 5-10x cheaper than cloud observability platforms at scale.

## Alerting: Symptoms vs Causes

### Symptom-based (preferred)

Alert on what users experience:
- Error rate > threshold
- Latency p99 > SLO
- Availability below target

### Cause-based (supplement only)

Alert on infrastructure issues that will cause symptoms:
- Disk > 90% full
- Certificate expires in < 7 days
- Connection pool exhausted

### Anti-patterns

- Alerting on every 5xx (alert on error *rate*).
- CPU > 80% (meaningless without impact).
- Too many alerts (alert fatigue = all alerts ignored).
- No runbook linked to alert (responder doesn't know what to do).

### Alert hygiene

1. Every alert has a runbook link.
2. If an alert fires and no action is taken 3 times: delete it.
3. Review alert volume monthly. Target: < 5 pages per on-call rotation.
4. Alerts should be actionable, not informational. Use dashboards for awareness.
