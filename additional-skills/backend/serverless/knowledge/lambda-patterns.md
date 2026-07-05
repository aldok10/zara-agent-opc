# Lambda Patterns

## Handler Structure

Separate handler glue from business logic:

```python
# handler.py -- thin glue layer
from aws_lambda_powertools import Logger, Tracer, Metrics
from aws_lambda_powertools.utilities.typing import LambdaContext
from aws_lambda_powertools.utilities.batch import BatchProcessor, EventType

from .service import OrderService

logger = Logger()
tracer = Tracer()
metrics = Metrics()

@logger.inject_lambda_context
@tracer.capture_lambda_handler
@metrics.log_metrics
def handler(event: dict, context: LambdaContext) -> dict:
    service = OrderService()
    return service.process(event)
```

## Event Sources

| Source | Invocation | Retry | Batching |
|--------|-----------|-------|----------|
| API Gateway | Sync | None (client retries) | No |
| SQS | Async/Poll | Built-in (visibility timeout) | Yes (1-10k) |
| SNS | Async | 3 retries | No |
| EventBridge | Async | Built-in (24h retention) | No |
| S3 | Async | 2 retries | No |
| DynamoDB Streams | Poll | Until expiry (24h) | Yes (1-10k) |
| Kinesis | Poll | Until expiry (7d) | Yes (1-10k) |

## Concurrency Model

```
Account Concurrency Limit (default 1000)
  └── Reserved Concurrency (per function, hard cap)
       └── Provisioned Concurrency (pre-warmed instances)
```

- **Unreserved**: shared pool, functions compete
- **Reserved**: guarantees capacity but caps max
- **Provisioned**: eliminates cold starts, costs more

Calculate needed concurrency:
```
concurrent_executions = invocations_per_second * avg_duration_seconds
```

## Cold Start Optimization

1. **Minimize package size**: tree-shake, exclude dev deps, use layers for shared code
2. **Lazy initialization**: defer SDK client creation until first use
3. **ARM64 (Graviton2)**: 20% cheaper, often faster cold starts
4. **SnapStart** (Java): pre-initializes JVM, ~100ms cold starts
5. **Provisioned concurrency**: for latency-critical paths (API responses)

```python
# Connection reuse outside handler (warm between invocations)
import boto3

# Initialized once per container, reused across invocations
_dynamodb = None

def get_dynamodb():
    global _dynamodb
    if _dynamodb is None:
        _dynamodb = boto3.resource("dynamodb")
    return _dynamodb
```

## Layers

Share code and dependencies across functions:

```yaml
# SAM template
Layers:
  SharedLayer:
    Type: AWS::Serverless::LayerVersion
    Properties:
      LayerName: shared-utils
      ContentUri: layers/shared/
      CompatibleRuntimes:
        - python3.12
      RetentionPolicy: Retain
```

Layer structure:
```
layers/shared/
  python/
    lib/
      python3.12/
        site-packages/
          shared_utils/
            __init__.py
```

## Memory and Performance

Lambda allocates CPU proportional to memory:
- 128MB = ~0.08 vCPU
- 1769MB = 1 vCPU
- 10240MB = 6 vCPU

Profile with Lambda Power Tuning to find cost-optimal memory:
- Low memory + long duration can cost MORE than high memory + short duration
- Sweet spot is usually where doubling memory halves duration

## Deployment Patterns

- **SAM/CloudFormation**: native AWS, template-based
- **CDK**: programmatic infrastructure
- **SST**: full-stack serverless framework
- **Terraform**: multi-cloud, state-managed

Function URL vs API Gateway:
- Function URL: simpler, no cost per request, limited features
- API Gateway: auth, throttling, request validation, caching, custom domains

## Error Handling

```python
from aws_lambda_powertools.utilities.batch import (
    BatchProcessor,
    EventType,
    batch_processor,
)

processor = BatchProcessor(event_type=EventType.SQS)

@batch_processor(record_handler=process_record, processor=processor)
def handler(event, context):
    return processor.response()

def process_record(record):
    # Process individual record
    # Raising exception marks THIS record as failed
    # Other records in batch still succeed
    pass
```

Configure `FunctionResponseTypes: ReportBatchItemFailures` to avoid reprocessing successful items.
