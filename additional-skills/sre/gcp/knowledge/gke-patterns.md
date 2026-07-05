---
type: fact
title: "GKE Patterns"
---

# GKE Patterns

## Autopilot vs Standard

- Autopilot: Google manages nodes, pay per pod resource request
- Standard: you manage node pools, more control, more operational burden
- Autopilot recommended for most workloads (2025+: feature parity nearly complete)
- Standard still needed for: GPU workloads, specific kernel modules, DaemonSets, privileged pods
- Autopilot enforces security best practices by default (no privileged, no hostNetwork)

## Autopilot Configuration

- Resource requests are mandatory (Autopilot bills on requests, not limits)
- Supported compute classes: general-purpose, balanced, scale-out, accelerator
- Performance tier for burst workloads (premium compute class)
- Spot pods for fault-tolerant workloads (up to 91% discount)
- ARM (T2A) pods for cost-efficient compute
- Minimum pod resources: 250m CPU, 512Mi memory (per container)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
spec:
  template:
    metadata:
      labels:
        app: myapp
    spec:
      nodeSelector:
        cloud.google.com/compute-class: "Scale-Out"
        kubernetes.io/arch: "arm64"
      containers:
        - name: app
          resources:
            requests:
              cpu: "500m"
              memory: "1Gi"
              ephemeral-storage: "1Gi"
            limits:
              memory: "1Gi"
```

## Workload Identity Federation for GKE

- Maps Kubernetes ServiceAccounts to Google Cloud IAM (no key files)
- Enabled by default on Autopilot
- Annotation-based: annotate KSA with GSA email
- IAM binding: `roles/iam.workloadIdentityUser` on GSA for KSA principal
- Principal format: `principal://iam.googleapis.com/projects/PROJECT_NUM/locations/global/workloadIdentityPools/PROJECT_ID.svc.id.goog/subject/ns/NAMESPACE/sa/KSA_NAME`
- Replaces node-level service account (which over-scopes all pods on a node)

## Gateway API

- Preferred over Ingress for new deployments
- GKE Gateway Controller manages Google Cloud load balancers
- Multi-cluster Gateway for cross-cluster traffic routing
- HTTPRoute for path/header-based routing
- Traffic splitting for canary deployments
- TLS termination with Google-managed certificates
- Regional (internal) and global (external) gateway classes

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: external
spec:
  gatewayClassName: gke-l7-global-external-managed
  listeners:
    - name: https
      protocol: HTTPS
      port: 443
      tls:
        mode: Terminate
        certificateRefs:
          - name: managed-cert
---
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: app-route
spec:
  parentRefs:
    - name: external
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /api
      backendRefs:
        - name: api-service
          port: 8080
          weight: 90
        - name: api-service-canary
          port: 8080
          weight: 10
```

## Security

- Binary Authorization: enforce signed images only
- GKE Security Posture: continuous scanning of workload configs
- Dataplane V2 (Cilium-based): network policy enforcement + observability
- Shielded GKE Nodes: secure boot, vTPM, integrity monitoring
- Workload vulnerability scanning: OS and language package CVEs
- Pod security standards: enforce via PodSecurity admission or Policy Controller

## Networking

- VPC-native clusters (alias IP): pods get VPC-routable IPs
- Dataplane V2: eBPF-based networking, replaces kube-proxy
- Network policy logging with Dataplane V2
- Multi-network pods for specialized traffic isolation
- Private clusters: nodes have internal IPs only, control plane on private endpoint
- Authorized networks: restrict control plane access to known CIDRs

## Observability

- GKE-native integration with Cloud Monitoring and Cloud Logging
- Managed Prometheus (GMP): send metrics to Google-managed Prometheus backend
- System metrics, Kubernetes metrics, workload metrics
- Cloud Trace integration for distributed tracing
- Recommended: structured JSON logging to stdout

## Upgrades and Maintenance

- Release channels: Rapid, Regular, Stable (Extended for long-term support)
- Maintenance windows and exclusions for production
- Surge upgrades: control parallelism during node pool updates
- Blue-green node pool upgrades for zero-downtime
- PodDisruptionBudgets respected during upgrades
- Auto-upgrade for security patches (cannot fully disable on Autopilot)

## Cost Optimization

- Autopilot: right-size requests (you pay for what you request)
- Spot pods: for batch, CI/CD, stateless workloads
- Committed use discounts: 1-year or 3-year for baseline
- Cluster autoscaler (Standard) or Autopilot scaling handles variable load
- Multi-tenant clusters with resource quotas reduce cluster sprawl
- Cost allocation via GKE cost attribution (labels to billing)

## Anti-Patterns

- Using default compute service account for workloads
- Overly broad RBAC (cluster-admin to application service accounts)
- Missing resource requests (Autopilot rejects, Standard wastes resources)
- Single-zone clusters for production
- Not using maintenance windows (surprise upgrades during peak)
- Skipping PodDisruptionBudgets on stateful workloads
