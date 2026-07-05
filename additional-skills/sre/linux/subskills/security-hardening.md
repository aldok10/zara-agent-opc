---
type: subskill
title: "Linux Security Hardening"
---

# Linux Security Hardening

SELinux, AppArmor, capabilities, seccomp profiles, and CIS benchmark compliance.

## When to Load
- Hardening Linux servers for production
- Configuring SELinux or AppArmor policies
- Reducing attack surface with capabilities and seccomp
- Auditing against CIS benchmarks

## Key Concepts

**Defense in depth layers:**
1. MAC (SELinux/AppArmor) -- process-level access control
2. Capabilities -- granular root privilege decomposition
3. seccomp -- syscall filtering
4. namespaces/cgroups -- isolation (containers)

**SELinux modes:** Enforcing (blocks), Permissive (logs only), Disabled. Always use Enforcing in production.

**AppArmor:** path-based MAC. Profiles per binary. Easier than SELinux but less granular.

**Capabilities:** split root privileges into ~40 individual capabilities. Drop all, grant only needed (e.g., CAP_NET_BIND_SERVICE for port <1024).

**seccomp:** filter syscalls per process. Default Docker profile blocks ~60 syscalls. Custom profiles for tighter restriction.

## Patterns

**Drop capabilities in systemd:**
```ini
[Service]
CapabilityBoundingSet=CAP_NET_BIND_SERVICE CAP_DAC_READ_SEARCH
AmbientCapabilities=CAP_NET_BIND_SERVICE
NoNewPrivileges=true
```

**seccomp profile (allow list for a web server):**
```json
{
  "defaultAction": "SCMP_ACT_ERRNO",
  "architectures": ["SCMP_ARCH_X86_64"],
  "syscalls": [
    {"names": ["read", "write", "close", "fstat", "mmap", "mprotect",
               "munmap", "brk", "epoll_create1", "epoll_ctl", "epoll_wait",
               "accept4", "socket", "bind", "listen", "setsockopt",
               "openat", "newfstatat", "clone", "exit_group", "futex"],
     "action": "SCMP_ACT_ALLOW"}
  ]
}
```

**AppArmor profile:**
```
#include <tunables/global>

/opt/app/bin/server {
  #include <abstractions/base>
  #include <abstractions/nameservice>

  /opt/app/** r,
  /opt/app/data/** rw,
  /var/log/app/** w,
  /tmp/** rw,

  network inet stream,
  network inet dgram,

  deny /etc/shadow r,
  deny /proc/*/mem rw,
}
```

**CIS hardening (key items):**
```bash
# Disable unused filesystems
echo "install cramfs /bin/true" >> /etc/modprobe.d/disable-fs.conf
echo "install squashfs /bin/true" >> /etc/modprobe.d/disable-fs.conf

# Restrict core dumps
echo "* hard core 0" >> /etc/security/limits.conf
echo "fs.suid_dumpable = 0" >> /etc/sysctl.d/99-security.conf

# SSH hardening
# /etc/ssh/sshd_config
PermitRootLogin no
PasswordAuthentication no
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
```

## Gotchas
- SELinux `setenforce 0` persists only until reboot -- permanent change needs `/etc/selinux/config`
- AppArmor profiles must be loaded before the process starts
- Dropping CAP_SYS_ADMIN breaks many container operations -- test thoroughly
- seccomp ERRNO vs KILL: ERRNO returns error to process, KILL terminates immediately
- CIS Level 2 controls can break legitimate functionality -- evaluate per workload
- `NoNewPrivileges=true` prevents setuid binaries from working under that service

## Verification
- `getenforce` / `aa-status` for MAC state
- `capsh --print` to see current process capabilities
- `ausearch -m AVC` for SELinux denials
- `dmesg | grep seccomp` for seccomp violations
- `lynis audit system` for automated security audit
- `oscap xccdf eval` for CIS benchmark automated checking
