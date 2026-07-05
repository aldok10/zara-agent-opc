---
type: subskill
title: "AWS Compute"
---

# AWS Compute

EC2, EKS, ECS, and compute optimization strategies including Graviton and spot instances.

## When to Load
- Choosing between EKS, ECS, and EC2 for workloads
- Configuring Karpenter for autoscaling
- Implementing spot instance strategies
- Evaluating Graviton migration

## Key Concepts

**Compute spectrum (managed -> control):**
Lambda -> Fargate -> ECS on EC2 -> EKS on EC2 -> bare EC2

**Instance selection factors:** vCPU:memory ratio, network bandwidth, EBS bandwidth, architecture (x86 vs arm64), generation (prefer latest).

**Graviton (arm64):** ~20% better price-performance. Available for most workloads. Not compatible with x86 compiled binaries or x86-specific instructions.

**Spot instances:** up to 90% discount, 2-minute interruption notice. Use for stateless, fault-tolerant workloads with diversification across instance types and AZs.

**Karpenter:** Kubernetes-native autoscaler. Replaces Cluster Autoscaler. Provisions right-sized nodes directly, no node groups required.

## Patterns

**Karpenter NodePool:**
```yaml
apiVersion: karpenter.sh/v1
kind: NodePool
metadata:
  name: default
spec:
  template:
    spec:
      requirements:
        - key: kubernetes.io/arch
          operator: In
          values: ["arm64"]
        - key: karpenter.sh/capacity-type
          operator: In
          values: ["spot", "on-demand"]
        - key: karpenter.k8s.aws/instance-generation
          operator: Gt
          values: ["5"]
      nodeClassRef:
        group: karpenter.k8s.aws
        kind: EC2NodeClass
        name: default
  limits:
    cpu: "1000"
    memory: 1000Gi
  disruption:
    consolidationPolicy: WhenEmptyOrUnderutilized
    consolidateAfter: 30s
```

**ECS service with capacity provider strategy:**
```json
{
  "capacityProviderStrategy": [
    {"capacityProvider": "FARGATE_SPOT", "weight": 3, "base": 0},
    {"capacityProvider": "FARGATE", "weight": 1, "base": 2}
  ]
}
```

**Spot diversification (EC2 fleet):**
```json
{
  "LaunchTemplateConfigs": [{
    "Overrides": [
      {"InstanceType": "m6g.large", "SubnetId": "subnet-a"},
      {"InstanceType": "m6i.large", "SubnetId": "subnet-a"},
      {"InstanceType": "m5.large", "SubnetId": "subnet-b"},
      {"InstanceType": "c6g.xlarge", "SubnetId": "subnet-b"}
    ]
  }],
  "SpotOptions": {
    "AllocationStrategy": "price-capacity-optimized"
  }
}
```

## Gotchas
- Graviton requires multi-arch container images or arm64-specific builds
- Spot can reclaim ALL instances of one type simultaneously -- diversify
- EKS managed node groups lag behind Karpenter in scaling speed
- Fargate has no GPU support and limited ephemeral storage (200GB max)
- EBS bandwidth is shared with network on most instance types
- t3/t4g burstable instances: monitor CPU credits, avoid for sustained loads
- Instance store data is lost on stop/terminate -- use for caches only

## Verification
- Spot interruption frequency: check Spot Placement Score API
- `kubectl get nodeclaims` for Karpenter provisioning status
- CloudWatch metrics: CPUUtilization, NetworkIn/Out, EBSIOBalance%
- Compute Optimizer for right-sizing recommendations
- `aws ec2 describe-spot-instance-requests` for spot fulfillment status
