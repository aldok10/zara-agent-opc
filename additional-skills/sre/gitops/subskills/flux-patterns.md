---
type: subskill
title: "Flux Patterns"
---

# Flux Patterns

## Core Concepts
- Flux is a GitOps toolkit for Kubernetes; reconciles cluster state against git repositories
- Core controllers: source-controller, kustomize-controller, helm-controller, notification-controller
- GitRepository/HelmRepository sources define where desired state lives
- Kustomization/HelmRelease resources define what to apply and how
- Reconciliation interval controls how frequently Flux checks for drift

## Key Practices
- Structure repos with base/overlays pattern: `base/` for shared manifests, `overlays/<env>/` for patches
- Use Flux's dependency ordering (`dependsOn`) to sequence deployments (infra before apps)
- Configure health checks on Kustomizations to gate dependent deployments on actual readiness
- Use SOPS or Sealed Secrets for encrypted secrets stored in git
- Set up notifications (Slack, webhook) for reconciliation failures and successful deployments

## Common Mistakes
- Putting all environments in one Kustomization, causing blast radius on reconciliation failure
- Not setting `prune: true`, leaving orphaned resources when manifests are removed from git
- Ignoring reconciliation timeouts, causing cascading delays in dependent resources

## When to Apply
- Implementing GitOps for Kubernetes clusters (single or multi-cluster)
- Migrating from imperative kubectl/helm deployments to declarative reconciliation
- Setting up progressive delivery with Flux + Flagger integration
