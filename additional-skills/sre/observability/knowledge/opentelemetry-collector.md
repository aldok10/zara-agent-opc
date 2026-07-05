# OpenTelemetry Collector Architecture

Production-grade OTel Collector deployment patterns for unified telemetry pipelines.

## Deployment Topology

Two-tier architecture is standard in 2026:

- **Agent layer**: DaemonSet on every node, collects host/container metrics and receives application telemetry via OTLP
- **Gateway layer**: Deployment (3+ replicas), performs tail sampling, enrichment, and routing to backends

Agent config is minimal -- forward to gateway. Gateway handles heavy processing.

## Processor Pipeline Order

Order matters. Recommended sequence:

1. `memory_limiter` -- always first, prevents OOM
2. `k8sattributes` -- enriches with pod/namespace/node labels
3. `resource` -- adds static attributes (cluster.name, environment)
4. `transform` -- OTTL statements for field manipulation
5. `filter` -- drop unwanted telemetry (health checks, internal routes)
6. `tail_sampling` -- traces only; keep errors/slow/sample baseline
7. `batch` -- last before export; groups by size (8192) or time (200ms)

## Tail Sampling Configuration

Gateway-only (requires complete traces). Policy chain:

| Policy | Keep Rate | Rationale |
|--------|-----------|-----------|
| status_code: ERROR | 100% | All errors preserved |
| latency > p95 threshold | 100% | Performance outliers |
| rate_limiting (default) | 5% | Baseline representation |

Decision wait: 30s (covers async spans). Expected traces per decision: 50000.

Traces not sampled at gateway get dropped -- never sample at agent for traces.

## Exporters and Backends

Standard backend mapping:

- Metrics: `otlphttp` -> Mimir (Prometheus-compatible)
- Traces: `otlp` -> Tempo (gRPC, faster for high volume)
- Logs: `otlphttp` -> Loki (structured JSON with OTel attributes)
- Profiles: `otlp` -> Pyroscope (continuous profiling)

Use `loadbalancing` exporter between agent and gateway for trace affinity (same trace ID -> same gateway instance for tail sampling).

## Backpressure and Reliability

Queue configuration per exporter:

```
sending_queue:
  enabled: true
  num_consumers: 10
  queue_size: 5000
retry_on_failure:
  enabled: true
  initial_interval: 5s
  max_interval: 30s
  max_elapsed_time: 300s
```

When queue fills: `memory_limiter` triggers `refusal` -> SDK retries. Never lose data silently.

## Resource Limits

Agent (DaemonSet): 200m CPU request, 500m limit; 256Mi memory request, 512Mi limit.
Gateway (Deployment): 1 CPU request, 2 limit; 2Gi memory request, 4Gi limit.

Memory limiter set to 80% of limit (soft) and 90% (hard). Gateway HPA on CPU 70%.

## Connector Pattern (2026)

Connectors link pipelines within a single Collector instance:

- `spanmetrics` connector: generates RED metrics from trace spans (no separate instrumentation)
- `servicegraph` connector: builds service topology from traces
- `count` connector: generates log-based metrics without external tools

This eliminates the need for separate metric generation from traces.

## Health and Monitoring

Collector self-monitoring:

- `service.telemetry.metrics.address: :8888` -- Prometheus metrics about Collector itself
- Key metrics: `otelcol_exporter_sent_spans`, `otelcol_processor_dropped_spans`, `otelcol_receiver_refused_spans`
- Alert on: queue saturation > 80%, dropped spans > 0 sustained, memory limiter triggers

## OpAMP (Open Agent Management Protocol)

Remote Collector management in 2026:

- Config updates pushed without restart (hot-reload)
- Health reporting to central control plane
- Collector fleet inventory and version tracking
- Used by Grafana Alloy and OTel Collector contrib builds

## Anti-Patterns

- Shipping directly from SDK to backend (bypasses sampling, enrichment, and buffering)
- Running gateway as a single replica (single point of failure for all telemetry)
- Using `batch` processor before `filter` (batching unwanted data wastes memory)
- Setting `decision_wait` too low for tail sampling (incomplete traces get wrong decisions)
- Mixing pull (Prometheus scrape) and push (OTLP) without deduplication strategy
