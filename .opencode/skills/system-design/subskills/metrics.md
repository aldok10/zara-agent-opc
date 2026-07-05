---
type: subskill
title: "Metrics & Instrumentation"
---

# Metrics & Instrumentation

Metrics are cheap, aggregatable time series. Use them for trends, SLIs, and alerting  --  not for per-request debugging (that's traces).

## Methodologies
- **RED** (request-driven services): **R**ate (requests/sec), **E**rrors (error rate), **D**uration (latency histogram).
- **USE** (resources): **U**tilization (% used), **S**aturation (queue depth), **E**rrors (error count).

## Metric types
- **Counter**: monotonic, only goes up (`requests_total`). Rate() it in queries.
- **Gauge**: goes up/down (`connections_active`, `queue_depth`).
- **Histogram**: distribution of observations (`latency_seconds`). Enables percentiles.

## Histograms
- Default OTel buckets fit most cases.
- Custom buckets for specific SLIs, e.g. `[0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]` seconds.
- Percentiles (p95/p99) require histograms  --  averages hide tail latency.

## Cardinality management
Labels multiply time series. 5 labels × 100 values each = 10 billion series = **cost explosion**.
- **Safe labels** (bounded): `method`, `status_code`, `endpoint`.
- **DANGEROUS labels** (unbounded): `user_id`, `request_id`, `trace_id`  --  NEVER on metrics.
- **Rule**: if label values are unbounded, use traces instead.

## Tools
- **Prometheus**: pull-based, PromQL, de facto standard. Great for K8s, self-managed, cost-conscious.
- **Mimir/Cortex**: multi-tenant, horizontally scalable Prometheus. For large-scale, long retention.
- **OpenTelemetry Metrics**: push-based, OTLP, vendor-neutral. Converging with Prometheus ecosystem.

## Dashboards & alerting
- RED dashboard per service, USE dashboard per resource, SLO dashboard for the business.
- Alert on metrics, link to a runbook, include context: which service, which SLI, current value vs threshold.

## Anti-patterns
- High-cardinality labels → runaway costs.
- No histograms (only averages) → p99 issues invisible.
- Alerting on every metric → alert fatigue.
- No dashboard for on-call → slow incident response.
