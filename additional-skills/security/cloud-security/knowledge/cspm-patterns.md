---
type: fact
title: "Cloud Security Posture Management (CSPM) Patterns"
---

# Cloud Security Posture Management (CSPM) Patterns

Detection and remediation of cloud infrastructure misconfigurations across AWS, GCP, and Azure.

## What CSPM Solves

Cloud environments drift from secure baselines due to:
- Manual console changes outside IaC
- Permissive defaults in cloud services
- Developers over-provisioning for speed
- Cross-account/cross-project visibility gaps
- Ephemeral resources escaping audit

## Critical Misconfiguration Categories

### Storage Exposure
- S3/GCS/Blob buckets with public access
- Unencrypted storage at rest
- Missing access logging on sensitive buckets
- Cross-account access without condition keys

### Network
- Security groups with 0.0.0.0/0 ingress on non-HTTP ports
- VPCs without flow logs enabled
- Missing network segmentation between environments
- Public IPs on internal-only workloads
- DNS dangling (CNAME pointing to deprovisioned resources)

### Identity
- IAM users with console access + long-lived keys
- Roles with `*:*` permissions (admin sprawl)
- Service accounts with unused permissions (stale access)
- Missing MFA on root/admin accounts
- Cross-account assume-role without external ID

### Compute
- Instances/containers running as root
- Unpatched AMIs/images older than 30 days
- Missing IMDSv2 enforcement (SSRF to metadata)
- Publicly accessible management ports (SSH/RDP)
- Lambda functions with overly broad VPC access

### Data
- RDS/databases publicly accessible
- Unencrypted database connections (no SSL enforcement)
- Backup/snapshot sharing with external accounts
- Missing deletion protection on production databases

## Detection Architecture

```
┌─────────────────────────────────────────────┐
│              CSPM Platform                    │
│  ┌─────────┐ ┌──────────┐ ┌──────────────┐ │
│  │ Scanner │ │ Policy   │ │ Remediation  │ │
│  │ (API)   │ │ Engine   │ │ Automation   │ │
│  └────┬────┘ └────┬─────┘ └──────┬───────┘ │
└───────┼───────────┼───────────────┼─────────┘
        │           │               │
   ┌────▼────┐ ┌────▼────┐    ┌────▼─────┐
   │ Cloud   │ │ Custom  │    │ IaC PR   │
   │ APIs    │ │ Rules   │    │ Auto-fix │
   └─────────┘ └─────────┘    └──────────┘
```

## Tool Landscape (2026)

| Tool | Type | Strengths |
|------|------|-----------|
| Wiz | Agent + agentless | Risk graph, attack path analysis |
| Prisma Cloud (Palo Alto) | Full CNAPP | Breadth, compliance mapping |
| Prowler | OSS, AWS-focused | Free, CIS benchmarks, CLI-friendly |
| ScoutSuite | OSS, multi-cloud | Audit reports, no agent needed |
| Checkov | IaC scanning | Pre-deploy prevention, Terraform/K8s |
| AWS Config | Native | Real-time rules, auto-remediation |
| Azure Policy | Native | Built-in, deny effects |
| GCP SCC | Native | Integrated findings, threat detection |

## Implementation Pattern

### Phase 1: Visibility (Week 1-2)
1. Enable cloud-native config recording (AWS Config, Azure Policy, GCP Asset Inventory)
2. Deploy Prowler/ScoutSuite for baseline assessment
3. Inventory all accounts/projects/subscriptions
4. Map asset ownership to teams

### Phase 2: Policy (Week 3-4)
1. Define organizational security baseline (CIS L1 minimum)
2. Write custom rules for business-specific requirements
3. Classify findings by severity and exploitability
4. Set SLA: critical 24h, high 72h, medium 2 weeks

### Phase 3: Enforcement (Week 5-8)
1. Preventive controls: deny non-compliant resource creation (SCPs, Azure Policy deny)
2. Detective controls: alert on drift from baseline
3. Corrective controls: auto-remediate safe issues (e.g., enable encryption, remove public access)
4. Exception process: documented, time-bound, reviewed quarterly

## Drift Detection

```
Baseline State (IaC) ──► Deployed State (Cloud API)
         │                          │
         └──────── DIFF ────────────┘
                    │
              ┌─────▼──────┐
              │ Expected?   │
              │ (planned    │──Yes──► Update baseline
              │  change)    │
              └─────┬──────┘
                    │ No
              ┌─────▼──────┐
              │ Severity?   │
              ├─ Critical ──► Auto-revert + alert
              ├─ High ──────► Alert + ticket
              └─ Medium ────► Log + weekly report
```

## Metrics

- Misconfiguration density: findings per 100 resources
- Mean time to detect (MTTD): from drift to alert
- Mean time to remediate (MTTR): from alert to fix
- Compliance score: % of resources passing baseline
- Drift rate: changes outside IaC per week
- Exception count and age: how many exemptions, how old
