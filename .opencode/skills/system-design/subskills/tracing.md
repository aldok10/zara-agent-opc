---
type: subskill
title: "Distributed Tracing"
---

# Distributed Tracing

Traces capture the end-to-end journey of a request across services. Each hop is a **span**; spans form a tree (parent-child). A trace is only as good as its weakest propagation link.

## Propagation
- **W3C TraceContext**: standard headers `traceparent` + `tracestate`. Every service MUST propagate them, inbound and outbound.
- **Automatic**: HTTP middleware, gRPC interceptors handle propagation transparently.
- **Manual**: queue messages, async jobs, cross-process boundaries. Inject/extract context explicitly.
- Broken propagation = disconnected spans = blind spot. This is the #1 tracing failure.

## Span design
- **Naming**: `<service>.<operation>` or `HTTP <method> <route>`. Consistent naming makes traces searchable.
- **Attributes**: `http.method`, `http.status_code`, `db.system`, `db.statement` (sanitized!), `rpc.service`, plus custom business attributes.
- **Kinds**: CLIENT (outgoing call), SERVER (incoming request), PRODUCER (async send), CONSUMER (async receive), INTERNAL (local work).

## Sampling strategies
- **Head-based**: decide at trace start (probabilistic %). Simple, predictable cost. Misses rare errors.
- **Tail-based**: decide after trace completes. Keep 100% of errors + slow traces, sample successes. Better signal, complex to run. Use OTel Collector `tail_sampling` processor.
- **Adaptive**: raise sample rate when errors spike. Best of both worlds.

## Correlation
- Inject `trace_id` into every log line. Every log becomes findable from a trace and vice versa.
- Propagate correlation IDs through async boundaries so queue consumers stay linked.

## Tools
- **Jaeger**: classic, easy self-host.
- **Tempo**: Grafana, S3-backed, cheap at scale.
- **Honeycomb**: query-first, high-cardinality analysis.
- **Zipkin**: simple, lightweight.
- **Datadog APM**: commercial, integrated.

## Numbers
- Target **<5% overhead** from tracing instrumentation.
- Tail sampling at the Collector keeps storage manageable while preserving all error traces.

## Anti-patterns
- No propagation → disconnected, useless spans.
- High-cardinality span names (unique per request) → unsearchable, storage blowup.
- Tracing everything without sampling → cost explosion.
- No correlation IDs → can't jump between traces and logs.
