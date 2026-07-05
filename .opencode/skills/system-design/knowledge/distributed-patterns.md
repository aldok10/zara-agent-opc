# Distributed Patterns

Core patterns for building correct, available, and partition-tolerant distributed systems.

## CAP Theorem

In the presence of a network partition, a distributed system must choose between consistency and availability. You cannot have both simultaneously during a partition.

### Practical implications

- **CP systems** (consistent + partition-tolerant): reject requests rather than return stale data. Examples: ZooKeeper, etcd, CockroachDB in serializable mode.
- **AP systems** (available + partition-tolerant): serve requests with potentially stale data. Examples: Cassandra, DynamoDB (eventually consistent reads), DNS.
- **CA** is not possible in distributed systems (no partitions = single node, which is not distributed).

### PACELC extension

When there is no Partition: choose between Latency and Consistency.

- PA/EL: when partitioned choose availability, else choose latency (Cassandra, DynamoDB).
- PC/EC: when partitioned choose consistency, else still choose consistency (PostgreSQL, traditional RDBMS).
- PA/EC: available during partitions but consistent otherwise (uncommon).

In practice: choose consistency per-operation, not per-system. Many databases offer tunable consistency.

## Consistency Models

| Model | Guarantee | Example |
|-------|-----------|---------|
| **Linearizable** | Reads reflect latest write globally | Single-node DB, etcd |
| **Sequential** | All operations appear in some total order | ZooKeeper |
| **Causal** | Related operations appear in order; unrelated may be reordered | CRDT systems |
| **Eventual** | All replicas converge given enough time | DynamoDB, Cassandra |
| **Read-your-writes** | You see your own writes immediately | Session consistency |
| **Monotonic reads** | Once you read a value, you never see an older one | Client-side guarantee |

### Choosing a model

- Financial transactions, inventory: linearizable or serializable.
- Social feeds, comments: eventual or causal (acceptable lag).
- User sessions: read-your-writes (route to same replica or use session tokens).
- Analytics: eventual (batch processing tolerates stale data).

## Consensus: Raft

Practical consensus algorithm. Ensures all nodes agree on the same log of operations.

### How it works

1. **Leader election**: nodes start as followers. If no heartbeat from leader, a follower becomes candidate and requests votes. Majority wins.
2. **Log replication**: leader accepts writes, appends to log, replicates to followers. Once a majority acknowledges, entry is committed.
3. **Safety**: committed entries are never lost. Leader always has all committed entries.

### Key properties

- Requires 2f+1 nodes to tolerate f failures (3 nodes tolerates 1, 5 tolerates 2).
- Leader handles all writes -- single point of coordination (not bottleneck at small scale).
- Followers serve read requests (stale reads) or redirect to leader (consistent reads).

### Practical systems using Raft

- etcd (Kubernetes backing store)
- CockroachDB (per-range Raft groups)
- HashiCorp Consul, Vault, Nomad
- TiKV (storage layer for TiDB)

### Paxos (theoretical)

Older, more general, harder to implement. Multi-Paxos for repeated consensus. Raft was designed to be understandable -- same guarantees, clearer implementation.

## Data Patterns

### Sharding (partitioning)

Split data across nodes to distribute load.

| Strategy | Pros | Cons |
|----------|------|------|
| Hash-based | Even distribution | Range queries require scatter-gather |
| Range-based | Efficient range scans | Hot spots on popular ranges |
| Directory-based | Flexible mapping | Lookup service = single point of failure |

Resharding (adding/removing nodes): consistent hashing minimizes data movement. Only K/N keys relocate (K = total keys, N = total nodes).

### Replication

| Topology | Write path | Read path | Tradeoff |
|----------|-----------|-----------|----------|
| Leader-follower | Single leader | Leader or followers | Simple, replication lag |
| Multi-leader | Any leader | Any node | Write conflicts, resolution needed |
| Leaderless (quorum) | W nodes | R nodes | W+R>N for consistency |

Quorum writes: write to W out of N nodes. Quorum reads: read from R out of N nodes. If W+R > N, at least one node has the latest value.

### CRDTs (Conflict-free Replicated Data Types)

Data structures that merge automatically without coordination:

