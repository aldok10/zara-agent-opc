# AKS Patterns (2026)

## Workload Identity

Pod Identity v1 is deprecated. Use Workload Identity (OIDC-based):

### How It Works

1. AKS cluster has OIDC issuer enabled
2. Kubernetes ServiceAccount annotated with client ID
3. Mutating webhook injects projected token volume
4. Azure SDK exchanges projected token for Entra ID token

### Setup Steps

```
1. Enable OIDC issuer on cluster
2. Create Managed Identity (user-assigned)
3. Create federated credential linking MI to K8s ServiceAccount
4. Annotate ServiceAccount: azure.workload.identity/client-id
5. Label pod: azure.workload.identity/use: "true"
6. Assign RBAC roles to the Managed Identity
```

### Key Points

- One Managed Identity per workload (or shared via user-assigned)
- Token refresh is automatic (kubelet projected token, 1h lifetime)
- Works with all Azure SDKs using DefaultAzureCredential
- No secrets in cluster -- zero credential management

## KEDA (Kubernetes Event-Driven Autoscaling)

AKS add-on, scales workloads based on event sources.

### Common Scalers

| Source | Use Case |
|--------|----------|
| Azure Service Bus | Message queue processing |
| Azure Storage Queue | Batch job triggers |
| Prometheus | Custom metric scaling |
| Cron | Scheduled scaling |
| HTTP | Request-based (KEDA HTTP add-on) |
| Azure Monitor | Log/metric-based scaling |

### ScaledObject Pattern

- `minReplicaCount`: 0 for scale-to-zero, 1 for always-on
- `maxReplicaCount`: set based on downstream capacity
- `pollingInterval`: how often to check (default 30s)
- `cooldownPeriod`: wait before scaling down (default 300s)

### Best Practices

- Set `minReplicaCount: 1` for latency-sensitive workloads
- Use `ScaledJob` (not ScaledObject) for batch/one-shot work
- Authentication via Workload Identity (TriggerAuthentication with podIdentity)
- Monitor scaling events via KEDA metrics server

## Virtual Nodes (ACI burst)

Burst to Azure Container Instances for sudden spikes:

### When to Use

- Unpredictable burst workloads
- CI/CD runners
- Batch processing overflow
- Cost: pay-per-second vs reserved node capacity

### Limitations

- No DaemonSets on virtual nodes
- Limited networking (no network policies)
- No persistent volumes (Azure Files only)
- GPU support limited to specific regions
- Max 4 vCPU / 16 GB per container group (standard)

### Configuration

- Taint virtual nodes: `virtual-kubelet.io/provider=azure`
- Use tolerations + node affinity for targeting
- Pair with KEDA for intelligent burst decisions

## Networking

### CNI Options (2026)

- **Azure CNI Overlay**: recommended default -- pods get overlay IPs, nodes get VNet IPs
- **Azure CNI with dynamic IP allocation**: when pods need VNet IPs (legacy integrations)
- **Kubenet**: not recommended for production (limited scale, no network policies)

### Network Policies

- Enable Calico or Azure Network Policy at cluster creation (cannot add later)
- Default deny all ingress/egress per namespace
- Explicit allow rules per workload

### Ingress

- Application Gateway for Containers (AGC): successor to AGIC
- Nginx Ingress Controller: community standard
- Istio-based service mesh: for mTLS and advanced traffic management

## Node Pool Strategy

| Pool | Purpose | VM Size | Scaling |
|------|---------|---------|---------|
| system | control plane workloads | Standard_D4s_v5 | Fixed (3 nodes) |
| general | stateless apps | Standard_D8s_v5 | Cluster Autoscaler |
| memory | caches, in-memory DBs | Standard_E8s_v5 | Manual or KEDA |
| gpu | inference workloads | Standard_NC24ads_A100_v4 | KEDA + spot |
| spot | batch, fault-tolerant | varies | Cluster Autoscaler |

## Monitoring

- Container Insights (Azure Monitor): metrics, logs, live tail
- Managed Prometheus + Managed Grafana: open-source compatible
- Cost Analysis: per-namespace cost allocation via labels

## Upgrade Strategy

- Use maintenance windows for automatic upgrades
- Node image auto-upgrade: `NodeImage` channel
- Kubernetes version: `stable` channel (N-1)
- Blue-green node pools for zero-downtime upgrades
- PodDisruptionBudgets on all production workloads
