# Saga Compensation Example: Order Fulfillment

An orchestrated saga for placing an order. Each step has a compensating action that undoes its effect on failure.

## Saga Steps

```
Step 1: Create Order        -> Compensate: Cancel Order
Step 2: Reserve Inventory   -> Compensate: Release Inventory
Step 3: Process Payment     -> Compensate: Refund Payment
Step 4: Schedule Shipping   -> Compensate: Cancel Shipment
Step 5: Send Confirmation   -> (no compensation needed - notification is fire-and-forget)
```

## Happy Path

```
1. CreateOrder(customer, items)     -> order_id=ORD-100, status=PENDING
2. ReserveInventory(order_id)       -> reservation_id=RES-200
3. ProcessPayment(order_id, amount) -> payment_id=PAY-300
4. ScheduleShipping(order_id)       -> shipment_id=SHP-400
5. SendConfirmation(order_id)       -> email sent
Result: Order CONFIRMED
```

## Failure at Step 3 (Payment Failed)

```
1. CreateOrder(customer, items)     -> order_id=ORD-100   OK
2. ReserveInventory(order_id)       -> reservation_id=RES-200   OK
3. ProcessPayment(order_id, amount) -> FAILED (insufficient funds)

--- COMPENSATION (reverse order) ---
2c. ReleaseInventory(reservation_id=RES-200)  -> items returned to stock
1c. CancelOrder(order_id=ORD-100)             -> status=CANCELLED

Result: Order CANCELLED, all state rolled back
```

## Orchestrator Implementation (Go)

```go
type OrderSaga struct {
    orders    orders.Service
    inventory inventory.Service
    payments  payments.Service
    shipping  shipping.Service
    notify    notifications.Service
}

type SagaState struct {
    OrderID       string
    ReservationID string
    PaymentID     string
    ShipmentID    string
    CompletedSteps []string
}

func (s *OrderSaga) Execute(ctx context.Context, req PlaceOrderRequest) error {
    state := &SagaState{}
    var err error

    // Step 1: Create Order
    state.OrderID, err = s.orders.Create(ctx, req)
    if err != nil {
        return err // Nothing to compensate
    }
    state.CompletedSteps = append(state.CompletedSteps, "create_order")

    // Step 2: Reserve Inventory
    state.ReservationID, err = s.inventory.Reserve(ctx, state.OrderID, req.Items)
    if err != nil {
        s.compensate(ctx, state)
        return fmt.Errorf("reserve inventory: %w", err)
    }
    state.CompletedSteps = append(state.CompletedSteps, "reserve_inventory")

    // Step 3: Process Payment
    state.PaymentID, err = s.payments.Process(ctx, state.OrderID, req.Total)
    if err != nil {
        s.compensate(ctx, state)
        return fmt.Errorf("process payment: %w", err)
    }
    state.CompletedSteps = append(state.CompletedSteps, "process_payment")

    // Step 4: Schedule Shipping
    state.ShipmentID, err = s.shipping.Schedule(ctx, state.OrderID)
    if err != nil {
        s.compensate(ctx, state)
        return fmt.Errorf("schedule shipping: %w", err)
    }
    state.CompletedSteps = append(state.CompletedSteps, "schedule_shipping")

    // Step 5: Send Confirmation (fire-and-forget, no compensation needed)
    _ = s.notify.SendOrderConfirmation(ctx, state.OrderID)

    return nil
}

func (s *OrderSaga) compensate(ctx context.Context, state *SagaState) {
    // Compensate in reverse order. Each compensation is idempotent.
    for i := len(state.CompletedSteps) - 1; i >= 0; i-- {
        switch state.CompletedSteps[i] {
        case "schedule_shipping":
            _ = s.shipping.Cancel(ctx, state.ShipmentID)
        case "process_payment":
            _ = s.payments.Refund(ctx, state.PaymentID)
        case "reserve_inventory":
            _ = s.inventory.Release(ctx, state.ReservationID)
        case "create_order":
            _ = s.orders.Cancel(ctx, state.OrderID)
        }
    }
}
```

## Compensation Rules

1. **Idempotent**: calling compensation twice has same effect as once.
2. **Never fails permanently**: retry with backoff. Dead letter queue for manual intervention.
3. **Semantic undo**: refund is not "delete payment record". It's a new business action.
4. **Logged**: every compensation is recorded for audit.
5. **Timeout-aware**: if compensation doesn't complete within SLA, alert ops.

## Failure in Compensation

If a compensation step fails:

```
Strategy:
1. Retry with exponential backoff (3 attempts)
2. If still failing: log to dead letter queue
3. Alert operations team
4. Saga state marked as COMPENSATION_FAILED (requires manual intervention)
5. Never leave saga in unknown state -- always persist current state
```

## With Temporal (Durable Execution)

```go
func OrderWorkflow(ctx workflow.Context, req PlaceOrderRequest) error {
    var orderID, reservationID, paymentID string

    // Temporal handles retries, timeouts, and persistence automatically
    err := workflow.ExecuteActivity(ctx, CreateOrder, req).Get(ctx, &orderID)
    if err != nil {
        return err
    }
    defer func() {
        if err != nil {
            _ = workflow.ExecuteActivity(ctx, CancelOrder, orderID).Get(ctx, nil)
        }
    }()

    err = workflow.ExecuteActivity(ctx, ReserveInventory, orderID, req.Items).Get(ctx, &reservationID)
    if err != nil {
        return err
    }
    defer func() {
        if err != nil {
            _ = workflow.ExecuteActivity(ctx, ReleaseInventory, reservationID).Get(ctx, nil)
        }
    }()

    err = workflow.ExecuteActivity(ctx, ProcessPayment, orderID, req.Total).Get(ctx, &paymentID)
    if err != nil {
        return err
    }

    // ... shipping, notification
    return nil
}
```

Temporal advantages: automatic state persistence, built-in retries, visibility UI, survives process crashes.
