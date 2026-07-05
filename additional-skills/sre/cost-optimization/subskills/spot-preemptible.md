---
type: subskill
title: "Spot & Preemptible Instances"
---

# Spot & Preemptible Instances

Interruption handling, instance diversification, and Karpenter spot strategies.

## When to Load
- Implementing spot/preemptible instances for cost savings
- Handling interruptions gracefully
- Configuring Karpenter for spot-first scaling
- Building fault-tolerant architectures on interruptible compute

## Key Concepts

**Spot/Preemptible comparison:**
- AWS Spot: 2-min warning, up to 90% discount, price-capacity-optimized allocation
- GCP Preemptible/Spot: 30-sec warning (Spot VMs), 24hr max (preemptible), 60-91% discount
- Azure Spot: 30-sec warning, variable discount, eviction type (deallocate or delete)

**Workload suitability:** stateless services, batch processing, CI/CD workers, dev/test environments, data pipelines. NOT suitable for: databases, single-instance services, long-running stateful workloads.

**Diversification:** spread across instance types, sizes, and AZs to reduce simultaneous interruption risk.

## Patterns

**Karpenter spot-first with on-demand fallback:**
```yaml
apiVersion: karpenter.sh/v1
kind: NodePool
metadata:
  name: spot-first
spec:
  template:
    spec:
      requirements:
        - key: karpenter.sh/capacity-type
          operator: In
          values: ["spot", "on-demand"]
        - key: kubernetes.io/arch
          operator: In
          values: ["arm64", "amd64"]
        - key: karpenter.k8s.aws/instance-category
          operator: In
          values: ["m", "c", "r"]
        - key: karpenter.k8s.aws/instance-generation
          operator: Gt
          values: ["5"]
  disruption:
    consolidationPolicy: WhenEmptyOrUnderutilized
    consolidateAfter: 60s
  limits:
    cpu: "500"
---
apiVersion: karpenter.sh/v1
kind: NodePool
metadata:
  name: on-demand-baseline
spec:
  template:
    spec:
      requirements:
        - key: karpenter.sh/capacity-type
          operator: In
          values: ["on-demand"]
  weight: 10
```

**Graceful interruption handling (Kubernetes):**
```yaml
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      terminationGracePeriodSeconds: 120
      containers:
        - name: app
          lifecycle:
            preStop:
              exec:
                command: ["/bin/sh", "-c", "sleep 5 && kill -SIGTERM 1"]
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: my-app
```

**AWS Spot interruption handler (Node Termination Handler):**
```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: aws-node-termination-handler
spec:
  template:
    spec:
      containers:
        - name: nth
          image: public.ecr.aws/aws-ec2/aws-node-termination-handler:latest
          env:
            - name: ENABLE_SPOT_INTERRUPTION_DRAINING
              value: "true"
            - name: ENABLE_REBALANCE_DRAINING
              value: "true"
```

## Gotchas
- Spot can reclaim ALL instances of one type/AZ at once -- diversify across 10+ instance types
- AWS rebalance recommendations come before interruptions -- drain early on rebalance
- GCP preemptible VMs have hard 24-hour limit; Spot VMs don't
- PodDisruptionBudgets are critical -- without them, all pods on a spot node terminate simultaneously
- Spot pricing varies by region -- same instance type can be 5x cheaper in another region
- Karpenter needs IAM permissions for `ec2:CreateFleet` with spot diversification

## Verification
- Spot interruption frequency: AWS Spot Placement Score API
- `kubectl get nodes -l karpenter.sh/capacity-type=spot` for spot node count
- CloudWatch metric: `SpotInterruptionRate` per instance type
- Test interruption handling: `aws ec2 terminate-instances` on spot nodes and observe recovery
- Cost savings: compare actual spot spend vs equivalent on-demand pricing
- Monitor PDB violations during interruptions
