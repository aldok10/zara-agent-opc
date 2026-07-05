# Workload Protection

Runtime security for containers, VMs, and serverless -- detecting and preventing threats at execution time.

## When to Load

- Implementing runtime threat detection for containers or serverless
- Setting up container image scanning pipelines
- Configuring workload identity and network policies
- Investigating anomalous process or network behavior in production

## Key Concepts

**Runtime Protection Layers**
- Image scanning: vulnerability and malware detection before deployment
- Admission control: block non-compliant images at deploy time
- Runtime monitoring: detect anomalous syscalls, network connections, file access
- Drift detection: alert when running container diverges from image

**Container Security**
- Immutable containers: no shell, no package manager in production images
- Read-only root filesystem with explicit writable volume mounts
- Non-root execution with specific UID/GID
- Seccomp/AppArmor profiles restricting syscalls
- Pod Security Standards (restricted/baseline/privileged)

**Serverless Security**
- Function-level IAM with least privilege (no wildcard permissions)
- Dependency scanning in build pipeline
- Cold start injection prevention (environment variable hygiene)
- Execution time limits and concurrency controls
- Layer/extension security review

**Threat Detection Signals**
- Unexpected outbound connections (C2 indicators)
- Cryptominer patterns (CPU spike + mining pool connections)
- Reverse shells (unexpected /bin/sh with network socket)
- Privilege escalation attempts (setuid, capability changes)
- Sensitive file access (/etc/shadow, service account tokens)

## Patterns

```yaml
# Kubernetes Pod Security (restricted)
apiVersion: v1
kind: Pod
metadata:
  name: secure-workload
spec:
  securityContext:
    runAsNonRoot: true
    seccompProfile:
      type: RuntimeDefault
  containers:
    - name: app
      image: registry.internal/app:v1.2.3@sha256:abc123
      securityContext:
        allowPrivilegeEscalation: false
        readOnlyRootFilesystem: true
        capabilities:
          drop: ["ALL"]
      resources:
        limits:
          cpu: "500m"
          memory: "256Mi"
```

```yaml
# Falco rule: detect reverse shell
- rule: Reverse Shell
  desc: Detect reverse shell connections
  condition: >
    spawned_process and proc.name in (bash, sh, zsh)
    and fd.type = ipv4
    and fd.direction = out
  output: "Reverse shell detected (user=%user.name command=%proc.cmdline connection=%fd.name)"
  priority: CRITICAL
```

## Gotchas

- Image scanning only catches known CVEs -- runtime protection catches zero-days
- Read-only filesystem breaks apps that write to /tmp -- mount explicit tmpfs
- Overly strict seccomp profiles cause silent failures; test thoroughly
- Container drift detection generates false positives with config file mounts
- Serverless cold starts can mask malicious initialization behavior

## Verification

- Deploy known-vulnerable image; confirm admission controller blocks it
- Exec into container; confirm runtime alert fires for shell access
- Attempt outbound connection to non-allowlisted IP; confirm detection
- Run CIS benchmark for container runtime (Docker Bench, kube-bench)
- Validate image signatures match expected signing identity
