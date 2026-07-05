---
name: cost-optimization
description: "Cloud cost management: FinOps, right-sizing, spot/preemptible, commitment discounts, waste elimination"
---

# Cost Optimization

FinOps-driven cloud cost management with right-sizing, commitment strategies, and continuous waste elimination.

## Scope

Covers FinOps framework implementation, Kubernetes resource right-sizing (VPA/Goldilocks), spot and preemptible instance strategies, commitment discount planning (CUDs, Savings Plans), idle resource detection, storage lifecycle policies, and cost allocation/showback. Targets unit economics (cost per request, cost per customer) as the north star metric.

## First Action

When loaded: pull current cost data (`gcloud billing budgets list` or cloud billing export), check for VPA/Goldilocks deployment, and identify top 5 cost drivers from cost allocation labels.

## Constraints

1. Unit economics tracked: cost per request, cost per customer, cost per environment
2. Right-sizing recommendations acted on monthly; VPA in recommendation mode always
3. Goldilocks dashboard deployed per namespace for resource request visibility
4. Spot/preemptible instances for all stateless workloads; minimum 60% spot ratio
5. Commitment discounts cover steady-state baseline only (never commit to peak)
6. Idle resource scan weekly: unused disks, unattached IPs, empty load balancers
7. Dev/staging environments auto-scale to zero outside business hours (8am-6pm local)
8. Storage lifecycle: hot -> nearline (30 days) -> coldline (90 days) -> archive (365 days)
9. Cost anomaly detection: alert on >20% day-over-day increase per service
10. Every new service includes cost estimate in design review
11. Shared resources (databases, caches) allocated proportionally by usage labels
12. FinOps review monthly: actual vs budget, forecast, optimization actions
13. Container resource efficiency target: 60-80% average utilization of requested resources
14. BigQuery on-demand queries capped per project; slot reservations for predictable workloads

## DO NOT

1. Over-commit: never purchase CUDs/Savings Plans for more than 70% of baseline
2. Right-size without observing 14+ days of utilization data
3. Use spot instances for stateful workloads (databases, message queues)
4. Delete resources without verifying ownership via cost allocation labels
5. Ignore egress costs -- they compound silently across regions and zones
6. Set resource requests equal to limits (prevents bin-packing efficiency)
7. Schedule dev environments 24/7 without explicit justification
8. Optimize cost at the expense of SLO compliance (reliability > savings)
9. Report cost without normalizing to business metrics (raw spend is misleading)

## Route to Subskill

| Signal | Subskill | Focus |
|--------|----------|-------|
| GCP billing specifics | sre-gcp | CUDs, BigQuery slots, GKE Autopilot pricing |
| Observability cost (metrics/logs) | sre-observability | Sampling, retention, cardinality |
| Compute right-sizing details | sre-platform-engineering | VPA integration, developer guardrails |
| Network egress costs | sre-networking | Cross-zone traffic, CDN offload |
| Security tool overhead | sre-security-ops | Agent resource requirements |

## Verification

- [ ] Unit cost metrics (cost/request) tracked and trending flat or down
- [ ] VPA/Goldilocks deployed and recommendations reviewed monthly
- [ ] Spot instance ratio > 60% for stateless workloads
- [ ] Zero idle resources (unattached disks, unused IPs, empty LBs)
- [ ] Dev/staging scaled to zero outside business hours
- [ ] Commitment coverage between 50-70% of baseline (not over-committed)
- [ ] Cost anomaly alerts configured and tested
- [ ] Monthly FinOps review completed with documented actions

## Knowledge

- knowledge/finops-framework.md
- knowledge/gke-cost-patterns.md
- knowledge/commitment-discount-strategy.md
- knowledge/right-sizing-methodology.md
- knowledge/storage-lifecycle-policies.md

## AI-Era Context (2026)

- Flex CUDs (GCP) and Savings Plans (AWS) offer 1-hour minimum commitment granularity
- GPU/TPU cost dominates AI workloads; fractional GPU sharing (MIG, time-slicing) critical
- FinOps Foundation FOCUS spec standardizes cost data across clouds
- AI-powered anomaly detection (GCP Cost Anomaly Detection, Kubecost AI) auto-triages spikes
- Kubernetes cost allocation via OpenCost (CNCF sandbox) provides pod-level showback
- Spot instance interruption prediction models enable proactive graceful shutdown
- GKE Autopilot pricing model (pay per pod resource) simplifies Kubernetes cost allocation
- Karpenter (AWS) and GKE NAP auto-select cheapest instance types for pending pods

## Related Skills

- sre-gcp
- sre-observability
- sre-platform-engineering
- sre-networking
