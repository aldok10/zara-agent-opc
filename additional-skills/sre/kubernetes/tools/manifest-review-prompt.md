---
type: tool
title: "K8s Manifest Review Prompt (Extended)"
---

# K8s Manifest Review Prompt (Extended)

Use this prompt template when reviewing Kubernetes manifests for production readiness with an LLM.

## System Context

```
You are a Kubernetes security and reliability reviewer. Review the provided manifest(s) against production best practices for K8s 1.31+. Be specific -- cite exact fields, line numbers, and provide corrected YAML.
```

## Review Prompt

```
Review this Kubernetes manifest for production readiness.

== MANIFEST START ==
{paste manifest here}
== MANIFEST END ==

## Evaluation Criteria

### Security (P0)
- [ ] securityContext.runAsNonRoot: true (pod and container level)
- [ ] securityContext.allowPrivilegeEscalation: false
- [ ] securityContext.readOnlyRootFilesystem: true
- [ ] capabilities.drop: ["ALL"] (add back only what's needed)
- [ ] seccompProfile.type: RuntimeDefault
- [ ] automountServiceAccountToken: false (unless K8s API needed)
- [ ] No :latest image tags -- pinned by semver or digest
- [ ] No hostNetwork, hostPID, hostIPC, privileged: true
- [ ] Namespace has pod-security.kubernetes.io/enforce: restricted label

### Reliability (P0)
- [ ] Resource requests set on all containers
- [ ] Memory limits set (CPU limits absent on latency-sensitive workloads)
- [ ] Readiness probe defined -- gates traffic during startup/degradation
- [ ] Liveness probe defined -- detects unrecoverable states (different from readiness)
- [ ] Startup probe for slow-starting apps (prevents liveness from killing during boot)
- [ ] PodDisruptionBudget exists when replicas > 1
- [ ] preStop lifecycle hook for graceful shutdown (sleep 5 + SIGTERM)
- [ ] terminationGracePeriodSeconds >= time needed for drain

### High Availability (P1)
- [ ] topologySpreadConstraints across zones (maxSkew: 1)
- [ ] replicas >= 2 for any non-batch workload
- [ ] rollingUpdate strategy with maxUnavailable <= 1

### Networking (P1)
- [ ] NetworkPolicy default deny in namespace
- [ ] Explicit ingress/egress rules per workload
- [ ] Service ports match containerPort names

### Operations (P2)
- [ ] Labels follow app.kubernetes.io/ convention
- [ ] revisionHistoryLimit set (3-5)
- [ ] env vars from ConfigMap/Secret references (not hardcoded)
- [ ] No secrets in plain text

## Output Format

For EACH finding:
- **Severity**: Critical (blocks deploy) | Warning (fix before prod) | Info (improvement)
- **Location**: resource kind/name, field path
- **Issue**: what's wrong or missing
- **Impact**: what happens if not fixed
- **Fix**: exact YAML snippet to apply

End with a summary: X critical, Y warnings, Z info. Production-ready: YES/NO.
```

## Quick Validation Commands

```bash
# Validate against restricted PSA locally (requires kubectl 1.27+)
kubectl apply --dry-run=server -f manifest.yaml

# Check resource completeness
kubectl diff -f manifest.yaml 2>&1 | head -50

# Policy engine validation (if Kyverno installed)
kyverno apply /path/to/policies/ --resource manifest.yaml
```
