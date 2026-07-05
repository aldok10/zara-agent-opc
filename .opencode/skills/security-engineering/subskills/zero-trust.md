# Subskill: Zero Trust

> Activate when: zero trust, BeyondCorp, network location, microsegmentation, service mesh, mTLS, identity-aware proxy, IAP, device trust, continuous verification, least privilege.

**Core**: Never trust, always verify. Network location grants no privilege. Every request is authenticated, authorized, and encrypted regardless of where it originates. Assume the network is already compromised.

## Core Principles

1. **Verify explicitly**  --  authenticate and authorize every request on identity + context, not IP.
2. **Least privilege**  --  grant the minimum access, just-in-time, time-boxed.
3. **Assume breach**  --  segment, encrypt, log, and limit blast radius as if the attacker is already inside.

## BeyondCorp Model

Google's zero-trust implementation: access decisions move from the network perimeter to individual devices + users. No VPN-implied trust. Every access goes through an **identity-aware proxy** that checks user identity, device state, and context per request. Internal apps are treated exactly like internet-facing ones.

## Never Trust Network Location

- A request from the internal subnet is not more trusted than one from the internet.
- Kill the "hard shell, soft center" model  --  flat internal networks let one breach spread laterally.
- Remove implicit trust from VPNs; VPN grants network reachability, not application access.

## Microsegmentation

- Divide the network into small zones; default-deny between them. Only explicitly allowed flows pass.
- Segment by workload identity, not IP/VLAN. Limits lateral movement  --  a compromised service reaches only what policy permits.
- Enforce with network policies (Kubernetes NetworkPolicy, Cilium) + host firewalls.

## Service Mesh mTLS

- Mesh (Istio, Linkerd) issues short-lived workload identities (SPIFFE SVIDs) and enforces **mTLS** on all service-to-service traffic automatically.
- Both encrypts in transit and authenticates the calling workload  --  spoofing an internal service requires a valid cert.
- Layer authorization policies (AuthorizationPolicy) on top: which identity may call which service/method.

## Identity-Aware Proxy (IAP)

- Front applications with an IAP that authenticates the user (OIDC) and evaluates device + context before forwarding.
- Removes the need for the app to sit on a trusted network. Central point for auth, logging, and policy.

## Device Trust

- Factor device posture into access: managed?, disk-encrypted?, OS patched?, EDR present?
- Issue device certificates; bind sessions to attested devices. Deny or step-up on untrusted/unhealthy devices.

## Continuous Verification

- Trust is not one-time at login. Re-evaluate on risk signals: new location, anomalous behavior, elevated action → step-up auth or terminate session.
- Short-lived tokens/certs force frequent re-verification. Feed auth + access logs into risk scoring.

## Least Privilege Access

- Deny by default; grant specific, scoped permissions. Use just-in-time elevation (request → approve → time-boxed grant).
- Policy-as-code (OPA/Rego, Cedar)  --  version, test, and audit authorization rules. Regularly review and revoke unused access.

## Verification

- No implicit network trust in architecture diagram.
- mTLS on all internal service traffic.
- Default-deny network + authz policies, reviewed.

## Delegates To

- **authentication**  --  identity + token mechanics.
- **api-security**  --  mTLS, request-level enforcement.
- **platform-engineering**  --  mesh/network policy rollout.
