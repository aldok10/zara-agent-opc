---
type: subskill
title: "GCP GKE"
---

# GCP GKE

Autopilot, Standard clusters, Gateway API, and Config Sync for Kubernetes on GCP.

## When to Load
- Choosing between GKE Autopilot and Standard
- Configuring Gateway API for traffic management
- Setting up Config Sync for GitOps
- Optimizing GKE cluster cost and performance

## Key Concepts

**GKE modes:**
- Autopilot: fully managed nodes, pay per pod, Google manages infrastructure, enforces best practices
- Standard: user-managed node pools, full control, manual scaling/security configuration

**Gateway API:** next-gen Kubernetes ingress. Multi-cluster, traffic splitting, header-based routing. GKE provides GatewayClass implementations (gke-l7-global-external-managed, gke-l7-rilb).

**Config Sync:** GitOps for GKE. Syncs cluster state from Git repo. Supports Kustomize and Helm. Part of Anthos Config Management.

**Release channels:** Rapid (newest), Regular (balanced), Stable (production). Control auto-upgrade timing.

## Patterns

**Autopilot cluster (Terraform):**
```hcl
resource "google_container_cluster" "autopilot" {
  name     = "prod-cluster"
  location = "us-central1"

  enable_autopilot = true
  release_channel {
    channel = "REGULAR"
  }

  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = false
    master_ipv4_cidr_block  = "172.16.0.0/28"
  }

  master_authorized_networks_config {
    cidr_blocks {
      cidr_block   = "10.0.0.0/8"
      display_name = "internal"
    }
  }
}
```

**Gateway API (HTTP route with traffic split):**
```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: external-http
spec:
  gatewayClassName: gke-l7-global-external-managed
  listeners:
    - name: https
      protocol: HTTPS
      port: 443
      tls:
        certificateRefs:
          - name: app-cert
---
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: app-route
spec:
  parentRefs:
    - name: external-http
  rules:
    - backendRefs:
        - name: app-v1
          port: 8080
          weight: 90
        - name: app-v2
          port: 8080
          weight: 10
```

**Config Sync setup:**
```yaml
apiVersion: configsync.gke.io/v1beta1
kind: RootSync
metadata:
  name: root-sync
  namespace: config-management-system
spec:
  sourceFormat: unstructured
  git:
    repo: https://github.com/org/cluster-config
    branch: main
    dir: clusters/prod
    auth: gcpserviceaccount
    gcpServiceAccountEmail: config-sync@project.iam.gserviceaccount.com
```

## Gotchas
- Autopilot rejects pods without resource requests/limits
- Autopilot minimum pod resources: 250m CPU, 512Mi memory (billable minimum)
- Gateway API GKE controller provisions Cloud Load Balancer -- takes 3-5 minutes
- Config Sync drift detection is eventually consistent (default 15s polling)
- Standard cluster node auto-upgrade can disrupt if PDBs aren't configured
- GKE Dataplane V2 (Cilium-based) required for NetworkPolicy enforcement in Autopilot
- Private clusters need Cloud NAT for outbound internet from pods

## Verification
- `gcloud container clusters describe <cluster> --format="value(autopilot.enabled)"`
- `kubectl get gateways,httproutes` for Gateway API resources
- `kubectl get rootsyncs -n config-management-system` for Config Sync status
- `nomos status` for Config Sync health across clusters
- `gcloud container operations list` for ongoing cluster operations
