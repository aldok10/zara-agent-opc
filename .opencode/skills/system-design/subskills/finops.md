---
type: subskill
title: "Cloud Cost Management & FinOps"
---

# Cloud Cost Management & FinOps

Engineering teams see and own their cloud costs. Finance provides guardrails, not approvals.

## Visibility First

Tag everything (team, service, environment), cost dashboards per team, monthly cost reviews. You can't optimize what you can't attribute.

## Cloud Cost Anatomy

Compute (50-70%), storage (15-25%), network (10-20%), managed services (variable).

## Quick Wins

- **Right-sizing**: VPA recommendations, downsize over-provisioned instances (typical 30-50% waste)
- **Reserved/Savings Plans**: 1-year commit = 30-40% savings, 3-year = 50-60%. Only for steady-state.
- **Spot/Preemptible**: 60-90% savings for fault-tolerant workloads (batch, CI, dev environments)
- **Delete unused**: orphaned volumes, stopped instances, old snapshots, unused load balancers
- **Autoscaling**: scale to zero for dev/staging outside hours, scale up on demand

## Cost Allocation

Showback (show teams their cost) before chargeback (bill teams). Start with showback to build awareness without friction.

## Quota Management

ResourceQuotas per namespace in K8s, AWS Service Quotas, budget alerts in cloud console.

## Cost Anomaly Detection

Alert on 20%+ daily spike. Investigate before the month-end surprise.

## Tools

- Native: AWS Cost Explorer, GCP Billing
- Third-party: Kubecost (K8s), Infracost (IaC PR comments), CloudZero, Spot.io

## FinOps in CI

Infracost in PR comments shows cost impact of IaC changes BEFORE merge.

## Unit Economics

Cost per request, cost per user, cost per transaction. Track over time; optimize the expensive ones.

## Anti-Patterns

- No tagging (can't attribute cost)
- No budgets (bill shock)
- Over-reserving (locked in for years)
- Optimizing before measuring
- Penny-wise pound-foolish (saving $100/mo but spending $5K in engineer time)
