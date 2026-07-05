# Progressive Delivery

## Overview

Progressive delivery extends continuous delivery by gradually shifting traffic to new versions while measuring success criteria. Roll back automatically on failure.

## Canary Deployments

### Concept

Route a small percentage of traffic to the new version. Increase incrementally if metrics remain healthy. Roll back immediately if metrics degrade.

### Argo Rollouts Canary

```yaml
spec:
  strategy:
    canary:
      steps:
        - setWeight: 5
        - pause: { duration: 2m }
        - analysis:
            templates:
              - templateName: success-rate
            args:
              - name: service-name
                value: payment-service
        - setWeight: 25
        - pause: { duration: 5m }
        - analysis:
            templates:
              - templateName: success-rate
        - setWeight: 50
        - pause: { duration: 5m }
        - setWeight: 100
```

### Traffic Management

Without a service mesh, canary uses replica ratio (imprecise). With Istio, Linkerd, or AWS ALB:

```yaml
spec:
  strategy:
    canary:
      trafficRouting:
        istio:
          virtualServices:
            - name: payment-service-vsvc
              routes:
                - primary
```

This gives exact percentage-based traffic splitting independent of replica count.

## Blue-Green Deployments

### Concept

Run two identical environments. "Blue" serves production traffic. Deploy to "Green", validate, then switch. Instant rollback by switching back.

### Argo Rollouts Blue-Green

```yaml
spec:
  strategy:
    blueGreen:
      activeService: payment-active
      previewService: payment-preview
      autoPromotionEnabled: false
      prePromotionAnalysis:
        templates:
          - templateName: smoke-tests
      postPromotionAnalysis:
        templates:
          - templateName: error-rate-check
      scaleDownDelaySeconds: 300
```

- `previewService` -- routes to the new version for testing before promotion
- `autoPromotionEnabled: false` -- requires manual approval or analysis pass
- `scaleDownDelaySeconds` -- keep old version running after switch for fast rollback

## Analysis Templates

Analysis templates define automated checks that determine if a rollout should proceed or abort.

### Prometheus Query

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: success-rate
spec:
  args:
    - name: service-name
  metrics:
    - name: success-rate
      interval: 30s
      count: 5
      successCondition: result[0] >= 0.99
      failureLimit: 2
      provider:
        prometheus:
          address: http://prometheus.monitoring:9090
          query: |
            sum(rate(http_requests_total{service="{{args.service-name}}",status=~"2.."}[2m]))
            /
            sum(rate(http_requests_total{service="{{args.service-name}}"}[2m]))
```

### Web Analysis (Custom Webhook)

```yaml
metrics:
  - name: integration-test
    count: 1
    successCondition: result.passed == true
    provider:
      web:
        url: "https://testing.internal/run?service={{args.service-name}}&version={{args.version}}"
        jsonPath: "{$.result}"
```

### Datadog, CloudWatch, New Relic

Argo Rollouts supports multiple metric providers. Each uses the same `successCondition`/`failureCondition` pattern with provider-specific query syntax.

### Combining Metrics

Run multiple metrics in a single analysis. ALL must pass for the analysis to succeed:

```yaml
metrics:
  - name: error-rate
    successCondition: result[0] < 0.01
    # ...
  - name: latency-p99
    successCondition: result[0] < 500
    # ...
  - name: saturation
    successCondition: result[0] < 0.8
    # ...
```

## Rollback Behavior

- **Canary**: reduces weight to 0 and scales down canary replicas
- **Blue-Green**: switches active service back to previous ReplicaSet
- **Automatic**: triggered when analysis fails beyond `failureLimit`
- **Manual**: `kubectl argo rollouts abort <name>` or ArgoCD UI

## Progressive Delivery with Flagger

Alternative to Argo Rollouts. Runs as a Kubernetes operator, integrates with Istio/Linkerd/Contour/Gloo.

Key differences from Argo Rollouts:
- Uses `Canary` CRD instead of modifying Deployment
- Tighter service mesh integration
- Built-in load testing with `loadtester` sidecar
- Webhook-based extensibility for custom checks

## Best Practices

- Start with conservative step weights (5% initial, not 25%)
- Analysis duration should cover at least 2-3 metric scrape intervals
- Set `failureLimit` > 1 to avoid false positives from metric jitter
- Use `inconclusiveLimit` for transient metric unavailability
- Test rollback behavior in staging -- don't discover issues in production
- Combine automated analysis with manual gates for critical services
- Monitor rollout controller itself -- if it's down, rollouts can stall mid-progress
- Set `progressDeadlineSeconds` to detect stuck rollouts
