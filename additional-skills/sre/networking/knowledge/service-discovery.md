---
type: fact
title: "Service Discovery Patterns"
---

# Service Discovery Patterns

How services find and communicate with each other in distributed systems.

## Problem Statement

Static IP/port configuration breaks when:
- Services scale horizontally (new instances appear/disappear)
- Deployments happen (new versions on different ports/hosts)
- Failures occur (unhealthy instances need removal from pool)
- Environments differ (dev/staging/production have different endpoints)

Service discovery solves: "where is service X right now?"

## DNS-Based Discovery

### Simple DNS

- Services register A/AAAA records on deploy
- Clients resolve hostname to current IPs
- TTL controls staleness (lower TTL = faster updates, more DNS traffic)

**Limitations:**
- DNS caching causes stale routing (especially with long TTL)
- No health checking built into DNS
- No load balancing sophistication (round-robin only)
- Port information requires SRV records (not all clients support them)

### DNS with Health Checks (Route 53, Cloud DNS)

- Health check endpoints registered alongside DNS records
- Unhealthy instances automatically removed from DNS responses
- Weighted routing, failover, and latency-based routing supported
- TTL as low as 1 second (but increases query volume)

Best for: cross-region routing, external service exposure, simple internal discovery.

## Consul (HashiCorp)

Full-featured service discovery with health checking:

### Registration

```hcl
service {
  name = "payment-api"
  port = 8080
  tags = ["v2.1", "production"]
  check {
    http     = "http://localhost:8080/health"
    interval = "10s"
    timeout  = "2s"
  }
}
```

### Query

- DNS interface: `payment-api.service.consul` (simple, any client works)
- HTTP API: `/v1/health/service/payment-api?passing=true` (rich metadata)
- Prepared queries: pre-defined queries with failover logic

### Features

- Multi-datacenter with WAN gossip
- Key-value store for distributed configuration
- Service mesh (Consul Connect) with mTLS
- Intention-based access control (which service can talk to which)

Best for: multi-cloud, hybrid environments, teams wanting dedicated discovery infrastructure.

## Kubernetes Service Discovery

Built into the platform — no additional infrastructure needed:

### ClusterIP Services

```yaml
apiVersion: v1
kind: Service
metadata:
  name: payment-api
spec:
  selector:
    app: payment-api
  ports:
    - port: 80
      targetPort: 8080
```

Discovery: `payment-api.namespace.svc.cluster.local`

### Endpoint Management

- kube-proxy maintains iptables/IPVS rules for routing
- Endpoints automatically updated as pods scale/fail readiness probes
- Headless services (`clusterIP: None`) return individual pod IPs for client-side balancing

### DNS in Kubernetes

- CoreDNS resolves service names to ClusterIPs
- Pod DNS: `pod-ip.namespace.pod.cluster.local`
- SRV records available for port discovery

Best for: Kubernetes-native workloads; zero additional setup.

## Service Mesh Discovery

Mesh sidecars (Envoy, Linkerd proxy) handle discovery transparently:

### How It Works

1. Application calls `http://payment-api:80` (simple hostname)
2. Sidecar intercepts outbound traffic
3. Sidecar resolves to healthy endpoints via control plane (Istiod, Linkerd control plane)
4. Load balancing, retries, circuit breaking applied by sidecar
5. mTLS encrypts service-to-service traffic

### Benefits Over Plain Discovery

- Transparent to application code (no SDK changes)
- Advanced load balancing: least connections, locality-aware, ring hash
- Automatic retries with budget (prevents retry storms)
- Observability: golden signals collected per-call without instrumentation

Best for: large microservices deployments needing traffic management and security.

## Client-Side vs Server-Side Discovery

### Client-Side

Client queries registry directly, chooses instance, connects.

```
Client → Registry → [list of instances]
Client → Instance B (chosen by client)
```

- **Pros**: no single point of failure at load balancer, client can make smart choices
- **Cons**: every language needs discovery library, client complexity
- **Examples**: Netflix Eureka + Ribbon, gRPC client-side balancing

### Server-Side

Client calls stable endpoint; load balancer routes to healthy instance.

```
Client → Load Balancer → Instance B (chosen by LB)
```

- **Pros**: clients stay simple, centralized routing logic
- **Cons**: load balancer is a potential bottleneck/SPOF
- **Examples**: Kubernetes Services, AWS ALB + ECS, Consul with Envoy

### Decision Criteria

| Factor | Client-Side | Server-Side |
|--------|-------------|-------------|
| Client simplicity | Low (needs SDK) | High (just call endpoint) |
| Polyglot support | Hard (SDK per language) | Easy (HTTP/gRPC to LB) |
| Latency | Lower (direct connection) | Slightly higher (extra hop) |
| Control | Fine-grained | Centralized |

## Health Checking Patterns

| Type | Checks | Catches |
|------|--------|---------|
| TCP | Port is open | Process crashed |
| HTTP | Endpoint returns 2xx | App not serving |
| gRPC health | Standard health RPC | Service-level issues |
| Deep/dependency | Downstream connectivity | Cascading failures |
| Startup probe | App finished initializing | Premature traffic routing |

**Rule**: readiness ≠ liveness. Readiness: "can I serve traffic?" Liveness: "am I fundamentally broken?"

## Anti-Patterns

- Hardcoding IPs or ports in application config (breaks on any topology change)
- DNS TTL too high for dynamic environments (>30s in containers is usually wrong)
- No health checking (traffic routes to dead instances)
- Health endpoint that always returns 200 (provides no actual signal)
- Coupling service discovery to deployment tool (creates vendor lock-in)
- Ignoring DNS caching in client libraries (Java's default is to cache forever)
