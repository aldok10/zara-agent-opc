---
type: fact
title: "Bottleneck Analysis Patterns"
---

# Bottleneck Analysis Patterns

## The Four Resource Types

Every performance issue traces back to saturation in one of four resources:

| Resource | Symptoms | Key Metrics |
|---|---|---|
| CPU | High utilization, slow computation | User%, System%, IOwait% |
| Memory | OOM kills, swapping, GC pressure | RSS, heap usage, page faults |
| I/O (Disk) | Slow reads/writes, high queue depth | IOPS, latency, throughput, await |
| Network | Timeout errors, packet loss, high latency | Bandwidth, connections, retransmits |

## CPU Bottleneck Analysis

### Detection
- `top`/`htop`: sustained >80% CPU across cores
- Load average > number of CPU cores
- Context switches abnormally high (thousands/sec/core)

### Profiling Tools
- **perf** (Linux): `perf record -g -p <pid>` → `perf report`
- **Instruments** (macOS): Time Profiler, System Trace
- **async-profiler** (JVM): low-overhead, production-safe
- **py-spy** (Python): sampling profiler, no code changes
- **pprof** (Go): built-in, HTTP endpoint in production

### Common CPU Bottlenecks
- Tight loops without yielding
- Excessive regex compilation (compile once, use many)
- Serialization/deserialization on hot paths
- Inefficient algorithms (O(n²) in disguise)
- Lock contention causing spin-waits

## Memory Bottleneck Analysis

### Detection
- RSS growing over time (memory leak)
- Frequent GC pauses (stop-the-world)
- Swap usage increasing
- OOMKiller entries in dmesg/journal

### Profiling Tools
- **Valgrind/Massif**: heap profiling (dev only, 10-50x slowdown)
- **jmap/MAT** (JVM): heap dumps, dominator tree analysis
- **tracemalloc** (Python): allocation tracking per call site
- **pprof heap** (Go): live allocations profiler
- **Chrome DevTools**: Memory tab for Node.js

### Common Memory Bottlenecks
- Unbounded caches (no eviction, no size limit)
- Event listener leaks (registered but never removed)
- Large object retention in closures
- Connection pool not releasing connections
- Buffer accumulation in streaming without backpressure

## I/O Bottleneck Analysis

### Detection
- `iostat -x 1`: await >10ms, %util >80%
- `iotop`: identify which process is I/O heavy
- High disk queue depth (avgqu-sz)
- IOwait% in CPU metrics (CPU waiting on disk)

### Profiling Tools
- **iostat**: device-level I/O statistics
- **blktrace**: block-level I/O tracing
- **strace**: syscall tracing (`read`, `write`, `fsync`)
- **fio**: benchmark disk performance baseline

### Common I/O Bottlenecks
- Synchronous file operations on hot paths
- Logging to disk without buffering
- Database writing without batching
- Missing indexes causing full table scans
- `fsync` after every write (vs batched flush)

## Network Bottleneck Analysis

### Detection
- Connection timeouts or refused connections
- TCP retransmits (packet loss)
- High TIME_WAIT count (connection churn)
- Bandwidth saturation (near link capacity)

### Profiling Tools
- **ss** / **netstat**: connection states, queue depths
- **tcpdump/Wireshark**: packet-level inspection
- **iftop/nload**: real-time bandwidth usage
- **mtr**: hop-by-hop latency analysis

### Common Network Bottlenecks
- DNS resolution on every request (no caching)
- New TCP connection per request (no keep-alive/pooling)
- Large payloads without compression
- Chatty protocols (many round-trips)
- Insufficient connection pool size

## Correlation Patterns

### The Saturation Cascade
Resources affect each other. Identify the PRIMARY bottleneck:

```
Disk slow → I/O wait → CPU appears idle but load is high
Memory pressure → Swapping → Disk I/O spike → Everything slow
Network timeout → Thread pool exhausted → CPU threads blocked
GC pressure → Memory churn → CPU spent in GC → Throughput drops
```

### Finding the Root Cause
1. Start with USE method: Utilization, Saturation, Errors per resource
2. Check all four resources simultaneously (not sequentially)
3. The resource with highest SATURATION is the bottleneck
4. Correlation ≠ causation: verify with controlled load

## Saturation Signals

### Queue Theory Indicators
- **Utilization approaching 100%**: exponential latency increase
- **Queue depth growing**: requests waiting, not being served
- **Errors under load**: resource exhaustion, not bugs

### The Knee Point
Performance degrades non-linearly. The "knee" is where saturation begins:
```
Below knee: latency stable, throughput scales linearly
At knee: latency starts increasing, throughput plateaus
Above knee: latency spikes, errors emerge, throughput may drop
```

### Key Thresholds
- CPU: >70% sustained = investigate, >85% = action required
- Memory: >80% committed = risk of OOM under spike
- Disk: await >20ms = degraded, >100ms = critical
- Network: >60% bandwidth = congestion risk under burst

## Production Profiling Safety

### Low-Overhead Techniques (safe in production)
- Sampling profilers at low frequency (100Hz)
- `/proc` filesystem metrics (zero overhead)
- eBPF-based tools (kernel-level, minimal impact)
- Application-level metrics (Prometheus/StatsD)
- Distributed tracing sampling (1-5% of requests)

### High-Overhead Techniques (staging/dev only)
- Instrumentation profilers (method-level timing)
- Heap dumps (stop-the-world pause)
- Full packet capture (high disk usage)
- Valgrind/sanitizers (10-50x slowdown)

## Systematic Approach

```
1. Define the problem: what metric is out of SLO?
2. Measure baseline: what's normal for this system?
3. Check USE for all resources: which is saturated?
4. Drill down: what workload saturates that resource?
5. Profile the workload: where does time/memory go?
6. Hypothesize root cause: what change would fix it?
7. Validate: test fix under equivalent load
8. Monitor: confirm improvement in production
```
