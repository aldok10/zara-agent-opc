---
type: tool
title: "GitOps PR Review Prompt"
---

# GitOps PR Review Prompt

You are reviewing a pull request that modifies GitOps manifests (Kubernetes YAML, Helm values, ArgoCD Applications, Kustomize overlays). Evaluate for correctness, safety, and operational risk.

## Instructions

### 1. Change Classification

Classify each changed file:
- **Config change** -- environment variables, feature flags, resource limits
- **Image update** -- container image tag change (deployment)
- **Infrastructure** -- new services, RBAC, network policies, storage
- **ArgoCD config** -- sync policies, Application/ApplicationSet changes
- **Secret reference** -- ExternalSecret, SealedSecret, or SOPS-encrypted values

### 2. Safety Checks

- [ ] No secrets committed in plaintext (base64 in a Secret manifest is NOT encrypted)
- [ ] Image tags are immutable (use SHA digests or semver, never `latest` or `main`)
- [ ] Resource requests and limits are set on all containers
- [ ] Liveness/readiness probes defined
- [ ] PodDisruptionBudget exists for production workloads
- [ ] Network policies don't accidentally block required traffic
- [ ] RBAC follows least privilege (no ClusterRoleBindings to `cluster-admin`)

### 3. Sync Policy Review

If sync policy changes are present:
- Is `prune: true` intentional? (Will delete resources removed from git)
- Is `selfHeal: true` appropriate? (Will revert manual hotfixes)
- Are sync windows configured for production?
- Is `ServerSideApply` enabled for large resources?
- Is retry configured with backoff?

### 4. Blast Radius Assessment

- How many clusters/namespaces are affected?
- Is this a single-service or cross-cutting change?
- Does an ApplicationSet generator expand to more targets than intended?
- Are there wave annotations ensuring correct ordering?

### 5. Rollback Capability

- Can this change be reverted by a simple `git revert`?
- Are there one-way operations (database migrations, PVC resizing, CRD removal)?
- Is `preserveResourcesOnDeletion` set where needed?

### 6. Progressive Delivery

If rollout strategy is modified:
- Are analysis templates still referenced and valid?
- Are canary weights reasonable (not jumping from 5% to 100%)?
- Is `failureLimit` set to prevent premature rollback on metric noise?
- Are pause durations sufficient for metric collection?

## Output Format

```
## Summary
- Files changed: N
- Services affected: [list]
- Clusters affected: [list]
- Risk level: LOW / MEDIUM / HIGH / CRITICAL

## Issues Found
1. [severity] description -- file:line
2. ...

## Recommendations
- [ ] Specific actionable items

## Approved: YES / NO / NEEDS_CHANGES
```

## Context Signals

Things that elevate risk:
- Changes touching `prod` or `production` paths/clusters
- RBAC or NetworkPolicy modifications
- Sync policy enabling `prune` for the first time
- ApplicationSet generator changes (may create/delete Applications)
- Removal of PDB, HPA, or monitoring resources
- Resource limit reductions below current usage
