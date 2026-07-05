# Kubernetes Workloads

## Deployment
- `strategy.rollingUpdate`: maxUnavailable 25%, maxSurge 25%
- `minReadySeconds`: wait before marking Ready
- Rollback: `kubectl rollout undo deployment/name`

## StatefulSet
- Ordered pod management (pod-0, pod-1, pod-2)
- Stable network IDs: `pod-name.service-name.namespace`
- `volumeClaimTemplates`: persistent storage per pod
- `podManagementPolicy: Parallel` for faster scaling (when order doesn't matter)

## Job / CronJob
- `completions`: how many pods must succeed
- `parallelism`: concurrent pods
- `backoffLimit`: retries before failure
- `ttlSecondsAfterFinished`: auto-cleanup
- CronJob: `schedule` in cron format, `concurrencyPolicy` (Forbid/Replace/Allow)

## DaemonSet
- One pod per node (log collectors, node monitors, CNI)
- `updateStrategy: RollingUpdate` with maxUnavailable

## Autoscaling

| Type | Scales On | Use Case |
|------|-----------|----------|
| HPA | CPU/memory/custom metrics | Request-driven load |
| VPA | Historical usage analysis | Right-sizing requests/limits |
| KEDA | External events (queue depth, cron, Prometheus) | Event-driven, scale-to-zero |

KEDA ScaledObject: define triggers (kafka lag, SQS depth, cron schedule), pollingInterval, cooldownPeriod.
