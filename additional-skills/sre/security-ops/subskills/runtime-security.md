---
type: subskill
title: "Runtime Security"
---

# Runtime Security

Falco, KubeArmor, and eBPF-based runtime threat detection.

## When to Load
- Deploying runtime security monitoring in Kubernetes
- Configuring Falco rules for threat detection
- Implementing KubeArmor for workload hardening
- Building eBPF-based detection pipelines

## Key Concepts

**Runtime security vs static security:** static (image scanning, IaC checks) catches known issues pre-deploy. Runtime catches actual malicious behavior in production -- the last line of defense.

**Detection approaches:**
- Syscall monitoring: Falco (kernel module or eBPF)
- Process/file/network enforcement: KubeArmor (LSM + eBPF)
- Network policy enforcement: Cilium, Calico
- File integrity monitoring: detect unexpected changes to binaries/configs

**Falco:** open-source runtime security. Monitors syscalls via eBPF. Rules detect suspicious activity (shell in container, sensitive file access, network anomalies). Alerts via syslog, HTTP, gRPC.

## Patterns

**Falco rule (detect shell in container):**
```yaml
- rule: Terminal shell in container
  desc: A shell was spawned in a container
  condition: >
    spawned_process and container and
    proc.name in (bash, sh, zsh, dash) and
    not proc.pname in (cron, supervisord)
  output: >
    Shell spawned in container
    (user=%user.name container=%container.name
    shell=%proc.name parent=%proc.pname cmdline=%proc.cmdline)
  priority: WARNING
  tags: [container, shell, mitre_execution]
```

**Falco rule (crypto mining detection):**
```yaml
- rule: Outbound connection to crypto mining pool
  desc: Detect connections to known mining pools
  condition: >
    outbound and fd.sip.name contains "pool" and
    (fd.sport = 3333 or fd.sport = 4444 or fd.sport = 8333)
  output: >
    Crypto mining connection (container=%container.name
    connection=%fd.name proc=%proc.name)
  priority: CRITICAL
  tags: [network, crypto, mitre_impact]
```

**KubeArmor workload policy:**
```yaml
apiVersion: security.kubearmor.com/v1
kind: KubeArmorPolicy
metadata:
  name: restrict-api-server
  namespace: production
spec:
  selector:
    matchLabels:
      app: api-server
  process:
    matchPaths:
      - path: /bin/bash
      - path: /bin/sh
      - path: /usr/bin/wget
      - path: /usr/bin/curl
    action: Block
  file:
    matchDirectories:
      - dir: /etc/
        readOnly: true
      - dir: /var/run/secrets/
        readOnly: true
    action: Block
  network:
    matchProtocols:
      - protocol: raw
    action: Block
```

**Falco Helm deployment:**
```yaml
falco:
  driver:
    kind: modern_ebpf
  rules_files:
    - /etc/falco/falco_rules.yaml
    - /etc/falco/rules.d
  json_output: true
  http_output:
    enabled: true
    url: "http://falcosidekick:2801"

falcosidekick:
  config:
    slack:
      webhookurl: "${SLACK_WEBHOOK}"
      minimumpriority: warning
    loki:
      hostport: "http://loki:3100"
```

## Gotchas
- Falco kernel module can conflict with other security modules -- prefer eBPF driver
- High-volume rules (every file open) generate noise -- tune with exceptions
- KubeArmor requires LSM support (AppArmor or BPF-LSM) on nodes
- Runtime alerts without response automation create alert fatigue
- Container drift detection (new binaries) requires baseline image knowledge
- Falco drops events under extreme syscall volume -- monitor drop counters

## Verification
- `falco --list` to verify loaded rules
- `kubectl logs -l app=falco -n falco` for detection events
- `kubectl get kubearmorpolicies -A` for active policies
- `karmor log` for KubeArmor enforcement events
- Test detection: `kubectl exec <pod> -- /bin/sh` should trigger shell alert
- Falco metrics: `falco_events_total`, `falco_kernel_drops_total`
