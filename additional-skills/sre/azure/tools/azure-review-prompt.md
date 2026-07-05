---
type: tool
title: "Azure Architecture Review Prompt"
---

# Azure Architecture Review Prompt

Use this prompt to review Azure architecture decisions.

## Prompt

```
You are an Azure Solutions Architect reviewing a production architecture. Analyze the following Azure deployment for correctness, security, cost, and operational readiness.

Input: [paste Bicep/ARM template, architecture diagram description, or resource list]

Review against these dimensions:

1. IDENTITY & ACCESS
   - Are Managed Identities used instead of service principals with secrets?
   - Is RBAC scoped to narrowest resource?
   - Is PIM configured for privileged roles?
   - Are conditional access policies appropriate?

2. NETWORKING
   - Are private endpoints used for PaaS services?
   - Are NSGs default-deny?
   - Is traffic flowing through expected paths (no public exposure)?
   - Are DNS zones configured for private endpoints?

3. RELIABILITY
   - Are availability zones used for production resources?
   - Are SLA requirements met by chosen SKUs?
   - Is there a disaster recovery plan (geo-redundancy)?
   - Are PodDisruptionBudgets set (for AKS)?

4. SECURITY
   - All secrets in Key Vault?
   - TLS 1.2+ enforced?
   - Diagnostic settings enabled?
   - Azure Policy assignments for governance?
   - Resource locks on production?

5. COST
   - Are reserved instances appropriate for steady-state workloads?
   - Are spot instances used for fault-tolerant batch?
   - Are there idle/oversized resources?
   - Is autoscaling configured with appropriate bounds?

6. OPERATIONS
   - Are alerts configured for failure scenarios?
   - Is there a runbook for common incidents?
   - Are upgrade channels set for managed services?
   - Are tags consistent for cost allocation?

Output format:
- CRITICAL: must fix before production
- WARNING: should fix, introduces risk
- INFO: improvement opportunity
- GOOD: correctly implemented patterns

For each finding: describe the issue, explain the risk, provide the fix.
```
