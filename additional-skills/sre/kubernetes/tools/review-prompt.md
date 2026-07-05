---
type: tool
title: "K8s Manifest Review Prompt"
---

# K8s Manifest Review Prompt

```
Review this Kubernetes manifest for production readiness:

Checklist:
1. [ ] Resource requests AND limits set (memory limit mandatory, CPU limit optional)
2. [ ] Liveness + readiness probes defined (startup probe for slow-starting apps)
3. [ ] SecurityContext: runAsNonRoot, readOnlyRootFilesystem, drop ALL capabilities
4. [ ] PodDisruptionBudget exists for replicas > 1
5. [ ] No :latest tag (pinned image version or digest)
6. [ ] topologySpreadConstraints or podAntiAffinity for HA
7. [ ] Labels consistent: app.kubernetes.io/name, version, component, managed-by
8. [ ] Secrets via External Secrets Operator (not hardcoded in env)
9. [ ] Service account with minimal RBAC (not default)
10. [ ] Namespace has Pod Security Admission label (restricted)

For each issue found:
- Severity: Critical / Warning / Info
- What: specific field or missing configuration
- Why: impact if not fixed
- Fix: exact YAML change needed
```
