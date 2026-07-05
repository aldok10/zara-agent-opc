---
type: fact
title: "systemd Hardening"
---

# systemd Hardening

## Security Directives Overview

systemd provides fine-grained sandboxing for services without containers. These directives create isolated execution environments at the kernel level using namespaces, seccomp, and capabilities.

## Filesystem Isolation

### ProtectSystem
- `ProtectSystem=strict`: entire filesystem read-only, service writes only to allowed paths
- `ReadWritePaths=`: whitelist specific writable directories
- `ReadOnlyPaths=`: additional explicit read-only mounts
- `InaccessiblePaths=`: completely hide paths from the service

### ProtectHome
- `ProtectHome=true`: /home, /root, /run/user inaccessible
- `ProtectHome=read-only`: visible but not writable
- `ProtectHome=tmpfs`: empty tmpfs mounted over home directories

### Private Temporary
- `PrivateTmp=true`: isolated /tmp and /var/tmp per service
- Prevents tmp-based attacks between services
- Cleaned up on service stop

### Dynamic User
- `DynamicUser=true`: allocates ephemeral UID/GID, no persistent state
- Combines with `StateDirectory=`, `CacheDirectory=`, `LogsDirectory=`
- Directories owned by dynamic user, persisted by systemd

## Network Isolation

- `PrivateNetwork=true`: service gets only loopback (no network access at all)
- `RestrictAddressFamilies=AF_INET AF_INET6`: allow only IPv4/IPv6
- `RestrictAddressFamilies=AF_UNIX`: allow only Unix sockets
- `IPAddressDeny=any` + `IPAddressAllow=...`: firewall at cgroup level
- `SocketBindDeny=any` + `SocketBindAllow=tcp:8080`: restrict listen ports

## Capabilities

- `CapabilityBoundingSet=`: maximum capabilities the service can ever have
- `AmbientCapabilities=`: capabilities granted without setuid
- Common minimal set: `CAP_NET_BIND_SERVICE` (bind <1024)
- Drop all and add back: `CapabilityBoundingSet=CAP_NET_BIND_SERVICE`
- `NoNewPrivileges=true`: prevent gaining new privileges via execve

## System Call Filtering (seccomp)

- `SystemCallFilter=@system-service`: allow common service syscalls
- `SystemCallFilter=~@mount`: deny mount-related calls
- `SystemCallFilter=~@debug`: deny ptrace and debugging
- `SystemCallFilter=~@privileged`: deny most privilege-escalation calls
- `SystemCallArchitectures=native`: block non-native syscall ABIs
- `SystemCallErrorNumber=EPERM`: return error instead of killing on violation

## Process and Resource Limits

- `MemoryMax=`: hard memory limit (OOM kill above this)
- `CPUQuota=`: CPU time percentage (200% = 2 cores)
- `TasksMax=`: maximum number of processes/threads
- `LimitNOFILE=`: file descriptor limit
- `LimitNPROC=`: process count limit
- `IOWeight=`: relative I/O scheduling weight

## Execution Environment

- `PrivateDevices=true`: no access to physical devices (/dev/null, /dev/zero still available)
- `ProtectKernelTunables=true`: /proc/sys, /sys read-only
- `ProtectKernelModules=true`: cannot load kernel modules
- `ProtectKernelLogs=true`: no access to kernel log buffer
- `ProtectControlGroups=true`: cgroup filesystem read-only
- `ProtectClock=true`: cannot set system clock
- `ProtectHostname=true`: cannot change hostname
- `ProtectProc=invisible`: only own processes visible in /proc
- `ProcSubset=pid`: minimal /proc visibility

## Credential and Secret Handling

- `LoadCredential=`: load secrets from files, available at `$CREDENTIALS_DIRECTORY`
- `SetCredential=`: inline credentials (for simple values)
- Credentials are read-only, accessible only by the service
- Integrates with TPM2 sealed credentials (`LoadCredentialEncrypted=`)
- Environment files: `EnvironmentFile=` for configuration (not secrets in env)

## Logging and Auditing

- `StandardOutput=journal`: all output to journald
- `StandardError=journal`: errors captured
- `SyslogIdentifier=`: custom identifier in journal
- `LogLevelMax=`: cap log level (prevent debug spam in production)
- `AuditFilter=`: BPF-based audit filtering

## Restart and Watchdog

- `Restart=on-failure`: auto-restart on non-zero exit
- `RestartSec=5`: delay between restarts
- `WatchdogSec=30`: service must notify within interval or gets killed
- `StartLimitIntervalSec=` + `StartLimitBurst=`: rate-limit restarts
- `FailureAction=reboot-force`: extreme measure for critical services

## Analyzing Security

```bash
systemd-analyze security myservice.service
```

- Scores each directive on EXPOSURE (0-10, lower is better)
- Shows which directives are missing
- Target: score below 3.0 for production services
- Use `--json=pretty` for machine-parseable output

## Incremental Hardening Strategy

1. Start with `systemd-analyze security` to baseline
2. Add `NoNewPrivileges=true` and `ProtectSystem=strict` (usually safe)
3. Add `PrivateTmp=true`, `ProtectHome=true` (rarely breaks things)
4. Add `PrivateDevices=true`, `ProtectKernel*=true`
5. Add `SystemCallFilter=@system-service` (test thoroughly)
6. Add network restrictions last (most likely to break things)
7. Verify service still works after each step
8. Run `systemd-analyze security` again to verify improvement
