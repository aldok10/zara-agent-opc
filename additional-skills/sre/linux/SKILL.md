---
name: linux
description: "System administration: systemd, performance tuning, cgroups v2, eBPF, hardening"
---

# Linux Specialist

Production Linux system administration with modern kernel features and hardening.

## Scope

Covers systemd service management, performance analysis and tuning, cgroups v2 resource control, eBPF observability, SELinux/AppArmor enforcement, kernel parameter optimization, and immutable infrastructure patterns. Targets Linux 6.x kernels on Ubuntu 24.04+, RHEL 9+, and container-optimized distributions.

## First Action

When loaded: identify the concern type (performance issue, service management, hardening, resource contention, debugging) and determine the distribution, kernel version, and init system. Run `uname -r` and `systemctl --version` to establish baseline before making recommendations.

## Constraints

1. cgroups v2 unified hierarchy mandatory -- all resource limits (cpu, memory, io) via systemd slices or direct cgroup2 fs
2. journalctl with structured JSON output for log analysis -- no grep chains on syslog text files
3. Benchmark before AND after tuning -- `perf stat`, `fio`, `wrk`, or relevant tool with repeatable methodology
4. Principle of least privilege: capabilities (cap_net_bind_service, cap_sys_ptrace) instead of root for all services
5. SELinux/AppArmor must remain enforcing -- fix the policy, never set permissive or disabled in production
6. systemd units with: proper `After=`/`Requires=` dependencies, `Restart=on-failure`, and sandboxing directives
7. eBPF for production profiling and tracing -- zero-overhead, no service restart, kernel-level visibility
8. sysctl tuning: every changed parameter must have documented rationale and load-test validation
9. Immutable infrastructure preferred: base image + config management, patch by replacement not in-place
10. Unattended security updates for base OS (unattended-upgrades on Debian, dnf-automatic on RHEL)
11. USE method (Utilization, Saturation, Errors) per resource for systematic performance analysis
12. Kernel lockdown mode enabled on production hosts -- prevent unsigned kernel module loading
13. auditd rules for privileged operations: exec, mount, user changes, network config modifications
14. TCP tuning: document `net.core.somaxconn`, `net.ipv4.tcp_tw_reuse`, `net.core.rmem_max` changes with justification
15. File descriptor limits set per-service via systemd `LimitNOFILE=` -- not global sysctl changes

## DO NOT

1. Disable SELinux/AppArmor because something breaks (create a custom policy module or fix the context)
2. Tune sysctls without load testing before and after (gut-feel tuning causes more problems than it solves)
3. Run services as root when Linux capabilities provide sufficient privilege
4. Use nohup, screen, or tmux for production services -- systemd provides proper lifecycle management
5. Modify running system state without automation (Ansible, cloud-init, packer) to reproduce the change
6. Set global sysctl values when per-service systemd settings are available (blast radius)
7. Ignore kernel version requirements for eBPF features -- check `bpftool feature` before writing programs
8. Apply CIS benchmarks blindly -- evaluate each control against workload requirements
9. Use `kill -9` as first response (send SIGTERM, wait, escalate to SIGKILL only as last resort)

## Route to Subskill

| Signal | Subskill | Focus |
|--------|----------|-------|
| Service units, timers, deps | systemd | Units, sandboxing, slices, journal, dependencies |
| Latency, throughput, CPU | performance-tuning | sysctl, NUMA, IRQ affinity, scheduler, benchmarks |
| Disks, filesystems, IO | storage | LVM, XFS/ext4, NVMe, io_uring, fio, RAID |
| OS hardening, compliance | security-hardening | SELinux, capabilities, seccomp, CIS, auditd |
| Kernel tracing, profiling | ebpf | bpftrace, bcc-tools, XDP, Cilium, perf |

## Verification

- [ ] `systemd-analyze security <unit>` scores <5.0 for all production services
- [ ] `getenforce` or `aa-status` shows enforcing mode active
- [ ] cgroup limits confirmed: `systemctl show <unit> -p MemoryMax,CPUQuota,IOWeight`
- [ ] No world-writable files in service directories (`find / -perm -0002 -type f`)
- [ ] sysctl changes documented in version-controlled config with load test results
- [ ] auditd rules active for privileged operations (`auditctl -l` shows rules)
- [ ] No services running as root that could use capabilities (`ps aux --forest | grep root`)

## Knowledge

- knowledge/linux-systemd-hardening.md
- knowledge/linux-performance-tuning.md
- knowledge/linux-ebpf-tracing.md
- knowledge/linux-cgroups-v2.md
- knowledge/linux-security-hardening.md

## AI-Era Context (2026)

- Linux 6.x kernels ship eBPF CO-RE (Compile Once Run Everywhere) -- portable tracing across kernel versions
- systemd 256+ includes `ImportCredential=` for secure secret injection without environment variables
- io_uring is the standard for high-performance async IO -- replacing epoll in many network/storage workloads. io_uring applications require kernel 6.1+ and appropriate seccomp profiles.
- cgroups v2 PSI (Pressure Stall Information) provides accurate resource contention metrics for autoscaling
- BPF LSM (Linux Security Module) enables dynamic security policies without kernel module compilation
- Confidential computing (AMD SEV-SNP, Intel TDX) protects workloads from hypervisor-level access
- Ubuntu Pro and RHEL provide 10-year kernel live patching -- zero-reboot security for long-lived hosts
- eBPF-based networking (Cilium) replaces iptables/nftables for container networking and security policy

## Related Skills

- kubernetes -- node-level performance and security for K8s workers
- docker -- container runtime and cgroup configuration
- security-ops -- host hardening as part of defense-in-depth
- observability -- system-level metrics feeding monitoring stacks
