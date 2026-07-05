---
type: subskill
title: "Argo CD Patterns"
---

# Argo CD Patterns

## Core Concepts
- Argo CD is a declarative GitOps continuous delivery tool for Kubernetes
- Application CRD defines: source (git repo + path + revision), destination (cluster + namespace), sync policy
- Sync strategies: manual (human approval), automated (self-healing + auto-prune)
- App-of-apps pattern: one Application manages other Application manifests for scalable multi-app management
- Health assessment: Argo CD checks resource health status beyond just "applied successfully"

## Key Practices
- Use ApplicationSets for generating Applications from templates (cluster/git generators)
- Enable auto-sync with self-heal for non-production; require manual sync for production
- Configure sync windows to restrict deployments during maintenance periods or peak traffic
- Use resource hooks (PreSync, PostSync, SyncFail) for migrations, notifications, and cleanup
- Structure git repos: one repo for app manifests, separate repo for Argo CD configuration

## Common Mistakes
- Enabling auto-prune in production without sync windows (accidental resource deletion)
- Not configuring resource exclusions, causing Argo CD to fight with other controllers
- Using HEAD/latest branch tracking instead of pinned revisions for production applications

## When to Apply
- Managing multi-cluster Kubernetes deployments from a central control plane
- Implementing approval workflows for production deployments
- Providing developer self-service deployment via git pull requests
