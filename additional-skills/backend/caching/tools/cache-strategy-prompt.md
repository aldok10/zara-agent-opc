---
type: tool
title: "Cache Strategy Design"
---

# Cache Strategy Design

## Purpose

Design caching layers with correct invalidation, TTL policies, and consistency guarantees. Covers application cache, CDN, database query cache, and distributed cache topologies.

## When to Use

- Adding caching to reduce latency or load
- Debugging stale data or cache stampede issues
- Choosing between cache-aside, write-through, or write-behind
- Designing multi-tier cache (L1 local + L2 distributed)

## Prompt Template

```
CONTEXT:
- Data type: [user profiles | product catalog | session state | computed results]
- Read/write ratio: [read-heavy | write-heavy | balanced]
- Consistency requirement: [eventual | strong | bounded staleness]
- Cache layer: [application memory | Redis/Memcached | CDN | DB query cache]
- Topology: [single node | replicated | sharded]
- Current latency: [p50/p95/p99 if known]
- Data size: [item size, total working set]

DESIGN DECISIONS:
1. Pattern: cache-aside vs write-through vs write-behind vs read-through
2. Key design: namespace, versioning, hash distribution
3. TTL strategy: fixed vs adaptive vs event-driven expiry
4. Invalidation: explicit delete, versioned keys, pub/sub, TTL-only
5. Stampede protection: lock/lease, probabilistic early expiry, request coalescing
6. Warm-up: lazy population vs pre-warming vs background refresh
7. Failure mode: cache-miss fallback, circuit breaker, degraded responses
8. Eviction: LRU vs LFU vs TTL-based, memory budget

IDENTIFY RISKS:
- Stale reads after writes
- Thundering herd on expiry
- Memory pressure / eviction storms
- Hot key concentration
- Cache poisoning (invalid data cached)
```

## Output Format

```
## Cache Strategy: [system/feature]

### Architecture
[Layer diagram: client -> CDN -> app cache -> DB]

### Configuration
| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Pattern   | ...   | ...       |
| TTL       | ...   | ...       |
| Eviction  | ...   | ...       |

### Invalidation Plan
- Trigger: [what causes invalidation]
- Method: [how cache is cleared/updated]
- Propagation: [single node / broadcast / pub-sub]

### Failure Modes
| Scenario | Behavior | Mitigation |
|----------|----------|------------|
| Cache down | ... | ... |
| Stampede   | ... | ... |
```
