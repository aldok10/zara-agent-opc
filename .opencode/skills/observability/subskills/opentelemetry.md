# OpenTelemetry Instrumentation

OpenTelemetry (OTel) is the vendor-neutral observability standard, unifying traces, metrics, and logs under one framework and wire protocol (OTLP).

## Architecture
SDK (in your app) → Exporter → **Collector** (agent/gateway) → Backend (Jaeger, Prometheus, Loki, Grafana Cloud, Datadog).

## Auto-instrumentation (start here)
Automatic spans for HTTP, gRPC, DB, Redis, message queues. Zero code.
- **Go**: `otelhttp`, `otelgrpc`, `otelsql`.
- **Python**: `opentelemetry-instrumentation-*` packages.
- **TypeScript**: `@opentelemetry/auto-instrumentations-node`.
- **PHP**: `opentelemetry-auto-*` packages.

## Manual instrumentation
Custom spans for business logic: `tracer.Start(ctx, "process-payment")`. Add when auto-instrumentation isn't enough.

## OTel Collector
Deployed as sidecar or gateway. Receives telemetry → processes → exports to backends.
- **Receivers**: OTLP (standard), Prometheus (scrape), Jaeger, Zipkin.
- **Processors**: `batch` (reduce API calls), `filter` (drop noisy spans), `tail_sampling` (keep errors), `transform` (add/remove attributes).
- **Exporters**: OTLP (Grafana, Honeycomb), Prometheus (metrics), Jaeger, Loki.

## Resource attributes
Set ONCE at startup: `service.name`, `service.version`, `deployment.environment`, `host.name`. Without these you can't identify which service emitted what.

## Context propagation
Automatic in most frameworks. Manual for: queue messages (inject trace context into message headers), background jobs, cross-process communication.

## Baggage
Key-value pairs propagated across ALL services in a request. Use for: A/B test variant, tenant ID, feature flags. **WARNING**: visible to every downstream service — never put secrets in baggage.

## SDK configuration
Via environment variables: `OTEL_SERVICE_NAME`, `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_TRACES_SAMPLER`.

## Anti-patterns
- No collector (SDK exports directly to backend) → tight coupling, no central control.
- No resource attributes → can't identify service.
- No batch processor → overwhelms backend.
- Tracing everything without sampling → cost explosion.
