# Saga Patterns

Distributed transactions without 2PC. Each step has a compensating action. If step N fails, execute compensations for steps N-1 through 1 in reverse order.

## When to Use

- Multi-service writes that must be logically atomic
- Long-running business processes (minutes to days)
- Cross-boundary operations where rollback is needed

## Choreography vs Orchestration

### Choreography (Event-Driven)

Each service listens for events and publishes results. No central coordinator.

```
OrderService -> OrderCreated
PaymentService (listens) -> PaymentProcessed | PaymentFailed
InventoryService (listens) -> ItemsReserved | ReservationFailed
ShippingService (listens) -> ShipmentScheduled | ShipmentFailed
```

**Pros**: Simple, decoupled, no single point of failure.
**Cons**: Hard to understand flow, difficult to add steps, no single view of saga state.
**Use when**: <5 steps, simple flows, teams want full autonomy.

### Orchestration (Central Coordinator)

A saga orchestrator tells each participant what to do and handles compensation.

```
SagaOrchestrator:
  1. CreateOrder -> success
  2. ProcessPayment -> success
  3. ReserveInventory -> FAILED
  4. CompensatePayment (refund)
  5. CompensateOrder (cancel)
```

**Pros**: Clear flow, easy to reason about, single source of truth for saga state.
**Cons**: Orchestrator is coupling point, can become bottleneck.
**Use when**: >4 steps, complex flows, need visibility into saga state.

## Compensation Design

Rules for compensation actions:

1. **Semantic undo**  -  not necessarily technical undo. Refund != delete payment record.
2. **Idempotent**  -  compensation may run multiple times (network retries).
3. **Commutative**  -  order of compensations shouldn't matter when possible.
4. **Never fail permanently**  -  compensations must eventually succeed (retry with backoff).
5. **Record state**  -  log compensation execution for audit.

## Timeout Handling

Every saga step needs a timeout. Without it, sagas hang forever.

```
Step timeout strategy:
- Define max duration per step (business SLA)
- On timeout: treat as failure, trigger compensation
- Use deadline propagation (context timeout)
- Persist saga state to survive process restarts
```

## Temporal / Restate (Durable Execution)

Modern approach: durable execution frameworks handle saga complexity at infrastructure level.

### Temporal

- Workflows are code (Go, Java, TypeScript, Python)
- Automatic retries, timeouts, compensation via `defer`
- Saga state persisted transparently
- Supports long-running workflows (days/months)
- Built-in visibility (Web UI shows workflow state)

### Restate

- Durable execution engine (no separate cluster required  -  embeds or runs as single binary)
- Virtual objects with durable state
- Journal-based replay (event sourcing under the hood)
- Lower operational overhead than Temporal
- Good for simpler saga patterns

## Decision Matrix

| Factor | Choreography | Orchestration | Durable Execution |
|--------|-------------|---------------|-------------------|
| Complexity | Low (< 5 steps) | Medium | Any |
| Visibility | Poor | Good | Excellent |
| Coupling | Very low | Medium (orchestrator) | Low |
| Ops overhead | Low | Medium | High (Temporal) / Low (Restate) |
| Team maturity | Any | Medium | High |

## Anti-Patterns

- **Missing compensation**: every forward step MUST have a compensating action defined.
- **Synchronous saga**: saga steps should be async; sync chains multiply latency.
- **Shared state**: saga participants should communicate only via events/commands.
- **No timeout**: hanging sagas leak resources and leave data inconsistent.
- **Compensation that can fail permanently**: use dead letter queue + manual intervention.

## Verification

- Test each compensation path independently.
- Simulate failure at every step and verify correct rollback.
- Verify idempotency: send same event twice, observe no duplicate effect.
- Test timeout behavior: slow participant triggers compensation correctly.
- Check saga state persistence survives process restart.
