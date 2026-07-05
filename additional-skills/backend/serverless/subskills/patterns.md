# Serverless Patterns

Architecture patterns for serverless -- fan-out, saga, circuit breaker, DLQ, and idempotency.

## When to Load

- Designing distributed workflows without servers
- Handling failures gracefully in event-driven systems
- Ensuring exactly-once semantics
- Coordinating multi-step business processes

## Key Concepts

**Fan-out** -- One event triggers multiple parallel consumers. SNS to multiple SQS queues, or EventBridge to multiple targets. Each consumer processes independently.

**Saga (Orchestration)** -- Step Functions coordinate multi-step transactions. Each step has a compensating action for rollback. Prefer orchestration over choreography for visibility.

**Circuit Breaker** -- Stop calling failing downstream services. Implemented via Step Functions wait states, or a DynamoDB-backed state check. Prevents cascade failures.

**Dead Letter Queue (DLQ)** -- Captures messages that fail all retry attempts. SQS DLQ for queues, Lambda destinations for async invocations. Must be monitored and reprocessed.

**Idempotency** -- Same request processed multiple times produces same result. Essential because Lambda may retry. Use idempotency keys stored in DynamoDB with conditional writes.

## Patterns

```python
# Idempotency with Powertools
from aws_lambda_powertools.utilities.idempotency import (
    idempotent, DynamoDBPersistenceLayer, IdempotencyConfig
)

persistence = DynamoDBPersistenceLayer(table_name="IdempotencyTable")
config = IdempotencyConfig(expires_after_seconds=3600)

@idempotent(persistence_store=persistence, config=config)
def handler(event, context):
    return process_payment(event)
```

```yaml
# Step Functions saga with compensation
States:
  ReserveInventory:
    Type: Task
    Resource: !GetAtt ReserveFn.Arn
    Catch:
      - ErrorEquals: ["States.ALL"]
        Next: CancelReservation
    Next: ChargePayment

  ChargePayment:
    Type: Task
    Resource: !GetAtt ChargeFn.Arn
    Catch:
      - ErrorEquals: ["States.ALL"]
        Next: ReleaseInventory
    Next: ConfirmOrder

  ReleaseInventory:
    Type: Task
    Resource: !GetAtt ReleaseFn.Arn
    Next: CancelReservation

  CancelReservation:
    Type: Task
    Resource: !GetAtt CancelFn.Arn
    Next: FailState
```

```yaml
# Fan-out with SNS + SQS
OrderTopic:
  Type: AWS::SNS::Topic

EmailQueue:
  Type: AWS::SQS::Queue
  Properties:
    RedrivePolicy:
      deadLetterTargetArn: !GetAtt EmailDLQ.Arn
      maxReceiveCount: 3

InventoryQueue:
  Type: AWS::SQS::Queue

EmailSubscription:
  Type: AWS::SNS::Subscription
  Properties:
    Protocol: sqs
    TopicArn: !Ref OrderTopic
    Endpoint: !GetAtt EmailQueue.Arn
```

## Gotchas

- Idempotency key must include all fields that affect the outcome -- not just request ID
- Step Functions Express Workflows have 5-minute max duration; Standard can run 1 year
- DLQ messages have no automatic reprocessing -- build a redrive mechanism
- Fan-out ordering: SNS does not guarantee order; use SQS FIFO if ordering matters
- Circuit breaker state in DynamoDB adds latency to every call -- use TTL for auto-reset

## Verification

- Replay the same event twice: verify no duplicate side effects (idempotency works)
- Force a saga step to fail: verify compensating actions execute in correct order
- Fill DLQ intentionally: verify alerting fires and redrive process works
- Test fan-out with one consumer failing: verify others are unaffected
- Measure Step Functions execution cost vs direct Lambda orchestration for your volume
