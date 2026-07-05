---
type: tool
title: "Ingress to Gateway API Migration Checklist"
---

# Ingress to Gateway API Migration Checklist

Structured checklist for migrating from Ingress resources to Gateway API v1.3+.

## Pre-Migration

- [ ] Inventory all Ingress resources: `kubectl get ingress -A -o wide`
- [ ] Document current annotations (these become policy attachments or route filters)
- [ ] Identify Ingress controller in use (nginx, traefik, ALB) and its Gateway API support
- [ ] Choose Gateway API implementation (Envoy Gateway, Istio, Cilium, NGINX Gateway Fabric)
- [ ] Verify controller supports needed route types (HTTPRoute, GRPCRoute, TCPRoute)
- [ ] Check Gateway API CRD version installed: `kubectl get crd gateways.gateway.networking.k8s.io -o jsonpath='{.spec.versions[*].name}'`
- [ ] Map team ownership: who manages GatewayClass, who manages Gateway, who manages Routes

## Annotation Mapping

| Ingress Annotation | Gateway API Equivalent |
|---|---|
| `nginx.ingress.kubernetes.io/rewrite-target` | HTTPRoute URLRewrite filter |
| `nginx.ingress.kubernetes.io/ssl-redirect` | HTTPRoute RequestRedirect filter (scheme: https) |
| `nginx.ingress.kubernetes.io/proxy-body-size` | BackendTrafficPolicy (implementation-specific) |
| `nginx.ingress.kubernetes.io/rate-limit-*` | BackendTrafficPolicy or policy attachment |
| `nginx.ingress.kubernetes.io/auth-*` | SecurityPolicy (implementation-specific) |
| `nginx.ingress.kubernetes.io/cors-*` | HTTPRoute ResponseHeaderModifier or policy |
| `nginx.ingress.kubernetes.io/canary-*` | HTTPRoute backendRefs with weights |
| `nginx.ingress.kubernetes.io/upstream-hash-by` | SessionPersistence (v1.3) |
| `cert-manager.io/cluster-issuer` | Gateway annotation (cert-manager supports Gateway API natively) |
| `alb.ingress.kubernetes.io/scheme` | Gateway infrastructure spec (implementation-specific) |

## Migration Steps (Per Service)

### Phase 1: Parallel Deploy

- [ ] Create Gateway resource in infra namespace with matching listeners
- [ ] Create HTTPRoute pointing to same backend Service as Ingress
- [ ] Verify route is accepted: `kubectl describe httproute <name> | grep -A5 "Parents"`
- [ ] Create ReferenceGrant if route and backend are in different namespaces
- [ ] Test via Gateway IP/hostname (DNS not yet pointed)
- [ ] Validate TLS termination works (cert loaded, chain valid)

### Phase 2: Traffic Migration

- [ ] Update DNS to point to Gateway's external address (or use weighted DNS)
- [ ] Monitor error rates, latency, 5xx during migration window
- [ ] Verify header forwarding (X-Forwarded-For, X-Request-ID) matches previous behavior
- [ ] Test path-based routing, host-based routing, redirects
- [ ] Confirm health check endpoints respond through Gateway

### Phase 3: Cleanup

- [ ] Remove DNS records pointing to old Ingress controller
- [ ] Delete Ingress resources: `kubectl delete ingress <name> -n <ns>`
- [ ] Remove Ingress controller if no Ingress resources remain
- [ ] Clean up unused TLS secrets from old Ingress
- [ ] Update CI/CD pipelines to deploy HTTPRoute instead of Ingress
- [ ] Update monitoring/alerting to reference Gateway metrics

## Validation Queries

```bash
# Compare routes -- what Ingress serves vs what Gateway serves
kubectl get ingress -A -o jsonpath='{range .items[*]}{.metadata.namespace}/{.metadata.name} -> {.spec.rules[*].host}{"\n"}{end}'
kubectl get httproute -A -o jsonpath='{range .items[*]}{.metadata.namespace}/{.metadata.name} -> {.spec.hostnames[*]}{"\n"}{end}'

# Verify all HTTPRoutes are accepted
kubectl get httproute -A -o jsonpath='{range .items[*]}{.metadata.name}: {.status.parents[*].conditions[?(@.type=="Accepted")].status}{"\n"}{end}'

# Check Gateway has address assigned
kubectl get gateway -A -o jsonpath='{range .items[*]}{.metadata.name}: {.status.addresses[*].value}{"\n"}{end}'
```

## Rollback Plan

- [ ] Keep Ingress resources (just not receiving traffic) until Gateway is stable (7 days minimum)
- [ ] DNS TTL set low (60s) before migration to allow fast rollback
- [ ] Document: "To rollback, point DNS back to Ingress controller LB at <old-address>"
- [ ] Test rollback procedure in staging before production migration

## Common Pitfalls

1. **Missing ReferenceGrant**: Routes in namespace A cannot target Services in namespace B without explicit grant
2. **allowedRoutes default is Same**: Gateway only accepts routes from its own namespace unless configured otherwise
3. **No wildcard in parentRefs**: Routes must reference Gateway by name, not by listener hostname
4. **Annotation parity gap**: Some nginx annotations have no direct Gateway API equivalent -- may need policy attachments
5. **cert-manager integration**: Use Gateway annotation instead of Ingress annotation; cert-manager v1.12+ supports both
6. **Path matching difference**: Ingress uses prefix by default; Gateway API requires explicit `type: PathPrefix` or `type: Exact`
