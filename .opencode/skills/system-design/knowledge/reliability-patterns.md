---
type: fact
title: "Reliability Engineering - SLOs, Error Budgets, Fault Tolerance"
---

# Reliability Patterns

Reliability is not uptime. It's the probability that a system performs its intended function under stated conditions for a specified period. Design for failure  --  it's when, not if.

## SLIs, SLOs, SLAs

### Service Level Indicators (SLIs)

Quantitative measurements of service behavior from the user's perspective.

| SLI type | Measurement | Good example |
|----------|-------------|--------------|
| Availability | Successful requests / total requests | 99.95% of HTTP requests return non-5xx |
| Latency | Request duration at percentile | p99 < 300ms for /api/search |
| Throughput | Successful operations per second | Process 10K events/sec sustained |
| Correctness | Correct responses / total responses | 99.99% of calculations match expected |
| Freshness | Data age at read time | Search index < 60s behind source |

### Service Level Objectives (SLOs)

Target value for an SLI over a time window. Internal commitment.

**Setting SLOs**:
- Start with current baseline (measure first, target second).
- Tighten gradually (99% → 99.5% → 99.9%). Never start at 99.99% unless you can afford the engineering cost.
- Different SLOs for different user segments (free vs paid vs enterprise).
- Rolling windows (30 days) are more actionable than calendar months.

**Real-world targets**:

| Availability | Allowed downtime/month | Engineering cost |
|--------------|----------------------|------------------|
| 99% | 7.3 hours | Single instance, basic monitoring |
| 99.9% | 43.8 minutes | Redundancy, health checks, auto-restart |
| 99.95% | 21.9 minutes | Multi-AZ, failover, load balancing |
| 99.99% | 4.3 minutes | Multi-region, active-active, chaos testing |
| 99.999% | 26 seconds | Extreme redundancy, custom hardware, massive investment |

### Service Level Agreements (SLAs)

External contract with financial penalties. Always set SLA weaker than SLO (buffer for engineering work without triggering penalties).

**Pattern**: SLO = 99.95%, SLA = 99.9%. The 0.05% gap is your margin for maintenance, experimentation, and incident response.

## Error Budget Policy

### Concept

Error budget = 1 - SLO. If SLO is 99.9%, error budget is 0.1% (43.8 minutes/month).

Spend the budget on velocity: deploys, experiments, migrations. When budget is exhausted, freeze changes and prioritize reliability.

### Policy components

