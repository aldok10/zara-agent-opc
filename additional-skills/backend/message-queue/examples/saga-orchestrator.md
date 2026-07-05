# Saga Orchestrator Pattern

Order fulfillment saga with compensation. Central orchestrator manages step execution, tracks state, and triggers rollback on failure.

## Flow Diagram

```
                    OrderSaga Orchestrator
                           |
          +----------------+----------------+
          |                |                |
    [1. Payment]     [2. Inventory]    [3. Shipping]
     Charge $99       Reserve 2x        Create Label
          |                |                |
    Compensate:       Compensate:       Compensate:
     Refund $99       Release 2x        Cancel Label
```

## Saga States

```
CREATED -> PAYMENT_PENDING -> PAYMENT_COMPLETED
  -> INVENTORY_PENDING -> INVENTORY_RESERVED
    -> SHIPPING_PENDING -> SHIPPING_CREATED -> COMPLETED

Failure at step N:
  -> COMPENSATING -> (reverse steps N-1 ... 1) -> COMPENSATION_COMPLETED -> FAILED

Compensation failure:
  -> COMPENSATION_FAILED -> (alert, manual intervention)
```

## Orchestrator State Table

```sql
CREATE TABLE saga_instances (
    saga_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    saga_type       VARCHAR(128) NOT NULL,      -- "OrderFulfillment"
    correlation_id  VARCHAR(255) NOT NULL,       -- Business reference (order_id)
    current_step    INT NOT NULL DEFAULT 0,
    status          VARCHAR(50) NOT NULL,        -- CREATED, PAYMENT_PENDING, COMPENSATING, etc.
    context         JSONB NOT NULL,              -- Saga data (order details, step results)
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deadline_at     TIMESTAMPTZ NOT NULL,        -- Overall saga timeout
    error_detail    TEXT
);

CREATE TABLE saga_step_log (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    saga_id     UUID NOT NULL REFERENCES saga_instances(saga_id),
    step_index  INT NOT NULL,
    step_name   VARCHAR(128) NOT NULL,
    action_type VARCHAR(20) NOT NULL,           -- "execute" or "compensate"
    status      VARCHAR(50) NOT NULL,           -- "pending", "completed", "failed"
    request     JSONB,
    response    JSONB,
    started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);
```

## Step Definitions

```
Step 1: ChargePayment
  Command:    payment.charge {order_id, amount, currency, idempotency_key}
  Success:    {payment_id, charged_at}
  Compensate: payment.refund {payment_id, amount, idempotency_key}
  Timeout:    30s

Step 2: ReserveInventory
  Command:    inventory.reserve {order_id, items: [{sku, qty}]}
  Success:    {reservation_id, reserved_items}
  Compensate: inventory.release {reservation_id}
  Timeout:    10s

Step 3: CreateShipment
  Command:    shipping.create {order_id, address, items}
  Success:    {shipment_id, tracking_number}
  Compensate: shipping.cancel {shipment_id}
  Timeout:    15s
```

## Execution Sequence (Happy Path)

```
1. Orchestrator creates saga instance (status: CREATED)
2. Send command: payment.charge
   - Update status: PAYMENT_PENDING
   - Log step: {step: 1, action: "execute", status: "pending"}
3. Receive reply: payment.completed {payment_id: "pay-789"}
   - Update status: PAYMENT_COMPLETED
   - Store payment_id in context
   - Log step: {step: 1, status: "completed"}
4. Send command: inventory.reserve
   - Update status: INVENTORY_PENDING
5. Receive reply: inventory.reserved {reservation_id: "res-456"}
   - Update status: INVENTORY_RESERVED
6. Send command: shipping.create
   - Update status: SHIPPING_PENDING
7. Receive reply: shipping.created {shipment_id: "ship-123"}
   - Update status: COMPLETED
   - Publish: OrderFulfilled event
```

## Compensation Sequence (Inventory Fails)

```
1. Steps 1-3 completed: payment charged ($99)
2. Step 4: inventory.reserve -> reply: STOCK_UNAVAILABLE
3. Orchestrator enters COMPENSATING state
4. Compensate step 1 (reverse order):
   - Send: payment.refund {payment_id: "pay-789", amount: 99.00}
   - Await: refund.completed
5. All compensations done -> status: FAILED
6. Publish: OrderFailed {reason: "stock_unavailable"}
7. Notify customer
```

## Timeout Handling

```
Per-step timeout:
  - If step does not reply within timeout: treat as failure
  - Retry once (step must be idempotent)
  - If retry fails: enter compensation

Overall saga timeout:
  - Deadline check: NOW() > deadline_at
  - Force compensation regardless of current step
  - Log: "Saga timed out at step N"

Dead saga detection (cron job):
  SELECT * FROM saga_instances
  WHERE status NOT IN ('COMPLETED', 'FAILED', 'COMPENSATION_FAILED')
  AND updated_at < NOW() - INTERVAL '1 hour';
```

## Idempotency Requirements

Each step command MUST be idempotent:
- Payment: charge with idempotency_key (provider dedup)
- Inventory: reserve with order_id (upsert reservation)
- Shipping: create with order_id (return existing if created)
- Compensations: refund with payment_id (provider dedup), release with reservation_id (idempotent)

Orchestrator itself is idempotent:
- Saga instance has unique correlation_id (order_id)
- Re-entry at same step = re-send command (step will dedup)
- Recovery after crash: load saga state, resume from current_step

## Message Flow (Kafka/NATS)

```
Topics:
  saga.order.commands     -- Orchestrator publishes commands
  saga.order.replies      -- Services publish replies (keyed by saga_id)

Command message:
  Key: saga_id
  Headers: {saga_id, step_index, command_type, correlation_id}
  Body: {order_id, amount, ...}

Reply message:
  Key: saga_id
  Headers: {saga_id, step_index, status: "success"|"failure"}
  Body: {payment_id, ...} or {error: "insufficient_funds"}
```

## Monitoring and Alerting

| Metric | Alert Threshold |
|--------|----------------|
| Active sagas count | Sudden spike > 2x normal |
| Saga duration p99 | > 2x expected (e.g., >60s for order saga) |
| Compensation rate | > 5% of sagas compensating |
| Stuck sagas | Any saga in non-terminal state > 1 hour |
| Compensation failures | Any COMPENSATION_FAILED (requires manual intervention) |

## Temporal Alternative

For production orchestration, consider Temporal/Cadence:
- Durable execution: workflow code survives crashes, deploys
- Built-in retry policies per activity
- Compensation via defer pattern in workflow code
- Visibility: query workflow state, search, full history
- Eliminates need for saga state table (Temporal manages persistence)
- Tradeoff: additional infrastructure (Temporal server + DB)
