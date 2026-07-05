---
type: subskill
title: "Commitment Discounts"
---

# Commitment Discounts

Savings Plans, Reserved Instances, Committed Use Discounts, and purchasing strategy.

## When to Load
- Evaluating commitment discount options across cloud providers
- Sizing commitment purchases for maximum savings
- Building a commitment strategy (term, upfront, coverage)
- Reviewing commitment utilization and coverage

## Key Concepts

**AWS options:**
- Compute Savings Plans: flexible (any instance family/region/OS), up to 66% off
- EC2 Instance Savings Plans: locked to family+region, up to 72% off
- Reserved Instances: legacy, being superseded by Savings Plans

**GCP options:**
- Committed Use Discounts (CUDs): 1yr (20% off) or 3yr (57% off), resource-based
- Flexible CUDs: apply across machine types within same category
- Spend-based CUDs: for specific services (Cloud SQL, GKE)

**Azure options:**
- Azure Savings Plans: Compute, flexible, up to 65% off
- Reserved Instances: VM-specific, up to 72% off
- Reserved Capacity: databases, storage, specific SKUs

**Strategy framework:**
1. Measure steady-state baseline (30-60 days)
2. Commit to 70-80% of baseline (conservative)
3. Layer specificity: general savings plans first, specific RIs for predictable workloads
4. Review monthly, top up quarterly

## Patterns

**Commitment sizing analysis:**
```
Step 1: Identify baseline
  - Pull 30-day hourly on-demand spend from Cost Explorer
  - Calculate p10 (floor), p50 (median), p90 (peak)
  - Filter out one-time charges and spot

Step 2: Size commitments
  Conservative: commit to p10 (maximum utilization, minimum savings)
  Moderate: commit to p25 (good balance)
  Aggressive: commit to p50 (higher savings, risk of underutilization)

Step 3: Layer commitments
  Layer 1: Compute Savings Plan @ p10 of total compute (most flexible)
  Layer 2: EC2 Savings Plan for known instance families @ delta to p25
  Layer 3: Spot/on-demand for remainder

Step 4: Choose terms
  3yr no-upfront: best savings, highest commitment
  1yr no-upfront: good for uncertain growth
  Mix: 3yr for stable core, 1yr for growth buffer
```

**AWS Savings Plan purchase (CLI):**
```bash
aws savingsplans create-savings-plan \
  --savings-plan-offering-id <offering-id> \
  --commitment 50.00 \
  --purchase-time "2025-07-01T00:00:00Z"

aws savingsplans describe-savings-plans-offerings \
  --savings-plan-type ComputeSavingsPlans \
  --durations 94608000 \
  --payment-options NoUpfront \
  --product-type EC2
```

**GCP CUD (Terraform):**
```hcl
resource "google_compute_commitment" "cpu_commitment" {
  name   = "3yr-cpu-commitment"
  region = "us-central1"
  plan   = "THIRTY_SIX_MONTH"
  type   = "GENERAL_PURPOSE"

  resources {
    type   = "VCPU"
    amount = 100
  }
  resources {
    type   = "MEMORY"
    amount = 400
  }
}
```

## Gotchas
- Savings Plans apply to highest-discount-eligible usage first -- can't target specific accounts
- Unused commitments are wasted money -- utilization monitoring is critical
- 3-year terms lock you in -- risky if migrating clouds or reducing spend
- GCP CUDs don't apply to preemptible/spot VMs
- Azure Reserved Instances can be exchanged (same family) but not refunded after 72 hours
- Over-committing is worse than under-committing -- you pay regardless of usage
- Commitments don't cover data transfer, storage IOPS, or API request costs

## Verification
- AWS: `aws savingsplans describe-savings-plans` + utilization report in Cost Explorer
- GCP: `gcloud compute commitments list --region=<region>`
- Azure: Reservation utilization report in Cost Management
- Target: >80% utilization on all active commitments
- Monthly review: coverage (% of eligible spend covered) and utilization (% of commitment used)
- Alert on utilization dropping below 70% (indicates over-commitment or workload reduction)
