# AWS Networking & VPC

VPC architecture, connectivity patterns, and network security for production workloads.

## When to Load
- Designing multi-AZ or multi-account VPC layouts
- Setting up PrivateLink, peering, or Transit Gateway
- Troubleshooting connectivity or routing issues
- Planning hybrid connectivity (VPN, Direct Connect)

## Key Concepts

**VPC building blocks:** CIDR blocks, subnets (public/private/isolated), route tables, internet gateways, NAT gateways, network ACLs, security groups.

**Subnet tiers:**
- Public: route to IGW, hosts ALBs/NAT GWs
- Private: route to NAT GW, hosts compute
- Isolated: no internet route, hosts databases

**Connectivity options:**
- VPC Peering: 1:1, non-transitive, cross-region supported
- Transit Gateway: hub-and-spoke, transitive, route tables for segmentation
- PrivateLink: expose services without VPC peering, unidirectional
- Direct Connect: dedicated fiber, consistent latency

## Patterns

**Standard 3-tier VPC (per AZ):**
```
10.0.0.0/16 VPC
  10.0.0.0/24   public-a   (ALB, NAT GW)
  10.0.1.0/24   public-b
  10.0.10.0/24  private-a  (ECS/EKS, EC2)
  10.0.11.0/24  private-b
  10.0.20.0/24  isolated-a (RDS, ElastiCache)
  10.0.21.0/24  isolated-b
```

**PrivateLink for cross-account service exposure:**
```
Provider account:
  NLB -> target group -> service
  VPC Endpoint Service (allowlist consumer accounts)

Consumer account:
  VPC Interface Endpoint -> ENI in private subnet
  Private DNS resolves service.internal -> endpoint ENI
```

**Transit Gateway segmentation:**
```
TGW Route Table: shared-services
  Associations: shared-vpc, dev-vpc, prod-vpc
  Propagations: shared-vpc only

TGW Route Table: prod
  Associations: prod-vpc
  Propagations: prod-vpc, shared-vpc (not dev-vpc)
```

**Security group rules (stateful, prefer over NACLs):**
```
# App tier SG
Inbound: ALB-SG:443
Outbound: DB-SG:5432, NAT-prefix:443

# DB tier SG
Inbound: App-SG:5432
Outbound: none needed (stateful return traffic)
```

## Gotchas
- /16 is the largest VPC CIDR; plan for growth with secondary CIDRs
- NAT Gateway is per-AZ -- deploy one per AZ for HA
- Security groups are stateful; NACLs are stateless (need explicit return rules)
- VPC peering doesn't support overlapping CIDRs
- DNS resolution across peering requires `enableDnsHostnames` + `enableDnsSupport`
- PrivateLink charges per AZ per hour plus data processing
- Transit Gateway has 50 Gbps per AZ bandwidth limit

## Verification
- VPC Reachability Analyzer for path analysis without sending packets
- VPC Flow Logs (S3 or CloudWatch) for traffic visibility
- `aws ec2 describe-route-tables` to confirm routing
- Network Firewall or traffic mirroring for deep inspection
- `traceroute` / `mtr` from instances for hop-by-hop debugging
