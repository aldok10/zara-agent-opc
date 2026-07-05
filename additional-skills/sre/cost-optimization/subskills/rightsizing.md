# Rightsizing

Instance selection, scaling policies, and cloud provider recommendations for cost optimization.

## When to Load
- Analyzing over-provisioned resources
- Implementing auto-scaling policies
- Evaluating provider right-sizing recommendations
- Reducing waste in Kubernetes resource requests

## Key Concepts

**Rightsizing definition:** matching resource allocation to actual workload requirements. Not just downsizing -- sometimes upgrading to fewer, larger instances is more efficient.

**Data sources for decisions:**
- CPU utilization (avg, p95, max)
- Memory utilization (avg, peak, working set)
- Network throughput and IOPS
- Business metrics correlation (traffic patterns)

**Kubernetes resource optimization:** requests (scheduling guarantee) vs limits (hard cap). Over-requesting wastes cluster capacity. Under-requesting causes OOMKills and throttling.

## Patterns

**Kubernetes VPA (Vertical Pod Autoscaler):**
```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: api-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  updatePolicy:
    updateMode: "Off"
  resourcePolicy:
    containerPolicies:
      - containerName: api
        minAllowed:
          cpu: 100m
          memory: 128Mi
        maxAllowed:
          cpu: 4
          memory: 8Gi
```

**HPA with custom metrics:**
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  minReplicas: 3
  maxReplicas: 50
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 10
          periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 30
      policies:
        - type: Percent
          value: 50
          periodSeconds: 60
  metrics:
    - type: Resource
      resource:
        name: cpu
        target: { type: Utilization, averageUtilization: 70 }
    - type: Pods
      pods:
        metric: { name: http_requests_per_second }
        target: { type: AverageValue, averageValue: "1000" }
```

**EC2 rightsizing analysis script:**
```bash
aws ce get-rightsizing-recommendation \
  --service AmazonEC2 \
  --configuration '{
    "RecommendationTarget": "SAME_INSTANCE_FAMILY",
    "BenefitsConsidered": true
  }' \
  --query 'RightsizingRecommendations[].{
    Instance: CurrentInstance.ResourceId,
    Current: CurrentInstance.ResourceDetails.EC2ResourceDetails.InstanceType,
    Recommended: ModifyRecommendationDetail.TargetInstances[0].ResourceDetails.EC2ResourceDetails.InstanceType,
    Savings: ModifyRecommendationDetail.TargetInstances[0].EstimatedMonthlySavings}'
```

## Gotchas
- VPA and HPA conflict on the same metric -- use VPA in recommendation-only mode with HPA
- Right-sizing recommendations based on 2 weeks may miss monthly/quarterly peaks
- Kubernetes CPU throttling happens at limits even when node has spare CPU
- Memory limits cause OOMKill -- set memory limit = memory request for predictability
- Auto-scaling down too aggressively causes performance degradation during traffic spikes
- Graviton migration often changes the optimal instance size (can go smaller)

## Verification
- AWS Compute Optimizer / Azure Advisor / GCP Recommender for provider suggestions
- Kubecost or OpenCost for Kubernetes resource efficiency scores
- VPA recommendations: `kubectl get vpa <name> -o yaml` (check status.recommendation)
- CloudWatch/Prometheus: CPU p95 should be 60-80% of allocated after rightsizing
- Cost before/after comparison (allow 7+ days for data)
