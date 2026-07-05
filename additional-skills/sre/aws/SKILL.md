---
name: aws
description: "AWS infrastructure: Well-Architected, IAM, VPC, EKS, serverless, Organizations"
---

# AWS Specialist

Production cloud infrastructure on AWS following Well-Architected Framework principles.

## Scope

Covers IAM policy design, VPC networking, EKS clusters, serverless patterns, Organizations/SCPs, cost optimization, and security posture. Applies to multi-account architectures using Control Tower, Identity Center, and modern compute (Graviton, Karpenter, Lambda).

## First Action

When loaded: identify the AWS service area (IAM, networking, compute, serverless, security, cost) and determine the account structure. Check for existing IaC (Terraform/CDK) before proposing changes. Verify the organizational context (single account vs Organizations).

## Constraints

1. IAM least privilege -- start with zero permissions, add specific actions on specific resources with conditions
2. Multi-AZ mandatory for production -- no single-AZ deployments for any stateful or critical service
3. VPC design: private subnets for workloads, public subnets only for ALB/NLB/NAT Gateway
4. Encryption at rest (KMS CMK with rotation) and in transit (TLS 1.3 minimum) -- no exceptions
5. SCPs as organizational guardrails -- deny dangerous actions (leaving org, disabling CloudTrail, public S3)
6. No root account usage -- SSO via Identity Center with MFA; root credentials in break-glass safe
7. Tag everything with: team, environment, cost-center, service -- enforce via SCP tag policies
8. EKS: managed node groups or Karpenter; Pod Identity over IRSA; Graviton instances for cost savings
9. CloudTrail (org trail, all regions) + GuardDuty + Security Hub enabled in every account
10. Account-per-workload isolation via Organizations -- shared-services, security, log-archive accounts separate
11. S3 Block Public Access enabled at organization level; bucket policies deny non-SSL requests
12. VPC endpoints (Gateway for S3/DynamoDB, Interface for others) to avoid NAT Gateway data charges
13. Use OIDC federation for CI/CD access -- zero static IAM access keys in any account
14. RDS/Aurora: Multi-AZ, automated backups with 7+ day retention, IAM DB authentication, encryption
15. Lambda: arm64 runtime for 20% cost reduction, reserved concurrency for critical functions, 256MB minimum memory

## DO NOT

1. Use long-lived IAM access keys when OIDC identity federation or IAM roles are available
2. Deploy production workloads to a single AZ (violates availability requirements)
3. Open 0.0.0.0/0 inbound on security groups except ALB port 443 (use prefix lists for known sources)
4. Use the default VPC for production workloads (it has public IPs by default, overly permissive NACLs)
5. Store secrets in SSM Parameter Store without SecureString or use plaintext in environment variables
6. Create IAM policies with `"Effect": "Allow", "Action": "*", "Resource": "*"` (admin access)
7. Skip cost allocation tags (impossible to attribute spend without them)
8. Use us-east-1 as sole region for global production (latency + regional blast radius)
9. Disable GuardDuty findings or suppress without investigation and documented exception

## Route to Subskill

| Signal | Subskill | Focus |
|--------|----------|-------|
| Permissions, roles, federation | iam | Policies, roles, OIDC, SCPs, Access Analyzer |
| Network design, connectivity | networking-vpc | VPC, subnets, TGW, PrivateLink, NACLs |
| EC2, EKS, ECS workloads | compute | Instance selection, Graviton, Karpenter, spot |
| Lambda, Step Functions, events | serverless | Event-driven, cold starts, concurrency, cost |
| Billing, waste, reservations | cost | Cost Explorer, Savings Plans, right-sizing |

## Verification

- [ ] IAM Access Analyzer shows no unintended external or cross-account access
- [ ] Security Hub score >90% with no critical findings unresolved
- [ ] No public S3 buckets (Block Public Access at org level)
- [ ] CloudTrail enabled all regions, all accounts, with log file validation
- [ ] VPC Flow Logs enabled for production VPCs (at minimum reject traffic)
- [ ] All production RDS instances are Multi-AZ with encryption enabled
- [ ] No IAM users with access keys older than 90 days (rotate or convert to OIDC)

## Knowledge

- knowledge/aws-iam-patterns.md
- knowledge/aws-vpc-design.md
- knowledge/aws-eks-production.md
- knowledge/aws-organizations-scps.md
- knowledge/aws-cost-optimization.md

## AI-Era Context (2026)

- EKS Pod Identity replaced IRSA as the recommended pod-level AWS credential mechanism
- Graviton4 (R8g, M8g, C8g) instances deliver 30%+ price-performance over x86 equivalents
- IAM Access Analyzer now validates policies against access patterns (unused permissions detection)
- S3 Express One Zone provides single-digit-ms latency for ML training data and analytics
- Lambda SnapStart for Java/Python eliminates cold starts via pre-initialized snapshots
- AWS Organizations Resource Control Policies (RCPs) complement SCPs for resource-based policy control
- CloudTrail Lake provides SQL-based querying of management and data events across accounts
- VPC Lattice simplifies service-to-service connectivity across VPCs and accounts without TGW complexity

## Related Skills

- terraform -- IaC for provisioning AWS resources
- kubernetes -- EKS workload orchestration
- networking -- VPC, Transit Gateway, PrivateLink patterns
- security-ops -- GuardDuty, Security Hub, incident response
