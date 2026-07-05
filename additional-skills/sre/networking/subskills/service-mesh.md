---
type: subskill
title: "Service Mesh"
---

# Service Mesh

Istio, Linkerd, Cilium mesh -- mTLS, traffic management, and observability.

## When to Load
- Choosing between service mesh implementations
- Configuring mTLS and traffic policies
- Setting up traffic splitting or canary deployments
- Troubleshooting mesh connectivity issues

## Key Concepts

**Service mesh value:** mTLS (encryption + identity), traffic management (retries, timeouts, splits), observability (golden signals without app changes), policy enforcement.

**Implementation approaches:**
- Istio: feature-rich, Envoy sidecars, complex but powerful
- Linkerd: lightweight, Rust proxy, simpler operations
- Cilium: eBPF-based (sidecar-free), kernel-level networking, lower overhead

**Data plane vs Control plane:** Data plane (proxy/eBPF) handles traffic. Control plane (istiod, linkerd-control-plane) configures data plane.

**mTLS modes:** PERMISSIVE (accepts both plain and TLS), STRICT (TLS only). Always migrate permissive -> strict.

## Patterns

**Istio traffic split (canary):**
```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: reviews
spec:
  hosts: [reviews]
  http:
    - route:
        - destination:
            host: reviews
            subset: v1
          weight: 90
        - destination:
            host: reviews
            subset: v2
          weight: 10
      retries:
        attempts: 3
        perTryTimeout: 2s
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: reviews
spec:
  host: reviews
  trafficPolicy:
    connectionPool:
      tcp: { maxConnections: 100 }
      http: { h2UpgradePolicy: UPGRADE }
  subsets:
    - name: v1
      labels: { version: v1 }
    - name: v2
      labels: { version: v2 }
```

**Linkerd service profile (timeouts + retries):**
```yaml
apiVersion: linkerd.io/v1alpha2
kind: ServiceProfile
metadata:
  name: orders.default.svc.cluster.local
spec:
  routes:
    - name: "GET /orders/{id}"
      condition:
        method: GET
        pathRegex: "/orders/[^/]+"
      timeout: 5s
      isRetryable: true
```

**Cilium L7 policy:**
```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: api-access
spec:
  endpointSelector:
    matchLabels:
      app: api
  ingress:
    - fromEndpoints:
        - matchLabels:
            app: frontend
      toPorts:
        - ports:
            - port: "8080"
              protocol: TCP
          rules:
            http:
              - method: GET
                path: "/api/v1/.*"
```

## Gotchas
- Istio sidecar injection requires namespace label AND pod restart
- mTLS strict mode breaks non-mesh clients -- use PeerAuthentication per namespace
- Istio memory: each Envoy sidecar uses 50-100MB RAM minimum
- Linkerd doesn't support TCP traffic splitting (HTTP only)
- Cilium mesh requires kernel 5.10+ for full feature set
- Service mesh + external services need ServiceEntry/ExternalWorkload configuration
- Mesh observability metrics can overwhelm Prometheus at scale -- use federation or remote write

## Verification
- `istioctl analyze` for configuration validation
- `istioctl proxy-status` for sidecar sync state
- `linkerd check` for control plane health
- `cilium status` and `cilium connectivity test` for Cilium health
- `istioctl proxy-config routes <pod>` to inspect Envoy configuration
- Kiali dashboard for Istio service topology visualization
