---
type: fact
title: "Runtime Security"
---

# Runtime Security

Container and Kubernetes runtime security with eBPF-based detection and enforcement.

## Tool Landscape (2026)

### Tetragon (Cilium/Isovalent)

Primary enforcement engine. eBPF-based, operates at kernel level:

- **TracingPolicy CRD**: define what syscalls/file accesses/network calls to monitor or block
- **Enforcement**: kill process, send signal, or deny syscall in real-time
- **Zero overhead**: no ptrace, no LD_PRELOAD, no sidecar -- pure eBPF
- **CO-RE**: single policy works across kernel versions (5.4+)

Detection capabilities:
- Process execution (exec monitoring with full argument capture)
- File access (read/write/delete on sensitive paths)
- Network connections (outbound to unexpected destinations)
- Privilege escalation (setuid, capabilities changes)
- Kernel module loading
- Namespace escape attempts

### Falco (CNCF)

Detection and alerting (not enforcement). Complementary to Tetragon:

- Rich rule language for behavioral detection
- Plugin system for AWS CloudTrail, Okta, GitHub audit logs
- Community-maintained rule library (300+ detection rules)
- Lower kernel requirements (works on 4.14+ with eBPF driver)

Use Falco for: broad detection coverage, non-Kubernetes events (cloud API calls), alerting pipeline.
Use Tetragon for: enforcement (kill/deny), low-overhead high-frequency monitoring, policy enforcement.

### KubeArmor

Complements Tetragon for per-container policy:

- File access control per container (deny write to /etc/)
- Process restriction (allow only specific binaries to run)
- Network-level restriction per pod
- Simpler policy language than Tetragon TracingPolicy

## Detection Patterns

### Cryptomining Detection

Indicators:
- Outbound connections to mining pool ports (3333, 4444, 5555, 8333)
- High CPU sustained usage without corresponding application load
- Execution of unexpected binaries (xmrig, minerd, ccminer)
- DNS queries to mining pool domains

Tetragon policy:
```yaml
apiVersion: cilium.io/v1alpha1
kind: TracingPolicy
metadata:
  name: detect-cryptominer
spec:
  kprobes:
    - call: "tcp_connect"
      syscall: false
      args:
        - index: 0
          type: "sock"
      selectors:
        - matchArgs:
            - index: 0
              operator: "DPort"
              values: ["3333", "4444", "5555", "8333"]
          matchActions:
            - action: Sigkill
```

### Container Escape Detection

Monitor for:
- Mount of host filesystem paths (/proc, /sys, /var/run/docker.sock)
- Namespace manipulation syscalls (setns, unshare)
- Writes to /proc/sys or /proc/self/exe
- Capability additions (CAP_SYS_ADMIN, CAP_NET_ADMIN gained at runtime)
- Access to container runtime sockets

### Reverse Shell Detection

Indicators:
- Process spawned with stdin/stdout redirected to network socket
- Execution of shell (/bin/sh, /bin/bash) with network parent
- Outbound connection followed immediately by shell execution
- Use of common reverse shell tools (nc, ncat, socat with EXEC)

### Sensitive File Access

Monitor read/write to:
- /etc/shadow, /etc/passwd
- /root/.ssh/*, /home/*/.ssh/authorized_keys
- Kubernetes service account tokens (/var/run/secrets/kubernetes.io/)
- Cloud provider metadata endpoint (169.254.169.254)

## Response Actions

### Automated (real-time, no human)
- Sigkill: terminate the offending process (Tetragon enforcement)
- Network block: Cilium policy update to isolate pod
- Pod eviction: delete pod, let controller recreate (clean state)

### Semi-automated (human confirms)
- Node cordon + drain: isolate the node, move workloads
- Image quarantine: add to deny-list in admission controller
- Credential rotation: revoke service account tokens

### Manual (requires investigation)
- Forensic snapshot: capture pod filesystem and memory state
- Full node isolation: network disconnect for forensic analysis
- Incident escalation: engage security team

## Alert Pipeline

Detection -> Falco/Tetragon -> Falcosidekick -> Multiple outputs:
- Critical: PagerDuty (immediate response)
- High: Slack security channel + SIEM
- Medium: SIEM only (for correlation)
- Low: Loki logs (retained for investigation)

Enrichment at Falcosidekick:
- Add Kubernetes context (namespace, deployment, node)
- Add owner labels (team, service)
- Add MITRE ATT&CK mapping for the detection
- Deduplicate repeated alerts (aggregate window: 5 minutes)

## Deployment Architecture

```
[Node]
  |-- Tetragon (DaemonSet) -- enforcement + high-fidelity detection
  |-- Falco (DaemonSet) -- broad detection + cloud event plugins
  |-- Falcosidekick (Deployment, 2 replicas) -- routing + enrichment
  |
  v
[SIEM] -- correlation, investigation, compliance reporting
[PagerDuty] -- critical alerts
[Slack] -- team notification
```

Resource overhead:
- Tetragon: 100m CPU, 256Mi memory per node
- Falco: 200m CPU, 512Mi memory per node (eBPF driver)
- Total: ~300m CPU, 768Mi per node for full runtime security

## Compliance Mapping

| Requirement | Tool | Policy |
|-------------|------|--------|
| CIS Kubernetes 5.1 (least privilege) | Tetragon | Block privilege escalation |
| PCI-DSS 10.2 (audit logging) | Falco | All exec events logged |
| SOC2 CC6.1 (access control) | KubeArmor | File access restriction |
| HIPAA 164.312 (access controls) | Tetragon | Block unauthorized data access |
