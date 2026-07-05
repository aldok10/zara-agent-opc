---
type: subskill
title: "Kubernetes Security"
---

# Kubernetes Security

## Pod Security Admission (PSA)
- Replaces deprecated PodSecurityPolicy
- Levels: `restricted` (prod), `baseline` (general), `privileged` (system only)
- Enforce on namespace: `pod-security.kubernetes.io/enforce: restricted`
- Warn + audit on baseline for migration visibility

## RBAC
- Role (namespace-scoped) / ClusterRole (cluster-wide)
- Bind to ServiceAccount, not user (machine identity)
- Least privilege: specific verbs + resources, never `*`
- Audit: `kubectl auth can-i --list --as=system:serviceaccount:ns:sa`

## Secrets Management
- Native Secrets: base64 only (not encrypted at rest by default)
- External Secrets Operator: sync from Vault/AWS SM/GCP SM into K8s
- Sealed Secrets: encrypt with controller public key, decrypt in cluster
- Recommendation: ESO for production, native only for non-sensitive config

## Image Security
- Require signed images (cosign verify at admission)
- Admission webhooks: Kyverno or OPA Gatekeeper policies
- Never allow `:latest` tag in production
- Image pull from private registry with imagePullSecrets

## SecurityContext (pod/container level)
```yaml
securityContext:
  runAsNonRoot: true
  readOnlyRootFilesystem: true
  allowPrivilegeEscalation: false
  capabilities:
    drop: ["ALL"]
```
