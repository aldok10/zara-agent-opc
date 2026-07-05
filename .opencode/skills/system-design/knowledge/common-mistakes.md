---
type: fact
title: "System Design Common Mistakes - Production Lessons"
---

# System Design Common Mistakes

Production lessons from real-world architecture failures.

## Architecture & Decomposition

| Mistake | Impact | Fix |
|---------|--------|-----|
| Premature microservices | Team of 3 managing 10 services; debugging nightmare | Start with modular monolith, extract at stable boundaries |
| Distributed monolith | Coupled services; field rename cascades across 3+ services | Async communication, strict API contracts, no shared internal models |
| Over-engineering for scale (CQRS for 50-user portal) | 6 months wasted, devs struggle with unnecessary complexity | Optimize for change not scale; add complexity when measured load demands it |
| One team per microservice regardless of domain | Integration bugs, weeks to ship cross-cutting features | Align ownership with business domains |

## Data & State

| Mistake | Impact | Fix |
|---------|--------|-----|
| Shared database across services | Index change locks tables used by others | Each service owns its schema, share via APIs/events |
| Wrong database choice (relational for everything) | Fighting the model; time-series in RDBMS causes hot partitions | Match data model to access patterns |
| Treating read replicas as free performance | Replica lag breaks read-after-write consistency | Only stale-tolerant reads to replicas |

## Communication & Coupling

| Mistake | Impact | Fix |
|---------|--------|-----|
| Synchronous call chains across services | Availability = product of all services; one slow service collapses path | Async messaging, circuit breakers, timeouts |
| N+1 queries across service boundaries | Hundreds of downstream calls; latency compounds | Batch APIs, data loaders, denormalize |
| Chatty inter-service communication | Network failures multiply with each hop | Coarser-grained APIs, batch operations |

## Resilience & Failure

| Mistake | Impact | Fix |
|---------|--------|-----|
| Missing circuit breakers | Slow dependency cascades to full outage | Circuit breaker per dependency, fallback responses |
| Incorrect idempotency implementation | Retries create duplicates, double-charges | Idempotency keys, deduplication, deterministic IDs |
| Thundering herd / cache stampede | Expired key sends thousands of requests to DB | Request coalescing, probabilistic early expiration, jittered TTLs |
| No retry budget or backoff | Retries amplify load exponentially | Exponential backoff with jitter, retry budgets |

## Database Scaling

| Mistake | Impact | Fix |
|---------|--------|-----|
| Connection storm (autoscaling without budgets) | 50 pods x 20 = 1000 connections; DB thrashes | Server-side pooling, hard connection budgets |
| Ignoring lock contention until production | Cascading failure from latency feedback loop | Track lock waits as first-class metrics |
| Sharding with wrong key (hot partition) | One shard absorbs all traffic | Uniform distribution keys, composite sharding |
| "Just raise max_connections" | More memory pressure, worse performance | Connection pooling, right-size workload |

## Caching

| Mistake | Impact | Fix |
|---------|--------|-----|
| No jitter on cache TTLs | Mass simultaneous expiration; DB spike | Add random jitter to TTL values |
| Cache-aside without coalescing | 1000 requests all recompute same value | Single-flight pattern (request coalescing) |
| Hot key concentration in Redis | Single node bottleneck | Local cache for hottest keys, read replicas |

## Kubernetes & Infrastructure

| Mistake | Impact | Fix |
|---------|--------|-----|
| No resource requests/limits on pods | Memory-leaking pod kills entire node | Set requests to typical usage, limits to peak |
| Using `latest` image tag | Different code per deploy; impossible rollbacks | Pinned version tags or SHA256 digests |
| Missing readiness/liveness probes | Traffic routed to unready pods | Separate liveness from readiness; tune thresholds |
| Running containers as root | Container escape = root on node | Non-root USER directive, drop capabilities |
| Neglecting cluster version upgrades | Forced multi-version jump is high-risk | Regular upgrade cadence (quarterly minimum) |

## Observability

| Mistake | Impact | Fix |
|---------|--------|-----|
| No distributed tracing from day one | Cannot trace requests across services | OpenTelemetry instrumentation, structured logging |
| No correlation IDs | Hours of manual log correlation per incident | Propagate trace IDs in all request headers |

## Consistency & Coordination

| Mistake | Impact | Fix |
|---------|--------|-----|
| Assuming exactly-once without enforcing | Duplicates processed; data corruption | At-least-once delivery + application idempotency |
| Split-brain in distributed consensus | Both partitions accept writes; data divergence | Quorum writes, fencing tokens, leader lease |
| Distributed transactions (2PC) across services | Locks held across network; availability tanks | Saga pattern, eventual consistency, outbox pattern |

## References

- DevX: "Architecture Mistakes That Kill Startups" (2024)
- Medium/InfoQ: Distributed systems anti-patterns series
- Redis documentation: Caching best practices, hot key handling
- Kubernetes blog: Production best practices, resource management
- Martin Kleppmann, "Designing Data-Intensive Applications" (O'Reilly)
- Sam Newman, "Building Microservices" 2nd ed (O'Reilly)
- AWS Well-Architected Framework: Reliability pillar