| Type | Example | Merge rule |
|------|---------|------------|
| G-Counter | Page view count | Max per node |
| PN-Counter | Like/unlike | Two G-Counters (positive + negative) |
| LWW-Register | Last-write-wins value | Timestamp comparison |
| OR-Set | Collaborative set | Add-wins semantics |
| RGA | Collaborative text | Position-based ordering |

Use when: availability matters more than immediate consistency, conflict resolution is deterministic. Examples: collaborative editing, distributed caches, shopping carts.

## Communication Patterns

### Synchronous (RPC)

Direct request-response. Client waits for server.

- **gRPC**: protobuf, HTTP/2, streaming, code generation. Best for internal service-to-service.
- **REST**: HTTP, JSON, ubiquitous. Best for external APIs, browser clients.
- **GraphQL**: client-specified queries. Best for varied client data needs.

Risks: tight coupling, cascading failures, latency amplification (N hops = N * latency).

### Asynchronous (Events)

Fire-and-forget. Decoupled producers and consumers.

- **Message queues** (point-to-point): SQS, RabbitMQ. One consumer processes each message.
- **Event streams** (pub/sub): Kafka, Kinesis, Pulsar. Multiple consumers, replay capability.
- **Event bus**: SNS + SQS fan-out. Broadcast to multiple queues.

Benefits: temporal decoupling, load leveling, fault isolation.
Costs: eventual consistency, debugging difficulty, message ordering challenges.

### Hybrid

Most systems use both:
- Synchronous for queries (need immediate response).
- Asynchronous for commands (fire-and-forget, process later).
- Webhooks for notifications (async callback to external systems).

## CQRS (Command Query Responsibility Segregation)

Separate the write model (commands) from the read model (queries).

### When to use

- Read and write patterns differ significantly (different schemas, different scale).
- Read-heavy systems where denormalized views improve performance.
- Complex domains where the write model is normalized but reads need joins.

### Implementation

```
Write side: Command -> Validate -> Store in write DB -> Publish event
Read side:  Event -> Update materialized view -> Serve queries
```

The read model is eventually consistent with the write model (latency = event propagation time).

### Event Sourcing (often paired with CQRS)

Store events (facts) instead of current state:

```
OrderCreated { id: 1, items: [...], total: 50.00 }
PaymentReceived { id: 1, amount: 50.00 }
OrderShipped { id: 1, tracking: "ABC123" }
```

Current state = replay all events. Benefits:
- Complete audit trail.
- Temporal queries (what was state at time T?).
- Bug fixes: fix projection logic, replay events, get corrected state.
- New read models: replay from beginning with new projection.

Costs:
- Event schema evolution (versioning events is hard).
- Eventual consistency (projections lag behind writes).
- Storage growth (snapshots needed for long-lived aggregates).

## Saga Pattern

Manage distributed transactions across services without 2PC (two-phase commit).

### Orchestration

Central coordinator directs the saga:

```
Saga Orchestrator:
  1. CreateOrder -> Order Service
  2. ReserveInventory -> Inventory Service
  3. ProcessPayment -> Payment Service
  4. ConfirmOrder -> Order Service

On failure at step 3:
  Compensate: ReleaseInventory -> Inventory Service
  Compensate: CancelOrder -> Order Service
```

Pros: clear flow, easy to reason about.
Cons: orchestrator is a single point of coordination, coupling.

### Choreography

Each service reacts to events and emits events:

```
Order Service: OrderCreated ->
Inventory Service: InventoryReserved ->
Payment Service: PaymentProcessed ->
Order Service: OrderConfirmed

Payment Service: PaymentFailed ->
Inventory Service: InventoryReleased ->
Order Service: OrderCancelled
```

Pros: no central coordinator, services are autonomous.
Cons: hard to understand full flow, distributed debugging, cyclic dependencies.

### Choosing

- Simple flows (3-4 steps): choreography.
- Complex flows (5+ steps, conditional branching): orchestration.
- Mixed: orchestration for critical paths, choreography for notifications/side effects.

## Circuit Breaker

Prevent cascading failures by failing fast when a dependency is down.

### States

```
CLOSED (normal)
  -> error threshold exceeded -> OPEN

OPEN (fast-fail)
  -> timeout expires -> HALF-OPEN

HALF-OPEN (testing)
  -> success -> CLOSED
  -> failure -> OPEN
```

