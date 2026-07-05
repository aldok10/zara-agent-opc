---
type: subskill
title: "Distributed Tracing"
---

# Distributed Tracing

## Core Concepts
- Traces follow a request across service boundaries, showing the full execution path
- Spans represent individual operations within a trace (DB call, HTTP request, queue processing)
- Context propagation: trace ID and span ID passed via headers (W3C Trace Context, B3)
- Sampling strategies: head-based (decide at entry), tail-based (decide after seeing full trace)
- Trace data reveals latency sources, error propagation, and dependency relationships

## Key Practices
- Instrument at service boundaries automatically (HTTP middleware, gRPC interceptors)
- Add semantic attributes to spans: user ID, request type, resource identifier
- Use tail-based sampling in production to capture interesting traces (errors, high latency)
- Set up trace-to-logs and trace-to-metrics correlation via trace ID
- Define SLO-aware alerting: trigger on trace-level latency exceeding service objectives

## Common Mistakes
- Over-sampling in production, creating storage cost and performance overhead
- Missing propagation in async flows (message queues, background jobs)
- Adding too many spans within a service (method-level) creating noise and overhead

## When to Apply
- Debugging latency issues in microservice architectures
- Understanding request flow and dependencies between services
- Building service maps and identifying critical path bottlenecks
