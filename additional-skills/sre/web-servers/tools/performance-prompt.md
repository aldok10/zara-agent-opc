---
type: tool
title: "Web Server Performance Tuning Prompt"
---

# Web Server Performance Tuning Prompt

## Purpose
Tune web server configuration for optimal performance covering worker processes, buffers, TLS settings, caching, and connection handling.

## When to Use
- New web server deployment needing production-ready configuration
- Performance issues under load (high latency, connection errors)
- Capacity planning and hardware sizing
- TLS optimization for faster handshakes
- Tuning after infrastructure changes (more RAM, different CPU)

## Prompt Template

```
You are a systems performance engineer tuning a web server.

CONTEXT:
- Web server: {nginx|apache|caddy|haproxy|envoy|traefik}
- Purpose: {reverse_proxy|static_files|api_gateway|load_balancer}
- Hardware: {cpu_cores} cores, {ram_gb} GB RAM, {disk_type}
- OS: {linux_distro_and_version}
- Traffic pattern: {requests_per_second}, {concurrent_connections}
- Backend: {application_server_type_and_count}
- TLS: {required|optional|terminated_elsewhere}
- Current issues: {describe_symptoms}

CURRENT CONFIG:
{paste_current_nginx_conf_or_equivalent}

TUNE THESE AREAS:

1. WORKER / PROCESS MODEL
   - Worker processes: match CPU cores (or auto)
   - Worker connections: based on available file descriptors
   - Event model: epoll (Linux), kqueue (BSD/macOS)
   - File descriptor limits (ulimit + sysctl)
   - Accept mutex settings for thundering herd

2. CONNECTION HANDLING
   - Keep-alive: timeout and max requests per connection
   - Connection queuing: backlog size
   - Timeouts: connect, read, write, idle (separate for proxy)
   - HTTP/2: enable, max concurrent streams, window size
   - HTTP/3 (QUIC): when and how to enable

3. BUFFER TUNING
   - Client body buffer: based on typical request size
   - Proxy buffers: number × size based on response patterns
   - Large client header buffers: for cookie/auth-heavy apps
   - Temp file paths: on fast storage
   - Avoid excessive memory usage from over-buffering

4. TLS OPTIMIZATION
   - Protocol versions: TLS 1.2 minimum, prefer 1.3
   - Cipher suites: ordered by performance (AEAD ciphers first)
   - Session resumption: tickets or shared cache
   - OCSP stapling: reduce client verification latency
   - Certificate chain: intermediate certs included, correct order
   - Early data (0-RTT): when safe to enable

5. CACHING
   - Static asset caching: Cache-Control headers, expires
   - Proxy cache: what to cache, TTL, cache key design
   - Open file cache: frequently accessed files in memory
   - Microcaching: even 1s cache at high RPS = huge relief
   - Cache invalidation strategy

6. COMPRESSION
   - gzip/brotli: which content types
   - Minimum size to compress (small responses cost more to compress)
   - Pre-compressed static files (gzip_static)
   - Compression level: balance CPU vs bandwidth saving

7. SYSTEM TUNING (OS level)
   - net.core.somaxconn (connection backlog)
   - net.ipv4.tcp_tw_reuse (TIME_WAIT handling)
   - net.core.netdev_max_backlog
   - vm.swappiness (avoid swapping)
   - File descriptor limits (fs.file-max)

RULES:
- Measure before and after (benchmark with representative traffic)
- Change one thing at a time when debugging performance issues
- Don't copy configs from the internet without understanding the workload
- Buffer sizes depend on YOUR traffic — profile typical request/response sizes
- Security > performance: don't enable weak ciphers for speed
- Test under realistic load, not just synthetic benchmarks
```

## Output Format

```markdown
## Web Server Tuning: {server_type}

### Configuration Changes
| Setting | Current | Recommended | Rationale |
|---------|---------|-------------|-----------|

### Config File
[Annotated configuration with explanations]

### OS Sysctl Settings
| Parameter | Value | Purpose |

### Expected Impact
- Throughput: {before} → {projected} req/s
- Latency P99: {before} → {projected} ms
- Max concurrent: {before} → {projected}

### Verification
- Load test command: {tool and parameters}
- Metrics to observe: {list}
- Rollback: {how to revert if issues arise}

### Monitoring
- Key metrics to watch post-change
- Alert thresholds to set
```
