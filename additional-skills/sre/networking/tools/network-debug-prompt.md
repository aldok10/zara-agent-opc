---
type: tool
title: "Network Debug Prompt"
---

# Network Debug Prompt

You are debugging a network connectivity issue in a Kubernetes cluster running Cilium as the CNI. Follow a systematic approach from symptoms to root cause.

## Input Required

Provide:
- Symptom description (timeout, connection refused, intermittent drops, DNS failure, etc.)
- Source and destination workloads (namespace/deployment or pod names)
- Protocol and port involved
- When the issue started (correlation with deploys, config changes, scaling events)
- Current Cilium version and cluster topology

## Diagnostic Sequence

### Phase 1: Identify the Layer

Determine which layer is failing:

1. **DNS** -- can source resolve destination name?
   - `kubectl exec <source-pod> -- nslookup <service-name>`
   - Check CoreDNS pods health and logs
   - Verify Cilium DNS proxy (`cilium status | grep DNS`)

2. **L3/L4 Connectivity** -- can source reach destination IP:port?
   - `kubectl exec <source-pod> -- nc -zv <dest-ip> <port>`
   - Check `cilium endpoint list` for both source and dest
   - Verify both pods have allocated Cilium identities

3. **L7 Protocol** -- is the application-layer request succeeding?
   - `kubectl exec <source-pod> -- curl -v http://<dest>:<port>/path`
   - Check for L7 CiliumNetworkPolicy rules filtering requests

### Phase 2: Flow Analysis

Use Hubble to trace the actual network path:

```bash
# Observe flows between source and destination
hubble observe --from-pod <ns>/<source> --to-pod <ns>/<dest> --verdict DROPPED

# Check all drops in a namespace
hubble observe -n <namespace> --verdict DROPPED --last 100

# DNS resolution flows
hubble observe --protocol DNS --to-pod kube-system/coredns-*
```

For each dropped flow, note:
- Drop reason (POLICY_DENIED, CT_NO_MAP_FOUND, NO_IDENTITY, etc.)
- Source and destination identity numbers
- L4 protocol and port

### Phase 3: Policy Evaluation

If drops show POLICY_DENIED:

```bash
# List policies applying to endpoint
cilium endpoint get <endpoint-id> | jq '.status.policy'

# Check if default-deny exists
kubectl get ciliumnetworkpolicies -n <namespace>

# Verify identity labels
cilium identity get <identity-number>

# Test policy verdict without sending traffic
cilium policy trace --src-identity <src-id> --dst-identity <dst-id> --dport <port>
```

### Phase 4: Datapath Verification

If the issue is not policy-related:

```bash
# BPF datapath status
cilium bpf tunnel list
cilium bpf ct list global | grep <dest-ip>

# Node-to-node connectivity
cilium-health status

# MTU check (especially if large payloads fail)
kubectl exec <pod> -- ping -s 1400 -M do <dest-ip>

# Connection tracking table capacity
cilium bpf ct list global | wc -l
# Compare against map size: cilium status | grep "CT map"
```

### Phase 5: Infrastructure Layer

If datapath is healthy:

```bash
# Node networking
ip route show  # on both nodes
iptables -L -n  # leftover rules from previous CNI?

# Kernel parameters
sysctl net.ipv4.ip_forward
sysctl net.bridge.bridge-nf-call-iptables

# Cloud provider network (VPC routes, security groups, NACLs)
# Verify node-to-node communication on VXLAN port 8472 or native routing
```

## Common Root Causes

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| New pod can't reach anything | Identity not yet allocated | Wait or restart cilium-agent on node |
| Intermittent timeouts | CT table full | Increase bpf-ct-global-max-entries |
| Large requests fail, small work | MTU mismatch | Set MTU = node MTU - encap overhead |
| Cross-node fails, same-node works | VXLAN/tunnel misconfigured | Check cilium bpf tunnel list |
| DNS resolution fails | Cilium DNS proxy crash | Check cilium-agent logs for DNS errors |
| L7 policy not matching | Envoy not injected | Verify CEC applied and Envoy pod running |
| Works then stops after minutes | CT entry expires | Check CT timeout settings |

## Output Format

Provide:
1. **Root cause**: single sentence describing the failure
2. **Evidence**: specific commands/output that confirm the cause
3. **Fix**: exact commands or config changes to resolve
4. **Verification**: how to confirm the fix works
5. **Prevention**: what monitoring/alerting would catch this earlier
