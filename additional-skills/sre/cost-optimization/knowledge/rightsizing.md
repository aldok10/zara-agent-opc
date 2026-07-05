---
type: fact
title: "Rightsizing"
---

# Rightsizing

Instance and resource right-sizing: data-driven selection, spot strategies, and commitment discount planning.

## Right-Sizing Methodology

### Data Requirements

Never right-size without sufficient data:
- Minimum observation period: 14 days
- Must include peak traffic patterns (weekday peak, batch job windows)
- Must include minimum 1 business cycle (weekly)
- For seasonal services: observe full cycle before optimizing

### Kubernetes Resource Right-Sizing

#### VPA (Vertical Pod Autoscaler)

Deploy in recommendation mode (never auto-update production without review):

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: payment-api-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: payment-api
  updatePolicy:
    updateMode: "Off"  # Recommendation only
  resourcePolicy:
    containerPolicies:
      - containerName: "*"
        minAllowed:
          cpu: 50m
          memory: 128Mi
        maxAllowed:
          cpu: 4
          memory: 8Gi
```

VPA provides: target (P50), lower bound (P10), upper bound (P95), uncapped target.

Recommended request: use VPA target (P50) for request, upper bound (P95) for awareness.
Recommended limit: 2-3x request for CPU (burstable), 1.5x request for memory (avoid OOM).

#### Goldilocks

Deploys VPA per namespace and surfaces recommendations in a dashboard:

- Install: `kubectl apply -f goldilocks.yaml` in monitoring namespace
- Label namespace: `goldilocks.fairwinds.com/enabled=true`
- Dashboard shows per-container recommendations with estimated savings

### Instance Type Selection

#### Compute Families

| Family | Use Case | Cost Efficiency |
|--------|----------|----------------|
| General purpose (e2/m/t) | Web servers, APIs, most workloads | Baseline choice |
| Compute-optimized (c) | CPU-bound batch, compilation | 15-20% cheaper per vCPU |
| Memory-optimized (m/r) | Caches, in-memory databases | Better $/GB ratio |
| Accelerator (g/p/a) | ML inference, GPU workloads | Massive per-GPU savings |
| ARM (t4g, tau) | Stateless services | 20-40% cheaper than x86 |

Decision flow:
1. Can it run on ARM? -> Use ARM (cheapest per unit work)
2. CPU-bound? -> Compute-optimized
3. Memory-bound? -> Memory-optimized
4. General workload? -> Latest generation general purpose

#### Generation Selection

Always use latest available generation:
- New generations typically 15-30% better price/performance
- GCP: N2 -> C3/C3D (compute) or N4 (general)
- AWS: m5 -> m7i/m7g (ARM)

### Target Utilization

Resource efficiency targets:

| Resource | Target Utilization | Over-provisioned | Under-provisioned |
|----------|-------------------|------------------|-------------------|
| CPU (request) | 60-80% average | < 40% average | > 90% average |
| Memory (request) | 70-85% average | < 50% average | > 95% average |
| Disk IOPS | 50-70% of provisioned | < 30% sustained | > 80% sustained |
| Network | N/A (usage-based) | N/A | Hitting bandwidth limits |

## Spot/Preemptible Strategy

### When to Use Spot

Safe for spot:
- Stateless web servers (behind load balancer with health checks)
- Batch processing (checkpointable, retry-safe)
- CI/CD runners (short-lived, disposable)
- Dev/staging environments (interruption acceptable)
- Distributed compute (Spark, MapReduce with task retry)

Not safe for spot:
- Databases and stateful stores
- Message brokers (Kafka, RabbitMQ)
- Single-instance services with no failover
- Long-running transactions without checkpointing
- Leader-elected services during election

### Spot Best Practices

1. **Diversify instance types**: request multiple families/sizes, let scheduler pick cheapest available
2. **Capacity-optimized allocation**: prefer pools with most available capacity (less interruption)
3. **Graceful handling**: SIGTERM handler with 30s shutdown, connection draining
4. **Interruption notice**: monitor metadata endpoint (2-minute warning on GCP, AWS)
5. **Mixed instance groups**: 60-70% spot, 30-40% on-demand for baseline stability

### Karpenter (AWS) / GKE NAP

Automatic instance selection based on pod requirements:

- Pending pod needs 2 CPU, 8GB memory -> Karpenter picks cheapest instance with that capacity
- Consolidation: when nodes underutilized, Karpenter migrates pods and terminates nodes
- Spot-first: configure to prefer spot, fallback to on-demand

## Commitment Discounts

### Types

| Discount | Provider | Term | Savings | Flexibility |
|----------|----------|------|---------|-------------|
| Reserved Instances | AWS | 1y/3y | 30-60% | Locked to type/region |
| Savings Plans (Compute) | AWS | 1y/3y | 20-40% | Any instance type |
| CUDs (resource-based) | GCP | 1y/3y | 20-57% | Locked to type/region |
| Flex CUDs | GCP | 1h minimum | 15-25% | Auto-applied, any type |
| Spot commitment | GCP | None | 60-91% | Can be interrupted |

### Commitment Strategy

**Rule: commit to baseline only, never to peak.**

```
Total capacity = Committed (baseline) + On-demand (variable) + Spot (elastic)
```

Coverage targets:
- Committed: 50-70% of steady-state minimum (never more than 70%)
- On-demand: 10-20% (handles baseline variation)
- Spot: 20-40% (handles peaks and elastic workloads)

### Purchase Decision Framework

Before purchasing commitments:

1. Analyze 90 days of utilization data
2. Identify steady-state minimum (P10 of daily usage)
3. Commit to 60-70% of that minimum
4. Review quarterly: if utilization of committed exceeds 95%, purchase more
5. Never commit to capacity you're not already using consistently

## Storage Right-Sizing

### Disk Type Selection

| Type | IOPS | Throughput | Cost | Use Case |
|------|------|------------|------|----------|
| Standard HDD (pd-standard) | 0.75/GB | Low | $0.04/GB | Backups, archives |
| Balanced SSD (pd-balanced) | 6/GB | Medium | $0.10/GB | General workloads |
| Performance SSD (pd-ssd) | 30/GB | High | $0.17/GB | Databases, latency-sensitive |
| Extreme (pd-extreme) | Provisioned | Very high | $0.12/GB + IOPS | Mission-critical databases |

Right-sizing sequence:
1. Check actual IOPS usage vs provisioned capacity
2. If < 30% IOPS utilization sustained -> downgrade tier
3. If disk capacity < 50% used -> reduce size (requires snapshot + recreate)

### Lifecycle Policies

Automate storage cost reduction:
- Snapshot retention: 7 days local, 30 days cross-region
- Unused disk cleanup: alert if unattached > 7 days, delete if > 30 days
- Object storage tiering: hot (0-30d) -> nearline (30-90d) -> coldline (90-365d) -> archive

## Measuring Success

| Metric | Before | Target | How to Measure |
|--------|--------|--------|----------------|
| CPU utilization (avg) | 25% | 60-80% | Prometheus/Cloud Monitoring |
| Memory utilization (avg) | 40% | 70-85% | VPA recommendations |
| Spot ratio (stateless) | 0% | 60%+ | Node pool composition |
| Commitment utilization | N/A | > 90% | Billing console |
| Idle resources | Unknown | 0 | Weekly cleanup script |
| Unit cost ($/request) | Baseline | -20% in 6 months | Custom dashboard |
