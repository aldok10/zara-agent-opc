# Cilium and eBPF Networking

Production Kubernetes networking with Cilium as CNI, eBPF dataplane, and Hubble observability.

## eBPF Dataplane Architecture

Cilium 1.16+ operates entirely in eBPF, replacing kube-proxy:

- **Socket-level load balancing**: service resolution at connect() syscall, not packet rewrite
- **Direct server return (DSR)**: response bypasses load balancer node
- **EDT (Earliest Departure Time)**: bandwidth enforcement without tc qdiscs
- **CO-RE (Compile Once Run Everywhere)**: single BPF bytecode runs on any kernel 5.4+

Data path: Pod -> BPF hook (tc ingress) -> Identity lookup -> Policy eval -> Encap/Forward -> BPF hook (tc egress) -> Wire

## Cilium Identity Model

Identity is kernel-level, not IP-based:

- Each unique set of labels gets a numeric identity (24-bit)
- Identity cached in BPF map on every node
- Policy evaluated by identity, not IP (survives pod rescheduling)
- SPIFFE integration maps identity to x509 SVID for mTLS

Identity allocation: cilium-operator assigns, distributes via KVStore (etcd) or CRD mode.

## Network Policies (Cilium vs K8s)

CiliumNetworkPolicy extends standard K8s NetworkPolicy:

| Feature | K8s NetworkPolicy | CiliumNetworkPolicy |
|---------|-------------------|---------------------|
| L3/L4 filtering | Yes | Yes |
| L7 filtering (HTTP, gRPC, Kafka) | No | Yes |
| DNS-based policies | No | Yes (FQDN) |
| Node-level policies | No | Yes (CiliumClusterwideNetworkPolicy) |
| TLS inspection | No | Yes (with Envoy proxy) |

Default-deny pattern:
```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: default-deny
  namespace: production
spec:
  endpointSelector: {}
  ingress: []
  egress: []
```

Then whitelist specific flows with additional policies.

## Hubble: eBPF-Powered Observability

Hubble provides network flow visibility without agents or sidecars:

- **Real-time flows**: source/dest identity, L4/L7 metadata, verdict (allowed/denied)
- **Timescape**: historical flow analysis (store flows in object storage)
- **Service map**: auto-generated topology from observed traffic
- **Metrics**: Prometheus metrics for flows, drops, DNS, HTTP

Key Hubble metrics:
- `hubble_flows_processed_total` -- total flows by verdict
- `hubble_drop_total` -- drops by reason (policy, CT exhaustion, etc.)
- `hubble_dns_queries_total` -- DNS query volume by RCODE
- `hubble_http_requests_total` -- L7 HTTP by method/status

## WireGuard Transparent Encryption

Cilium 1.15+ uses WireGuard for node-to-node encryption:

- Zero-config: enabled via helm value `encryption.type=wireguard`
- Per-node keypair auto-rotated
- ~5% throughput overhead (vs ~15% for IPsec)
- Encrypts all pod-to-pod traffic crossing node boundaries
- Pods on same node communicate unencrypted (kernel namespace isolation sufficient)

IPsec still required for FIPS compliance environments.

## Cilium Service Mesh (Sidecar-Free)

Cilium replaces Istio/Linkerd sidecars for most use cases:

- **mTLS**: handled at socket level via eBPF + WireGuard or SPIFFE
- **L7 policy**: Envoy runs per-node (not per-pod), shared by all pods
- **Traffic management**: CiliumEnvoyConfig CRD for retries, timeouts, rate limits
- **No sidecar injection**: eliminates resource overhead and startup delay

When Istio is still needed: advanced traffic mirroring, Wasm filters, multi-cluster with non-Cilium clusters.

## Multi-Cluster (ClusterMesh)

Cilium ClusterMesh connects clusters without VPN:

- Shared identity space across clusters (global services)
- Pod-to-pod connectivity via tunnel or native routing
- Service affinity: prefer local cluster, failover to remote
- Single Hubble UI for all clusters

Requirements: non-overlapping PodCIDR, network connectivity between nodes, shared etcd or CRD store.

## Performance Tuning

Critical settings for high-throughput clusters:

| Setting | Default | Recommended | Why |
|---------|---------|-------------|-----|
| bpf-map-dynamic-size-ratio | 0.0025 | 0.005 | Prevent conntrack exhaustion |
| enable-bandwidth-manager | false | true | EDT-based rate limiting |
| bpf-lb-algorithm | random | maglev | Consistent hashing for backends |
| tunnel-protocol | vxlan | disabled (native routing) | Avoid encap overhead on flat networks |
| enable-local-redirect-policy | false | true | Node-local DNS caching |

## Troubleshooting Sequence

1. `cilium status` -- overall agent health
2. `cilium bpf ct list global` -- connection tracking entries
3. `cilium monitor -t drop` -- real-time packet drops with reason
4. `hubble observe --verdict DROPPED` -- flow-level drop analysis
5. `cilium endpoint list` -- endpoint state and identity
6. `cilium bpf policy get <endpoint-id>` -- applied policy rules for endpoint

## Common Failure Modes

- **CT table exhaustion**: high connection churn overwhelms conntrack map -> increase map size
- **Identity allocation delay**: new pods get default identity -> check cilium-operator health
- **MTU mismatch**: encapsulation adds overhead -> set MTU to 1450 (VXLAN) or 1500 (native)
- **KVStore latency**: etcd slowness causes stale identities -> consider CRD mode for <500 nodes
