---
type: tool
title: "Cloud Cost Optimization Review Prompt"
---

# Cloud Cost Optimization Review Prompt

You are reviewing cloud infrastructure for cost optimization opportunities. Identify savings without compromising reliability or performance.

## Input Required

Provide:
- Cloud provider and account structure (single account, multi-account, organization)
- Monthly cloud spend (total and top 5 services by cost)
- Kubernetes cluster details (node count, types, utilization)
- Current commitment coverage (Reserved Instances, CUDs, Savings Plans)
- Cost allocation labels in use
- SLO requirements for key services
- Growth trajectory (traffic/data growth rate)

## Review Framework

### 1. Compute Right-Sizing

Check:
- [ ] Average CPU utilization across workloads (target: 60-80%)
- [ ] Average memory utilization across workloads (target: 70-85%)
- [ ] VPA/Goldilocks deployed and recommendations available
- [ ] Instance generation is current (latest gen = better price/perf)
- [ ] ARM instances used where possible (20-40% savings)
- [ ] Overprovisioned pod requests identified (request >> actual usage)

Analysis:
- Compare VPA recommendations to current requests
- Calculate potential savings from right-sizing (requests reduced * hourly cost delta)
- Identify pods requesting limits == requests (prevents bin-packing)

### 2. Spot/Preemptible Usage

Check:
- [ ] Spot ratio for stateless workloads (target: > 60%)
- [ ] Instance type diversification (multiple families for spot availability)
- [ ] Graceful interruption handling (SIGTERM handler, PDB)
- [ ] Fallback to on-demand configured
- [ ] Karpenter/NAP for automatic cheapest-instance selection

Savings estimate:
- Spot typically 60-90% cheaper than on-demand
- Calculate: (on-demand nodes eligible for spot) * (on-demand price - spot price) * hours

### 3. Commitment Discounts

Check:
- [ ] Current commitment utilization > 90% (if not, over-committed)
- [ ] Uncommitted steady-state baseline identified
- [ ] Commitment covers 50-70% of baseline (not more)
- [ ] Term length appropriate (1y for uncertain, 3y for stable)
- [ ] Flex CUDs (GCP) or Compute Savings Plans (AWS) used for flexibility

Analysis:
- Utilization of existing commitments (waste = unused committed capacity)
- Headroom for additional commitment (steady-state - current commitment)
- Break-even analysis: months to recoup commitment if workload changes

### 4. Storage Optimization

Check:
- [ ] Disk type matches IOPS requirements (no SSD for < 100 IOPS)
- [ ] Unattached disks/volumes identified and cleaned
- [ ] Snapshot retention policies in place
- [ ] Object storage lifecycle (hot -> cold -> archive transitions)
- [ ] Database storage auto-scaling vs over-provisioned
- [ ] Logging/metrics retention matches policy (not storing indefinitely)

Savings estimate:
- Unattached disks: count * size * monthly rate
- Over-tiered storage: (SSD cost - HDD cost) * GB for low-IOPS workloads
- Unneeded snapshots: count * size * snapshot rate

### 5. Network and Egress

Check:
- [ ] Cross-region traffic minimized (replicate data, not send repeatedly)
- [ ] Cross-zone traffic accounted for (placement strategy)
- [ ] CDN offloading static content (reduce origin egress)
- [ ] NAT gateway costs (data processing charges)
- [ ] VPC endpoint usage for AWS service traffic (avoids NAT)

Often overlooked: NAT gateway data processing can be $0.045/GB -- significant for high-traffic services.

### 6. Dev/Staging Environments

Check:
- [ ] Non-production scaled to zero outside business hours
- [ ] Non-production using smaller instance types than production
- [ ] Preview/ephemeral environments auto-deleted after PR merge
- [ ] Dev databases using smaller tier / HDD storage
- [ ] CI/CD runners using spot instances

Target: dev/staging cost < 20% of production cost.

### 7. Idle Resources

Check:
- [ ] Unattached Elastic IPs / static IPs ($3.65/month each on AWS)
- [ ] Empty load balancers (idle LB cost)
- [ ] Unused NAT gateways
- [ ] Databases with no connections in 7+ days
- [ ] Container registries with untagged/old images
- [ ] Unused custom machine images

### 8. Observability Cost

Check:
- [ ] Metric cardinality under control (< 50k active series per service)
- [ ] Log sampling for high-volume paths (health checks, debug)
- [ ] Trace sampling configured (not storing 100% of traces)
- [ ] Retention policies match actual query patterns
- [ ] Unused dashboards/alerts consuming resources

## Output Format

### Executive Summary
- Current monthly spend: $X
- Identified savings: $Y (Z% reduction)
- Confidence: high (measured) / medium (estimated) / low (projected)
- Implementation effort: X engineering-weeks

### Savings Breakdown

| Category | Current Cost | Savings | Effort | Risk |
|----------|-------------|---------|--------|------|
| Right-sizing | $X | $Y | Low | Low |
| Spot adoption | $X | $Y | Medium | Low |
| Commitments | $X | $Y | Low | Medium (lock-in) |
| Storage | $X | $Y | Low | Low |
| Dev/staging | $X | $Y | Medium | None |
| Idle cleanup | $X | $Y | Low | None |

### Recommendations (ordered by savings/effort ratio)

1. [Highest ROI action] -- $X/month savings, Y hours effort
2. [Second priority] -- $X/month savings, Y hours effort
3. [Third priority] -- $X/month savings, Y hours effort

### Risks and Caveats
- [What could go wrong with each recommendation]
- [SLO impact assessment]
- [Lock-in risks for commitment purchases]

### Implementation Timeline
- Week 1-2: [Quick wins -- idle cleanup, scheduling]
- Week 3-4: [Medium effort -- right-sizing, spot]
- Month 2: [Longer term -- commitments, architecture]
