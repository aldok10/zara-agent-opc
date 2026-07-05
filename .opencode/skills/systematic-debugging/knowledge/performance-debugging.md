# Performance Debugging

## USE Method (Utilization, Saturation, Errors)

For every resource (CPU, memory, disk, network, connections):

| Resource | Utilization | Saturation | Errors |
|----------|-------------|------------|--------|
| CPU | `top`, `mpstat` | Run queue length (`vmstat r`) | Machine check exceptions |
| Memory | `free -m`, `vmstat` | Swap usage, OOM kills | `dmesg` OOM |
| Disk | `iostat -x` %util | `avgqu-sz` (queue depth) | `smartctl`, `dmesg` |
| Network | `sar -n DEV` | `ifconfig` overruns, drops | `ifconfig` errors |
| Connections | Pool usage % | Pool wait queue | Connection refused / timeout |

```bash
# Quick USE check
# CPU
mpstat -P ALL 1 5

# Memory
free -m && cat /proc/meminfo | grep -E "MemFree|Buffers|Cached|SwapUsed"

# Disk
iostat -xz 1 5

# Network
sar -n DEV 1 5
ss -s  # socket statistics
```

## RED Method (Rate, Errors, Duration)

For every service endpoint:

```promql
# Rate (requests per second)
rate(http_requests_total{service="order-service"}[5m])

# Errors (error rate)
rate(http_requests_total{service="order-service", status=~"5.."}[5m])
/ rate(http_requests_total{service="order-service"}[5m])

# Duration (latency percentiles)
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket{service="order-service"}[5m]))
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{service="order-service"}[5m]))
histogram_quantile(0.50, rate(http_request_duration_seconds_bucket{service="order-service"}[5m]))
```

Key insight: check p99 vs p50. Large gap = tail latency problem (likely one slow dependency or resource contention).

## CPU Profiling

### Flame Graphs

```bash
# Linux perf (system-wide)
perf record -g -p $(pgrep myapp) -- sleep 30
perf script | stackcollapse-perf.pl | flamegraph.pl > flame.svg

# Go pprof
go tool pprof -http=:8080 http://localhost:6060/debug/pprof/profile?seconds=30

# Node.js
node --prof app.js
node --prof-process isolate-*.log > processed.txt

# Python (py-spy)
py-spy record -o profile.svg --pid 12345
```

### Reading Flame Graphs

- Width = time spent (wider = more CPU time)
- Y-axis = stack depth (bottom = entry point, top = leaf function)
- Look for: wide plateaus (hot functions), unexpected deep stacks
- Color is arbitrary (not meaningful unless custom)

### Common CPU Issues

| Pattern | Cause | Fix |
|---------|-------|-----|
| Wide plateau in JSON.parse | Large payload parsing | Stream parsing, reduce payload |
| Deep regex stack | Catastrophic backtracking | Rewrite regex, add timeout |
| Repeated GC frames | Memory pressure | Reduce allocations, increase heap |
| Spin in lock acquisition | Lock contention | Reduce critical section, shard locks |

## Memory Leak Detection

### Patterns

```typescript
// Common leak: event listeners not cleaned up
class LeakyService {
  constructor(emitter: EventEmitter) {
    // LEAK: listener accumulates on each instantiation
    emitter.on('data', this.handleData.bind(this));
  }
  // FIX: remove listener in destructor
  destroy() {
    emitter.off('data', this.handler);
  }
}
```

### Detection Tools

```bash
# Node.js heap snapshot
node --inspect app.js
# In Chrome DevTools: Memory tab -> Take heap snapshot -> Compare

# Go
go tool pprof http://localhost:6060/debug/pprof/heap
# In pprof: top, list, web commands

# JVM
jmap -dump:live,format=b,file=heap.hprof $(pgrep java)
# Open in Eclipse MAT or VisualVM
```

### Memory Leak Investigation

