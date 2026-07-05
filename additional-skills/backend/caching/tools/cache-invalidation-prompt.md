---
type: tool
title: "Cache Invalidation Strategy"
---

# Cache Invalidation Strategy

## Purpose

Design a cache invalidation approach that balances data freshness against performance. Covers TTL-based, event-driven, and write-through/write-behind patterns with consistency guarantees.

## When to Use

- Stale data is causing user-visible bugs
- Designing cache layer for a new service
- Migrating from TTL-only to event-driven invalidation
- Choosing between write-through, write-behind, and cache-aside
- Debugging cache inconsistency in distributed systems

## Prompt Template

```
CONTEXT:
- Cache layer: [Redis | Memcached | CDN | in-process | multi-tier]
- Data type: [user profile | product catalog | session | config | aggregates]
- Write frequency: [per second | per minute | hourly | rarely]
- Read frequency: [per second | per minute | hourly]
- Staleness tolerance: [seconds | minutes | hours | none]
- Consistency requirement: [eventual | read-your-writes | strong]
- Data relationships: [independent | hierarchical | graph]

EVALUATE PATTERNS:
1. TTL-based: simple, bounded staleness, no coordination
2. Event-driven: publish invalidation on write, near real-time
3. Write-through: update cache on write, strong consistency, write latency
4. Write-behind: async cache-to-store, fast writes, durability risk
5. Cache-aside: app manages cache, flexible, thundering herd risk
6. Tag-based: group related keys, invalidate by tag

DESIGN:
1. Key schema: [namespace:entity:id:version pattern]
2. Invalidation trigger: [write event | CDC | cron | manual]
3. Propagation: [pub/sub | webhook | polling | CDC stream]
4. Thundering herd prevention: [lock | probabilistic expiry | stale-while-revalidate]
5. Multi-region: [replication lag handling | local invalidation | global bus]
6. Failure mode: [serve stale | fail open | fail closed]
7. Monitoring: [hit rate | stale serve rate | invalidation latency]

EDGE CASES:
- Cache stampede on popular keys
- Partial invalidation (parent updated, children stale)
- Race condition: invalidation arrives before write completes
- Network partition between cache and invalidation bus
```

## Output Format

```
## Invalidation Strategy: [system/data type]

### Approach
[Selected pattern with rationale]

### Flow
1. [Write occurs] -> 2. [Event emitted] -> 3. [Cache action] -> 4. [Verification]

### Key Design
- Pattern: [namespace:entity:id]
- TTL: [duration and reasoning]
- Tags: [grouping strategy if applicable]

### Failure Handling
| Scenario | Behavior | Recovery |
|----------|----------|----------|
| ... | ... | ... |

### Monitoring
- Metrics: [hit rate, invalidation lag, stale serve count]
- Alerts: [threshold-based triggers]

### Trade-offs
- [What's gained vs what's sacrificed]
```
