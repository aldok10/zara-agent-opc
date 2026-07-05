---
type: subskill
title: "AWS Serverless"
---

# AWS Serverless

Lambda, API Gateway, Step Functions, and EventBridge for event-driven architectures.

## When to Load
- Building event-driven or request-driven serverless apps
- Designing Step Functions workflows
- Configuring EventBridge rules and buses
- Optimizing Lambda cold starts or concurrency

## Key Concepts

**Lambda execution model:** handler invoked per event. Execution environment reused across invocations (warm start). Cold start = init + handler. Memory (128MB-10GB) proportionally allocates CPU.

**Concurrency:** reserved (guaranteed), provisioned (pre-warmed), unreserved (shared pool). Account default: 1000 concurrent.

**API Gateway types:**
- REST API: full-featured, request validation, WAF, caching
- HTTP API: lower latency, lower cost, simpler (prefer for most cases)

**Step Functions:** state machine orchestration. Standard (long-running, exactly-once) vs Express (high-volume, at-least-once, 5 min max).

**EventBridge:** serverless event bus. Schema discovery, content-based filtering, archive/replay.

## Patterns

**Lambda with Powertools (Python):**
```python
from aws_lambda_powertools import Logger, Tracer, Metrics
from aws_lambda_powertools.event_handler import APIGatewayHttpResolver

logger = Logger()
tracer = Tracer()
metrics = Metrics()
app = APIGatewayHttpResolver()

@app.get("/items/<item_id>")
@tracer.capture_method
def get_item(item_id: str):
    metrics.add_metric(name="GetItemInvocations", unit="Count", value=1)
    return {"id": item_id}

@logger.inject_lambda_context
@tracer.capture_lambda_handler
@metrics.log_metrics
def handler(event, context):
    return app.resolve(event, context)
```

**Step Functions (parallel with error handling):**
```json
{
  "StartAt": "ProcessOrder",
  "States": {
    "ProcessOrder": {
      "Type": "Parallel",
      "Branches": [
        {"StartAt": "ChargePayment", "States": {"ChargePayment": {"Type": "Task", "Resource": "arn:aws:lambda:...", "End": true}}},
        {"StartAt": "ReserveInventory", "States": {"ReserveInventory": {"Type": "Task", "Resource": "arn:aws:lambda:...", "End": true}}}
      ],
      "Catch": [{"ErrorEquals": ["States.ALL"], "Next": "Compensate"}],
      "Next": "SendConfirmation"
    }
  }
}
```

**EventBridge rule with content filtering:**
```json
{
  "source": ["myapp.orders"],
  "detail-type": ["OrderPlaced"],
  "detail": {
    "amount": [{"numeric": [">=", 100]}],
    "region": ["us-east-1", "eu-west-1"]
  }
}
```

## Gotchas
- Lambda /tmp is 512MB default (configurable to 10GB) and shared across warm invocations
- VPC-attached Lambda adds ENI setup to cold start (use Hyperplane ENI to mitigate)
- API Gateway has 29-second timeout (non-configurable for REST/HTTP APIs)
- Step Functions Standard charges per state transition -- minimize states for cost
- EventBridge rules max 5 targets per rule
- Lambda layers count toward 250MB unzipped deployment limit
- Provisioned concurrency charges even when idle
- DLQ must be configured explicitly; failures silently drop otherwise

## Verification
- `aws lambda invoke --log-type Tail` for quick function test
- X-Ray traces for end-to-end latency breakdown
- CloudWatch Lambda Insights for memory/CPU/network metrics
- Step Functions console visual for execution history
- EventBridge Archive + Replay for event debugging
- `aws lambda get-function-concurrency` to check limits
