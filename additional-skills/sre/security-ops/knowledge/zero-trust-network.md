---
type: fact
title: "Zero Trust Networking"
---

# Zero Trust Networking

Never trust, always verify. No implicit trust based on network location.

## Core Principles

1. **Verify explicitly**: authenticate and authorize every request based on all available data points
2. **Least-privilege access**: just-in-time, just-enough-access (JIT/JEA)
3. **Assume breach**: minimize blast radius, segment access, verify end-to-end encryption

Traditional model: "inside the firewall = trusted." Zero trust: "nothing is trusted by default regardless of location."

## Microsegmentation

Fine-grained network policies between workloads:

### Kubernetes Network Policies

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: payment-api-ingress
spec:
  podSelector:
    matchLabels:
      app: payment-api
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: api-gateway
      ports:
        - port: 8080
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: payment-db
      ports:
        - port: 5432
```

### Implementation Layers

| Layer | Tool | Granularity |
|-------|------|-------------|
| L3/L4 | Kubernetes NetworkPolicy, Calico | IP + port |
| L4/L7 | Cilium, Istio AuthorizationPolicy | HTTP method + path |
| Application | Service mesh mTLS + RBAC | Service identity + payload |

### Default-Deny Strategy

1. Start with `deny-all` ingress and egress policy per namespace
2. Explicitly allow only required communication paths
3. Audit: any pod without network policy = violation (flag in CI)

## Identity-Based Access

Replace IP-based trust with cryptographic identity:

### Service Identity

- **SPIFFE/SPIRE**: universal identity framework for workloads
  - Each workload gets an SVID (SPIFFE Verifiable Identity Document)
  - Identity format: `spiffe://trust-domain/path` (e.g., `spiffe://prod.example.com/payment-api`)
  - Automatic certificate rotation (short-lived: 1 hour typical)

- **Service mesh mTLS**: Istio/Linkerd issue per-pod certificates
  - Identity derived from Kubernetes service account
  - All traffic encrypted and authenticated without app changes

### Authorization Models

| Model | How It Works | Use Case |
|-------|-------------|----------|
| RBAC | Roles assigned to identities | Coarse-grained service access |
| ABAC | Attributes evaluated per request | Context-dependent access (time, location) |
| OPA/Rego | Policy-as-code evaluated at enforcement point | Complex, auditable rules |

### Example: Istio Authorization Policy

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: payment-api-policy
spec:
  selector:
    matchLabels:
      app: payment-api
  rules:
    - from:
        - source:
            principals: ["cluster.local/ns/default/sa/order-service"]
      to:
        - operation:
            methods: ["POST"]
            paths: ["/api/v1/charges"]
    - from:
        - source:
            principals: ["cluster.local/ns/default/sa/admin-dashboard"]
      to:
        - operation:
            methods: ["GET"]
            paths: ["/api/v1/charges/*"]
```

## BeyondCorp Model

Google's implementation of zero trust for employee access:

### Components

1. **Device inventory**: every device registered with security posture tracked
2. **Device trust engine**: assesses device health (patched, encrypted, managed)
3. **Access proxy**: all application access through identity-aware proxy
4. **Access policies**: combine user identity + device trust + context for every request
5. **No VPN**: direct internet access to applications via proxy (VPN eliminated)

### Decision Flow

```
User request → Access Proxy → Check:
  ✓ User authenticated (SSO/MFA)?
  ✓ Device registered and healthy?
  ✓ Request matches policy for this user+device+app?
  ✓ Context acceptable (time, location, risk score)?
→ Allow/Deny
```

### Modern Implementations

| Product | Type | Key Feature |
|---------|------|-------------|
| Google BeyondCorp Enterprise | SaaS | Chrome integration, DLP |
| Cloudflare Access | SaaS | Edge-based, no agent option |
| Zscaler Private Access | SaaS | App connector model |
| Pomerium | Open source | Identity-aware proxy, self-hosted |
| Teleport | Open source | Infrastructure access (SSH, K8s, DB) |

## ZTNA (Zero Trust Network Access)

Replaces VPN for remote access:

### VPN vs ZTNA

| Aspect | VPN | ZTNA |
|--------|-----|------|
| Access scope | Full network after connect | Per-application only |
| Trust model | Trusted after authentication | Verified per request |
| Attack surface | Entire network exposed | Only authorized apps visible |
| Lateral movement | Possible (on the network) | Blocked (no network access) |
| User experience | Connect, then access | Transparent, always-on |

### ZTNA Architecture

- Connector/agent deployed near application (outbound-only connections)
- Control plane brokers connections between user and application
- Application never exposed directly to internet
- Per-session authorization with continuous verification

## Implementation Roadmap

### Phase 1: Visibility (Month 1-2)
- Inventory all service-to-service communication
- Map data flows and trust dependencies
- Deploy network policy in audit/log-only mode

### Phase 2: Identity (Month 2-4)
- Deploy service mesh or SPIFFE for workload identity
- Enable mTLS between all services
- Replace IP allowlists with identity-based policies

### Phase 3: Segmentation (Month 4-6)
- Apply default-deny network policies
- Implement per-service authorization rules
- Test failure modes (what breaks when policy enforced)

### Phase 4: Continuous Verification (Month 6+)
- Anomaly detection on access patterns
- Short-lived credentials everywhere (1-hour max)
- Automated policy updates from service registry changes

## Anti-Patterns

- "Zero trust" = just adding MFA (it is a full architecture shift, not a feature)
- Microsegmentation without identity (IP-based policies still break on scaling)
- Overly permissive policies that pass audit but allow lateral movement
- No monitoring on policy violations (you cannot enforce what you cannot see)
- VPN as "zero trust" (VPN grants network access, which is the opposite of ZT)
- Big-bang migration (implement incrementally or break everything at once)
