# Service Mesh Patterns

Comparison of service mesh architectures, mTLS implementations, and traffic management patterns for 2026 Kubernetes environments.

## Architecture Comparison

### Cilium Service Mesh (Sidecar-Free)

- eBPF dataplane handles L3/L4; per-node Envoy for L7
- Identity via eBPF numeric labels; mTLS via WireGuard or SPIFFE
- Resource cost: one Envoy per node (~200MB) vs one per pod
- Startup latency: zero (no sidecar injection)
- Best for: Kubernetes-native shops using Cilium as CNI

### Istio (Sidecar or Ambient)

- **Sidecar mode**: Envoy per pod, full feature set, high resource overhead
- **Ambient mode** (GA in 2025): ztunnel (L4 per-node) + waypoint proxy (L7 per-service)
- Identity: SPIFFE SVIDs issued by istiod CA
- Best for: multi-cluster, multi-cloud, heterogeneous environments

### Linkerd

- Rust-based micro-proxy (linkerd2-proxy), minimal resource footprint
- Sidecar model only, no sidecar-free option
- mTLS automatic with identity from trust anchor
- Best for: teams wanting simplicity over configurability

## Feature Matrix (2026)

| Feature | Cilium Mesh | Istio Ambient | Linkerd |
|---------|------------|---------------|---------|
| mTLS | WireGuard/SPIFFE | SPIFFE (ztunnel) | Auto (trust anchor) |
| L7 Policy | CiliumEnvoyConfig | AuthorizationPolicy | Server/HTTPRoute |
| Traffic Split | CiliumEnvoyConfig | VirtualService | TrafficSplit |
| Retries | Yes | Yes | Yes |
| Circuit Breaking | Yes | Yes | No (intentionally) |
| Fault Injection | Yes | Yes | No |
| Rate Limiting | Yes (eBPF + Envoy) | EnvoyFilter/Wasm | No |
| Multi-cluster | ClusterMesh | East-west gateway | Multicluster |
| Wasm Extensions | No (Envoy only) | Yes | No |
| Gateway API | Yes (GatewayClass) | Yes (GatewayClass) | Yes (HTTPRoute) |
| Protocol Detection | eBPF socket inspect | Sidecar/ztunnel | Proxy |

## mTLS Implementation Patterns

### Zero-Trust Pod-to-Pod

Every connection authenticated and encrypted. Three approaches:

1. **WireGuard (Cilium)**: kernel-level encryption, transparent to applications, no cert management
2. **SPIFFE mTLS (Istio/Cilium)**: x509 SVIDs with workload identity, 24h rotation
3. **Linkerd identity**: per-proxy identity cert, automatic rotation via trust anchor

### Certificate Rotation

Standard rotation lifecycle:
- Root CA: 10 years, offline, rotated manually with overlap period
- Intermediate CA: 3 years, online in istiod/cert-manager
- Workload cert: 24 hours, auto-rotated by proxy/agent
- Grace period: new cert issued at 50% lifetime, old valid until expiry

### SPIFFE Identity Format

```
spiffe://cluster.local/ns/<namespace>/sa/<service-account>
```

Identity bound to Kubernetes ServiceAccount. Policy references identity, not IP.

## Traffic Management Patterns

### Canary Deployments

Progressive traffic shifting with automated rollback:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: payment-canary
spec:
  parentRefs:
    - name: internal-gateway
  rules:
    - backendRefs:
        - name: payment-stable
          port: 8080
          weight: 90
        - name: payment-canary
          port: 8080
          weight: 10
```

Combine with Flagger or Argo Rollouts for automated analysis and promotion.

### Retry Budgets

Prevent retry storms:
- Max retries: 3 per request
- Retry budget: 20% of baseline RPS (if service handles 1000 RPS, max 200 retries/sec)
- Retry conditions: 5xx, connection reset, gateway errors (not 4xx)
- Exponential backoff: 25ms, 50ms, 100ms

### Circuit Breaking

Outlier detection at connection pool level:
- Consecutive errors: 5 -> eject for 30s
- Max connections per host: 100
- Max pending requests: 100
- Max retries: 3

### Locality-Aware Routing

Prefer local zone, fallback to region, then cross-region:
- Same zone: 0 priority (always preferred)
- Same region, different zone: 1 priority (failover)
- Different region: 2 priority (disaster recovery)

Override when: zone has <3 healthy endpoints (force distribution).

## Observability Integration

All mesh implementations should export:
- Request count (by source, destination, method, status)
- Request duration histogram (p50/p95/p99)
- Connection pool utilization
- mTLS handshake errors
- Certificate expiration countdown

Standard metric names (Istio-compatible, adopted by others):
- `istio_requests_total` / `request_total`
- `istio_request_duration_milliseconds` / `request_duration_seconds`

## Migration Strategies

### No Mesh -> Cilium Service Mesh

1. Deploy Cilium as CNI (or migrate from Calico)
2. Enable Hubble for flow visibility (baseline traffic patterns)
3. Enable WireGuard encryption (transparent, no app changes)
4. Add L7 policies incrementally per namespace
5. Enable per-node Envoy for advanced L7 features as needed

### Istio Sidecar -> Istio Ambient

1. Install ambient control plane alongside existing sidecars
2. Label namespaces `istio.io/dataplane-mode=ambient` one at a time
3. Verify ztunnel handles L4 (mTLS, telemetry) correctly
4. Deploy waypoint proxies for namespaces needing L7 policy
5. Remove sidecar injection label once ambient verified

### Istio -> Cilium

1. Run both in parallel (Cilium handles networking, Istio handles mesh)
2. Migrate mTLS to WireGuard (verify encryption in Hubble)
3. Convert AuthorizationPolicy to CiliumNetworkPolicy (L7)
4. Migrate VirtualService to CiliumEnvoyConfig or Gateway API HTTPRoute
5. Remove Istio sidecars namespace by namespace
6. Decommission istiod once all namespaces migrated

## Decision Framework

Choose **Cilium mesh** when: already using Cilium CNI, want lowest overhead, Kubernetes-only.
Choose **Istio ambient** when: multi-cloud/multi-cluster, need Wasm extensions, existing Istio investment.
Choose **Linkerd** when: want simplicity, small team, Rust proxy performance, no L7 policy needs.
Choose **no mesh** when: <10 services, internal-only traffic, mTLS not required by compliance.
