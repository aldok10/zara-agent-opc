# References

## Argo CD (8 refs)
- **Argo CD Documentation** -- https://argo-cd.readthedocs.io/en/stable/ -- Declarative GitOps continuous delivery for Kubernetes
- **Argo CD Getting Started** -- https://argo-cd.readthedocs.io/en/stable/getting_started/ -- Installation and first application
- **Argo CD Application CRD** -- https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/ -- Managing apps declaratively
- **Argo CD ApplicationSet** -- https://argo-cd.readthedocs.io/en/stable/user-guide/application-set/ -- Generating applications from templates
- **Argo CD Sync Strategies** -- https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/ -- Auto-sync, prune, self-heal configuration
- **Argo CD RBAC** -- https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/ -- Role-based access control policies
- **Argo CD Notifications** -- https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/ -- Event-driven alerting and messaging
- **Argo CD Best Practices** -- https://argo-cd.readthedocs.io/en/stable/user-guide/best_practices/ -- Repository structure and app patterns

## Flux CD (7 refs)
- **Flux Documentation** -- https://fluxcd.io/flux/ -- GitOps toolkit for Kubernetes
- **Flux Getting Started** -- https://fluxcd.io/flux/get-started/ -- Bootstrap and first reconciliation
- **Flux Kustomization** -- https://fluxcd.io/flux/components/kustomize/ -- Kustomize-based reconciliation controller
- **Flux HelmRelease** -- https://fluxcd.io/flux/components/helm/ -- Helm chart lifecycle management
- **Flux Image Automation** -- https://fluxcd.io/flux/guides/image-update/ -- Automatic container image updates
- **Flux Multi-tenancy** -- https://fluxcd.io/flux/installation/configuration/multitenancy/ -- Namespace isolation and RBAC
- **Flux Monitoring** -- https://fluxcd.io/flux/monitoring/ -- Prometheus metrics and Grafana dashboards

## Argo Rollouts & Progressive Delivery (6 refs)
- **Argo Rollouts** -- https://argo-rollouts.readthedocs.io/en/stable/ -- Advanced deployment strategies for Kubernetes
- **Canary Deployments** -- https://argo-rollouts.readthedocs.io/en/stable/features/canary/ -- Traffic-weighted rollout with analysis
- **Blue-Green Deployments** -- https://argo-rollouts.readthedocs.io/en/stable/features/bluegreen/ -- Zero-downtime deployment switching
- **Analysis Templates** -- https://argo-rollouts.readthedocs.io/en/stable/features/analysis/ -- Automated promotion/rollback based on metrics
- **Traffic Management** -- https://argo-rollouts.readthedocs.io/en/stable/features/traffic-management/ -- Istio, NGINX, ALB traffic splitting
- **Flagger** -- https://flagger.app/ -- Progressive delivery operator with Istio/Linkerd/Gateway API

## GitOps Principles & Patterns (6 refs)
- **OpenGitOps** -- https://opengitops.dev/ -- CNCF GitOps principles and specification
- **GitOps Working Group** -- https://github.com/open-gitops/documents -- Community standards and definitions
- **Weaveworks GitOps** -- https://www.weave.works/technologies/gitops/ -- Original GitOps concept and patterns
- **GitOps with Helm** -- https://fluxcd.io/flux/guides/helmreleases/ -- Managing Helm releases declaratively
- **Kustomize Overlays** -- https://kubectl.docs.kubernetes.io/references/kustomize/ -- Environment-specific configuration
- **Sealed Secrets** -- https://sealed-secrets.netlify.app/ -- Encrypted secrets safe for Git storage

## Multi-Cluster & Multi-Env (4 refs)
- **Argo CD Multi-cluster** -- https://argo-cd.readthedocs.io/en/stable/user-guide/clusters/ -- Managing multiple cluster destinations
- **Flux Multi-cluster** -- https://fluxcd.io/flux/use-cases/flux-multi-cluster/ -- Fleet management patterns
- **Cluster API** -- https://cluster-api.sigs.k8s.io/ -- Declarative cluster lifecycle management
- **vcluster** -- https://www.vcluster.com/docs -- Virtual clusters for dev/test environments

## Secret Management in GitOps (5 refs)
- **Sealed Secrets** -- https://github.com/bitnami-labs/sealed-secrets -- One-way encrypted secrets for Git
- **SOPS** -- https://getsops.io/ -- Encrypted file editor for YAML/JSON/ENV
- **External Secrets Operator** -- https://external-secrets.io/ -- Sync secrets from Vault, AWS SM, GCP SM
- **Vault Secrets Operator** -- https://developer.hashicorp.com/vault/docs/platform/k8s/vso -- HashiCorp Vault integration for Kubernetes
- **Age Encryption** -- https://age-encryption.org/ -- Modern file encryption used with SOPS

## Observability & Compliance (5 refs)
- **Argo CD Metrics** -- https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/ -- Prometheus metrics for sync status
- **Flux Alerts** -- https://fluxcd.io/flux/components/notification/ -- Event forwarding to Slack, Teams, webhooks
- **GitOps Compliance** -- https://github.com/open-gitops/documents/blob/main/PRINCIPLES.md -- Audit trail via Git history
- **Argo CD Diff Strategy** -- https://argo-cd.readthedocs.io/en/stable/user-guide/diffing/ -- Customizing drift detection
- **Capacitor** -- https://fluxcd.io/blog/2024/02/introducing-capacitor/ -- Flux UI for cluster visualization
