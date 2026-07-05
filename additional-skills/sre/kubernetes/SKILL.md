---
name: kubernetes
description: "Container orchestration: K8s 1.31+, Gateway API, Karpenter, KEDA, pod security"
---

# Kubernetes Specialist

Container orchestration for production workloads on Kubernetes 1.31+.

## Scope

Covers cluster architecture, workload deployment, networking (Gateway API), autoscaling (Karpenter, KEDA), pod security, storage, and troubleshooting. Applies to EKS, GKE, AKS, and self-managed clusters running K8s 1.31 or later.

## First Action

When loaded: identify the problem type (workload deployment, networking, scaling, security, storage, or troubleshooting) and route to the appropriate subskill. Read existing manifests in the target namespace before proposing changes.

## Constraints

1. Gateway API v1.3+ for all new ingress/routing -- Ingress resources are legacy and should only be maintained, never created new
2. Karpenter NodePools over Cluster Autoscaler -- respond to pending pods in <30s vs 2-3min
3. Pod Security Admission set to `enforce: restricted` in all production namespaces
4. PodDisruptionBudgets required on every workload with replicas >1 -- minAvailable or maxUnavailable set
5. topologySpreadConstraints with maxSkew=1 across zones for HA -- do not rely on pod anti-affinity alone
6. KEDA ScaledObjects for event-driven scaling (queue depth, Kafka lag); HPA only for CPU/memory
7. Resource requests must be set on all containers -- requests = scheduling guarantee, limits = OOM ceiling
8. CPU limits should NOT be set on latency-sensitive workloads (causes CFS throttling); use requests only
9. Liveness probes detect unrecoverable states; readiness probes gate traffic -- never make them identical
10. One application container per pod; sidecars require documented justification (logging, proxy, init)
11. Namespace-per-team with ResourceQuotas (cpu, memory, pods) and LimitRanges (defaults)
12. External Secrets Operator for secret injection from Vault/AWS SM -- no secrets stored in Git or ConfigMaps
13. Pod identity (EKS Pod Identity, GKE Workload Identity) over mounted service account keys
14. Helm charts pinned to exact version; Kustomize overlays for environment-specific patches
15. preStop hooks with `sleep 5` + SIGTERM handling for graceful shutdown before LB deregistration

## DO NOT

1. Run pods as root or with `privileged: true` (violates restricted PSA and expands attack surface)
2. Use `:latest` tag on images -- pin by digest or immutable semver tag for reproducibility
3. Skip PDBs on stateful workloads (risks data corruption during node drain)
4. Set CPU limits on latency-sensitive services (CFS throttling causes p99 spikes)
5. Use `hostNetwork`, `hostPID`, or `hostIPC` unless running CNI/CSI/monitoring agents
6. Deploy without readiness probes (causes traffic to unready pods during rollout)
7. Create NetworkPolicy `allow-all` rules (defeats purpose of network segmentation)
8. Use Ingress for new deployments -- Gateway API is the standard since K8s 1.29+
9. Mount service account tokens into pods that do not need K8s API access (`automountServiceAccountToken: false`)

## Route to Subskill

| Signal | Subskill | Focus |
|--------|----------|-------|
| Deploying/scaling apps | workloads | Deployments, StatefulSets, Jobs, DaemonSets, KEDA, HPA |
| Service routing, ingress | networking | Gateway API, NetworkPolicy, Services, DNS, mTLS |
| Persistent volumes, backups | storage | PVCs, CSI drivers, StorageClasses, Velero |
| Hardening, RBAC, admission | security | PSA, RBAC, pod identity, OPA/Kyverno, secrets |
| Custom controllers, CRDs | operators | Operator SDK, controller-runtime, reconciliation |
| Pod crashes, node pressure | troubleshooting | Events, logs, exec, resource pressure, network debug |

## Verification

- [ ] `kubectl auth can-i --list` shows least-privilege RBAC
- [ ] All pods pass `restricted` PSA validation
- [ ] PDB exists for every Deployment/StatefulSet with replicas >1
- [ ] Resource requests set; CPU limits absent on latency-sensitive services
- [ ] topologySpreadConstraints spread pods across 3+ zones
- [ ] Gateway API HTTPRoutes resolve correctly (`kubectl get httproute`)
- [ ] Karpenter NodePool constraints match workload instance requirements

## Knowledge

- knowledge/kubernetes-gateway-api.md
- knowledge/karpenter-nodepools.md
- knowledge/keda-scalers.md
- knowledge/pod-security-admission.md
- knowledge/kubernetes-troubleshooting.md

## AI-Era Context (2026)

- Gateway API v1.3 is GA and the default routing mechanism; Ingress controller maintainers recommend migration
- Karpenter v1.0+ is production-stable on EKS and in beta for GKE; replaced Cluster Autoscaler in most greenfield deployments
- K8s 1.31 removed in-tree cloud provider code -- external cloud-controller-manager is mandatory
- Sidecar containers (KEP-753) are GA -- native init/sidecar lifecycle support replaces workarounds
- Pod identity is the standard auth mechanism (IRSA deprecated in favor of EKS Pod Identity)
- KEDA 2.15+ supports paused ScaledObjects and composite scalers for complex scaling logic
- Wasm workloads via SpinKube/containerd-shim-spin are emerging for edge and serverless-on-K8s
- ValidatingAdmissionPolicy (CEL-based) replaces many webhook-based admission controllers

## Related Skills

- docker -- container image builds consumed by K8s workloads
- gitops -- deployment delivery mechanism for K8s manifests
- terraform -- cluster provisioning (EKS/GKE/AKS modules)
- observability -- metrics, logs, traces from K8s workloads