1. Take baseline heap snapshot
2. Run workload for N minutes
3. Take second snapshot
4. Compare: what objects grew?
5. Find retention path (what's holding references?)

```bash
# Go: compare heap profiles
go tool pprof -base=heap1.prof heap2.prof
# Shows only growth between snapshots
```

## Database Query Debugging

### PostgreSQL

```sql
-- Find slow queries
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Check for table scans
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM orders WHERE user_id = 'abc123' AND status = 'pending';

-- Look for:
-- Seq Scan (missing index)
-- Nested Loop with high row counts (bad join strategy)
-- Sort with external merge (insufficient work_mem)
-- Bitmap Heap Scan with high "Rows Removed by Filter" (partial index needed)
```

### Index Analysis

```sql
-- Unused indexes (waste of write performance)
SELECT indexrelname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes
WHERE idx_scan = 0 AND indexrelname NOT LIKE '%pkey%'
ORDER BY pg_relation_size(indexrelid) DESC;

-- Missing indexes (high sequential scans on large tables)
SELECT relname, seq_scan, seq_tup_read, idx_scan
FROM pg_stat_user_tables
WHERE seq_scan > 100 AND pg_relation_size(relid) > 10000000
ORDER BY seq_tup_read DESC;
```

### Connection Pool Issues

```sql
-- Active connections
SELECT state, count(*) FROM pg_stat_activity GROUP BY state;

-- Long-running queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE state != 'idle' AND query_start < now() - interval '30 seconds'
ORDER BY duration DESC;

-- Blocked queries (lock contention)
SELECT blocked.pid, blocked.query, blocking.pid AS blocking_pid, blocking.query AS blocking_query
FROM pg_stat_activity blocked
JOIN pg_locks bl ON bl.pid = blocked.pid
JOIN pg_locks kl ON kl.locktype = bl.locktype AND kl.relation = bl.relation AND kl.pid != bl.pid
JOIN pg_stat_activity blocking ON blocking.pid = kl.pid
WHERE NOT bl.granted;
```

## Network Latency Diagnosis

```bash
# DNS resolution time
dig +stats example.com | grep "Query time"

# TCP connection time
curl -w "dns: %{time_namelookup}s\nconnect: %{time_connect}s\ntls: %{time_appconnect}s\nfirst_byte: %{time_starttransfer}s\ntotal: %{time_total}s\n" -o /dev/null -s https://api.example.com/health

# Trace route with timing
mtr --report --report-cycles 10 target-host

# Check for packet loss
ping -c 100 target-host | tail -3
```

### Service-to-Service Latency

```go
// Instrument HTTP client with timing breakdown
type TimingTransport struct {
    Base http.RoundTripper
}

func (t *TimingTransport) RoundTrip(req *http.Request) (*http.Response, error) {
    trace := &httptrace.ClientTrace{
        DNSStart:          func(info httptrace.DNSStartInfo) { /* record */ },
        DNSDone:           func(info httptrace.DNSDoneInfo) { /* record */ },
        ConnectStart:      func(network, addr string) { /* record */ },
        ConnectDone:       func(network, addr string, err error) { /* record */ },
        TLSHandshakeStart: func() { /* record */ },
        TLSHandshakeDone:  func(tls.ConnectionState, error) { /* record */ },
        GotFirstResponseByte: func() { /* record */ },
    }
    req = req.WithContext(httptrace.WithClientTrace(req.Context(), trace))
    return t.Base.RoundTrip(req)
}
```

## Quick Diagnosis Flowchart

```
Symptom: High latency
├── Is CPU saturated? → Profile CPU, optimize hot paths
├── Is memory pressure high? → Check GC, heap, swap
├── Is disk I/O high? → Check queries, caching, buffer pool
├── Is network slow? → Check DNS, connection reuse, payload size
└── Is a dependency slow? → Check downstream service RED metrics

Symptom: Errors increasing
├── 5xx from your service? → Check logs, recent deploy, resource exhaustion
├── 5xx from dependency? → Check dependency health, circuit breaker state
├── Connection errors? → Check pool exhaustion, DNS, network
└── Timeout errors? → Check dependency latency, your timeout config
```
