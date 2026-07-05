# Bottleneck Analysis

## Resource Saturation Signals

| Resource | Metric | Saturation Signal |
|----------|--------|-------------------|
| CPU | `system.cpu.utilization` | > 80% sustained, high run queue |
| Memory | `system.memory.used` | Swap usage > 0, OOM kills |
| Disk I/O | `disk.io.util` | > 90% utilization, high await time |
| Network | `net.bytes_sent/recv` | Approaching NIC capacity, packet drops |
| Connections | `active_connections` | Near ulimit, connection refused errors |
| File descriptors | `process.open_fds` | Approaching max_fds limit |

Monitor all resources simultaneously during load tests. A bottleneck in one layer often masks issues in others.

## Correlation Techniques

**Latency vs Throughput**: When latency increases linearly with throughput, the system is at or past saturation. The "hockey stick" inflection point marks capacity limit.

**Error Rate Correlation**:
- Errors spike with latency = timeout cascade
- Errors spike without latency change = upstream rejection (rate limiter, circuit breaker)
- Gradual error increase = resource exhaustion (pool drain, memory)

**Little's Law validation**: `L = lambda * W` (concurrent users = arrival rate * avg response time). If observed concurrency exceeds expected, requests are queuing.

**USE Method** (Brendan Gregg): For every resource check Utilization, Saturation, Errors. Systematically eliminates guessing.

## Database Bottlenecks

| Symptom | Likely Cause | Investigation |
|---------|-------------|---------------|
| Latency spikes at specific RPS | Connection pool exhaustion | Check `active` vs `max` pool connections |
| Intermittent timeouts | Lock contention | `pg_stat_activity` for waiting queries, `SHOW ENGINE INNODB STATUS` |
| Gradual latency increase | Missing index / table scan | `EXPLAIN ANALYZE` on slow queries, `pg_stat_statements` |
| Periodic latency bursts | Autovacuum / checkpoint | Correlate with WAL write spikes |
| Read replica lag | Write-heavy workload | Monitor replication lag metric |

**Connection pool sizing**: `pool_size = (core_count * 2) + effective_spindle_count`. Oversized pools cause contention overhead.

## Application Bottlenecks

**GC Pressure**:
- Long GC pauses correlate with latency spikes (check GC logs)
- High allocation rate with short-lived objects = frequent young-gen GC
- Growing old-gen = memory leak, eventual full GC stop-the-world

**Thread/Goroutine Pool**:
- All threads busy = requests queue (monitor pool active count vs max)
- Thread creation spike = pool too small for burst traffic
- Deadlocks = complete stall at specific concurrency level

**Memory Leaks**:
- Resident memory grows linearly during soak test
- Response time degrades over hours (not minutes)
- Common sources: unclosed connections, growing caches, event listener accumulation

**Async Bottlenecks**:
- Event loop lag (Node.js: `process.hrtime` delta, Go: goroutine count growth)
- Blocking calls in async context starving the event loop

## Infrastructure Bottlenecks

**Network**:
- Bandwidth saturation: check bytes/sec vs NIC capacity
- TCP connection overhead: high TIME_WAIT count consuming ports
- DNS resolution: sporadic timeouts, add caching or pre-resolve
- TLS handshake: cpu-intensive at scale, check session resumption rate

**Load Balancer**:
- Uneven distribution: one backend saturated while others idle
- Health check failures causing traffic oscillation
- Connection draining timeouts during rolling deploys

**Container/K8s**:
- CPU throttling: `container_cpu_cfs_throttled_seconds_total`
- Memory limits: OOMKilled events in pod status
- Network policies: unexpected packet drops between services

## Profiling During Load

**Go (pprof)**:
```bash
# CPU profile during load test
curl http://app:6060/debug/pprof/profile?seconds=30 > cpu.prof
go tool pprof -http=:8080 cpu.prof

# Heap profile for memory analysis
curl http://app:6060/debug/pprof/heap > heap.prof

# Goroutine dump for concurrency issues
curl http://app:6060/debug/pprof/goroutine?debug=2
```

**Java (async-profiler)**:
```bash
# CPU flame graph during load
./asprof -d 30 -f flamegraph.html <pid>

# Allocation profiling
./asprof -e alloc -d 30 -f alloc.html <pid>

# Wall-clock (includes blocked time)
./asprof -e wall -d 30 -f wall.html <pid>
```

**Flame Graph interpretation**:
- Wide plateaus = hot code paths consuming most CPU
- Deep stacks = excessive abstraction overhead
- Lock/wait frames = contention points
- Allocation-heavy frames = GC pressure sources

**Continuous profiling** (Pyroscope, Datadog Profiling): always-on, compare profiles between normal and high-load periods to identify load-dependent bottlenecks.
