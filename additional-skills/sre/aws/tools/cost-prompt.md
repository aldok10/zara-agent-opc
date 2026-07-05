---
type: tool
title: "AWS Cost Optimization Prompt"
---

# AWS Cost Optimization Prompt

## Purpose
Identify AWS cost savings opportunities through rightsizing, reserved capacity, spot instances, and elimination of unused resources.

## When to Use
- Monthly or quarterly cloud cost reviews
- Responding to unexpected billing increases
- Planning reserved instance or savings plan purchases
- Identifying unused or underutilized resources

## Prompt Template

```
You are a FinOps engineer analyzing AWS costs for optimization opportunities.

CONTEXT:
- Account(s): {account_ids_or_org_structure}
- Monthly spend: {current_monthly_total}
- Growth trend: {increasing|stable|decreasing}
- Commitment coverage: {percentage_of_spend_covered_by_RI_SP}
- Cost Explorer data available: {yes|no}
- Trusted Advisor findings: {paste_if_available}

COST DATA:
{paste_cost_breakdown_by_service_or_cost_explorer_export}

ANALYZE THESE CATEGORIES:

1. RIGHTSIZING
   - EC2 instances with <20% average CPU utilization
   - RDS instances oversized for actual query load
   - ElastiCache nodes with low memory/connection usage
   - EBS volumes with low IOPS utilization (gp3 downgrade, remove provisioned)
   - Lambda functions over-allocated memory

2. RESERVED / SAVINGS PLANS
   - Stable workloads running on-demand (conversion candidates)
   - RI expiration dates approaching (renewal planning)
   - Compute vs EC2 Instance Savings Plans tradeoff
   - Coverage gaps: on-demand spend that should be committed

3. SPOT OPPORTUNITIES
   - Stateless workers eligible for Spot (batch, CI/CD, dev)
   - Spot interruption tolerance assessment
   - Mixed instance policies for ASGs
   - Spot vs Fargate Spot for container workloads

4. UNUSED RESOURCES (WASTE)
   - Unattached EBS volumes
   - Idle load balancers (zero healthy targets)
   - Unused Elastic IPs
   - Old snapshots and AMIs beyond retention
   - Stopped instances with attached storage
   - NAT Gateway in VPCs with no private subnet traffic

5. ARCHITECTURE OPTIMIZATIONS
   - Data transfer costs (cross-AZ, cross-region, internet egress)
   - S3 storage class optimization (Intelligent Tiering, Glacier)
   - CloudFront for reducing origin load and egress
   - Graviton migration savings (ARM instances)
   - Serverless replacement for low-utilization services

RULES:
- Quantify each recommendation: estimated monthly savings
- Risk-rate each change: no-risk, low-risk, needs-testing
- Prioritize by savings-to-effort ratio
- Don't recommend cuts that would degrade reliability below SLA
- Include implementation steps (not just "use smaller instance")
```

## Output Format

```markdown
## AWS Cost Optimization Report

### Summary
- Current monthly: ${amount}
- Identified savings: ${amount} ({percentage}%)
- Quick wins (this week): ${amount}
- Medium-term (this month): ${amount}

### Recommendations
| # | Category | Resource | Current Cost | Savings | Risk | Effort |
|---|----------|----------|-------------|---------|------|--------|

### Quick Wins (No Risk)
1. [Action + estimated savings]

### Rightsizing Plan
| Resource | Current | Recommended | Monthly Savings |

### Commitment Recommendations
| Type | Term | Upfront | Monthly Effective Rate | Annual Savings |

### Waste Elimination
| Resource | Type | Monthly Cost | Action |

### Implementation Priority
1. [Highest ROI action]
2. [Second priority]
```
