---
type: fact
title: "Karpenter NodePools (v1.0+)"
---

# Karpenter NodePools (v1.0+)

Just-in-time node provisioning that responds to pending pods in under 30 seconds. Replaces Cluster Autoscaler for most workloads by directly selecting instance types to match pod requirements without ASG intermediaries.

## Key Concepts

**NodePool**: Defines constraints, limits, and disruption policies for a group of nodes Karpenter can create. Replaces the deprecated `Provisioner` resource.

**EC2NodeClass** (EKS) / **GCENodeClass** (GKE): Cloud-specific node configuration -- AMI selection, subnet/security group discovery, user data, block device mappings.

**Scheduling loop**: Karpenter watches for unschedulable pods, bins them by compatible NodePool constraints, selects the cheapest instance type that fits, and launches the node. No node groups involved.

**Consolidation**: Continuously evaluates whether pods can be packed onto fewer/cheaper nodes. Replaces nodes when utilization drops below threshold or cheaper options become available.

**Drift**: Detects when running nodes no longer match the NodePool/NodeClass spec (AMI update, security group change) and rolls nodes gracefully.

## Configuration Examples

NodePool with instance constraints:

```yaml
apiVersion: karpenter.sh/v1
kind: NodePool
metadata:
  name: general
spec:
  template:
    metadata:
      labels:
        team: platform
        karpenter.sh/capacity-type: on-demand
    spec:
      nodeClassRef:
        group: karpenter.k8s.aws
        kind: EC2NodeClass
        name: default
      requirements:
        - key: kubernetes.io/arch
          operator: In
          values: ["amd64"]
        - key: karpenter.sh/capacity-type
          operator: In
          values: ["on-demand", "spot"]
        - key: karpenter.k8s.aws/instance-category
          operator: In
          values: ["c", "m", "r"]
        - key: karpenter.k8s.aws/instance-generation
          operator: Gte
          values: ["6"]
        - key: karpenter.k8s.aws/instance-size
          operator: In
          values: ["medium", "large", "xlarge", "2xlarge"]
      expireAfter: 720h
  limits:
    cpu: "1000"
    memory: 2000Gi
  disruption:
    consolidationPolicy: WhenEmptyOrUnderutilized
    consolidateAfter: 60s
  weight: 50
```

EC2NodeClass with AMI selection:

```yaml
apiVersion: karpenter.k8s.aws/v1
kind: EC2NodeClass
metadata:
  name: default
spec:
  role: KarpenterNodeRole-prod-cluster
  amiSelectorTerms:
    - alias: al2023@latest
  subnetSelectorTerms:
    - tags:
        karpenter.sh/discovery: prod-cluster
  securityGroupSelectorTerms:
    - tags:
        karpenter.sh/discovery: prod-cluster
  blockDeviceMappings:
    - deviceName: /dev/xvda
      ebs:
        volumeSize: 100Gi
        volumeType: gp3
        iops: 3000
        throughput: 125
        encrypted: true
  metadataOptions:
    httpEndpoint: enabled
    httpProtocolIPv6: disabled
    httpPutResponseHopLimit: 2
    httpTokens: required
```

## Common Patterns

| Pattern | Implementation |
|---------|---------------|
| GPU workloads | Separate NodePool with `karpenter.k8s.aws/instance-gpu-count: "1"` requirement |
| Spot with fallback | `capacity-type: ["spot", "on-demand"]` -- Karpenter prefers spot, falls back |
| ARM64 cost savings | NodePool with `kubernetes.io/arch: ["arm64"]`, requires multi-arch images |
| Batch/ephemeral | Short `expireAfter` (24h), aggressive consolidation |
| Compliance isolation | NodePool with subnet selectors for dedicated VPC segment |
| Weighted priority | Lower `weight` = higher priority. Use to prefer spot pool over on-demand |

## Gotchas

1. **Pod topology spread blocks consolidation**: If topologySpreadConstraints prevent moving pods, Karpenter cannot consolidate. Set `whenUnsatisfiable: DoNotSchedule` only where truly needed.
2. **Instance type filtering too narrow**: Over-constraining instance types causes capacity errors in single-AZ scenarios. Allow 20+ instance types across 3+ families.
3. **Drift + PDB conflict**: If PDB blocks eviction, drift replacement stalls. Monitor `karpenter_nodeclaims_disrupted` metric and alert if age > threshold.
4. **expireAfter triggers rolling replacement**: All nodes expire eventually. Stagger creation times or set expireAfter long enough (30 days) to avoid thundering herd.
5. **AMI updates require NodeClass change**: Karpenter doesn't auto-update AMIs unless `alias: al2023@latest` is used and drift detection is enabled.
6. **limits are hard caps**: Once a NodePool hits its CPU/memory limit, new pods remain pending. Set limits above expected peak, monitor headroom.

## Quick Reference

```bash
# List NodePools and their status
kubectl get nodepools

# Check NodeClaim status (nodes being provisioned)
kubectl get nodeclaims

# See why a node was created
kubectl describe nodeclaim <name> | grep -A10 "Spec"

# Force drift detection
kubectl annotate nodeclaim <name> karpenter.sh/voluntary-disruption=drifted

# View Karpenter controller logs
kubectl logs -n kube-system -l app.kubernetes.io/name=karpenter -c controller --tail=100

# Monitor consolidation decisions
kubectl logs -n kube-system -l app.kubernetes.io/name=karpenter -c controller | grep -i consolidat

# Check which instance types Karpenter is considering
kubectl get nodeclaim <name> -o jsonpath='{.status.instanceType}'
```
