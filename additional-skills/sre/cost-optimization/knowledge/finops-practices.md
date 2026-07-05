---
type: fact
title: "FinOps Practices"
---

# FinOps Practices

Cloud financial operations: showback, chargeback, unit economics, and organizational alignment for cost accountability.

## FinOps Framework

Three phases, run continuously:

### Inform (visibility)
- Cost allocation by team/service/environment
- Unit economics calculation (cost per request, cost per customer)
- Anomaly detection on spending changes
- Forecasting based on growth projections

### Optimize (action)
- Right-sizing based on utilization data
- Commitment discount purchases (CUDs, Savings Plans)
- Waste elimination (idle resources, over-provisioned storage)
- Architecture optimization (caching, data tiering, compute selection)

### Operate (governance)
- Budget guardrails and alerting
- Cost-aware architecture decisions in design reviews
- FinOps review cadence (weekly team, monthly leadership)
- Showback/chargeback to drive team accountability

## Cost Allocation

### Labeling Strategy

Every cloud resource must have:

| Label | Example | Purpose |
|-------|---------|---------|
| team | payments | Cost attribution |
| service | payment-api | Per-service tracking |
| environment | production | Env-level breakdown |
| tier | tier-1 | Priority classification |
| cost-center | eng-123 | Finance mapping |
| managed-by | crossplane | Automation tracking |

Enforcement: admission controller rejects resources without required labels.

### Allocation Models

**Showback** (recommended start): show teams their costs, no financial impact. Builds awareness.

**Chargeback**: allocate costs to team budgets. Creates accountability but adds process overhead.

**Hybrid**: chargeback for compute/storage (teams control), showback for shared infra (platform costs).

### Shared Cost Distribution

Shared resources (monitoring, networking, platform services) allocated by:

1. **Proportional usage**: split based on actual consumption (API calls, bytes stored)
2. **Even split**: divide equally among teams using the shared resource
3. **Fixed allocation**: predetermined percentage per team (simplest, least accurate)

Recommended: proportional for large shared costs (>$10k/month), even split for smaller items.

## Unit Economics

Raw cloud spend is meaningless without business context.

### Key Metrics

| Metric | Formula | Use |
|--------|---------|-----|
| Cost per request | monthly_cost / total_requests | Service efficiency |
| Cost per customer | monthly_cost / active_customers | Business unit economics |
| Cost per environment | env_cost / production_cost | Dev/staging efficiency |
| Infrastructure cost ratio | infra_cost / revenue | Business health |
| Cost per deployment | deploy_pipeline_cost / deploys | CI/CD efficiency |

### Tracking Over Time

Unit cost should trend flat or down as:
- Traffic grows (economies of scale)
- Optimization actions take effect
- Right-sizing recommendations applied

Red flags:
- Unit cost increasing without architecture change
- Cost per customer > $X threshold (varies by business)
- Dev/staging cost > 30% of production cost

## Anomaly Detection

### Automated Detection

Configure alerts for:
- Day-over-day increase > 20% per service
- Week-over-week increase > 30% per team
- New resource type appearing (someone deployed something expensive)
- Spot interruption rate increase (instance family availability changing)

### Root Cause Patterns

| Anomaly | Common Cause | Investigation |
|---------|-------------|---------------|
| Sudden spike | Runaway job, DDoS, misconfigured autoscaler | Check recent deploys, traffic patterns |
| Gradual increase | Data growth, traffic growth, missing lifecycle policies | Compare unit cost trend |
| New line item | New service deployed, feature flag enabled | Check resource creation timestamps |
| Egress spike | Cross-region replication, CDN miss rate | Check network flow logs |

## Forecasting

### Methods

**Linear extrapolation**: current spend + growth rate. Works for steady-state services.

**Seasonal adjustment**: account for business cycles (Black Friday, end of quarter).

**Capacity planning**: forecast from planned launches and growth targets.

### Accuracy Targets

| Timeframe | Accuracy Target | Method |
|-----------|----------------|--------|
| Next month | +/- 5% | Linear + known changes |
| Next quarter | +/- 15% | Seasonal + planned launches |
| Next year | +/- 30% | Growth model + architecture changes |

## FinOps Cadence

### Weekly (team level)
- Review cost anomaly alerts
- Check right-sizing recommendations
- Identify and clean idle resources
- Duration: 15 minutes in team standup

### Monthly (leadership)
- Actual vs budget review
- Unit economics trend
- Commitment discount utilization
- Top optimization opportunities ranked by savings
- Duration: 30-minute meeting

### Quarterly (strategy)
- Commitment discount renewal/purchase decisions
- Architecture optimization ROI review
- Budget planning for next quarter
- Team cost efficiency ranking

## Organizational Models

### Centralized FinOps Team
- Small team (2-3 people) owns tools, processes, and reporting
- Provides recommendations, teams execute
- Best for: organizations < 200 engineers

### Federated (FinOps Champions)
- One champion per engineering team
- Central team provides tooling and training
- Champions drive optimization within their team
- Best for: organizations 200-1000 engineers

### Embedded
- FinOps engineer embedded in each platform/product area
- Full context on team architecture and roadmap
- Most effective but most expensive
- Best for: organizations > 1000 engineers or $10M+ cloud spend

## Tooling Stack

| Layer | Tool | Purpose |
|-------|------|---------|
| Collection | Cloud billing export, OpenCost | Raw cost data |
| Allocation | OpenCost, Kubecost | Kubernetes pod-level attribution |
| Visualization | Grafana, custom dashboards | Team-facing cost views |
| Optimization | Cloud recommenders, Goldilocks | Right-sizing suggestions |
| Governance | OPA/Kyverno, budget alerts | Enforcement and guardrails |
| Forecasting | Cloud forecasting APIs + custom | Predict future spend |

## Anti-Patterns

- Optimizing before measuring (need baseline to know if optimization worked)
- Cost reduction that violates SLOs (savings worthless if customers suffer)
- Ignoring shared costs ("it's infrastructure's problem")
- Annual commitment purchases without utilization data (risk of waste)
- Treating all environments equally (production needs > dev needs)
- One-time cleanup without recurring process (waste grows back)
