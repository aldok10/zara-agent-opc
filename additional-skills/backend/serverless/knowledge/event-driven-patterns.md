# Event-Driven Patterns

## Fan-Out

Distribute a single event to multiple consumers for parallel processing.

```
Event Source --> SNS Topic --> SQS Queue A --> Lambda A
                          --> SQS Queue B --> Lambda B
                          --> SQS Queue C --> Lambda C
```

Implementation:
- SNS for fan-out to multiple SQS queues (each consumer gets its own queue)
- EventBridge for content-based routing with rules
- SQS as buffer between producer and consumer (absorbs spikes)

Best practices:
- Each consumer has its own queue (independent retry/DLQ per consumer)
- Set visibility timeout to 6x Lambda timeout
- Use message deduplication for exactly-once processing where needed

## Choreography

Services react to events without a central coordinator. Each service publishes events after completing its work.

```
Order Placed (event)
  --> Payment Service (charges card, emits PaymentProcessed)
      --> Inventory Service (reserves stock, emits StockReserved)
          --> Shipping Service (creates shipment, emits ShipmentCreated)
```

Advantages: loose coupling, independent deployments, no single point of failure
Disadvantages: hard to visualize full flow, distributed debugging, eventual consistency

When to use:
- Simple linear flows (3-4 steps)
- Services owned by different teams
- Steps are independently valuable

## Saga Pattern

Coordinate multi-step transactions across services with compensating actions on failure.

### Choreography-based Saga
```
Step 1: Reserve Inventory --> success --> Step 2: Charge Payment
                                         --> failure --> Compensate: Release Inventory
Step 2: Charge Payment --> success --> Step 3: Create Shipment
                                      --> failure --> Compensate: Refund Payment
                                                     Compensate: Release Inventory
```

### Orchestrator-based Saga
```python
class OrderSaga:
    steps = [
        SagaStep(
            action=reserve_inventory,
            compensation=release_inventory,
        ),
        SagaStep(
            action=charge_payment,
            compensation=refund_payment,
        ),
        SagaStep(
            action=create_shipment,
            compensation=cancel_shipment,
        ),
    ]

    def execute(self, order):
        completed = []
        for step in self.steps:
            try:
                step.action(order)
                completed.append(step)
            except Exception:
                for s in reversed(completed):
                    s.compensation(order)
                raise
```

Use orchestrator when:
- More than 4 steps
- Complex branching logic
- Need visibility into saga state
- Compensation ordering matters

## Dead Letter Queue (DLQ)

Capture messages that fail processing after max retries.

```yaml
# SQS with DLQ
MainQueue:
  Properties:
    RedrivePolicy:
      deadLetterTargetArn: !GetAtt DLQ.Arn
      maxReceiveCount: 3

DLQ:
  Properties:
    MessageRetentionPeriod: 1209600  # 14 days
```

DLQ processing strategies:
1. **Alert and manual review**: alarm on DLQ depth > 0
2. **Automated retry**: scheduled Lambda replays messages after fix deployed
3. **Parking lot**: store failed events in S3 for later bulk reprocessing

## Backpressure

Prevent downstream overwhelm when event volume spikes:

```
High-volume Source --> SQS (buffer) --> Lambda (reserved concurrency = 10)
                                        --> Downstream API (can handle 10 concurrent)
```

Mechanisms:
- SQS buffering with `MaximumBatchingWindowInSeconds`
- Reserved concurrency caps parallel executions
- EventBridge API Destination with rate limiting
- Step Functions with `Map` state concurrency limit

## Event Schema and Versioning

```json
{
  "specversion": "1.0",
  "type": "order.placed",
  "source": "orders-service",
  "id": "evt_abc123",
  "time": "2026-01-15T10:30:00Z",
  "datacontenttype": "application/json",
  "data": {
    "order_id": "ord_456",
    "customer_id": "cust_789",
    "total_cents": 4999
  }
}
```

Versioning strategies:
- Additive changes only (add fields, never remove or rename)
- Schema registry (EventBridge Schema Registry, Confluent)
- Consumer must ignore unknown fields (forward compatibility)

## Idempotency

Events may be delivered more than once. Design for it:

```python
from aws_lambda_powertools.utilities.idempotency import (
    idempotent,
    DynamoDBPersistenceLayer,
)

persistence = DynamoDBPersistenceLayer(table_name="IdempotencyTable")

@idempotent(persistence_store=persistence)
def process_payment(event):
    # Only executes once per event ID
    # Subsequent calls return cached result
    pass
```

Idempotency keys: use event ID, message ID, or a business-meaningful key (order_id + action).
