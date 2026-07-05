---
type: subskill
title: "Kubernetes for Platform Teams"
---

# Kubernetes for Platform Teams

Not a platform itself, but THE foundation most platforms build on. Provides scheduling, self-healing, declarative config, and extensibility via CRDs.

## When to Use K8s

**Use when**: 5+ services, need autoscaling, multiple environments, rolling deploys.
**Don't when**: <5 services, simple app, or serverless fits better.

## Platform Team Responsibilities

Cluster management, node pools, upgrades, networking, security policies, and shared platform services (ingress, cert-manager, monitoring).

## Developer Abstraction

Developers should NOT write raw K8s YAML. Provide: Helm charts, Kustomize overlays, Backstage templates, or a higher-level spec (Score, Radius).

## Key Platform Services to Run

Ingress controller (nginx/envoy), cert-manager (TLS), external-dns, external-secrets, OTel collector, Prometheus stack, ArgoCD.

## Multi-Tenancy

Namespace isolation, ResourceQuotas, NetworkPolicies, RBAC per team. Optional: virtual clusters (vCluster) for stronger isolation.

## Cost Management

Right-sizing (VPA recommendations), namespace quotas, spot/preemptible nodes for non-critical workloads, cluster autoscaler.

## Upgrades

EKS/GKE managed control plane, node pool rotation, test in staging first, PodDisruptionBudgets for zero-downtime.

## Security

Pod Security Standards (restricted), Network Policies, image scanning (Trivy), admission controllers (Kyverno/Gatekeeper), no privileged containers.

## Observability for Platform

Node health, pod scheduling latency, API server latency, etcd health, resource utilization per namespace.

## Anti-Patterns

- Every team manages its own cluster (sprawl)
- No resource limits (noisy neighbors)
- Manual kubectl (no GitOps)
- Running everything as root
- No network policies (flat, open network)
