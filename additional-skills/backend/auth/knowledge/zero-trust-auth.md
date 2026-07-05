---
type: fact
title: "Zero Trust Authentication"
---

# Zero Trust Authentication

## Core Principles

1. Never trust, always verify  -  network location grants no implicit trust
2. Least privilege access  -  minimum permissions for minimum duration
3. Assume breach  -  design controls assuming attacker is already inside
4. Continuous verification  -  re-evaluate trust on every request, not just at login
5. Explicit verification  -  authenticate and authorize based on all available signals

## Trust Signals

| Signal | Weight | Source |
|--------|--------|--------|
| Identity (who) | High | IdP assertion, passkey, certificate |
| Device health | Medium | MDM compliance, OS patch level, disk encryption |
| Network context | Low | IP reputation, geo-location, VPN status |
| Behavior | Medium | Access patterns, time-of-day, velocity |
| Request context | Medium | Resource sensitivity, action type, data volume |

## Authentication Architecture

### Request-Level Verification
```
Every request must carry:
1. Identity proof (token/session with valid authentication)
2. Client attestation (device health, when available)
3. Context signals (IP, user-agent, timestamp)

Policy engine evaluates: identity + device + context + resource → allow/deny/step-up
```

### Continuous Authentication
```
Initial auth → Full ceremony (passkey, MFA)
Within session → Behavioral signals (typing pattern, mouse movement, location stability)
Sensitive action → Step-up authentication (re-verify biometric)
Anomaly detected → Challenge or terminate session
```

### Step-Up Authentication Triggers
- Accessing sensitive resource (PII, financial, admin panel)
- Action exceeds threshold (large transfer, bulk export)
- Context change (new IP, new device, unusual time)
- Session age exceeds step-up window (e.g., 15 minutes for admin)
- Explicit policy requirement (regulatory compliance)

## Service-to-Service (East-West)

| Method | Strength | Use When |
|--------|----------|----------|
| mTLS | Strong | Service mesh, infrastructure-level identity |
| JWT with DPoP | Strong | Application-level, cross-boundary |
| SPIFFE/SPIRE | Strong | Workload identity, Kubernetes-native |
| API keys | Weak | Legacy, rate limiting only (not auth) |

### mTLS in Service Mesh
```
1. Each service gets short-lived X.509 certificate from mesh CA
2. Every connection: mutual TLS handshake (both sides present certs)
3. Mesh validates: cert chain, SPIFFE ID, service identity
4. Authorization: service A → service B permitted by mesh policy
5. Rotation: automatic, sub-24h lifetime, no manual intervention
```

## Device Trust

### Signal Collection
- MDM enrollment status (managed vs BYOD)
- OS version and patch level
- Disk encryption enabled
- Screen lock configured
- Jailbreak/root detection
- Endpoint detection agent running

### Policy Integration
```
IF device.managed AND device.encrypted AND device.patched_within(30d)
  THEN trust_level = high → full access
ELIF device.encrypted AND device.screen_lock
  THEN trust_level = medium → limited access, no sensitive data
ELSE
  trust_level = low → read-only, or denied
```

## Implementation Checklist

- [ ] Every service authenticates incoming requests (no trusted network zones)
- [ ] Tokens are short-lived (<15min) and audience-scoped
- [ ] Service-to-service uses mTLS or workload identity (not shared secrets)
- [ ] Sensitive actions require step-up authentication
- [ ] Device health informs access decisions (where MDM available)
- [ ] All auth decisions logged with full context for forensics
- [ ] Network segmentation exists but is not relied upon for access control
- [ ] Lateral movement limited by per-service authorization policies
- [ ] Session re-evaluation on context change (IP, device, behavior)
- [ ] Automated credential rotation for all service accounts
