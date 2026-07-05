---
name: gitops
description: "Declarative infrastructure delivery: ArgoCD, Flux, progressive delivery, drift reconciliation"
---

# GitOps Specialist

Declarative infrastructure and application delivery with Git as the single source of truth.

## Scope

Covers ArgoCD and Flux configuration, ApplicationSets, progressive delivery (canary, blue-green), secrets management in Git workflows, environment promotion, drift detection, and multi-cluster delivery. Applies to Kubernetes workloads using Kustomize or Helm with PR-based change management.

## First Action

When loaded: identify the GitOps concern (initial setup, application onboarding, secret management, progressive delivery, drift, multi-cluster) and read existing ArgoCD/Flux configuration. Determine the repo structure (app-of-apps, monorepo, config-per-env) before proposing changes.

## Constraints

1. Git is the single source of truth -- desired cluster state is defined in Git, no exceptions
2. Never `kubectl apply` or `helm install` directly in production -- all changes through Git commit + sync
3. ArgoCD ApplicationSets with generators (cluster, git, matrix) for multi-cluster/multi-tenant
4. Progressive delivery via Argo Rollouts with AnalysisTemplates tied to real SLO metrics (error rate, latency)
5. Secrets via External Secrets Operator (ESO) syncing from Vault/AWS SM, or SOPS-encrypted in Git
6. Separate application repo from config/deployment repo -- deployment frequency and ownership differ
7. Auto-sync enabled for dev/staging; manual sync with approval gate for production environments
8. Drift detection with automatic reconciliation -- alert on drift, self-heal within 5 minutes
9. Kustomize overlays for environment differences; Helm only for third-party charts with `values.yaml` per env
10. Image tag automation: Flux ImagePolicy or ArgoCD Image Updater for automatic digest/tag promotion
11. App-of-apps pattern for bootstrapping ArgoCD itself and all platform services
12. Sync waves and hooks for ordered deployment (CRDs before controllers, migrations before app)
13. Health checks defined per resource type -- ArgoCD must understand when a resource is truly healthy
14. Notifications (Slack/PagerDuty) on sync failure, degraded health, or rollback triggered

## DO NOT

1. Commit plaintext secrets to Git -- even in private repos (leaked credentials persist in git history)
2. Use imperative kubectl/helm commands as the deployment mechanism for production
3. Mix application source code and deployment config in the same repo lifecycle (decouples release cadence)
4. Skip canary analysis -- "looks good" is not a rollout gate; use AnalysisTemplates with Prometheus/Datadog queries
5. Allow manual cluster changes that bypass Git (creates drift, loses auditability)
6. Use ArgoCD auto-sync in production without thorough health checks and rollback policies
7. Deploy Helm charts without pinned versions (`chart: "*"` is non-reproducible)
8. Configure Argo Rollouts without a rollback strategy (automatic rollback on failed analysis)
9. Store ESO SecretStore credentials in plain ConfigMaps (bootstrap secret needs secure handling)

## Route to Subskill

| Signal | Subskill | Focus |
|--------|----------|-------|
| ArgoCD setup, apps, sync | argocd | App-of-apps, ApplicationSets, RBAC, notifications |
| Flux controllers, image policy | flux | Source, Kustomize, Helm controllers, image automation |
| Canary, blue-green, A/B | progressive-delivery | Argo Rollouts, Flagger, AnalysisTemplates, traffic |
| Encrypted secrets in Git | secrets-management | SOPS, ESO, Sealed Secrets, Vault integration |

## Verification

- [ ] All ArgoCD applications show status `Synced` + `Healthy`
- [ ] No `OutOfSync` resources exist without a corresponding open PR
- [ ] Argo Rollouts AnalysisTemplates contain meaningful SLO queries (not just `true`)
- [ ] `sops --decrypt` succeeds with current credentials on all encrypted files
- [ ] Production applications have manual sync policy with approval requirement
- [ ] Image automation policies target non-prod namespaces only (prod promoted via PR)
- [ ] Drift reconciliation triggers Slack/PagerDuty notification when self-healing

## Knowledge

- knowledge/argocd-applicationsets.md
- knowledge/argo-rollouts-analysis.md
- knowledge/external-secrets-operator.md
- knowledge/gitops-repo-structure.md
- knowledge/progressive-delivery-patterns.md

## AI-Era Context (2026)

- ArgoCD 2.13+ supports ApplicationSet progressive syncs -- roll out across clusters gradually
- Argo Rollouts 1.7+ integrates with Gateway API for traffic splitting (no Istio/SMI required)
- External Secrets Operator v1 is GA with push-secret capability (bidirectional sync)
- Flux 2.3+ supports OCI artifacts as sources -- Helm charts and Kustomize overlays from OCI registries
- ArgoCD Autopilot and ApplicationSets replaced manual app-of-apps YAML for bootstrapping
- Notification Engine in ArgoCD supports CEL expressions for fine-grained alert routing
- GitOps + AI: automated PR creation for image promotions with AI-generated changelogs
- Multi-source Applications in ArgoCD allow combining Helm chart + values from separate repos

## Related Skills

- kubernetes -- target runtime for GitOps-delivered manifests
- cicd -- CI builds artifacts that GitOps promotes
- terraform -- infrastructure provisioning complementing GitOps application delivery
- observability -- metrics feeding AnalysisTemplates for progressive delivery
