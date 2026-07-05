# ArgoCD Patterns

## ApplicationSets

ApplicationSets generate ArgoCD Applications dynamically from templates. They replace manual Application manifests for multi-cluster and multi-tenant deployments.

### Generators

**List Generator** -- explicit enumeration of targets:

```yaml
generators:
  - list:
      elements:
        - cluster: production
          url: https://prod.k8s.internal
        - cluster: staging
          url: https://staging.k8s.internal
```

**Git Directory Generator** -- one Application per directory in a repo:

```yaml
generators:
  - git:
      repoURL: https://github.com/org/deployments.git
      revision: HEAD
      directories:
        - path: apps/*
        - path: apps/excluded-app
          exclude: true
```

**Git File Generator** -- driven by config files in git:

```yaml
generators:
  - git:
      repoURL: https://github.com/org/deployments.git
      revision: HEAD
      files:
        - path: "clusters/*/config.json"
```

**Matrix Generator** -- cartesian product of two generators (e.g., every app x every cluster):

```yaml
generators:
  - matrix:
      generators:
        - git:
            repoURL: https://github.com/org/apps.git
            directories:
              - path: "*"
        - list:
            elements:
              - cluster: prod
              - cluster: staging
```

**Merge Generator** -- combine results with override semantics. Useful for per-cluster overrides on top of a base configuration.

### Template Overrides

Use `template` in ApplicationSet for defaults and `templatePatch` for per-element overrides:

```yaml
templatePatch: |
  spec:
    source:
      helm:
        values: |
          replicaCount: {{.replicas}}
```

## App-of-Apps Pattern

A root Application that manages other Application manifests. The root points to a directory of Application YAMLs.

```
argocd/
  root-app.yaml          -- points to apps/ directory
  apps/
    payment-service.yaml
    user-service.yaml
    infra-components.yaml
```

Benefits:
- Single entry point for bootstrapping a cluster
- Declarative dependency management between applications
- Easy to add/remove services by adding/removing YAML files

Drawback: manual Application YAML per service. ApplicationSets solve this for homogeneous deployments.

## Sync Strategies

### Automated Sync

```yaml
spec:
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
      allowEmpty: false
```

- `prune: true` -- delete resources removed from git
- `selfHeal: true` -- revert manual cluster changes back to git state
- `allowEmpty: false` -- prevent accidental deletion of all resources if source is empty

### Sync Waves

Order resource creation using annotations:

```yaml
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "-1"  # namespaces, CRDs first
```

Lower numbers sync first. Use for: CRDs before CRs, namespaces before workloads, ConfigMaps before Deployments.

### Sync Windows

Restrict when syncs can occur (maintenance windows):

```yaml
spec:
  syncWindows:
    - kind: allow
      schedule: "0 2 * * 1-5"
      duration: 2h
      applications: ["prod-*"]
```

### Retry Policy

```yaml
spec:
  syncPolicy:
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
```

## Multi-Cluster Management

### Hub-Spoke Model

Central ArgoCD instance (hub) manages applications across multiple clusters (spokes). Register clusters with `argocd cluster add`.

### Per-Cluster ArgoCD

Each cluster runs its own ArgoCD managing only local applications. Simpler RBAC, fewer network dependencies, but more operational overhead.

### Hybrid

Central ArgoCD for platform components; per-cluster ArgoCD for team workloads. Best for organizations with both platform and application teams.

## Health Checks and Notifications

Custom health checks for CRDs:

```yaml
resource.customizations.health.argoproj.io_Rollout: |
  hs = {}
  if obj.status ~= nil then
    if obj.status.currentStepIndex == obj.status.stepsCount then
      hs.status = "Healthy"
    else
      hs.status = "Progressing"
    end
  end
  return hs
```

Notifications via ArgoCD Notifications Controller -- send alerts on sync failures, health degradation, or successful deployments to Slack, PagerDuty, or webhooks.

## Best Practices

- Pin ApplicationSet controller version alongside ArgoCD version
- Use `preserveResourcesOnDeletion: true` in ApplicationSets for stateful workloads
- Set `ignoreApplicationDifferences` for fields managed by controllers (HPA replicas)
- Use Projects to isolate teams (restrict source repos, destination clusters/namespaces)
- Enable SSO and RBAC -- never share admin credentials across teams
