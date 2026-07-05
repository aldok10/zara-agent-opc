---
type: subskill
title: "Serverless Observability"
---

# Serverless Observability

Monitoring, tracing, and debugging serverless applications -- X-Ray, Powertools, structured logging, custom metrics.

## When to Load

- Setting up monitoring for Lambda functions
- Debugging latency or error issues in production
- Implementing structured logging standards
- Creating dashboards and alerts for serverless workloads

## Key Concepts

**AWS X-Ray** -- Distributed tracing across Lambda, API Gateway, SQS, DynamoDB. Trace requests end-to-end. Subsegments for external calls. Service map visualization.

**Lambda Powertools** -- Opinionated library for observability. Structured logging, tracing decorators, custom metrics via EMF (Embedded Metric Format). Available for Python, TypeScript, Java, .NET.

**Structured Logging** -- JSON-formatted logs with consistent fields (request_id, correlation_id, level, service). Enables CloudWatch Insights queries. Never log sensitive data.

**Custom Metrics** -- EMF (Embedded Metric Format) emits metrics via logs without API calls. Zero latency overhead. Dimensions for slicing. Use for business metrics alongside CloudWatch native metrics.

**Correlation** -- Thread a correlation_id through all services in a request chain. Inject in API Gateway, propagate via event metadata, log in every function.

## Patterns

```python
from aws_lambda_powertools import Logger, Tracer, Metrics
from aws_lambda_powertools.metrics import MetricUnit

logger = Logger(service="order-service")
tracer = Tracer(service="order-service")
metrics = Metrics(service="order-service", namespace="MyApp")

@logger.inject_lambda_context(log_event=True)
@tracer.capture_lambda_handler
@metrics.log_metrics(capture_cold_start_metric=True)
def handler(event, context):
    order_id = event["detail"]["order_id"]
    logger.append_keys(order_id=order_id)

    logger.info("Processing order")
    metrics.add_metric(name="OrdersProcessed", unit=MetricUnit.Count, value=1)

    with tracer.provider.in_subsegment("fetch_order") as subsegment:
        order = fetch_order(order_id)
        subsegment.put_annotation("order_status", order.status)

    return {"statusCode": 200}
```

```python
# CloudWatch Insights query for error analysis
# fields @timestamp, @message, level, order_id
# | filter level = "ERROR"
# | stats count() by error_type
# | sort count desc
# | limit 20
```

```yaml
# SAM template with tracing enabled
Globals:
  Function:
    Tracing: Active
    Environment:
      Variables:
        POWERTOOLS_SERVICE_NAME: order-service
        POWERTOOLS_METRICS_NAMESPACE: MyApp
        LOG_LEVEL: INFO
```

## Gotchas

- X-Ray sampling rate defaults to 1 req/sec + 5% -- increase for low-traffic services or debugging
- EMF metrics have a 100 metric values per log event limit -- batch carefully
- Structured logging with log_event=True logs the full event including potentially sensitive payload
- Cold start metrics skew averages -- always filter or segment cold vs warm in dashboards
- X-Ray traces are retained for 30 days only -- export to S3 for long-term analysis

## Verification

- Confirm traces appear in X-Ray service map with all downstream services visible
- Query CloudWatch Insights to verify structured fields are searchable
- Trigger an error and verify it appears with full context (correlation_id, stack trace)
- Verify custom metrics appear in CloudWatch with correct dimensions
- Test alert thresholds: confirm notifications fire within expected time window
