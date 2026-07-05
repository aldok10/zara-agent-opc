---
type: fact
title: "Zero Trust Patterns"
---
# Zero Trust Patterns

## Core Principles

1. Never trust, always verify -- every request is authenticated and authorized regardless of network location
2. Least privilege access -- grant minimum permissions needed, just-in-time
3. Assume breach -- design systems expecting attackers are already inside
4. Explicit verification -- authenticate based on all available data points (identity, device, location, behavior)

## NIST SP 800-207 Key Takeaways

- All data sources and computing services are resources
- All communication is secured regardless of network location
- Access to individual enterprise resources is granted on a per-session basis
- Access is determined by dynamic policy (identity, device state, behavioral attributes)
- Enterprise monitors and measures integrity/security posture of all owned assets
- Authentication and authorization are dynamic and strictly enforced before access
- Enterprise collects info about asset state, network traffic, and access requests for improving policy

## BeyondCorp Model (Google's Implementation)

Traditional: firewall perimeter = trust boundary. Inside = trusted.
BeyondCorp: no privileged network. Trust based on device + user identity + context.

Components:
- Device inventory database (what devices exist)
- Device trust engine (is this device healthy?)
- Identity provider (who is this user?)
- Access proxy (enforces policy at every request)
- Access policy engine (decides allow/deny per request)

## Identity-Based Access

### Service Identity (workload-to-workload)

```yaml
# SPIFFE ID format
spiffe://trust-domain/workload-identifier
spiffe://mycompany.com/payment-service
spiffe://mycompany.com/order-service
```

```go
// Go service verifying peer identity via SPIFFE
import "github.com/spiffe/go-spiffe/v2/workloadapi"

func main() {
    ctx := context.Background()
    source, err := workloadapi.NewX509Source(ctx)
    if err != nil {
        log.Fatal(err)
    }
    defer source.Close()

    tlsConfig := tlsconfig.MTLSServerConfig(
        source,
        source,
        tlsconfig.AuthorizeID(
            spiffeid.RequireID(spiffeid.Must("mycompany.com", "order-service")),
        ),
    )

    server := &http.Server{
        TLSConfig: tlsConfig,
        Addr:      ":8443",
    }
    server.ListenAndServeTLS("", "")
}
```

### User Identity

```typescript
// Token validation middleware with full context check
interface AccessContext {
  userId: string;
  deviceId: string;
  deviceTrust: 'high' | 'medium' | 'low';
  ipReputation: number;
  location: string;
  mfaVerified: boolean;
}

function evaluateAccess(ctx: AccessContext, resource: string): boolean {
  if (!ctx.mfaVerified) return false;
  if (ctx.deviceTrust === 'low') return false;
  if (ctx.ipReputation < 50) return false;

  const policy = getPolicy(resource);
  return policy.evaluate(ctx);
}
```

## Microsegmentation

Network divided into small zones; traffic between zones explicitly allowed.

### Kubernetes NetworkPolicy

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: payment-service-policy
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: payment-service
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: order-service
      ports:
        - port: 8443
          protocol: TCP
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: postgres
      ports:
        - port: 5432
          protocol: TCP
    - to:  # DNS
        - namespaceSelector: {}
          podSelector:
            matchLabels:
              k8s-app: kube-dns
      ports:
        - port: 53
          protocol: UDP
```

### Service Mesh (Istio AuthorizationPolicy)

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: payment-authz
  namespace: production
spec:
  selector:
    matchLabels:
      app: payment-service
  action: ALLOW
  rules:
    - from:
        - source:
            principals: ["cluster.local/ns/production/sa/order-service"]
      to:
        - operation:
            methods: ["POST"]
            paths: ["/api/v1/charge"]
```

## mTLS Service-to-Service

Both client and server present certificates. Proves identity in both directions.

### Implementation with Envoy Sidecar

```yaml
# Istio PeerAuthentication -- enforce mTLS
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: production
spec:
  mtls:
    mode: STRICT
```

### Manual mTLS in Go

```go
func createMTLSServer(certFile, keyFile, caFile string) *http.Server {
    caCert, _ := os.ReadFile(caFile)
    caCertPool := x509.NewCertPool()
    caCertPool.AppendCertsFromPEM(caCert)

    tlsConfig := &tls.Config{
        ClientCAs:  caCertPool,
        ClientAuth: tls.RequireAndVerifyClientCert,
        MinVersion: tls.VersionTLS13,
    }

    return &http.Server{
        Addr:      ":8443",
        TLSConfig: tlsConfig,
    }
}
```

## Token-Based Access (Short-Lived)

```typescript
// Issue short-lived tokens for service access
function issueServiceToken(serviceId: string, targetService: string): string {
  return jwt.sign(
    {
      sub: serviceId,
      aud: targetService,
      scope: ['read:orders'],
      iat: Math.floor(Date.now() / 1000),
    },
    privateKey,
    { algorithm: 'ES256', expiresIn: '5m' }
  );
}
```

## Continuous Verification

Zero trust is not one-time auth. Continuously re-evaluate:

```typescript
// Session risk scoring -- re-evaluate on each request
interface SessionRisk {
  score: number;  // 0-100, higher = more risky
  factors: string[];
}

function assessRisk(session: Session, request: Request): SessionRisk {
  let score = 0;
  const factors: string[] = [];

  if (session.lastActivity < Date.now() - 30 * 60 * 1000) {
    score += 20;
    factors.push('inactive_30m');
  }
  if (request.ip !== session.originalIp) {
    score += 30;
    factors.push('ip_changed');
  }
  if (isUnusualTime(request.timestamp, session.userId)) {
    score += 15;
    factors.push('unusual_time');
  }

  return { score, factors };
}

// Step-up auth when risk exceeds threshold
function enforcePolicy(risk: SessionRisk): 'allow' | 'step_up' | 'deny' {
  if (risk.score < 30) return 'allow';
  if (risk.score < 70) return 'step_up';  // Require MFA re-verification
  return 'deny';
}
```

## Implementation Checklist

- [ ] All services have unique identities (SPIFFE/service accounts)
- [ ] mTLS enforced between all services
- [ ] Network policies deny all by default, allow explicitly
- [ ] Short-lived tokens (< 15 min) for service-to-service
- [ ] Device trust assessment for user access
- [ ] Continuous session risk evaluation
- [ ] Centralized policy engine (OPA/Cedar)
- [ ] All access decisions logged and auditable
- [ ] No implicit trust based on network location
- [ ] Regular policy review and access recertification
