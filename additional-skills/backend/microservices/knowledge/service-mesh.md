---
type: fact
title: "Service Mesh - Istio, Linkerd, mTLS, Traffic Management"
---

# Service Mesh

A service mesh is a dedicated infrastructure layer that handles service-to-service communication, providing observability, security, and traffic control without application code changes.

## Architecture Models

### Sidecar Proxy (Traditional)

- Each pod gets an Envoy/linkerd-proxy sidecar container
- Intercepts all inbound/outbound traffic transparently
- Pros: per-pod policy, proven model, broad adoption
- Cons: resource overhead (~50MB RAM per sidecar), latency per hop, operational complexity

### Ambient Mesh (Istio v1.18+)

- Shared ztunnel (zero-trust tunnel) per node handles L4
- Waypoint proxies (per-namespace/service) handle L7 when needed
- Pros: lower resource footprint, simpler sidecar-free deployments
- Cons: newer, fewer production case studies, L7 still needs waypoint

## Istio

### Core Resources

| Resource | Purpose |
|----------|---------|
| VirtualService | Route rules: retries, timeouts, fault injection, traffic splitting |
| DestinationRule | Load balancing, connection pools, outlier detection, TLS settings |
| Gateway | Ingress/egress entry points |
| AuthorizationPolicy | L7 access control (allow/deny per path, method, source) |
| PeerAuthentication | mTLS mode per namespace/workload (STRICT, PERMISSIVE, DISABLE) |
| RequestAuthentication | JWT validation at mesh edge |

### Traffic Management Patterns

**Canary releases:**
```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
spec:
  http:
    - route:
        - destination:
            host: my-service
            subset: v1
          weight: 90
        - destination:
            host: my-service
            subset: v2
          weight: 10
```

**Traffic mirroring:** send a copy of live traffic to a new version without affecting responses.

**Fault injection:** inject delays or HTTP errors to test resilience:
```yaml
fault:
  delay:
    percentage:
      value: 5
    fixedDelay: 3s
  abort:
    percentage:
      value: 1
    httpStatus: 503
```

## Linkerd

- Written in Rust (linkerd2-proxy) — smaller footprint than Envoy
- Simpler operational model: fewer CRDs, opinionated defaults
- Automatic mTLS with no configuration (identity system built-in)
- Service profiles for per-route metrics and retries
- No built-in ingress gateway — pairs with existing ingress controllers
- Best for: teams wanting mesh benefits without Istio's complexity

## mTLS Automation

Both Istio and Linkerd automate certificate lifecycle:

1. Mesh CA issues short-lived certificates (24h default in Istio)
2. Sidecars/ztunnels negotiate mTLS on every connection
3. Certificate rotation happens transparently
4. SPIFFE identity format: `spiffe://cluster.local/ns/{namespace}/sa/{service-account}`

Benefits: encrypt all east-west traffic, identity-based access control, no manual cert management.

## Observability Integration

Service meshes provide "free" telemetry without code instrumentation:

- **Metrics:** request rate, error rate, latency (RED) per service pair
- **Distributed tracing:** automatic span creation at proxy level (needs header propagation in app)
- **Access logs:** structured logs with source/destination identity
- **Service graph:** auto-generated topology map from observed traffic

Integrations: Prometheus, Grafana, Jaeger/Zipkin, Kiali (Istio dashboard).

## When to Use

**Good fit:**
- 10+ services with complex inter-service communication
- Regulatory requirement for encryption in transit
- Need canary/progressive delivery without app changes
- Multi-team environments needing consistent policies
- Zero-trust networking requirements

**Overkill / avoid when:**
- < 5 services (use simple retries + client-side load balancing)
- Team lacks Kubernetes operational maturity
- Latency budget is extremely tight (each hop adds ~1-3ms)
- Simple request patterns with no cross-cutting policy needs
- Monolith or monolith + few satellites architecture

## Key Decisions

| Decision | Guidance |
|----------|----------|
| Istio vs Linkerd | Istio for full control + advanced policies; Linkerd for simplicity + lower overhead |
| Sidecar vs Ambient | Ambient if on Istio 1.22+, lower resource needs, and L4 suffices for most traffic |
| mTLS mode | Start PERMISSIVE (allows plaintext), move to STRICT per-namespace after verifying |
| Retry budget | Cap at 20% additional load to prevent retry storms |
