---
type: fact
title: "Zero Trust Networking"
---

# Zero Trust Networking

BeyondCorp principles and identity-based access in modern cloud architectures.

## Core Principles

Zero Trust eliminates implicit trust based on network location. Every request is authenticated, authorized, and encrypted regardless of origin.

1. **Never trust, always verify** -- network location grants zero privilege
2. **Least privilege access** -- just enough access for just long enough
3. **Assume breach** -- design as if the attacker is already inside
4. **Verify explicitly** -- authenticate and authorize every access attempt
5. **Micro-segmentation** -- limit blast radius of any single compromise

## Architecture Components

### Identity Provider (IdP)
- Central authentication authority (Okta, Azure AD, Google Workspace)
- Device identity bound to user identity
- Continuous authentication (session risk scoring, step-up MFA)
- SCIM provisioning for lifecycle management

### Policy Engine
- Real-time access decisions based on context:
  - User identity and role
  - Device posture (patched, encrypted, managed)
  - Location and time
  - Resource sensitivity
  - Behavior anomalies
- Policy-as-code (OPA/Rego, Cedar) for auditability

### Policy Enforcement Point (PEP)
- Sits between subject and resource
- Enforces policy engine decisions
- Options: reverse proxy, service mesh sidecar, API gateway, eBPF agent
- No direct network path from user to resource exists without PEP

### Device Trust
- Device identity certificates (mTLS)
- Posture assessment: OS version, disk encryption, EDR active
- Managed vs unmanaged device tiers with different access levels
- Hardware-bound keys (TPM/Secure Enclave)

## BeyondCorp Implementation

Google's production implementation that removed their VPN entirely.

```
┌──────────┐     ┌─────────────┐     ┌──────────────┐
│  User +  │────►│ Access Proxy │────►│  Application │
│  Device  │     │ (PEP)       │     │  (Backend)   │
└──────────┘     └──────┬──────┘     └──────────────┘
                        │
                 ┌──────▼──────┐
                 │   Policy    │
                 │   Engine    │
                 └──────┬──────┘
                        │
          ┌─────────────┼─────────────┐
          │             │             │
   ┌──────▼──┐   ┌─────▼────┐  ┌────▼─────┐
   │ Identity │   │ Device   │  │ Context  │
   │ Store    │   │ Inventory│  │ (time,   │
   └──────────┘   └──────────┘  │  geo,    │
                                 │  risk)   │
                                 └──────────┘
```

### Access Levels (example tiers)

| Level | Requirements | Access Granted |
|-------|-------------|----------------|
| 1 | Authenticated user, any device | Public docs, non-sensitive apps |
| 2 | Managed device, recent auth | Internal tools, code repos |
| 3 | Compliant device + MFA | Production consoles, PII access |
| 4 | Hardware key + compliant device + recent MFA | Admin panels, secrets management |

## Service-to-Service Zero Trust

Internal services also need zero trust -- lateral movement is the primary attack vector.

### mTLS Everywhere
- Service mesh (Istio, Linkerd, Cilium) provides automatic mTLS
- SPIFFE/SPIRE for workload identity (x509 SVID)
- Short-lived certificates (hours, not years)
- No plaintext communication between services

### Service Authorization
- AuthZ policy per service pair (service A can call service B endpoint X)
- Intent-based networking: define allowed communication, deny everything else
- NetworkPolicy (Kubernetes) or security groups scoped to service identity

### API-Level Controls
- Token exchange: user token converted to service token with reduced scope
- Request-level authorization (not just service-level)
- Audit log every cross-service call

## Migration from Perimeter Security

### Phase 1: Inventory and Observe
- Map all network flows (VPC flow logs, service mesh telemetry)
- Identify all access paths and dependencies
- Catalog implicit trust assumptions

### Phase 2: Identity Foundation
- Deploy strong IdP with MFA
- Establish device trust and posture assessment
- Implement service identity (SPIFFE/mTLS)

### Phase 3: Overlay Zero Trust
- Deploy access proxy for web applications
- Add service mesh for east-west traffic
- Begin enforcing policies in audit mode (log violations, don't block)

### Phase 4: Remove Perimeter Trust
- Switch policies from audit to enforce
- Remove VPN for application access (keep for admin edge cases)
- Close inbound firewall rules that relied on "trusted network"
- Monitor for access failures and adjust policies

## 2026 Context

- AI workloads need identity: model endpoints, training pipelines, inference services -- all need authn/authz
- eBPF-based enforcement (Cilium, Tetragon) replaces iptables for kernel-level zero trust
- Passkeys eliminate phishable credentials -- reduces identity compromise risk
- Continuous access evaluation (CAEP/SSF) revokes sessions in real-time on risk signals
- Multi-cloud identity federation via OIDC workload identity (no long-lived keys)
