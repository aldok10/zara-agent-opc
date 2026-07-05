---
type: subskill
title: "AWS Cost Management"
---

# AWS Cost Management

Cost Explorer, Savings Plans, right-sizing, and tagging strategies for FinOps.

## When to Load
- Analyzing or reducing AWS spend
- Implementing tagging and cost allocation
- Evaluating Savings Plans vs Reserved Instances
- Setting up budgets and alerts

## Key Concepts

**Cost visibility layers:**
1. Cost Explorer: historical analysis, forecasting, grouping/filtering
2. Cost and Usage Report (CUR): line-item detail, Athena queryable
3. Cost Allocation Tags: map spend to teams/services/environments

**Commitment options:**
- Savings Plans: Compute SP (flexible), EC2 SP (specific family), SageMaker SP
- Reserved Instances: capacity reservation, less flexible, being phased out
- Commit to steady-state baseline; use on-demand/spot for variable load

**Right-sizing:** match instance type to actual utilization. Compute Optimizer uses ML on CloudWatch metrics to recommend changes.

## Patterns

**Tagging strategy (minimum viable):**
```
Required tags:
  Environment: prod | staging | dev
  Team: platform | backend | data
  Service: api-gateway | user-service | analytics
  CostCenter: CC-1234
  ManagedBy: terraform | manual

Enforce via SCP:
  Deny ec2:RunInstances if missing required tags
  Deny s3:CreateBucket if missing required tags
```

**Budget alert (Terraform):**
```hcl
resource "aws_budgets_budget" "monthly" {
  name         = "monthly-total"
  budget_type  = "COST"
  limit_amount = "10000"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  notification {
    comparison_operator       = "GREATER_THAN"
    threshold                 = 80
    threshold_type            = "PERCENTAGE"
    notification_type         = "FORECASTED"
    subscriber_email_addresses = ["platform-team@company.com"]
  }
}
```

**CUR query (Athena) -- top spend by service:**
```sql
SELECT
  line_item_product_code AS service,
  SUM(line_item_unblended_cost) AS cost
FROM cur_database.cur_table
WHERE month = '7' AND year = '2025'
GROUP BY line_item_product_code
ORDER BY cost DESC
LIMIT 20;
```

**Savings Plan sizing approach:**
1. Pull 30-day baseline from Cost Explorer (filter out one-time charges)
2. Identify steady-state compute floor (p10 daily spend)
3. Commit 70-80% of floor to Compute Savings Plan (3yr no upfront for max savings, 1yr no upfront for flexibility)
4. Layer EC2 SP for predictable instance families
5. Review utilization monthly; top up if consistently >95% utilized

## Gotchas
- Untagged resources are invisible to cost allocation -- enforce early
- Savings Plans apply automatically to highest-discount-eligible usage first
- Data transfer costs often surprise: cross-AZ ($0.01/GB each way), NAT Gateway ($0.045/GB)
- CloudWatch costs scale with custom metrics and high-resolution
- Stopped EC2 instances still incur EBS volume charges
- S3 costs: factor in requests, not just storage (many small GETs add up)
- Unused Elastic IPs charged $0.005/hour
- Multi-AZ RDS doubles compute cost (but necessary for production)

## Verification
- Cost Explorer anomaly detection for unexpected spikes
- AWS Trusted Advisor for idle resources
- Compute Optimizer recommendations (check weekly)
- `aws ce get-cost-and-usage` for programmatic cost queries
- S3 Storage Lens for bucket-level cost insights
- Tag Editor for finding untagged resources
