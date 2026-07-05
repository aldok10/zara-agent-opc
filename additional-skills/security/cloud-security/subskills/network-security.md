---
type: subskill
title: "Cloud Network Security"
---

# Cloud Network Security

VPC isolation, traffic filtering, DDoS mitigation, and microsegmentation in cloud environments.

## When to Load

- Designing VPC architectures with proper isolation
- Configuring WAF rules and DDoS protection
- Implementing microsegmentation between services
- Troubleshooting connectivity issues caused by security controls
- Setting up network monitoring and flow log analysis

## Key Concepts

**VPC Design Principles**
- Separate VPCs for production, staging, and development
- Private subnets for all workloads; public subnets only for load balancers
- Transit Gateway for hub-and-spoke connectivity
- VPC endpoints for AWS service access without internet traversal
- No direct internet access from workload subnets (NAT or proxy only)

**Defense in Depth Layers**
1. Edge: CloudFront/CDN + AWS Shield + WAF
2. Perimeter: NLB/ALB in public subnet with security groups
3. Application: Security groups on compute (allow only from LB)
4. Data: Security groups on databases (allow only from app tier)
5. DNS: Route53 resolver rules + DNS firewall

**WAF Strategy**
- Managed rule groups as baseline (OWASP Core, Known Bad Inputs)
- Custom rules for app-specific patterns (valid paths, rate limiting)
- Rate-based rules per IP to prevent brute force
- Geo-restriction where business allows
- Log all requests; block mode only after testing in count mode

**Microsegmentation**
- Kubernetes: NetworkPolicies (default deny all, explicit allow)
- Service mesh: mTLS between services (Istio, Linkerd)
- Cloud-native: security groups per service role
- Zero trust: verify identity on every request, not just at perimeter

## Patterns

```yaml
# Kubernetes default-deny NetworkPolicy
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress

---
# Allow specific service communication
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-api-to-db
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: postgres
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: api-server
      ports:
        - port: 5432
          protocol: TCP
```

**Flow Log Analysis Queries**
- Rejected traffic patterns reveal misconfigured security groups
- Unusual port usage indicates potential lateral movement
- High-volume flows to external IPs suggest data exfiltration
- DNS query logs reveal tunneling or C2 communication

## Gotchas

- Security groups are stateful; NACLs are stateless -- don't mix up behavior
- VPC peering is non-transitive; Transit Gateway solves hub routing
- WAF regex rules have size limits; complex patterns may need multiple rules
- NetworkPolicies require a CNI that supports them (Calico, Cilium -- not default AWS VPC CNI without addon)
- Flow logs have 10-15 minute delay; not suitable for real-time alerting
- IPv6 dual-stack introduces separate security group rules often forgotten

## Verification

- Port scan from external -- confirm only intended ports respond
- Test WAF rules with OWASP ZAP or known attack payloads
- Verify NetworkPolicies by attempting cross-namespace connections
- Check VPC flow logs for unexpected ACCEPT entries
- Run ScoutSuite or Prowler for network configuration audit
- Confirm no 0.0.0.0/0 ingress rules on non-LB security groups
