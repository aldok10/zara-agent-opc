# cgroups v2

## Overview

cgroups v2 (unified hierarchy) replaces the split hierarchies of cgroups v1. Single tree structure at `/sys/fs/cgroup/`. All modern distros (RHEL 9+, Ubuntu 22.04+, Debian 12+) default to v2.

## Hierarchy and Controllers

### Structure
- Single unified hierarchy (no per-controller trees)
- Controllers: cpu, memory, io, pids, cpuset, rdma, misc
- Controllers enabled per-subtree via `cgroup.subtree_control`
- Leaf cgroups contain processes, internal nodes contain only sub-cgroups

### Enabling Controllers

```bash
# Enable cpu and memory controllers for children of /sys/fs/cgroup/myapp/
echo "+cpu +memory +io +pids" > /sys/fs/cgroup/myapp/cgroup.subtree_control
```

## Memory Controller

- `memory.max`: hard limit (OOM kill above this)
- `memory.high`: throttle point (reclaim pressure, no OOM)
- `memory.low`: best-effort memory protection (reclaim last)
- `memory.min`: guaranteed memory reservation (never reclaimed)
- `memory.swap.max`: swap limit (0 to disable swap for this cgroup)
- `memory.current`: current usage
- `memory.peak`: high watermark since creation
- `memory.events`: OOM kills, low/high/max events counter

### Strategy
- Set `memory.high` slightly below `memory.max` for graceful pressure
- Use `memory.low` for critical services to protect from noisy neighbors
- Monitor `memory.events` for throttling and OOM indicators

## CPU Controller

- `cpu.max`: bandwidth limit as "quota period" (e.g., "200000 100000" = 200% of one CPU)
- `cpu.weight`: relative weight (1-10000, default 100) for proportional sharing
- `cpu.weight.nice`: alternative to weight, uses nice values
- `cpu.pressure`: PSI (Pressure Stall Information) for CPU stalls
- `cpu.stat`: usage statistics

### Bandwidth vs Weight
- Weight: fair sharing when CPUs are contended (burst allowed when idle)
- Max: hard cap regardless of system load (use for noisy neighbor isolation)
- Combine both: weight for fair sharing + max as safety ceiling

## IO Controller

- `io.max`: per-device bandwidth/IOPS limits
- `io.weight`: proportional IO weight (1-10000)
- `io.latency`: target latency (prioritize latency-sensitive workloads)
- `io.cost.model`: cost-based IO control (more accurate than raw IOPS)
- Format: `MAJ:MIN rbps=X wbps=X riops=X wiops=X`

```bash
# Limit sda to 50MB/s read, 10MB/s write
echo "8:0 rbps=52428800 wbps=10485760" > /sys/fs/cgroup/myapp/io.max
```

## PIDs Controller

- `pids.max`: maximum number of processes (fork bomb protection)
- `pids.current`: current count
- Essential for multi-tenant systems and untrusted workloads

## Delegation

- Allows unprivileged processes to manage their own sub-hierarchy
- Delegate by setting ownership: `chown user:group cgroup_dir/`
- Delegatable files: `cgroup.procs`, `cgroup.threads`, `cgroup.subtree_control`
- systemd delegates automatically via `Delegate=yes` in unit files
- Containers use delegation: container runtime owns its subtree

### systemd Delegation

```ini
[Service]
Delegate=yes
# Service can create and manage sub-cgroups
# Used by container runtimes (containerd, CRI-O)
```

## Slices in systemd

- `-.slice`: root slice
- `system.slice`: system services (default for units)
- `user.slice`: user sessions
- `machine.slice`: VMs and containers
- Custom slices for workload isolation:

```ini
# /etc/systemd/system/app.slice
[Slice]
MemoryMax=8G
CPUQuota=400%
TasksMax=1024
IOWeight=200
```

## PSI (Pressure Stall Information)

- Available at each cgroup: `cpu.pressure`, `memory.pressure`, `io.pressure`
- Measures time processes spend waiting for resources
- Format: `some avg10=X avg60=X avg300=X total=Y`
- `some`: at least one task stalled
- `full`: all tasks stalled simultaneously
- Use for autoscaling decisions and alerting

```bash
# Monitor memory pressure
cat /sys/fs/cgroup/myapp/memory.pressure
# some avg10=0.00 avg60=0.00 avg300=0.00 total=0
# full avg10=0.00 avg60=0.00 avg300=0.00 total=0
```

## Kubernetes and cgroups v2

- kubelet uses cgroups v2 for pod resource management
- Memory QoS: `memory.min` for Guaranteed pods, `memory.high` for Burstable
- Swap support (alpha/beta): controlled per-pod with cgroups v2
- PSI-based eviction: more accurate than memory.usage-based
- MemoryQoS feature gate enables hierarchical memory protection

## Migration from v1

- Check current mode: `stat -fc %T /sys/fs/cgroup/` (cgroup2fs = v2)
- Hybrid mode (v1 + v2) exists but not recommended for new systems
- Most applications are transparent to the change
- Container runtimes (containerd 1.4+, CRI-O 1.20+) support v2
- Docker 20.10+ supports cgroups v2

## Best Practices

- Use systemd resource directives (maps to cgroups v2 automatically)
- Set `memory.high` < `memory.max` for graceful degradation
- Always set `pids.max` for defense against fork bombs
- Use PSI metrics for capacity planning and autoscaling
- Monitor `memory.events` for silent throttling
- Delegate to container runtimes, don't fight the hierarchy
- Test resource limits under load before production
