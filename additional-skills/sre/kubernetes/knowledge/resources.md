---
type: fact
title: "Kubernetes Resource Guide"
---

# Kubernetes Resource Guide

## Units
- **CPU**: 1000m = 1 core. 100m = 0.1 core. 250m common for small services.
- **Memory**: Mi (mebibytes), Gi (gibibytes). 256Mi, 512Mi, 1Gi common.

## QoS Classes

| Class | Condition | Behavior |
|-------|-----------|----------|
| Guaranteed | requests = limits (CPU + memory) | Last to be evicted |
| Burstable | requests < limits | Evicted after BestEffort |
| BestEffort | No requests or limits set | First to be evicted |

## Requests vs Limits
- **Requests**: scheduling guarantee (scheduler places pod on node with capacity)
- **Limits**: enforcement ceiling (OOMKill if memory exceeded, CPU throttled)
- Best practice: always set requests, set memory limit, CPU limit optional (throttling can hurt latency)

## Sizing Heuristic
1. Observe actual usage for 7+ days (Prometheus metrics)
2. Set requests = p95 usage + 20% headroom
3. Set memory limit = requests * 1.5 (prevent OOM but allow burst)
4. CPU limit: omit or set generous (throttling worse than burst)

## Guardrails
- `LimitRange`: namespace defaults for pods without explicit resources
- `ResourceQuota`: total resource cap per namespace
- VPA `updateMode: Off` for recommendations without auto-apply
