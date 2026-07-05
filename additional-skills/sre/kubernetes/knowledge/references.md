# References

## Official Kubernetes Documentation (8 refs)
- **Kubernetes Concepts** -- https://kubernetes.io/docs/concepts/ -- Core abstractions: Pods, Services, Deployments, StatefulSets
- **Kubernetes API Reference** -- https://kubernetes.io/docs/reference/kubernetes-api/ -- Complete API specification for all resource types
- **kubectl Reference** -- https://kubernetes.io/docs/reference/kubectl/ -- CLI tool commands and usage patterns
- **Kubernetes Blog** -- https://kubernetes.io/blog/ -- Release announcements, feature highlights, deprecation notices
- **Kubernetes Enhancement Proposals (KEPs)** -- https://github.com/kubernetes/enhancements -- Design docs for upcoming features
- **Kubernetes Security Best Practices** -- https://kubernetes.io/docs/concepts/security/ -- Security context, RBAC, network policies
- **Kubernetes Scheduling** -- https://kubernetes.io/docs/concepts/scheduling-eviction/ -- Scheduler configuration, affinity, taints/tolerations
- **Kubernetes Storage** -- https://kubernetes.io/docs/concepts/storage/ -- PV/PVC, CSI drivers, storage classes

## Gateway API (5 refs)
- **Gateway API Docs** -- https://gateway-api.sigs.k8s.io/ -- Official specification for next-gen Kubernetes ingress
- **Gateway API Guides** -- https://gateway-api.sigs.k8s.io/guides/ -- Implementation patterns and migration from Ingress
- **GEP Index** -- https://gateway-api.sigs.k8s.io/geps/overview/ -- Gateway Enhancement Proposals tracking feature evolution
- **Gateway API Implementations** -- https://gateway-api.sigs.k8s.io/implementations/ -- Conformance status of various controllers
- **HTTPRoute Reference** -- https://gateway-api.sigs.k8s.io/api-types/httproute/ -- Traffic routing specification

## Karpenter (5 refs)
- **Karpenter Docs** -- https://karpenter.sh/docs/ -- Just-in-time node provisioning for Kubernetes
- **Karpenter NodePool API** -- https://karpenter.sh/docs/concepts/nodepools/ -- Configuration for node provisioning constraints
- **Karpenter NodeClass** -- https://karpenter.sh/docs/concepts/nodeclasses/ -- Cloud-provider-specific node configuration
- **Karpenter Disruption** -- https://karpenter.sh/docs/concepts/disruption/ -- Consolidation, drift detection, expiration
- **Karpenter Best Practices** -- https://karpenter.sh/docs/best-practices/ -- Production deployment patterns

## KEDA (5 refs)
- **KEDA Docs** -- https://keda.sh/docs/ -- Event-driven autoscaling for Kubernetes workloads
- **KEDA Scalers** -- https://keda.sh/docs/scalers/ -- All supported event sources (60+ scalers)
- **KEDA ScaledObject** -- https://keda.sh/docs/concepts/scaling-deployments/ -- Configuration for scaling Deployments
- **KEDA ScaledJob** -- https://keda.sh/docs/concepts/scaling-jobs/ -- Event-driven Job creation
- **KEDA Troubleshooting** -- https://keda.sh/docs/troubleshooting/ -- Common issues and debugging approaches

## Pod Security (5 refs)
- **Pod Security Admission** -- https://kubernetes.io/docs/concepts/security/pod-security-admission/ -- Built-in admission controller for pod security
- **Pod Security Standards** -- https://kubernetes.io/docs/concepts/security/pod-security-standards/ -- Privileged, Baseline, Restricted profiles
- **Kyverno** -- https://kyverno.io/docs/ -- Policy engine for Kubernetes validation and mutation
- **OPA Gatekeeper** -- https://open-policy-agent.github.io/gatekeeper/website/docs/ -- Policy enforcement via admission webhooks
- **Kubernetes RBAC** -- https://kubernetes.io/docs/reference/access-authn-authz/rbac/ -- Role-based access control configuration

## Networking & Service Mesh (5 refs)
- **Kubernetes Networking Model** -- https://kubernetes.io/docs/concepts/services-networking/ -- Services, DNS, NetworkPolicy fundamentals
- **Cilium** -- https://docs.cilium.io/ -- eBPF-based networking, observability, and security
- **Istio** -- https://istio.io/latest/docs/ -- Service mesh: traffic management, mTLS, observability
- **CoreDNS** -- https://coredns.io/manual/toc/ -- Kubernetes DNS server configuration
- **Calico** -- https://docs.tigera.io/calico/latest/about/ -- Network policy enforcement and BGP routing

## Reliability & Operations (7 refs)
- **Kubernetes SIG Reliability** -- https://github.com/kubernetes/community/tree/master/sig-scalability -- Scalability and reliability working group
- **Velero** -- https://velero.io/docs/ -- Backup and disaster recovery for Kubernetes
- **Chaos Mesh** -- https://chaos-mesh.org/docs/ -- Chaos engineering platform for Kubernetes
- **Vertical Pod Autoscaler** -- https://github.com/kubernetes/autoscaler/tree/master/vertical-pod-autoscaler -- Right-sizing pod resource requests
- **PodDisruptionBudget** -- https://kubernetes.io/docs/concepts/workloads/pods/disruptions/ -- Voluntary disruption protection
- **Kubernetes Metrics Server** -- https://github.com/kubernetes-sigs/metrics-server -- Resource metrics for HPA and VPA
- **Learnk8s Production Best Practices** -- https://learnk8s.io/production-best-practices -- Checklist for production readiness

## Tools & Ecosystem (5 refs)
- **Helm** -- https://helm.sh/docs/ -- Package manager for Kubernetes applications
- **Kustomize** -- https://kustomize.io/ -- Template-free configuration customization
- **k9s** -- https://k9scli.io/ -- Terminal UI for Kubernetes cluster management
- **Kubebuilder** -- https://book.kubebuilder.io/ -- Framework for building Kubernetes operators
- **cert-manager** -- https://cert-manager.io/docs/ -- Automated TLS certificate management
