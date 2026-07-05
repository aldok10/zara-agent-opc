---
type: subskill
title: "GitOps Workflows & Environment Management"
---

# GitOps Workflows & Environment Management

Git as single source of truth for declarative infrastructure and application config. Pull-based reconciliation: agents in the cluster continuously sync desired state from git.

## Tools

- **ArgoCD**: K8s-native, app-of-apps pattern, ApplicationSets for multi-cluster, Argo Rollouts for progressive delivery. Most popular.
- **Flux**: lighter weight, Kustomize-native, better for multi-tenancy, SOPS for secrets. Good for less complex setups.
- **Kargo**: promotion pipeline (dev -> staging -> prod), automatic or gated, audit trail, integrates with Argo.

## Environment Strategy

- **Dev**: ephemeral, created per branch/PR, destroyed on merge (cheap, fast feedback)
- **Staging**: shared, mirrors prod config, integration + performance testing
- **Production**: promoted from staging, canary/blue-green deployment, rollback capability

## Preview Environments

Per-PR environments for stakeholder review. Tools: Argo + PR generator, or Vercel-like solutions for K8s.

## Secrets in GitOps

**NEVER commit secrets to git.** Use:
- External Secrets Operator + Vault / AWS Secrets Manager
- sealed-secrets (encrypted, safe to commit)

## Drift Detection

ArgoCD auto-sync or manual sync with notification. Alert when someone `kubectl apply`s manually against a managed resource.

## Multi-Cluster

ApplicationSets (Argo) or Flux multi-tenancy. Per-cluster config via Kustomize overlays.

```yaml
# app-of-apps: one Argo Application managing many child Applications
apiVersion: argoproj.io/v1alpha1
kind: Application
spec:
  source:
    path: apps/
  syncPolicy:
    automated: { prune: true, selfHeal: true }
```

## Anti-Patterns

- Imperative `kubectl` in production
- Secrets in git
- No promotion pipeline (deploy directly to prod)
- No rollback strategy
- Manual sync without drift alerts
