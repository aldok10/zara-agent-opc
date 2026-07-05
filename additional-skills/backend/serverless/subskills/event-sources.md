---
type: subskill
title: "Event Sources"
---

# Event Sources

Lambda triggers and integration patterns -- API Gateway, SQS, EventBridge, S3, DynamoDB Streams.

## When to Load

- Choosing the right trigger for a workload
- Configuring batch processing with SQS/Kinesis
- Building event-driven architectures
- Debugging invocation failures and retries

## Key Concepts

**Synchronous (Push)** -- Caller waits for response. API Gateway, ALB, CloudFront (Lambda@Edge). Lambda returns result directly. Caller handles errors.

**Asynchronous (Event)** -- Fire and forget. S3, SNS, EventBridge, IoT. Lambda manages retry (2 retries default). Failed events go to DLQ/on-failure destination.

**Poll-based (Stream/Queue)** -- Lambda polls the source. SQS, Kinesis, DynamoDB Streams, Kafka. Batch processing. Lambda manages checkpointing.

**API Gateway Integration** -- REST (resource-based), HTTP API (faster, cheaper), WebSocket. Proxy integration passes full request. Response format: statusCode, headers, body.

**EventBridge** -- Event bus with content-based routing. Rules filter events by pattern. Targets include Lambda, Step Functions, SQS. Schema registry for discovery.

## Patterns

```yaml
# SQS with batch processing and partial failure reporting
Events:
  OrderQueue:
    Type: SQS
    Properties:
      Queue: !GetAtt OrderQueue.Arn
      BatchSize: 10
      MaximumBatchingWindowInSeconds: 5
      FunctionResponseTypes:
        - ReportBatchItemFailures

# DynamoDB Streams
Events:
  TableStream:
    Type: DynamoDB
    Properties:
      Stream: !GetAtt UsersTable.StreamArn
      StartingPosition: TRIM_HORIZON
      BatchSize: 100
      MaximumRetryAttempts: 3
      BisectBatchOnFunctionError: true
      FilterCriteria:
        Filters:
          - Pattern: '{"eventName": ["INSERT", "MODIFY"]}'

# EventBridge rule
Events:
  OrderPlaced:
    Type: EventBridgeRule
    Properties:
      Pattern:
        source: ["com.myapp.orders"]
        detail-type: ["OrderPlaced"]
        detail:
          amount: [{ "numeric": [">=", 100] }]
```

```python
# SQS partial batch failure response
def handler(event, context):
    failures = []
    for record in event["Records"]:
        try:
            process(record)
        except Exception:
            failures.append({"itemIdentifier": record["messageId"]})
    return {"batchItemFailures": failures}
```

## Gotchas

- SQS without ReportBatchItemFailures: one failure retries the entire batch
- DynamoDB Streams are ordered per partition key -- parallelism is limited by partition count
- EventBridge has 5 targets per rule limit (use SQS fan-out for more)
- API Gateway timeout is 29s (REST) or 30s (HTTP API) -- long tasks need async pattern
- S3 event notifications can have 1-minute delivery delay and possible duplicates

## Verification

- Test partial batch failures: verify only failed messages return to queue
- Confirm DLQ receives events after max retries exhausted
- Validate EventBridge filter patterns with `aws events test-event-pattern`
- Load test SQS consumers to find optimal batch size for throughput vs latency
- Monitor IteratorAge for stream sources to detect processing lag