### Configuration

| Parameter | Purpose | Example |
|-----------|---------|---------|
| Failure threshold | Errors before opening | 5 failures in 60s |
| Timeout | How long to stay open | 30 seconds |
| Success threshold | Successes to close from half-open | 3 consecutive |

### Fallback strategies

- Return cached response (stale but available).
- Return degraded response (partial data).
- Return default/empty (graceful blank state).
- Queue request for retry later.

## Retry Pattern

Handle transient failures by retrying operations.

### Strategies

| Strategy | Behavior | When |
|----------|----------|------|
| Fixed delay | Wait N seconds between retries | Simple cases |
| Exponential backoff | 1s, 2s, 4s, 8s... | API calls, network |
| Exponential + jitter | Backoff + random offset | High concurrency (avoid thundering herd) |
| Immediate retry | No delay, retry once | In-memory operations |

### Jitter formula

```
delay = base * 2^attempt + random(0, base * 2^attempt)
```

Full jitter prevents synchronized retries from overwhelming a recovering service.

### When NOT to retry

- Non-transient errors (400 Bad Request, 403 Forbidden).
- Non-idempotent operations without idempotency keys.
- Already at timeout budget.

## Bulkhead

Isolate failures by partitioning resources.

### Thread pool bulkhead

Separate thread pools per dependency. If Payment Service is slow, its thread pool fills up but doesn't affect Inventory Service calls.

### Connection pool bulkhead

Separate connection pools per downstream. Database connections for read-heavy analytics don't starve transaction connections.

### Semaphore bulkhead

Limit concurrent calls to a dependency:

```
Payment Service: max 50 concurrent requests
Inventory Service: max 100 concurrent requests
Email Service: max 20 concurrent requests
```

## Rate Limiting

Control request rate to protect services from overload.

### Algorithms

| Algorithm | Behavior | Memory | Burst handling |
|-----------|----------|--------|----------------|
| Token bucket | Tokens refill at fixed rate, each request costs a token | O(1) | Allows burst up to bucket size |
| Leaky bucket | Requests queue, drain at fixed rate | O(N) | Smooths bursts (queuing) |
| Fixed window | Counter per time window | O(1) | Boundary spike (2x at window edge) |
| Sliding window log | Track each request timestamp | O(N) | Accurate but memory-heavy |
| Sliding window counter | Weighted average of current + previous window | O(1) | Good accuracy, low memory |

### Distributed rate limiting

Single-node counters don't work when requests hit multiple instances.

- **Redis-based**: INCR + EXPIRE. Atomic operations. Slight over-counting under race.
- **Token bucket in Redis**: Lua script for atomic check-and-decrement.
- **Approximate (cell rate)**: each node gets a portion of the global limit (N/nodes). Simple but wastes capacity.

### Response headers (standard practice)

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1710500000
Retry-After: 30
```

## Idempotency Patterns

Ensure that performing an operation multiple times produces the same result as performing it once.

### Idempotency keys

Client generates a unique key per logical operation:

```
POST /payments
Idempotency-Key: pay_abc123_attempt_1
```

Server: check if key exists in store.
- If yes: return stored response (don't re-execute).
- If no: execute, store response keyed by idempotency key.

### Natural idempotency

Some operations are naturally idempotent:
- `PUT /users/123 { name: "Alice" }` -- same result regardless of repetition.
- `DELETE /items/456` -- deleting twice = same end state.
- Setting a value (vs incrementing).

### Making non-idempotent operations safe

| Operation | Problem | Solution |
|-----------|---------|----------|
| `POST /orders` | Duplicate order on retry | Idempotency key |
| Increment counter | Double-counted on retry | Conditional update with version |
| Send email | Duplicate email | Deduplication table (message ID) |
| Transfer money | Double debit | Transaction ID + idempotency check |

### Implementation

```
1. Client sends request with idempotency key.
2. Server checks key in store (Redis/DB).
3. If found: return cached response.
4. If not found: acquire lock on key.
5. Execute operation.
6. Store response with key (TTL: 24-72 hours).
7. Release lock.
8. Return response.
```

Lock prevents race conditions when parallel retries arrive simultaneously.
