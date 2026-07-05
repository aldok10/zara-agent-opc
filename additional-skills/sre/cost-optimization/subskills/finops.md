---
type: subskill
title: "FinOps"
---

# FinOps

Showback, chargeback, unit economics, and budget management for cloud costs.

## When to Load
- Implementing cost allocation and showback/chargeback
- Defining unit economics for cloud services
- Setting up budgets and anomaly detection
- Building a FinOps practice from scratch

## Key Concepts

**FinOps phases:** Inform (visibility) -> Optimize (reduce waste) -> Operate (continuous governance).

**Allocation models:**
- Showback: show teams their costs, no billing impact
- Chargeback: actually bill teams/BUs for their usage
- Split allocation: shared costs divided by usage proportion

**Unit economics:** cost per meaningful business unit. Examples: cost per transaction, cost per user, cost per API call. Normalizes spend against business growth.

**FinOps personas:** Engineering (optimize), Finance (forecast/budget), Leadership (unit economics), Platform (enable self-service cost data).

## Patterns

**Cost allocation strategy:**
```
Level 1: Cloud account/subscription per team (easiest)
Level 2: Tags/labels for resource-level allocation
Level 3: Kubernetes namespace + labels for shared clusters
Level 4: Custom metrics (requests, CPU-seconds) for shared services

Shared costs allocation:
  Proportional: divide by team's % of total usage
  Fixed: equal split across consuming teams
  Weighted: by agreed weights (headcount, revenue)
```

**Unit economics tracking:**
```
Monthly report:
  Total cloud spend: $150,000
  Monthly active users: 500,000
  Cost per user: $0.30
  
  Breakdown:
    Compute: $0.15/user (50%)
    Storage: $0.06/user (20%)
    Network: $0.04/user (13%)
    Databases: $0.03/user (10%)
    Other: $0.02/user (7%)

  Trend: cost/user decreased 8% MoM (efficiency gain)
  Target: cost/user < $0.25 by Q4
```

**Budget structure:**
```yaml
budgets:
  organization:
    monthly_total: 200000
    alert_thresholds: [70, 85, 95, 100]
    
  per_team:
    platform:
      monthly: 80000
      includes: [shared-infra, observability, networking]
    backend:
      monthly: 60000
      includes: [compute, databases, queues]
    data:
      monthly: 40000
      includes: [warehouse, pipelines, storage]
    
  anomaly_detection:
    sensitivity: medium
    lookback_days: 14
    alert_channel: "#finops-alerts"
```

**Tagging enforcement policy:**
```
Required tags (all resources):
  team: <owning-team>
  service: <service-name>
  environment: prod | staging | dev
  cost-center: <finance-code>

Optional but tracked:
  component: <sub-service>
  managed-by: terraform | crossplane | manual

Enforcement:
  New resources: block creation without required tags (SCP/Policy)
  Existing: weekly report of untagged resources
  Target: >95% tag compliance
```

## Gotchas
- Chargeback without optimization authority frustrates teams ("I can see costs but can't reduce them")
- Unit economics only work if the denominator (users, transactions) is accurately measured
- Cloud provider billing data lags 24-48 hours -- real-time is not possible
- Shared Kubernetes clusters make per-team attribution hard -- use namespace-level tooling (Kubecost, OpenCost)
- Amortized vs unblended costs: amortized spreads upfront payments; use amortized for team allocation
- Container costs: allocate by request (reserved) not actual usage (incentivizes right-sizing requests)

## Verification
- Monthly FinOps review with cost owners
- Unit economics trend (should be flat or decreasing as you scale)
- Tag compliance percentage (measure weekly)
- Budget alert response time (alert -> action)
- Savings Plan/RI utilization rate (target >80%)
- Anomaly detection precision (reduce false positive rate)
