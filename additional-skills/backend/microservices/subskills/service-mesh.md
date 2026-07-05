---
type: subskill
title: "Service Mesh"
---

# Service Mesh

Infrastructure layer handling service-to-service communication. Moves networking concerns (mTLS, retries, circuit breaking, observability) from application code to infrastructure.

## Core Concepts

- **Data Plane**: sidecar proxies (Envoy) deployed alongside each service. Handle all network traffic.
- **Control Plane**: configuration brain (Istio/Linkerd). Pushes policy to sidecars.
- **Sidecar**: proxy container/process co-located with service. Intercepts all inbound/outbound traffic.
- **mTLS**: mutual TLS between all services. Zero-trust networking without app code changes.

## Sidecar Proxy (Envoy)

Envoy is the de-facto data plane proxy. Each service pod gets an Envoy sidecar.

```
[Service A] <-> [Envoy Proxy] <--mTLS--> [Envoy Proxy] <-> [Service B]
```

Envoy handles:
- TLS termination and origination
- Load balancing (round-robin, least connections, ring hash)
- Circuit breaking and outlier detection
- Retry with budget and backoff
- Rate limiting
- Request/response transformation
- Observability (metrics, traces, access logs)

## mTLS (Mutual TLS)

Service mesh provides automatic mTLS between all services:

1. Control plane issues short-lived certificates (SPIFFE identity)
2. Sidecars rotate certificates automatically
3. All service-to-service traffic encrypted
4. Identity-based authorization (not just network-based)
5. No application code changes needed

**Zero trust**: even within the cluster, all traffic is encrypted and authenticated.

## Traffic Management

### Routing

- **Path-based**: `/api/v1/orders` -> orders-service
- **Header-based**: `x-version: canary` -> canary deployment
- **Weight-based**: 90% stable, 10% canary (traffic splitting)

### Deployment Strategies

- **Canary**: route small % to new version, monitor, increase gradually.
- **Blue-green**: two full deployments, switch traffic instantly.
- **A/B testing**: route by user segment (header/cookie).
- **Shadow/mirroring**: duplicate traffic to new version without affecting responses.

### Resilience at Mesh Level

```yaml
# Istio VirtualService example
retries:
  attempts: 3
  perTryTimeout: 2s
  retryOn: "5xx,reset,connect-failure"
timeout: 10s
outlierDetection:
  consecutive5xxErrors: 5
  interval: 30s
  baseEjectionTime: 30s
```

## Observability

Service mesh provides observability without instrumentation:

- **Metrics**: request rate, error rate, latency (RED/USE) per service pair.
- **Distributed tracing**: automatic span creation for mesh-managed calls.
- **Access logs**: structured logs for every request with timing and status.
- **Service graph**: automatic topology visualization from traffic.

## Istio vs Linkerd

| Factor | Istio | Linkerd |
|--------|-------|---------|
| Complexity | High | Low |
| Features | Full (traffic, security, observability) | Focused (reliability, observability) |
| Resource usage | Higher | Lower (Rust proxy) |
| Learning curve | Steep | Gentle |
| mTLS | Yes | Yes |
| Multi-cluster | Yes | Yes (simpler) |
| Protocol support | HTTP, gRPC, TCP | HTTP, gRPC, TCP |
| Sidecar-free mode | Yes (ambient mode, GA 2024) | No (uses native K8s sidecars) |

**Choose Istio**: need advanced traffic management, multi-cluster, custom extensions.
**Choose Linkerd**: want simplicity, lower resource footprint, faster adoption.

## When to Use

**Good fit**: >10 services, need mTLS everywhere, want infrastructure-level resilience, multiple teams deploying independently, Kubernetes-native.

**Bad fit**: <5 services (overhead not justified), non-Kubernetes, team can't operate mesh, simple communication patterns.

## Without Full Mesh

For smaller deployments, consider:
- **Library-based**: resilience in code (Go: go-kit, Java: Resilience4j)
- **API gateway only**: gateway handles external traffic, internal is direct
- **Ambient mesh**: Istio ambient mode (GA in Istio 1.24, Nov 2024). Uses per-node ztunnel (L4) + optional waypoint proxies (L7). No sidecar injection required.

## Anti-Patterns

- **Mesh as silver bullet**: mesh handles transport, not business logic. Sagas still needed.
- **Ignoring resource cost**: sidecars add memory/CPU per pod. Budget for it.
- **No gradual rollout**: adopt mesh incrementally (namespace by namespace).
- **Skipping mTLS**: if you have a mesh but disabled mTLS, you're missing the primary benefit.
- **Over-configuring**: start with defaults, tune only what metrics show needs tuning.

## Verification

- mTLS enforced: plain HTTP between services is rejected.
- Circuit breaker ejects unhealthy upstream after threshold.
- Canary routing sends correct % of traffic (verify with metrics).
- Retry budget prevents retry storms (total retries bounded).
- Mesh control plane failure doesn't break data plane (last-known-good config).
