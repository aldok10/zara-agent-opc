---
type: example
title: "Spot/Preemptible Instance Strategy with Karpenter"
---

# Spot/Preemptible Instance Strategy (K8s + Karpenter)

## Context
When running stateless workloads on Kubernetes and you want to cut compute costs by 60-90% using spot instances. Karpenter automatically provisions right-sized spot nodes with diversification across instance types to minimize interruption impact.

## Code/Template

```yaml
# karpenter/node-pool-spot.yaml
apiVersion: karpenter.sh/v1
kind: NodePool
metadata:
  name: spot-general
spec:
  template:
    metadata:
      labels:
        capacity-type: spot
        workload-class: stateless
    spec:
      requirements:
        # Diversify across many instance types to reduce interruption
        - key: karpenter.k8s.aws/instance-category
          operator: In
          values: ["c", "m", "r"]
        - key: karpenter.k8s.aws/instance-generation
          operator: Gte
          values: ["5"]
        - key: karpenter.k8s.aws/instance-size
          operator: In
          values: ["large", "xlarge", "2xlarge"]
        - key: karpenter.sh/capacity-type
          operator: In
          values: ["spot"]
        - key: kubernetes.io/arch
          operator: In
          values: ["amd64"]
        - key: topology.kubernetes.io/zone
          operator: In
          values: ["us-east-1a", "us-east-1b", "us-east-1c"]
      nodeClassRef:
        group: karpenter.k8s.aws
        kind: EC2NodeClass
        name: spot-general
      # Expire nodes after 24h to pick up cheaper spots
      expireAfter: 24h
  limits:
    cpu: "200"
    memory: 800Gi
  disruption:
    consolidationPolicy: WhenEmptyOrUnderutilized
    consolidateAfter: 60s
  # Budget: max 20% of nodes disrupted simultaneously
  budget:
    - nodes: "20%"
---
apiVersion: karpenter.k8s.aws/v1
kind: EC2NodeClass
metadata:
  name: spot-general
spec:
  amiSelectorTerms:
    - alias: al2023@latest
  subnetSelectorTerms:
    - tags:
        karpenter.sh/discovery: production-cluster
  securityGroupSelectorTerms:
    - tags:
        karpenter.sh/discovery: production-cluster
  role: KarpenterNodeRole-production
  blockDeviceMappings:
    - deviceName: /dev/xvda
      ebs:
        volumeSize: 50Gi
        volumeType: gp3
        encrypted: true
        deleteOnTermination: true
```

```yaml
# karpenter/node-pool-on-demand-fallback.yaml
apiVersion: karpenter.sh/v1
kind: NodePool
metadata:
  name: on-demand-fallback
spec:
  template:
    metadata:
      labels:
        capacity-type: on-demand
        workload-class: critical
    spec:
      requirements:
        - key: karpenter.k8s.aws/instance-category
          operator: In
          values: ["m", "c"]
        - key: karpenter.k8s.aws/instance-generation
          operator: Gte
          values: ["6"]
        - key: karpenter.sh/capacity-type
          operator: In
          values: ["on-demand"]
      nodeClassRef:
        group: karpenter.k8s.aws
        kind: EC2NodeClass
        name: spot-general
  # Lower weight = lower priority (spot preferred)
  weight: 10
  limits:
    cpu: "50"
```

```yaml
# workloads/api-deployment.yaml - Spot-tolerant workload
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  replicas: 6
  strategy:
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 2
  template:
    metadata:
      labels:
        app: api-server
    spec:
      # Spread across zones for spot diversity
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: api-server
        - maxSkew: 1
          topologyKey: karpenter.sh/capacity-type
          whenUnsatisfiable: ScheduleAnyway
          labelSelector:
            matchLabels:
              app: api-server
      # Tolerate spot interruptions
      tolerations:
        - key: karpenter.sh/disruption
          operator: Exists
      # Prefer spot, but allow on-demand fallback
      affinity:
        nodeAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 80
              preference:
                matchExpressions:
                  - key: capacity-type
                    operator: In
                    values: ["spot"]
      # Graceful shutdown on interruption (2 min warning)
      terminationGracePeriodSeconds: 120
      containers:
        - name: api
          image: app/api-server:v2.1.0
          lifecycle:
            preStop:
              exec:
                command: ["/bin/sh", "-c", "sleep 5 && kill -SIGTERM 1"]
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
            limits:
              memory: 1Gi
```

## Key Points
- Diversify across 15+ instance types (category + generation + size combinations) to maintain spot capacity even during regional pressure
- Use `topologySpreadConstraints` across zones AND capacity types so a single spot interruption event doesn't take out all replicas
- Set `terminationGracePeriodSeconds: 120` to match AWS's 2-minute interruption warning - drain connections gracefully
