---
name: networking
description: "Network engineering: TLS/mTLS, service mesh, DNS failover, CDN, zero-trust, load balancing, DDoS protection, Network Policies"
---

# Network Engineering

Production network design covering encrypted transport, identity-based access, traffic distribution, DNS architecture, and edge protection.

## Scope

TLS/mTLS certificate lifecycle (cert-manager, ACME, Let's Encrypt). CDN and edge protection (Cloudflare, CloudFront, WAF, DDoS mitigation). Zero-trust networking (BeyondCorp, Tailscale, Cloudflare Access). DNS architecture -- multi-region failover (Route53, Cloud DNS), split-horizon, DNSSEC, CoreDNS. L4/L7 load balancing (weighted, geographic, connection draining). Service mesh (Cilium, Istio, Linkerd, Envoy). Kubernetes Network Policies and eBPF dataplane. Private connectivity (PrivateLink, Private Service Connect). Cross-cluster and multi-cloud networking.

## First Action

When loaded: verify TLS posture (`testssl.sh` against primary endpoints), check cert expiry (`kubectl get certificates -A`), identify CNI and mesh (`kubectl get pods -n kube-system`), review Network Policies (`kubectl get networkpolicies -A`), confirm DNS failover health checks active.

## Constraints

1. TLS 1.2+ everywhere; prefer TLS 1.3 -- no legacy ciphers or protocols allowed
2. All service-to-service communication requires mTLS; no plaintext east-west traffic
3. cert-manager + ACME (Let's Encrypt) for automated certificate issuance and rotation
4. Zero-trust model: authenticate and authorize every request regardless of network location
5. Default-deny NetworkPolicy applied to every namespace before workloads deploy
6. DNS TTL: internal services < 60s for failover; external records 60-300s maximum
7. CDN in front of all static assets and cacheable API responses
8. DDoS protection at edge -- CDN + WAF + rate limiting before traffic hits origin
9. Health checks at LB layer must use application-level probes, not TCP connect alone
10. Private connectivity (PrivateLink/PSC) for all internal cross-service communication
11. Gateway API (v1.3+) replaces Ingress; no new Ingress resources
12. Cert rotation: mesh certs every 24h (SPIFFE identity), edge certs via ACME auto-renewal
13. Multi-region DNS failover with active health checks (Route53 failover or Cloud DNS)
14. Egress traffic filtered through FQDN-based policies; no unrestricted outbound
15. Network segmentation: separate VPCs/subnets for tiers (edge, app, data, management)

## DO NOT

1. Allow TLS 1.0/1.1 anywhere -- enforce minimum 1.2 at all terminators
2. Trust source IP as authentication -- use identity (mTLS, tokens, SPIFFE)
3. Use self-signed certs in production without explicit pinning and rotation plan
4. Expose internal services directly to the internet without edge protection
5. Set DNS TTL >3600s for any service that needs failover capability
6. Deploy service mesh sidecars when proxy-free mTLS (Cilium) is available
7. Create Network Policies with empty ingress rules (implicit allow-all)
8. Mix iptables and eBPF datapath modes within the same cluster
9. Skip MTU validation when changing CNI, enabling encryption, or crossing cloud boundaries

## Route to Subskill

| Signal | Subskill | Focus |
|--------|----------|-------|
| Service mesh selection or mTLS config | service-mesh | Cilium/Istio/Linkerd, auto-mTLS, SPIFFE |
| Domain resolution, failover routing | dns | Record types, TTL tuning, Route53/Cloud DNS, split-horizon, DNSSEC |
| Certificate issuance, rotation, ACME | tls-mtls | cert-manager, ClusterIssuer, cipher suites, TLS version enforcement |
| Traffic distribution, health checks | load-balancing | L4 vs L7, algorithms, weighted/geographic, connection draining, sticky sessions |
| Identity-based access, perimeter-free | zero-trust | BeyondCorp, Tailscale, Cloudflare Access, identity-aware proxies |
| Packet capture, connectivity failures | debugging | tcpdump, dig, traceroute, Hubble flows, eBPF tracing |
| GKE/GCP network design | sre-gcp | VPC, subnets, Private Service Connect |
| Network latency SLO breach | sre-observability | Hubble flows, L7 latency tracing |

## Verification

- [ ] `testssl.sh` against all public endpoints -- A+ rating, no TLS <1.2
- [ ] Certificate expiry monitoring: alert fires >14 days before expiry
- [ ] mTLS enforced: services reject plaintext connections (verify with `curl --plaintext`)
- [ ] Default-deny NetworkPolicy exists in every namespace
- [ ] DNS failover: simulate region failure, confirm traffic shifts within TTL window
- [ ] CDN cache-hit ratio >80% for static assets (check CDN analytics)
- [ ] Zero-trust: internal service unreachable without valid identity token
- [ ] `cilium connectivity test` passes (if Cilium is CNI)
- [ ] No pods running with hostNetwork outside system namespaces

## Knowledge

- knowledge/tls-mtls-cert-lifecycle.md
- knowledge/cdn-edge-protection.md
- knowledge/zero-trust-patterns.md
- knowledge/dns-failover-multi-region.md
- knowledge/network-policy-recipes.md
- knowledge/load-balancing-patterns.md

## AI-Era Context (2026)

- Gateway API v1.3 is GA; Ingress deprecated in Kubernetes 1.32
- Cilium 1.16+ replaces kube-proxy entirely; eBPF handles all service routing
- cert-manager 1.15+ supports Gateway API TLS listeners natively
- Cloudflare/CloudFront push QUIC (HTTP/3) as default for edge termination
- SPIFFE/SPIRE federation enables cross-cluster identity without shared CA
- Zero-trust proxies (Tailscale Funnel, Cloudflare Tunnel) replace traditional VPNs
- AI workloads (GPU clusters) require jumbo frames (9000 MTU) and RDMA-aware networking

## Ecosystem / Related Skills

cert-manager, Cilium, Istio, Envoy, Linkerd, CoreDNS, external-dns, Cloudflare, CloudFront, Tailscale, Nginx, HAProxy, Hubble, testssl.sh, Route53, Cloud DNS

- sre-gcp
- sre-observability
- sre-security-ops
- sre-incident-response
- sre-platform-engineering
