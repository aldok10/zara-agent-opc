---
type: subskill
title: "Reliability: Fault Tolerance & Resilience Patterns"
---

# Reliability: Fault Tolerance & Resilience Patterns

Deep-dive reference for building systems that degrade gracefully instead of collapsing.

## Circuit Breaker

States: **closed** (normal) → **open** (fail fast after failure threshold) → **half-open** (probe with limited traffic, close if healthy). Prevents hammering a dying dependency and cascading failure. Configure: failure threshold, open duration, probe count. Libraries: resilience4j, Polly, Hystrix (legacy).

## Retry with Exponential Backoff

`delay = base * 2^attempt + jitter`. Cap max retries and max delay. **Jitter is essential**  --  without it, all clients retry in sync and create a thundering herd. **Only retry idempotent operations** (or use idempotency keys). Never retry on 4xx client errors.

## Timeout Budget

Allocate a total request budget across the call chain. Each hop gets a slice; if upstream has 100ms left, downstream call can't wait 500ms. **Propagate deadlines** and cancel downstream work when the caller has already given up. No timeout = hang forever.

## Bulkhead

Isolate resources so one failure can't sink the ship. Separate **thread pools / connection pools per dependency**. If service X gets slow, it exhausts only its own pool, not the shared one that also serves healthy services Y and Z.

## Fallback

Return a degraded-but-functional response when a dependency fails: cached/stale data, sensible defaults, simplified computation, or a partial result. Better a slightly stale feed than an error page.

## Health Checks

- **Liveness**: is the process alive? Fail → restart the container.
- **Readiness**: can it serve traffic right now (deps connected, warmed up)? Fail → remove from load balancer, don't restart.

K8s uses both. Don't conflate them  --  a readiness blip shouldn't trigger a restart.

## Graceful Degradation

Shed non-critical features under load  --  turn off recommendations, disable expensive analytics, serve cached results. Drive with **feature flags + load shedding** (reject low-priority requests first).

## Chaos Engineering

Deliberately inject failures (kill instances, add latency, drop packets) to find weaknesses before they find you. **Start small**  --  one service in staging  --  then expand to prod with guardrails. Tools: Chaos Monkey, Gremlin, Litmus.

## Idempotency

Every operation should be safe to retry. Naturally idempotent: GET, PUT, DELETE. For non-idempotent ops (payments, order creation) use **idempotency keys**  --  client sends a unique key, server dedups.

## Blast Radius Containment

- **Cell-based architecture**: partition users into isolated cells; a failure hits one cell, not all.
- **Regional isolation**: contain failures to a region.
- **Canary deploys**: **1% → 10% → 100%**, watch metrics, auto-rollback on regression.

## SLO-Driven Reliability

Define an **error budget** (e.g., 99.9% = 43 min/month downtime). Alert on **burn rate** (fast burn = page now, slow burn = ticket). When budget is exhausted, **freeze feature launches** and focus on reliability.

## Anti-Patterns

- **Retry storms**: retries amplify load on an already-struggling system (no backoff/jitter/circuit breaker).
- **No timeout**: threads hang forever, pool exhausts, cascade.
- **Single point of failure**: one node/DB/region with no redundancy.
- **No fallback**: any dependency hiccup = full outage.
