---
type: fact
title: "OpenTelemetry Patterns"
---

# OpenTelemetry Patterns

Vendor-neutral observability framework: traces, metrics, and logs with unified context propagation.

## Auto-Instrumentation

Zero-code instrumentation for common libraries:

### Language Support

| Language | Mechanism | Coverage |
|----------|-----------|----------|
| Java | Java agent (javaagent JAR) | HTTP, gRPC, JDBC, messaging |
| Python | `opentelemetry-instrument` wrapper | Flask, Django, requests, SQLAlchemy |
| Node.js | `@opentelemetry/auto-instrumentations-node` | Express, HTTP, pg, redis |
| Go | Compile-time instrumentation (manual or eBPF) | net/http, gRPC, database/sql |
| .NET | .NET agent or startup hook | ASP.NET Core, HttpClient, EF Core |

### Configuration (Environment Variables)

```bash
OTEL_SERVICE_NAME=payment-api
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317
OTEL_TRACES_SAMPLER=parentbased_traceidratio
OTEL_TRACES_SAMPLER_ARG=0.1
OTEL_RESOURCE_ATTRIBUTES=deployment.environment=production,service.version=2.1.0
```

### When to Add Manual Instrumentation

Auto-instrumentation captures framework-level spans. Add manual spans for:
- Business logic operations (order processing, payment validation)
- Internal function calls that are performance-critical
- Custom attributes with domain context (user_id, order_value, plan_tier)

## Collector Pipeline

The OTel Collector is the central processing hub:

### Architecture

```
[App + SDK] → [Collector Agent (per-node)] → [Collector Gateway (cluster)] → [Backend]
```

### Pipeline Components

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
  attributes:
    actions:
      - key: environment
        value: production
        action: upsert

exporters:
  otlp/tempo:
    endpoint: tempo:4317
  prometheus:
    endpoint: 0.0.0.0:8889

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlp/tempo]
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [prometheus]
```

### Deployment Patterns

| Pattern | When | Benefit |
|---------|------|---------|
| Agent (DaemonSet) | Per-node collection | Low latency, local buffering |
| Sidecar | Per-pod isolation needed | Tenant isolation, custom config |
| Gateway | Central processing | Single point for sampling, routing |
| Agent + Gateway | Production at scale | Best of both: local buffering + central control |

## Sampling Strategies

Full collection is expensive at scale. Sampling reduces volume while preserving signal.

### Head Sampling (at trace start)

- **TraceIdRatio**: sample X% of traces deterministically by trace ID
- **ParentBased**: respect parent's sampling decision (consistent across services)
- **RuleBased**: sample 100% of errors, 10% of success (custom sampler)

### Tail Sampling (at collector, after trace completes)

```yaml
processors:
  tail_sampling:
    decision_wait: 10s
    policies:
      - name: errors
        type: status_code
        status_code: {status_codes: [ERROR]}
      - name: slow-traces
        type: latency
        latency: {threshold_ms: 2000}
      - name: baseline
        type: probabilistic
        probabilistic: {sampling_percentage: 5}
```

**Trade-offs:**
- Head sampling: low overhead, but misses interesting traces that become interesting later
- Tail sampling: captures all important traces, but requires buffering complete traces (memory-intensive)

### Recommended Approach

- Production: tail sampling at gateway collector (keep errors + slow + 5% baseline)
- Staging: 100% sampling (full visibility, lower volume)
- Development: 100% sampling with short retention

## Baggage (Cross-Service Context)

Propagate arbitrary key-value pairs across service boundaries:

```go
// Set baggage in upstream service
bag, _ := baggage.Parse("user_id=abc123,plan=enterprise")
ctx = baggage.ContextWithBaggage(ctx, bag)

// Read baggage in downstream service
bag := baggage.FromContext(ctx)
userId := bag.Member("user_id").Value()
```

### Use Cases

- Tenant ID for multi-tenant routing and attribution
- Feature flag context for A/B test correlation
- Request priority for downstream throttling decisions
- Debug flags ("trace this request at full verbosity")

### Caution

- Baggage travels with every request (bandwidth cost)
- Sensitive data in baggage crosses trust boundaries
- Keep baggage entries small and limited (< 10 entries, short values)

## Resource Attributes

Identify the source of telemetry:

```yaml
resource:
  attributes:
    service.name: payment-api
    service.version: 2.1.0
    service.namespace: payments
    deployment.environment: production
    host.name: ${HOSTNAME}
    cloud.provider: aws
    cloud.region: us-east-1
    k8s.pod.name: ${POD_NAME}
    k8s.namespace.name: ${NAMESPACE}
```

Standard attributes (semantic conventions) enable cross-service correlation and backend features.

## Common Pitfalls

- Missing `memory_limiter` processor (collector OOMs under load)
- Batch processor timeout too low (excessive export calls)
- Not setting `OTEL_SERVICE_NAME` (telemetry shows as "unknown_service")
- Sampling decisions inconsistent across services (broken traces)
- Exporting directly to backend without collector (no buffering, no processing)
- Baggage containing PII crossing service boundaries (privacy violation)
- Auto-instrumentation generating too many low-value spans (database connection pool internals)
