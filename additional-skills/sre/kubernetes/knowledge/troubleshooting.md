---
type: fact
title: "Kubernetes Troubleshooting"
---

# Kubernetes Troubleshooting

## CrashLoopBackOff
- **Cause**: Container starts and immediately crashes, kubelet retries with backoff
- **Debug**: `kubectl logs pod-name --previous` (see crash output)
- **Common**: liveness probe failing, missing config/secrets, app startup error
- **Fix**: check probe config, verify env vars, review app logs

## ImagePullBackOff
- **Cause**: Cannot pull container image
- **Debug**: `kubectl describe pod` (Events section shows pull error)
- **Common**: typo in image name, private registry without imagePullSecrets, image doesn't exist
- **Fix**: verify image exists, check registry credentials, ensure imagePullSecrets in ServiceAccount

## OOMKilled (exit code 137)
- **Cause**: Container exceeded memory limit
- **Debug**: `kubectl describe pod` shows `OOMKilled` reason
- **Fix**: increase memory limit OR fix memory leak (heap dump, profiling)
- **Note**: Java apps often need `-XX:MaxRAMPercentage=75` to respect container limits

## Pending
- **Cause**: Scheduler cannot place pod
- **Debug**: `kubectl describe pod` (Events: FailedScheduling)
- **Common**: insufficient CPU/memory on nodes, nodeSelector/affinity mismatch, taints without tolerations
- **Fix**: scale nodes (Karpenter/CA), relax affinity, add tolerations

## Evicted
- **Cause**: Node under resource pressure (disk, memory, PID)
- **Debug**: `kubectl describe node` (Conditions: MemoryPressure, DiskPressure)
- **Fix**: increase node resources, set proper resource limits, add monitoring for node pressure
