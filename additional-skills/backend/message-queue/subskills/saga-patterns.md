---
type: subskill
title: "Saga Patterns"
---

# Saga Patterns

Distributed transactions without 2PC. Coordinate multi-service operations through sequences of local transactions with compensation on failure. Two approaches: choreography (event-driven) and orchestration (central coordinator).

## Choreography vs Orchestration

| Aspect | Choreography | Orchestration |
|--------|-------------|---------------|
| Coordination | Implicit via events | Explicit via coordinator |
| Coupling | Loose (services react to events) | Medium (orchestrator knows flow) |
| Visibility | Hard to trace full saga flow | Single place shows full workflow |
| Complexity | Grows with participants (N^2 potential) | Linear (add step to orchestrator) |
| Failure handling | Each service compensates locally | Orchestrator drives compensation |
| Best for | Simple flows (2-3 steps) | Complex flows (4+ steps, branching) |

## Choreography Pattern

### Flow (Order Example)
```
OrderService publishes: OrderCreated
  -> PaymentService listens, charges card
     publishes: PaymentCompleted | PaymentFailed
       -> InventoryService listens, reserves stock
          publishes: StockReserved | StockFailed
            -> ShippingService listens, creates shipment
               publishes: ShipmentCreated
                 -> OrderService listens, marks OrderCompleted
```

### Compensation Flow
```
StockFailed event published:
  -> PaymentService listens: refunds payment, publishes PaymentRefunded
  -> OrderService listens: marks OrderFailed, notifies customer
```

### Rules
1. Each service publishes outcome events (success + failure variants)
2. Each service implements its own compensation logic
3. Events carry enough context for compensation (original amount, item IDs)
4. Correlation ID links all events in same saga instance
5. No service knows the full workflow -- only its own step

## Orchestration Pattern

### Architecture
```
[Orchestrator] -> Command -> [Service A] -> Reply
[Orchestrator] -> Command -> [Service B] -> Reply
[Orchestrator] -> Compensate -> [Service A] (on B failure)
```

### Saga Definition (Pseudocode)
```go
type OrderSaga struct {
    Steps []SagaStep
}

var orderSaga = OrderSaga{
    Steps: []SagaStep{
        {
            Action:     "payment.charge",
            Compensate: "payment.refund",
        },
        {
            Action:     "inventory.reserve",
            Compensate: "inventory.release",
        },
        {
            Action:     "shipping.create",
            Compensate: "shipping.cancel",
        },
    },
}
```

### Orchestrator State Machine
```
STARTED -> PAYMENT_PENDING -> PAYMENT_COMPLETED
  -> STOCK_PENDING -> STOCK_RESERVED
    -> SHIPPING_PENDING -> SHIPPING_CREATED -> COMPLETED

Failure at any step:
  -> COMPENSATING -> (reverse completed steps) -> FAILED
```

### Orchestrator Responsibilities
1. Execute steps in order (or parallel where independent)
2. Track saga instance state (persistent, survives crashes)
3. On failure: execute compensation in reverse order
4. Handle timeout: treat as failure after deadline
5. Idempotent step execution (retry safe)

## Compensation Design

### Rules
- Compensation = semantic undo (not necessarily DB rollback)
- Every forward action MUST have a defined compensation
- Compensations must be idempotent (may execute multiple times on retry)
- Some actions are non-compensatable (email sent) -- use "pivot transaction" design
- Compensation order: reverse of execution order

### Pivot Transaction
- The point of no return in a saga
- Before pivot: all steps compensatable
- After pivot: all steps must succeed (or are acceptable as-is)
- Design: put non-compensatable actions last (email notification, third-party API)

### Example Compensations
| Action | Compensation |
|--------|-------------|
| Charge payment | Refund payment |
| Reserve inventory | Release inventory |
| Create shipment | Cancel shipment |
| Send email | No compensation (pivot) |
| Debit account | Credit account |

## Timeout and Failure Handling

### Timeout Strategy
- Each step has a deadline (e.g., payment: 30s, inventory: 10s)
- Overall saga has a deadline (e.g., 5 minutes for entire order flow)
- Timeout = treat as failure, trigger compensation
- Distinguish: timeout vs explicit failure vs network error

### Failure Modes
| Failure | Handling |
|---------|----------|
| Step returns error | Compensate completed steps |
| Step times out | Retry once, then compensate |
| Orchestrator crashes | Recover from persisted state, resume |
| Compensation fails | Retry with exponential backoff, alert if stuck |
| Participant unavailable | Queue command, retry with deadline |

### Dead Saga Detection
- Monitor saga instances older than max expected duration
- Alert on sagas stuck in COMPENSATING state
- Manual intervention queue for unresolvable sagas

## Temporal (Modern Orchestration)

- Durable execution engine: workflow survives process crashes, deploys, restarts
- Automatic retry with configurable policies
- Built-in compensation via `defer` pattern in workflow code
- Saga timeout, heartbeat, and cancellation handled by platform
- Activity workers: execute individual steps, report back to Temporal server
- Visibility: query workflow state, search by attributes, full execution history

```go
// Temporal workflow example
func OrderWorkflow(ctx workflow.Context, order Order) error {
    // Charge payment
    var paymentID string
    err := workflow.ExecuteActivity(ctx, ChargePayment, order).Get(ctx, &paymentID)
    if err != nil {
        return err
    }
    defer func() {
        if err != nil {
            // Compensation: refund on any subsequent failure
            workflow.ExecuteActivity(ctx, RefundPayment, paymentID)
        }
    }()

    // Reserve inventory
    err = workflow.ExecuteActivity(ctx, ReserveStock, order.Items).Get(ctx, nil)
    if err != nil {
        return err // triggers refund via defer
    }

    return nil
}
```

## Monitoring

- Saga instance count by state (active, completed, compensating, failed)
- Step duration percentiles (detect slow services)
- Compensation rate (high = downstream reliability issue)
- Stuck sagas (in-progress beyond deadline)
- Correlation ID enables end-to-end trace across services

## Verification Checklist

- [ ] Every action step has defined compensation
- [ ] Saga orchestrator state persisted (survives crash + restart)
- [ ] Compensations are idempotent (tested with double-execution)
- [ ] Timeout configured per step AND overall saga
- [ ] Dead saga detection with alerting
- [ ] Correlation ID propagated through all saga events/commands
- [ ] Pivot transaction identified and placed last in sequence
- [ ] Manual intervention path for stuck compensations
