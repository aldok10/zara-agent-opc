# eBPF Observability

## Overview

eBPF (extended Berkeley Packet Filter) allows running sandboxed programs in the Linux kernel without modifying kernel source or loading modules. For observability, this means low-overhead tracing of kernel and user-space events in production.

## bpftrace

High-level tracing language for Linux. Single-line to multi-line scripts for ad-hoc investigation.

### Key Probe Types

- `tracepoint`: stable kernel tracepoints (preferred for portability)
- `kprobe`/`kretprobe`: any kernel function entry/return
- `uprobe`/`uretprobe`: user-space function entry/return
- `usdt`: user-space statically defined tracepoints
- `software`: CPU, page faults, context switches
- `hardware`: CPU cache misses, branch mispredictions
- `profile`: timed sampling (CPU profiling)

### Essential One-Liners

```
# Who is executing what
bpftrace -e 'tracepoint:syscalls:sys_enter_execve { printf("%s %s\n", comm, str(args.filename)); }'

# Syscall count by process
bpftrace -e 'tracepoint:raw_syscalls:sys_enter { @[comm] = count(); }'

# Read latency distribution (histogram)
bpftrace -e 'kprobe:vfs_read { @start[tid] = nsecs; } kretprobe:vfs_read /@start[tid]/ { @us = hist((nsecs - @start[tid]) / 1000); delete(@start[tid]); }'

# TCP connect latency
bpftrace -e 'kprobe:tcp_v4_connect { @start[tid] = nsecs; } kretprobe:tcp_v4_connect /@start[tid]/ { @us = hist((nsecs - @start[tid]) / 1000); delete(@start[tid]); }'

# Block I/O latency by disk
bpftrace -e 'tracepoint:block:block_rq_issue { @start[args.dev, args.sector] = nsecs; } tracepoint:block:block_rq_complete /@start[args.dev, args.sector]/ { @us[args.dev] = hist((nsecs - @start[args.dev, args.sector]) / 1000); delete(@start[args.dev, args.sector]); }'

# Page faults by process
bpftrace -e 'software:page-fault:1 { @[comm] = count(); }'

# File opens by process
bpftrace -e 'tracepoint:syscalls:sys_enter_openat { printf("%s %s\n", comm, str(args.filename)); }'

# Off-CPU time (why is my process sleeping?)
bpftrace -e 'tracepoint:sched:sched_switch { @[kstack, comm] = count(); }'
```

## bcc-tools (BPF Compiler Collection)

Pre-built tools for common observability tasks. Production-ready, lower barrier than raw bpftrace.

### Network

- `tcpconnect`: trace TCP active connections (connect() calls)
- `tcpaccept`: trace TCP passive connections (accept() calls)
- `tcpretrans`: trace TCP retransmissions (network issues)
- `tcpdrop`: trace TCP drops with kernel stack traces
- `tcplife`: trace TCP session lifetimes with bytes transferred
- `tcptracer`: trace TCP connect/accept/close events

### Disk and Filesystem

- `biolatency`: block I/O latency histogram
- `biosnoop`: trace every block I/O event with latency
- `ext4slower`/`xfs_slower`: trace slow filesystem operations
- `filelife`: trace file creation and deletion with ages
- `fileslower`: trace slow file reads/writes
- `cachestat`: page cache hit/miss statistics

### CPU and Scheduling

- `cpudist`: on-CPU time distribution per process
- `runqlat`: run queue (scheduler) latency histogram
- `runqlen`: run queue length over time
- `offcputime`: off-CPU stack traces and durations
- `profile`: CPU profiling via timed sampling (generates flame graphs)
- `funccount`: count kernel function calls

### Memory

- `memleak`: detect memory leaks (outstanding allocations)
- `oomkill`: trace OOM kill events with details
- `slabratetop`: kernel slab allocation rates
- `cachestat`: page cache hit ratio

### Application

- `mysqld_qslower`: trace slow MySQL queries
- `dbslower`: trace slow database queries (generic)
- `gethostlatency`: trace DNS lookup latency
- `sslsniff`: trace SSL/TLS plaintext data (debugging, not production)

## Production Usage Guidelines

### Safety

- eBPF programs are verified by the kernel (can't crash the system)
- But: probes add latency to the probed path
- kprobes on hot paths (scheduler, network stack) can add measurable overhead
- Profile impact: run for short durations, sample rather than trace all events
- Tracepoints are cheaper than kprobes (stable, optimized)

### Performance Impact

- Tracepoints: ~50-100ns per event
- kprobes: ~100-200ns per event
- Map operations: ~50ns per lookup
- Rule of thumb: if event fires >100k/sec, use sampling or aggregation
- Always aggregate in-kernel (histograms, counts) rather than streaming every event

### Kernel Requirements

- Linux 4.9+: basic eBPF tracing
- Linux 5.3+: bounded loops in BPF programs
- Linux 5.8+: ring buffer (efficient event streaming)
- Linux 5.10+: BTF (no kernel headers needed for CO-RE)
- Linux 6.1+: typed pointers, improved verifier
- BTF (BPF Type Format): enables portable tools across kernel versions

### Deployment Patterns

- Ad-hoc investigation: SSH + bpftrace one-liners
- Continuous monitoring: bcc tools as systemd services with output to metrics
- Fleet-wide: Pixie, Cilium Hubble, or Grafana Beyla for always-on eBPF observability
- CI/CD: run targeted bpf traces during load tests

## Flame Graphs from eBPF

```bash
# CPU flame graph (30-second sample)
profile-bpfcc -F 99 -a 30 > /tmp/profile.out
flamegraph.pl /tmp/profile.out > cpu-flame.svg

# Off-CPU flame graph
offcputime-bpfcc -K -f 30 > /tmp/offcpu.out
flamegraph.pl --color=io /tmp/offcpu.out > offcpu-flame.svg
```

## Integration with Observability Stack

- Prometheus: export bcc tool output as metrics (custom exporter or ebpf_exporter)
- OpenTelemetry: eBPF-based auto-instrumentation (no code changes)
- Grafana Beyla: automatic HTTP/gRPC metrics and traces from eBPF
- Cilium Hubble: network observability for Kubernetes (eBPF-powered)
- Tetragon: security observability and enforcement via eBPF

## Troubleshooting eBPF

- "Permission denied": needs `CAP_BPF` (or `CAP_SYS_ADMIN` on older kernels)
- "Verifier failed": program too complex, reduce loops/branches
- Missing BTF: install `linux-headers` or kernel with CONFIG_DEBUG_INFO_BTF
- No output: verify probe exists with `bpftrace -l 'tracepoint:*keyword*'`
