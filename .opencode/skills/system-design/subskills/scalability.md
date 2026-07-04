# Scalability: Scaling Patterns & Capacity Planning

Deep-dive reference for scaling systems and doing the napkin math.

## Vertical vs Horizontal

- **Vertical** (bigger box): simplest, no distribution complexity, no code changes. Do this first. Ceiling: hardware limits, single point of failure.
- **Horizontal** (more boxes): needed when vertical maxes out OR you need HA/redundancy. Requires statelessness, load balancing, distributed data.

## Load Balancing

- **L4 (transport/TCP)**: fast, connection-level, no payload inspection. Cheaper, less intelligent.
- **L7 (application/HTTP)**: content-based routing (path/header), SSL termination, sticky sessions. Smarter, slightly slower.

**Algorithms:**
- **Round-robin**: simple, assumes uniform requests.
- **Least-connections**: better when request work is uneven.
- **Consistent hashing**: route same key to same node — for stateful/cache affinity, minimizes reshuffle on node changes.
- **Weighted**: heterogeneous fleet (bigger boxes get more).

## Auto-Scaling

- **CPU/memory-based**: reactive, lags behind spikes.
- **Queue-depth-based**: scale workers on backlog — more predictive for async work.
- **Schedule-based**: known patterns (business hours, game launch). Pre-scale.

Combine: schedule for known peaks + reactive for surprises.

## Stateless Services

Push state to external stores (Redis, DB). Stateless instances scale horizontally trivially and are disposable. **Stateful services are much harder to scale** — need sticky sessions or data partitioning.

## Database Scaling

- **Read replicas**: read-heavy workloads. Watch replication lag.
- **Sharding**: write-heavy, dataset exceeds one node.
- **CQRS**: separate read model (denormalized, optimized) from write model.

## Back-of-Envelope Framework

1. **DAU → peak QPS**: average QPS = DAU × requests-per-user / 86,400. Peak = **2–5× average**.
2. **Storage/year**: writes/day × payload × 365 (× replication factor).
3. **Bandwidth**: QPS × payload size.
4. **Memory for cache**: hot dataset size (80/20: cache the hot 20%).

## Numbers

- **1M DAU** ≈ 100–500 QPS average ≈ **1000–2500 peak QPS**.
- **1 server**: ~1K–10K QPS depending on work per request.
- Cache can cut DB load **10–100×**.
- CDN offloads static origin traffic **60–90%**.

## Capacity Planning

1. **Measure** current usage (don't guess).
2. **Project growth** (~2×/year typical).
3. **Plan for 3× current peak** headroom.

## Caching & CDN as Scaling

- **80/20 rule**: 20% of data serves 80% of requests — cache it, get huge relief.
- **CDN**: move all static assets off origin; edge-cache dynamic with short TTL.

## Anti-Patterns

- **Premature optimization**: scaling before measuring/needing it.
- **Scaling without measuring**: adding boxes when the bottleneck is one slow query.
- **Monolithic DB as bottleneck**: app tier scales horizontally but everyone hammers one primary.
- Stateful app servers blocking horizontal scale.
