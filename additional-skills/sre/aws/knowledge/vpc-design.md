# VPC Design

## Multi-AZ Architecture

- Minimum 2 AZs for HA, 3 AZs for production workloads
- Subnet tiers: public, private (app), private (data), private (management)
- Each tier spans all AZs for redundancy
- Size CIDR blocks for growth: /16 for VPC, /20-/22 per subnet tier per AZ
- Reserve IP space for future AZs and tiers
- Use secondary CIDR blocks if primary exhausted (RFC 6598: 100.64.0.0/10)

## Subnet Strategy

### Public Subnets
- Only for load balancers, NAT gateways, bastion hosts (if still needed)
- Auto-assign public IP disabled by default
- Route table: 0.0.0.0/0 -> Internet Gateway

### Private App Subnets
- Application workloads (ECS tasks, EKS pods, EC2 instances)
- Route table: 0.0.0.0/0 -> NAT Gateway (one per AZ for HA)
- No direct internet ingress

### Private Data Subnets
- RDS, ElastiCache, OpenSearch, other data stores
- No internet route (no NAT gateway route)
- Access only from app subnets via security groups

## NAT Gateway

- One per AZ for high availability (not one shared across AZs)
- Consider NAT instances for dev/non-prod to save cost
- Monitor `BytesOutToDestination` and `ErrorPortAllocation`
- For high-bandwidth: multiple NAT gateways with routing split
- IPv6 eliminates need for NAT (egress-only internet gateway instead)

## PrivateLink (VPC Endpoints)

### Gateway Endpoints (free)
- S3 and DynamoDB -- always enable, no cost
- Add to all route tables

### Interface Endpoints
- Per-AZ ENI, charged hourly + per-GB
- Prioritize: ECR (dkr + api), STS, Secrets Manager, KMS, CloudWatch Logs
- Use endpoint policies to restrict which principals/resources can be accessed
- Enable private DNS to override public endpoints transparently
- Consolidate: one endpoint serves all subnets in the VPC

## Transit Gateway

- Hub-and-spoke for multi-VPC and hybrid connectivity
- Replace VPC peering mesh when >3 VPCs
- Route tables for segmentation: prod, non-prod, shared services
- Supports inter-region peering for multi-region architectures
- Attach VPN and Direct Connect for hybrid
- Appliance mode for stateful inspection (firewall in separate VPC)
- Cost: per-attachment hourly + per-GB processed

## Security Groups

- Stateful, instance-level firewall
- Reference other security groups instead of CIDR where possible
- Pattern: `sg-alb` allows 443 from 0.0.0.0/0, `sg-app` allows 8080 from `sg-alb`
- No need for explicit deny -- implicit deny on everything not allowed
- Limit rules per SG (60 inbound default, request increase if needed)
- Prefix lists for managing CIDR sets across multiple SGs

## Network ACLs

- Stateless, subnet-level, processed in order
- Use sparingly -- primarily for explicit subnet-level denies
- Block known bad CIDR ranges at NACL level
- Remember: must allow ephemeral ports (1024-65535) for return traffic
- Default NACL allows all -- create custom for restricted subnets

## DNS and Route 53

- Enable VPC DNS resolution and DNS hostnames
- Private hosted zones for internal service discovery
- Route 53 Resolver endpoints for hybrid DNS (on-prem <-> AWS)
- Split-horizon DNS: same domain resolves differently internal vs external

## Flow Logs

- Enable at VPC level (captures all subnets)
- Send to CloudWatch Logs or S3 (S3 cheaper for long retention)
- Custom format: include `tcp-flags`, `pkt-srcaddr`, `pkt-dstaddr` for deep analysis
- Use Athena for querying S3-stored flow logs
- Alert on rejected traffic patterns (indicates misconfig or probing)

## Multi-Account VPC Strategy

- Dedicated VPC per workload/team/environment
- Shared services VPC: DNS, monitoring, CI/CD agents
- Use RAM (Resource Access Manager) to share subnets across accounts
- Transit Gateway owned by network account, shared to workload accounts
- IP address management: IPAM for automated, non-overlapping CIDR allocation

## IPv6

- Dual-stack for new deployments where possible
- Egress-only internet gateway replaces NAT for IPv6
- Security groups and NACLs apply equally to IPv6
- Not all services support IPv6 -- verify before mandating

## Anti-Patterns

- Single AZ deployments for anything production
- Overlapping CIDR blocks (blocks peering and TGW)
- NAT gateway in single AZ serving multi-AZ workloads
- Public subnets for application workloads
- Overly broad security group rules (0.0.0.0/0 on non-ALB)
- Not using VPC endpoints for high-traffic AWS service calls
