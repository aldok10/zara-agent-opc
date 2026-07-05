# Azure AKS

AKS configuration, Workload Identity, KEDA autoscaling, and virtual nodes.

## When to Load
- Provisioning or upgrading AKS clusters
- Configuring Workload Identity for pod-level Azure access
- Setting up KEDA for event-driven autoscaling
- Evaluating virtual nodes for burst workloads

## Key Concepts

**AKS tiers:** Free (dev), Standard (production SLA), Premium (long-term support).

**Node pool types:** System (CoreDNS, metrics-server) vs User (application workloads). Use taints to isolate system pools.

**Workload Identity:** replaces pod-identity (deprecated). Uses OIDC federation between AKS cluster and Entra ID. No secrets stored in cluster.

**KEDA (Kubernetes Event-Driven Autoscaling):** scales based on external metrics (queue depth, HTTP traffic, cron, custom). Scales to zero. AKS add-on available.

**Virtual nodes:** backed by Azure Container Instances. Instant burst capacity, per-second billing, Linux only.

## Patterns

**AKS with Workload Identity (Terraform):**
```hcl
resource "azurerm_kubernetes_cluster" "aks" {
  name                = "prod-aks"
  oidc_issuer_enabled = true
  workload_identity_enabled = true

  default_node_pool {
    name       = "system"
    vm_size    = "Standard_D4s_v5"
    node_count = 3
    zones      = [1, 2, 3]
  }
}

resource "azurerm_federated_identity_credential" "app" {
  name                = "app-federated"
  resource_group_name = azurerm_resource_group.rg.name
  parent_id           = azurerm_user_assigned_identity.app.id
  audience            = ["api://AzureADTokenExchange"]
  issuer              = azurerm_kubernetes_cluster.aks.oidc_issuer_url
  subject             = "system:serviceaccount:default:app-sa"
}
```

**KEDA ScaledObject (Azure Service Bus):**
```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: order-processor
spec:
  scaleTargetRef:
    name: order-processor
  pollingInterval: 15
  cooldownPeriod: 300
  minReplicaCount: 0
  maxReplicaCount: 50
  triggers:
    - type: azure-servicebus
      metadata:
        queueName: orders
        messageCount: "5"
      authenticationRef:
        name: servicebus-auth
```

**Pod manifest with Workload Identity:**
```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: app-sa
  annotations:
    azure.workload.identity/client-id: "<managed-identity-client-id>"
---
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    metadata:
      labels:
        azure.workload.identity/use: "true"
    spec:
      serviceAccountName: app-sa
```

## Gotchas
- Workload Identity requires both cluster OIDC AND the federated credential -- missing either fails silently
- KEDA scales Deployment replicas; HPA and KEDA on same target conflict
- Virtual nodes don't support DaemonSets, hostNetwork, or persistent volumes
- AKS upgrades are node-pool specific; system pool must be upgraded first
- Availability zones: node pools are zone-pinned at creation, can't change after
- Managed NAT Gateway has 64K SNAT port limit per IP (add IPs for high-connection workloads)

## Verification
- `az aks show -g <rg> -n <cluster> --query "oidcIssuerProfile"`
- `kubectl get pods -l azure.workload.identity/use=true` to verify injection
- `kubectl get scaledobject -A` for KEDA status
- `az aks nodepool list -g <rg> --cluster-name <cluster>`
- KEDA operator logs: `kubectl logs -n kube-system -l app=keda-operator`
