# Gateway API (v1.3+)

The successor to Ingress, providing expressive, role-oriented routing for HTTP, gRPC, TCP, and TLS traffic in Kubernetes 1.29+. GA since v1.0, with v1.3 adding session persistence, backend TLS policy, and retry budgets.

## Key Concepts

**Resource Model** -- three-layer separation of concerns:

- **GatewayClass**: Cluster-scoped, defines the controller implementation (e.g., `gateway.envoyproxy.io/gateway-controller`). Managed by infra admins.
- **Gateway**: Namespace-scoped, declares listeners (ports, protocols, TLS certs). Managed by platform team.
- **HTTPRoute / GRPCRoute / TCPRoute / TLSRoute**: Namespace-scoped, attaches to a Gateway and defines routing rules. Managed by app teams.

**Attachment model**: Routes attach to Gateways via `parentRefs`. Gateways can restrict which namespaces may attach via `allowedRoutes`.

**BackendTLSPolicy** (v1.3): Configures TLS from the gateway to the backend, enabling mTLS without sidecars for backends that terminate TLS directly.

**ReferenceGrant**: Cross-namespace permission -- allows a Route in namespace A to reference a Service in namespace B.

## Configuration Examples

Minimal Gateway with HTTPS listener:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: main-gateway
  namespace: gateway-infra
spec:
  gatewayClassName: envoy
  listeners:
    - name: https
      protocol: HTTPS
      port: 443
      tls:
        mode: Terminate
        certificateRefs:
          - kind: Secret
            name: wildcard-tls
      allowedRoutes:
        namespaces:
          from: Selector
          selector:
            matchLabels:
              gateway-access: "true"
```

HTTPRoute with path matching and header-based canary:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: api-route
  namespace: app-prod
spec:
  parentRefs:
    - name: main-gateway
      namespace: gateway-infra
  hostnames:
    - "api.example.com"
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /v2
          headers:
            - name: x-canary
              value: "true"
      backendRefs:
        - name: api-v2
          port: 8080
          weight: 100
    - matches:
        - path:
            type: PathPrefix
            value: /v2
      backendRefs:
        - name: api-v1
          port: 8080
          weight: 90
        - name: api-v2
          port: 8080
          weight: 10
```

## Common Patterns

| Pattern | Implementation |
|---------|---------------|
| Blue-green deploy | Two HTTPRoutes, swap `backendRefs` atomically |
| Canary (weight-based) | Single rule with multiple `backendRefs` + weights |
| Header-based routing | `matches[].headers` for internal/canary traffic |
| Rate limiting | BackendTrafficPolicy (Envoy Gateway) or policy attachment |
| Redirect HTTP to HTTPS | HTTPRoute with `requestRedirect` filter, scheme: https |
| Cross-namespace backend | ReferenceGrant in target namespace allowing HTTPRoute source |
| Session affinity | SessionPersistence policy attachment (v1.3) |

## Gotchas

1. **Listener hostname collision**: Two Gateways with identical listener hostname+port on same IP will conflict. Use distinct hostnames or merge into one Gateway.
2. **Route precedence**: Longer path prefixes win. If equal, lexicographic order of route name. Design hostnames/paths to avoid ambiguity.
3. **Secret in wrong namespace**: TLS certificateRefs must be in the same namespace as the Gateway unless a ReferenceGrant exists.
4. **allowedRoutes default**: If unset, defaults to `from: Same` (same namespace only). App teams in other namespaces will silently fail to attach.
5. **Controller support varies**: Not all controllers support GRPCRoute, TCPRoute, or extended features. Check conformance reports.
6. **No wildcard host in parentRefs**: Routes select Gateways by name, not by listener hostname. A route with `hostnames: ["*.example.com"]` attaches to a named Gateway regardless of the Gateway's listener hostname.

## Quick Reference

```bash
# List all Gateways and their status
kubectl get gateways -A

# Check HTTPRoute attachment status
kubectl get httproute -A -o wide

# Verify a route is accepted
kubectl describe httproute <name> -n <ns> | grep -A5 "Conditions"

# Debug: show effective routes on a gateway (Envoy Gateway)
egctl config envoy-proxy route -A

# Force reconcile (delete and recreate route)
kubectl delete httproute <name> -n <ns> && kubectl apply -f route.yaml

# Verify TLS cert is loaded
kubectl get secret <tls-secret> -n gateway-infra -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -noout -dates
```
