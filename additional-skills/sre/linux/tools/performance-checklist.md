---
type: tool
title: "Performance Checklist (USE Method)"
---

# Performance Checklist (USE Method)

Systematic approach to performance analysis using Brendan Gregg's USE Method: for every resource, check Utilization, Saturation, and Errors.

## CPU

### Utilization
- [ ] `mpstat -P ALL 1` -- per-CPU utilization breakdown (usr, sys, iowait, idle)
- [ ] `top` / `htop` -- which processes consuming CPU
- [ ] `pidstat 1` -- per-process CPU usage over time
- [ ] Check: is total CPU >80% sustained? Any single CPU pinned at 100%?

### Saturation
- [ ] `vmstat 1` -- check `r` column (run queue length > CPU count = saturated)
- [ ] `cat /proc/pressure/cpu` -- PSI some/full metrics
- [ ] `perf sched latency` -- scheduler latency per task
- [ ] `bpftrace runqlat.bt` -- run queue latency histogram

### Errors
- [ ] `perf stat -a sleep 10` -- CPU hardware errors, stalled cycles
- [ ] `dmesg | grep -i mce` -- machine check exceptions
- [ ] `journalctl -k | grep -i error` -- kernel CPU errors

## Memory

### Utilization
- [ ] `free -h` -- total, used, available (not "free", which excludes cache)
- [ ] `vmstat 1` -- `si`/`so` columns (swap in/out)
- [ ] `cat /proc/meminfo` -- detailed breakdown
- [ ] `slabtop` -- kernel slab allocation (dentries, inodes)

### Saturation
- [ ] `vmstat 1` -- `si`/`so` > 0 sustained = memory pressure
- [ ] `cat /proc/pressure/memory` -- PSI some/full metrics
- [ ] `sar -B 1` -- page scan rate (pgscank, pgscand)
- [ ] `dmesg | grep -i oom` -- OOM killer activity

### Errors
- [ ] `dmesg | grep -i "hardware error\|memory"` -- ECC errors
- [ ] `edac-util -s` -- EDAC (Error Detection and Correction) status
- [ ] `cat /sys/devices/system/edac/mc/mc*/ce_count` -- correctable errors

## Disk I/O

### Utilization
- [ ] `iostat -xz 1` -- %util per device (>70% sustained = concern)
- [ ] `iotop -oP` -- per-process I/O usage
- [ ] `pidstat -d 1` -- per-process disk I/O

### Saturation
- [ ] `iostat -xz 1` -- avgqu-sz (average queue length > 1 for single disk)
- [ ] `cat /proc/pressure/io` -- PSI some/full metrics
- [ ] `biolatency` (bcc) -- I/O latency distribution
- [ ] Check: await >> svctm indicates queuing

### Errors
- [ ] `smartctl -a /dev/sda` -- SMART disk health
- [ ] `dmesg | grep -i "i/o error\|sector"` -- disk I/O errors
- [ ] `cat /sys/block/*/stat` -- io_ticks, time_in_queue

## Network

### Utilization
- [ ] `sar -n DEV 1` -- per-interface bytes/packets (compare to link speed)
- [ ] `ip -s link` -- interface statistics
- [ ] `nstat` -- detailed network statistics
- [ ] `ss -s` -- socket summary (established, time-wait counts)

### Saturation
- [ ] `netstat -s | grep -i retrans` -- TCP retransmissions
- [ ] `ss -tnp | grep -c ESTABLISHED` -- connection count
- [ ] `nstat | grep -i drop` -- dropped packets
- [ ] `tc -s qdisc show` -- queuing discipline drops/overlimits
- [ ] `ethtool -S <interface> | grep drop` -- NIC-level drops

### Errors
- [ ] `ip -s link` -- errors, dropped, overruns per interface
- [ ] `ethtool -S <interface>` -- NIC error counters
- [ ] `dmesg | grep -i "link\|eth\|network"` -- driver errors
- [ ] `netstat -s` -- protocol error counters

## File Descriptors

### Utilization
- [ ] `cat /proc/sys/fs/file-nr` -- allocated / max file descriptors
- [ ] `ls /proc/<pid>/fd | wc -l` -- per-process FD count
- [ ] `lsof -p <pid> | wc -l` -- open files per process

### Saturation
- [ ] `dmesg | grep "too many open files"` -- FD exhaustion events
- [ ] Compare per-process FD count vs `ulimit -n`

### Errors
- [ ] Application logs for EMFILE / ENFILE errors
- [ ] `strace -e trace=open,openat -c -p <pid>` -- failed opens

## Kernel and Scheduling

### Utilization
- [ ] `sysctl kernel.threads-max` vs `ps -eLf | wc -l` -- thread count
- [ ] `ipcs -u` -- IPC resource usage (semaphores, shared memory)

### Saturation
- [ ] `dmesg | grep "fork"` -- fork failures
- [ ] `cat /proc/pressure/cpu` -- scheduling pressure

### Errors
- [ ] `dmesg | tail -50` -- recent kernel messages
- [ ] `journalctl -p err -b` -- error-level journal entries this boot

## Quick Triage Sequence

Run these first (covers 80% of issues in 60 seconds):

```bash
# 1. Load averages and uptime
uptime

# 2. Kernel errors
dmesg -T | tail -20

# 3. Overall resource usage
vmstat 1 5

# 4. Disk I/O
iostat -xz 1 3

# 5. Network
sar -n DEV 1 3

# 6. Top processes
top -bn1 | head -20

# 7. PSI (Pressure Stall Information)
cat /proc/pressure/{cpu,memory,io}

# 8. Recent OOM or errors
journalctl -p err --since "1 hour ago" --no-pager | tail -20
```

## Capacity Planning Signals

- CPU: sustained >70% utilization across all cores
- Memory: available < 20% of total, any swap activity
- Disk: %util > 60% sustained, await > 10ms (SSD) or > 20ms (HDD)
- Network: >70% of link capacity, retransmission rate > 1%
- FDs: >80% of process limit

## Post-Analysis Actions

1. Identify bottleneck resource (USE method narrows it down)
2. Correlate with application metrics (latency spike timing)
3. Determine if: resize (more resource), optimize (use less), distribute (spread load)
4. For saturation issues: often need architectural change, not just more resource
5. For error issues: often hardware or configuration, fix the root cause