1. **Budget calculation**: automated, visible dashboard. No arguments about math.
2. **Escalation thresholds**: 50% burned → alert. 75% → slow deploy cadence. 100% → feature freeze.
3. **Exemptions**: planned maintenance, dependency failures (upstream provider outage).
4. **Reset**: monthly or rolling window. Rolling is fairer (one bad day doesn't ruin the whole month).
5. **Accountability**: product and engineering jointly own the budget. Not just SRE's problem.

### What happens when budget is exhausted

- No new feature deployments until budget recovers.
- All engineering effort goes to reliability improvements.
- Postmortem required for any incident that consumed >25% of budget.
- Exception process requires VP-level approval (makes the cost visible).

## Fault Tolerance

### Redundancy

| Type | Mechanism | Cost |
|------|-----------|------|
| Active-active | All instances serve traffic simultaneously | N instances running always |
| Active-passive | Standby takes over on primary failure | Standby cost + failover time |
| N+1 | One extra beyond minimum required | Handles single failure gracefully |
| N+2 | Two extras | Handles failure during maintenance |

**Rule of thumb**: production workloads should tolerate losing any single component (server, AZ, even region for critical services) without user-visible impact.

### Failover patterns

- **DNS failover**: Route53 health checks, failover routing. TTL limits speed (60s minimum practical).
- **Load balancer failover**: health checks every 5-10s, remove unhealthy targets. Fastest automated failover.
- **Database failover**: promote replica to primary. PostgreSQL: pg_auto_failover or Patroni. MySQL: orchestrator. Cloud: RDS multi-AZ (30-60s failover).
- **Application failover**: retry with different backend. Circuit breaker prevents cascading.

### Graceful degradation

When a dependency fails, serve reduced functionality instead of complete failure.

| Dependency down | Degraded behavior | User impact |
|-----------------|-------------------|-------------|
| Recommendation engine | Show popular items | Less personalized |
| Payment processor | Queue order, process later | Delayed confirmation |
| Search index | Fallback to database LIKE query | Slower, less relevant |
| CDN | Serve from origin | Higher latency |
| Feature flag service | Use cached/default values | Stale toggles |

## Disaster Recovery

### RPO and RTO

- **RPO** (Recovery Point Objective): maximum acceptable data loss measured in time. RPO=0 means no data loss (synchronous replication).
- **RTO** (Recovery Time Objective): maximum acceptable downtime. RTO=5min means service must be restored within 5 minutes.

### Strategies by cost

| Strategy | RPO | RTO | Relative cost |
|----------|-----|-----|---------------|
| Backup & restore | Hours | Hours-days | $ |
| Pilot light | Minutes | 10-30 min | $$ |
| Warm standby | Seconds-minutes | Minutes | $$$ |
| Active-active multi-region | Near-zero | Seconds | $$$$ |

### Active-active multi-region

Both regions serve traffic simultaneously. Data replicated bidirectionally.

**Challenges**:
- Conflict resolution: last-writer-wins, vector clocks, CRDTs.
- Global consistency: accept eventual consistency or pay latency penalty for synchronous cross-region writes.
- Data sovereignty: some data cannot leave certain regions (GDPR, data residency laws).
- Testing: regularly test full region failover. Untested DR plans are fiction.

**Who needs it**: payment processing, real-time trading, global consumer apps (>100M users), critical infrastructure.

## Chaos Engineering

### Principles (from Netflix)

1. Define "steady state" as measurable output (request success rate, latency percentiles).
2. Hypothesize that steady state continues during injection.
3. Introduce real-world events: server crashes, network partitions, clock skew, disk full.
4. Observe difference between control and experimental groups.
5. Minimize blast radius (start small, expand).

### Tools

- **Chaos Monkey**: random instance termination in production.
- **Litmus**: Kubernetes-native chaos experiments (pod kill, network loss, CPU stress).
- **Gremlin**: SaaS platform with safety controls and rollback.
- **Toxiproxy**: inject network conditions (latency, packet loss) between services.
- **AWS Fault Injection Simulator**: managed service for AWS resource disruption.

### Progressive approach

1. Start in staging with known failure modes.
2. Move to production during business hours with manual abort.
3. Automate recurring experiments (weekly chaos days).
4. Game days: multi-team, multi-failure scenarios with incident response practice.

## Bulkhead Pattern

### Concept

Isolate components so failure in one doesn't cascade to others. Named after ship compartments  --  flooding one doesn't sink the ship.

### Implementation

- **Thread pool isolation**: each dependency gets its own thread pool. If dependency A is slow, its threads fill up but don't block calls to dependency B.
- **Connection pool isolation**: separate database connection pools per service or per query type.
- **Process isolation**: critical paths in separate processes/containers from non-critical.
- **Queue isolation**: separate queues for different priority levels or tenant tiers.

### Sizing

Thread pool for dependency: max_concurrent_requests × p99_latency × safety_factor. Example: 50 req/s × 0.2s × 2 = 20 threads.

## Circuit Breaker

### States

1. **Closed**: requests flow normally. Track failure rate.
2. **Open**: all requests fail immediately (fast-fail). No calls to unhealthy dependency.
3. **Half-open**: after timeout, allow limited test requests. Success → close. Failure → reopen.

### Configuration

- Failure threshold: 50% failures in 10-second window → open.
- Open duration: 30-60 seconds before trying half-open.
- Half-open test count: 3-5 requests.
- Failure definition: 5xx responses, timeouts, connection refused. NOT 4xx (client errors).

### Libraries

- **resilience4j** (Java): modern, lightweight, functional API. Preferred over Hystrix (deprecated).
- **Polly** (.NET): policies for retry, circuit breaker, timeout, bulkhead.
- **gobreaker** (Go): simple, reliable implementation.
- **opossum** (Node.js): circuit breaker for JavaScript.

### Anti-patterns

- Circuit breaker per instance (should be per-dependency or per-endpoint).
- Too sensitive thresholds (opens on transient blips).
- No fallback strategy (breaking the circuit without a plan leaves users with errors).

## Retry with Backoff and Jitter

### Exponential backoff

Wait time doubles each retry: 1s, 2s, 4s, 8s... with a max cap (30-60s).

### Why jitter is critical

Without jitter, all failed requests retry simultaneously (thundering herd). Add random jitter to spread retries across the window.

**Full jitter** (recommended): `sleep = random(0, min(cap, base * 2^attempt))`
**Equal jitter**: `sleep = base * 2^attempt / 2 + random(0, base * 2^attempt / 2)`
**Decorrelated jitter**: `sleep = random(base, previous_sleep * 3)`

### Retry budget

Limit total retry traffic to 10% of normal traffic. If retries exceed budget, stop retrying (system is genuinely down, retries just add load).

### What to retry

- Network timeouts, connection refused, 503 Service Unavailable, 429 (after Retry-After).
- NOT: 400 Bad Request, 401 Unauthorized, 404 Not Found (retrying won't fix these).

## Cell-Based Architecture

### Concept

Divide infrastructure into independent cells (units of deployment). Each cell serves a subset of users/tenants. Failure in one cell doesn't affect others.

### Properties

- **Blast radius**: limited to one cell's population (typically 5-10% of users).
- **Independent scaling**: cells scale independently based on their load.
- **Independent deployment**: deploy changes to one cell first (canary cell).
- **No cross-cell communication**: cells don't call each other. Shared nothing.

### Routing

A thin global routing layer (cell router) maps users to cells. Based on: user ID hash, geographic region, tenant tier. Router itself must be the most reliable component.

### Real-world usage

AWS uses cell architecture extensively internally. Each Availability Zone operates as cells for many services. DynamoDB, S3 partitions are cell-like in design.

### When to use

- Services handling >1M users where blast radius must be limited.
- Multi-tenant platforms where noisy neighbor isolation matters.
- High-compliance environments requiring data residency.

## Blast Radius Reduction

### Strategies

1. **Feature flags with kill switches**: disable new code paths instantly without deploy.
2. **Canary deployments**: 1% → 5% → 25% → 100% traffic shift with automated rollback on SLI degradation.
3. **Traffic shifting**: weighted routing allows gradual migration.
4. **Tenant isolation**: dedicated compute/storage for high-value tenants.
5. **Timeout cascades**: set timeouts at every service boundary. No unbounded waits.
6. **Dependency circuit breakers**: fail fast when downstream is unhealthy.
7. **Queue depth limits**: reject work when queues grow beyond acceptable delay.

### Principle

Every design decision should answer: "When this fails (not if), how many users are affected and for how long?" Acceptable answers vary by service tier but should always be bounded and quantified.
