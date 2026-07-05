# Linux Performance Tuning

sysctl, scheduler, NUMA, IRQ balancing, and benchmarking for production workloads.

## When to Load
- Tuning kernel parameters for specific workloads
- Optimizing CPU scheduling and NUMA topology
- Diagnosing performance bottlenecks
- Running and interpreting benchmarks

## Key Concepts

**Performance layers (top-down):** Application -> Libraries -> Syscalls -> Kernel -> Hardware. Tune from top down -- application fixes beat kernel tuning.

**CPU scheduling:** CFS (default), SCHED_FIFO/RR (real-time). CPU isolation via `isolcpus` or cgroups for latency-sensitive workloads.

**NUMA:** Non-Uniform Memory Access. Memory access is faster to local node. Bind processes to NUMA node to avoid remote memory access penalty.

**IRQ affinity:** distribute hardware interrupts across CPUs. Critical for high-throughput network workloads. Use `irqbalance` or pin manually.

## Patterns

**Network-optimized sysctl (high-connection server):**
```bash
# /etc/sysctl.d/99-network.conf
net.core.somaxconn = 65535
net.core.netdev_max_backlog = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.tcp_fin_timeout = 15
net.ipv4.tcp_tw_reuse = 1
net.ipv4.ip_local_port_range = 1024 65535
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.ipv4.tcp_rmem = 4096 87380 16777216
net.ipv4.tcp_wmem = 4096 87380 16777216
```

**CPU isolation for latency-sensitive workload:**
```bash
# Kernel cmdline (GRUB)
isolcpus=4-7 nohz_full=4-7 rcu_nocbs=4-7

# Pin application to isolated CPUs
taskset -c 4-7 /opt/app/bin/server

# Or via systemd
# CPUAffinity=4-7 in [Service] section
```

**NUMA-aware process binding:**
```bash
# Show NUMA topology
numactl --hardware

# Run process on node 0 (local memory only)
numactl --cpunodebind=0 --membind=0 /opt/app/bin/server

# Check NUMA stats for imbalance
numastat -p $(pidof server)
```

**IRQ pinning for NIC queues:**
```bash
#!/bin/bash
# Pin each NIC queue IRQ to a specific CPU
NIC="eth0"
CPUS=(0 1 2 3)
i=0
for irq in $(grep "$NIC-TxRx" /proc/interrupts | awk '{print $1}' | tr -d ':'); do
  echo "${CPUS[$i]}" > /proc/irq/$irq/smp_affinity_list
  i=$(( (i + 1) % ${#CPUS[@]} ))
done
```

## Gotchas
- `isolcpus` is boot-time only -- requires reboot to change
- `tcp_tw_reuse` only helps for outbound connections (client side)
- NUMA imbalance shows as high `numa_miss` in `/proc/vmstat`
- Transparent Huge Pages (THP) can cause latency spikes -- disable for databases
- `vm.swappiness=0` doesn't disable swap -- it makes kernel prefer killing over swapping
- `irqbalance` daemon overrides manual IRQ pinning unless stopped

## Verification
- `perf top` / `perf stat` for CPU-level profiling
- `vmstat 1` for system-wide activity (CPU, memory, IO)
- `mpstat -P ALL 1` for per-CPU utilization
- `numastat` for NUMA hit/miss ratio
- `cat /proc/interrupts` for IRQ distribution
- `sysbench cpu/memory/fileio` for quick benchmarks
- `stress-ng` for targeted subsystem stress testing
