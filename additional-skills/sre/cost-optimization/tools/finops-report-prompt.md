---
type: tool
title: "FinOps Report Generation Prompt"
---

# FinOps Report Generation Prompt

## Purpose
Generate a FinOps report with cost showback/chargeback, trend analysis, optimization recommendations, and forecasting.

## When to Use
- Monthly cloud cost reporting to stakeholders
- Building showback reports per team/service/environment
- Identifying cost trends and anomalies
- Presenting optimization progress and recommendations

## Prompt Template

```
You are a FinOps practitioner generating a cloud cost report.

CONTEXT:
- Cloud providers: {aws|gcp|azure|multi_cloud}
- Reporting period: {month_or_quarter}
- Allocation model: {tags|accounts|resource_groups|custom}
- Stakeholder audience: {engineering|finance|executives|team_leads}
- Budget: {monthly_budget_if_set}
- Previous period spend: {amount}

COST DATA:
{paste_cost_breakdown_by_team_service_or_environment}

GENERATE REPORT SECTIONS:

1. EXECUTIVE SUMMARY
   - Total spend this period vs budget vs last period
   - Percentage change and primary drivers
   - Top 3 cost-saving opportunities
   - Forecast for next period (based on trend)

2. SHOWBACK / CHARGEBACK
   - Cost per team/business unit
   - Cost per service/application
   - Cost per environment (prod/staging/dev)
   - Unallocated spend (untagged resources)
   - Unit economics (cost per user, per transaction, per request)

3. TREND ANALYSIS
   - Month-over-month change by category
   - Anomaly detection (spikes, unexpected growth)
   - Seasonal patterns if applicable
   - Cost per unit trending (improving or degrading efficiency?)

4. OPTIMIZATION TRACKING
   - Previously identified savings: implemented vs pending
   - New savings identified this period
   - Commitment utilization (RI/SP coverage and waste)
   - Waste metrics (unused resources, idle capacity)

5. RECOMMENDATIONS
   - Immediate actions (no risk, clear savings)
   - Short-term (within sprint, minor effort)
   - Medium-term (requires planning, architecture change)
   - Each: estimated savings, effort, owner

6. FORECAST
   - Next month projection (linear + known changes)
   - Risk factors (new launches, migrations, traffic growth)
   - Budget risk assessment (on-track, at-risk, exceeded)

RULES:
- Use consistent time periods for comparison (normalize for days in month)
- Distinguish between growth-driven cost increase vs waste
- Don't alarm on cost growth that correlates with revenue/traffic growth
- Include unit economics alongside absolute costs
- Make recommendations specific: resource IDs, not just "optimize compute"
```

## Output Format

```markdown
## Cloud Cost Report: {Period}

### Executive Summary
- Total spend: ${amount} ({+/-}X% vs last period)
- Budget status: {on_track|at_risk|exceeded}
- Top savings opportunity: {description} (${amount}/mo)

### Cost by Team
| Team | This Period | Last Period | Change | Budget |
|------|------------|------------|--------|--------|

### Cost by Service
| Service | Cost | % of Total | Trend |

### Anomalies
| Date | Service | Spike | Root Cause |

### Optimization Progress
| Recommendation | Status | Savings Realized |

### New Recommendations
| # | Action | Savings/mo | Effort | Owner |

### Forecast
- Next month projected: ${amount}
- Confidence: {high|medium|low}
- Risk factors: {list}
```
