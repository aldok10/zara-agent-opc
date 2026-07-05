---
type: reference
title: Distributed System Patterns Reference
---

# Distributed System Patterns -- Full Reference

## Load Balancing

- L4 (transport): fast, connection-based, no content inspection
- L7 (application): content-aware routing, path/header-based, TLS termination
- Algorithms: round-robin, least connections, consistent hashing, weighted
- Health checks: active (probe) vs passive (error tracking)

## Caching

- Cache-aside: app reads cache first, fills on miss from DB
- Write-through: app writes to cache, cache writes to DB synchronously
- Write-behind: cache writes to DB asynchronously (risk: data loss)
- Invalidation: TTL, event-driven, versioning
- CDN: static assets, edge caching, cache-control headers

## Message Queues

- Purpose: async decoupling, load leveling, temporal decoupling
- Delivery: at-most-once, at-least-once, exactly-once (expensive)
- Dead letter queues: poison messages, manual inspection
- Backpressure: bounded queues, flow control, consumer scaling

## Database Sharding

- Range-based: ordered queries easy, hotspots likely
- Hash-based: even distribution, range queries expensive
- Resharding: consistent hashing avoids full rebalance
- Cross-shard queries: scatter-gather, avoid if possible

## Consistent Hashing

- Virtual nodes: even distribution across physical nodes
- Rebalancing: only K/N keys move on add/remove
- Jump hash: no memory, deterministic, add-only
- Token ring: Cassandra/DynamoDB model

## CQRS / Event Sourcing

- Separate read (query) and write (command) models
- Event log: append-only, immutable, source of truth
- Projections: materialized views from event stream
- Replay: rebuild state, fix bugs retroactively
- Audit: full history for free

## Saga Pattern

- Orchestration: central coordinator manages steps
- Choreography: each service emits events, next reacts
- Compensation: undo partial work on failure
- Idempotency: required for safe retries

## Circuit Breaker

- States: closed (normal), open (failing, fast-fail), half-open (testing recovery)
- Fallback: cached response, degraded service, error
- Cascading failure prevention: isolate failing dependencies

## Rate Limiting

- Token bucket: burst-friendly, refill rate
- Sliding window: smooth distribution, memory-intensive
- Fixed window: simple, boundary spike issue
- Distributed quotas: Redis-based, eventual consistency tradeoffs

## Replication

- Leader-follower: read scaling, single write point, replication lag
- Multi-leader: write everywhere, conflict resolution required
- Quorum: W+R>N for consistency, tunable
- CRDTs: conflict-free, eventually consistent, no coordination

## Service Mesh

- Sidecar proxy: transparent network management per pod
- mTLS: automatic inter-service encryption
- Traffic management: canary, blue-green, fault injection
- Observability: automatic metrics/traces without app changes
- Implementations: Istio, Linkerd, Consul Connect
