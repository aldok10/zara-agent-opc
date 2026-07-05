# Kubernetes Networking

## Gateway API (replaces Ingress)
- `Gateway`: infra team defines listeners (ports, TLS)
- `HTTPRoute`: app team defines routing rules (paths, headers, backends)
- `GRPCRoute`: gRPC-specific routing
- Role separation: infra owns Gateway, apps own Routes
- Implementations: Istio, Envoy Gateway, NGINX Gateway Fabric

## Service Types

| Type | Use | Notes |
|------|-----|-------|
| ClusterIP | Internal communication | Default, cluster-only |
| NodePort | Development/testing | Exposes on node IP:port |
| LoadBalancer | External traffic | Cloud LB provisioned |
| ExternalName | DNS alias | CNAME to external service |
| Headless (clusterIP: None) | StatefulSet DNS | Individual pod DNS records |

## NetworkPolicy
- Default: allow all (no policies = open network)
- Best practice: default-deny-all, then explicit allow rules
- Scope: namespace-level, label-based selectors
- Egress policies for controlling outbound

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
spec:
  podSelector: {}
  policyTypes: [Ingress, Egress]
```

## DNS
- Pattern: `service.namespace.svc.cluster.local`
- CoreDNS: cluster DNS server, configurable via ConfigMap
- ndots:5 default (can cause slow resolution, tune for external calls)
