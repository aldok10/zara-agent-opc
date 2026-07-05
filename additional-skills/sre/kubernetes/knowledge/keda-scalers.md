# KEDA Scalers (2.15+)

Event-driven autoscaling for Kubernetes workloads based on external metrics -- queue depth, stream lag, cron schedules, Prometheus queries, and 60+ other sources. Scales Deployments, StatefulSets, and Jobs from 0 to N.

## Key Concepts

**ScaledObject**: Attaches to a Deployment/StatefulSet. Defines triggers (scalers), polling interval, cooldown, and min/max replica count. KEDA creates an HPA under the hood but manages it entirely.

**ScaledJob**: Creates Kubernetes Jobs in response to events. One job per event (e.g., one message = one job). Good for long-running batch tasks.

**TriggerAuthentication**: Stores credentials for accessing external metric sources (MSK, SQS, Prometheus). References Secrets, pod identity, or environment variables.

**Composite triggers**: Multiple triggers on one ScaledObject -- KEDA scales to the MAX of all trigger metrics. Use for workloads that must respond to both queue depth and CPU.

**Paused scaling** (2.15+): Annotate a ScaledObject to freeze replica count without deleting the resource. Useful during maintenance windows.

**Fallback**: If a scaler fails to fetch metrics, KEDA can use a fallback replica count instead of scaling to 0 or erroring.

## Configuration Examples

ScaledObject for AWS SQS:

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: order-processor
  namespace: app-prod
spec:
  scaleTargetRef:
    name: order-processor
  pollingInterval: 10
  cooldownPeriod: 300
  idleReplicaCount: 0
  minReplicaCount: 1
  maxReplicaCount: 50
  fallback:
    failureThreshold: 3
    replicas: 5
  triggers:
    - type: aws-sqs-queue
      authenticationRef:
        name: aws-credentials
      metadata:
        queueURL: https://sqs.us-east-1.amazonaws.com/123456789/orders
        queueLength: "5"
        awsRegion: us-east-1
        identityOwner: operator
```

ScaledObject for Kafka consumer lag:

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: event-consumer
  namespace: streaming
spec:
  scaleTargetRef:
    name: event-consumer
  pollingInterval: 15
  cooldownPeriod: 60
  minReplicaCount: 2
  maxReplicaCount: 100
  triggers:
    - type: kafka
      metadata:
        bootstrapServers: kafka-bootstrap.kafka:9092
        consumerGroup: event-consumer-group
        topic: events
        lagThreshold: "100"
        activationLagThreshold: "10"
        offsetResetPolicy: earliest
```

TriggerAuthentication with pod identity:

```yaml
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: aws-credentials
  namespace: app-prod
spec:
  podIdentity:
    provider: aws
    identityId: arn:aws:iam::123456789:role/keda-sqs-role
```

## Common Patterns

| Pattern | Implementation |
|---------|---------------|
| Scale to zero | Set `idleReplicaCount: 0`, activation threshold > 0 |
| Burst protection | Set `maxReplicaCount` + use `advanced.horizontalPodAutoscalerConfig.behavior.scaleUp.stabilizationWindowSeconds` |
| Scheduled scaling | Cron trigger to pre-scale before expected traffic |
| Prometheus-based | `prometheus` trigger with custom PromQL query |
| Multi-trigger | Multiple entries in `triggers[]` -- KEDA uses the highest desired count |
| Scale Jobs | ScaledJob with `maxReplicaCount` for parallel batch processing |
| Maintenance pause | `kubectl annotate scaledobject <name> autoscaling.keda.sh/paused-replicas="5"` |

## Gotchas

1. **idleReplicaCount vs minReplicaCount**: `idleReplicaCount: 0` means KEDA scales to 0 when no events. `minReplicaCount` is the floor when the scaler IS active. Setting both to 0 means the HPA floor is 0 but KEDA manages the 0-to-1 transition.
2. **Kafka partition ceiling**: Cannot scale beyond partition count for a single topic. If topic has 10 partitions, maxReplicaCount of 50 is pointless -- cap at partition count.
3. **SQS ApproximateNumberOfMessages delay**: SQS metrics update every ~20 seconds. Set pollingInterval >= 15 to avoid stale decisions.
4. **ScaledObject name collision**: If a ScaledObject and HPA target the same Deployment, they fight. Remove HPA before creating ScaledObject.
5. **fallback not set**: Without fallback config, a metric endpoint outage can cause scale-to-zero or stuck replicas. Always define fallback for production.
6. **cooldownPeriod is for scale-to-idle**: It only applies for the transition from minReplicaCount to idleReplicaCount. HPA behavior config controls all other scale-down timing.

## Quick Reference

```bash
# List all ScaledObjects and their status
kubectl get scaledobject -A

# Check if a scaler is active
kubectl describe scaledobject <name> -n <ns> | grep -A5 "Conditions"

# View KEDA operator logs
kubectl logs -n keda -l app=keda-operator --tail=100

# Pause scaling (freeze at current count)
kubectl annotate scaledobject <name> -n <ns> autoscaling.keda.sh/paused-replicas="3"

# Resume scaling
kubectl annotate scaledobject <name> -n <ns> autoscaling.keda.sh/paused-replicas-

# Check the HPA KEDA created
kubectl get hpa -n <ns> -l scaledobject.keda.sh/name=<scaledobject-name>

# Force metric refresh (restart KEDA metrics server)
kubectl rollout restart deployment keda-operator-metrics-apiserver -n keda
```
