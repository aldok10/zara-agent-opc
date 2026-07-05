---
name: observability
description: "Telemetry pipeline: OpenTelemetry, Grafana LGTM stack, SLO-based alerting, eBPF kernel visibility"
---

# Observability Engineering

Production telemetry with OTel Collector as the universal pipeline, Grafana LGTM stack, and SLO-driven operations.

## Scope

Covers OpenTelemetry instrumentation and Collector architecture, Grafana (Loki, Grafana, Tempo, Mimir) stack operations, SLO definition and burn-rate alerting, eBPF-based kernel telemetry, dashboards-as-code, and cardinality management. Applies RED method for services, USE method for infrastructure.

## First Action

When loaded: check OTel Collector deployment (`kubectl get pods -l app=otel-collector`), verify Grafana datasources, and review existing SLO definitions in monitoring IaC.

## Constraints

1. OTel Collector is the single ingestion point -- no direct SDK-to-backend shipping
2. Tail-based sampling in Collector: keep 100% errors, 100% slow (>p95), 5% baseline
3. RED method mandatory for every service: Rate, Errors, Duration
4. USE method mandatory for every infra component: Utilization, Saturation, Errors
5. SLO burn-rate alerts replace threshold alerts; 14-day rolling window minimum
6. Multi-window alerting: 1h/5% budget + 6h/10% budget for page-worthy events
7. All logs structured JSON with trace_id, span_id, service.name, level fields
8. Trace context (W3C traceparent) propagated across all service boundaries
9. eBPF auto-instrumentation (Grafana Beyla / OTel eBPF) for uninstrumented services
10. Cardinality budget: max 50k active series per service; alert at 80%
11. Dashboards stored as code (Grafana-as-code / Jsonnet); no manual dashboard edits
12. Metric retention: raw 15 days, 5m downsampled 90 days, 1h downsampled 1 year
13. Exemplars link metrics to traces; every latency histogram must have exemplars
14. Alert routing: page (PagerDuty) for SLO burn, ticket (Jira) for anomaly, silent for info
15. Continuous profiling (Grafana Pyroscope, OTel profiling signal) as 4th observability pillar

## DO NOT

1. Ship logs/metrics directly from application to backend (bypass Collector)
2. Use high-cardinality labels (user_id, request_id) on metrics
3. Create alerts on raw thresholds without SLO context
4. Store unsampled traces for more than 72 hours
5. Build dashboards manually in Grafana UI for production views
6. Use pull-based Prometheus scraping as sole collection for ephemeral workloads
7. Deploy observability agents without resource limits (CPU/memory)
8. Ignore Collector pipeline backpressure -- configure queue/retry/drop policies
9. Mix metric naming conventions (snake_case is standard; never camelCase)

## Route to Subskill

| Signal | Subskill | Focus |
|--------|----------|-------|
| Network flow visibility needed | sre-networking | Hubble eBPF flows |
| SLO breach triggers incident | sre-incident-response | Detection, triage |
| GCP Cloud Monitoring integration | sre-gcp | Monitoring API, export |
| Cost of telemetry storage | sre-cost-optimization | Retention, sampling, cardinality |
| Developer onboarding to OTel | sre-platform-engineering | SDK golden path |

## Verification

- [ ] OTel Collector pipeline: logs, metrics, traces all flowing to backends
- [ ] Tail-based sampling configured with error/latency rules
- [ ] SLOs defined for all critical services (availability + latency)
- [ ] Burn-rate alerts firing correctly (test with synthetic error injection)
- [ ] Dashboards load from version-controlled source (no manual edits)
- [ ] Cardinality report shows all services under 50k series budget
- [ ] Trace-to-log correlation working (click trace -> see logs)
- [ ] eBPF instrumentation covering non-SDK services

## Knowledge

- knowledge/otel-collector-pipelines.md
- knowledge/slo-burn-rate-alerting.md
- knowledge/grafana-lgtm-architecture.md
- knowledge/ebpf-auto-instrumentation.md
- knowledge/cardinality-control-patterns.md

## AI-Era Context (2026)

- OpenTelemetry is the CNCF standard; vendor-specific agents deprecated industry-wide
- Grafana Beyla (eBPF) provides zero-code HTTP/gRPC metrics and traces
- OTel Collector supports profiling signal (logs/metrics/traces/profiles unified)
- Mimir + Tempo correlation enables metrics-to-traces without exemplar gaps
- AI/ML inference workloads require GPU utilization metrics via DCGM exporter
- Adaptive sampling algorithms replace static rate configs in OTel Collector 1.0+
- SLO-as-code tools (sloth, pyrra) generate multi-window alerts from YAML specs

## Related Skills

- sre-incident-response
- sre-networking
- sre-gcp
- sre-cost-optimization
