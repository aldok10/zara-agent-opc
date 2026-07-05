---
type: subskill
title: "Cold Starts"
---

# Cold Starts

Strategies to minimize Lambda/function cold start latency -- provisioned concurrency, SnapStart, warm pools, and optimization techniques.

## When to Load

- Latency-sensitive serverless APIs
- Choosing between provisioned concurrency and SnapStart
- Optimizing function initialization code
- Evaluating cold start impact on user experience

## Key Concepts

**Cold Start Phases** -- Init (runtime bootstrap + handler init) then Invoke. Init is the cold start penalty. Typically 100ms-5s depending on runtime, package size, and dependencies.

**Provisioned Concurrency** -- Pre-warm N instances. Eliminates cold starts entirely for those instances. Costs per-instance whether invoked or not. Use Application Auto Scaling to adjust based on schedule or utilization.

**SnapStart (Java)** -- Snapshots the initialized JVM state. Subsequent starts restore from snapshot instead of reinitializing. 90%+ reduction in Java cold starts. Requires CRaC-compatible code (no open sockets in init).

**Warm Pools** -- Keep instances warm after invocation for reuse. Default behavior -- AWS keeps instances for ~5-15 min. Not configurable directly; influenced by traffic patterns.

**Init Optimization** -- Lazy-load heavy dependencies, minimize deployment package, use layers for shared code, prefer lightweight runtimes (Go, Rust < Node < Python < Java).

## Patterns

```yaml
# Provisioned concurrency with auto-scaling
Resources:
  ApiFunction:
    Type: AWS::Serverless::Function
    Properties:
      AutoPublishAlias: live
      ProvisionedConcurrencyConfig:
        ProvisionedConcurrentExecutions: 5

  ScalingTarget:
    Type: AWS::ApplicationAutoScaling::ScalableTarget
    Properties:
      MaxCapacity: 50
      MinCapacity: 5
      ResourceId: !Sub function:${ApiFunction}:live
      ScalableDimension: lambda:function:ProvisionedConcurrency

  ScalingPolicy:
    Type: AWS::ApplicationAutoScaling::ScalingPolicy
    Properties:
      TargetTrackingScalingPolicyConfiguration:
        TargetValue: 0.7
        PredefinedMetricSpecification:
          PredefinedMetricType: LambdaProvisionedConcurrencyUtilization
```

```python
# Lazy initialization pattern
_db_client = None

def get_db():
    global _db_client
    if _db_client is None:
        _db_client = create_client()
    return _db_client

def handler(event, context):
    db = get_db()  # Only initializes on first call
    ...
```

## Gotchas

- Provisioned concurrency is NOT free -- you pay for idle warm instances
- SnapStart does not work with arm64 (Graviton) or Lambda@Edge currently
- Lazy init shifts cold start cost to the first request (same latency, different timing)
- VPC-attached Lambda adds ENI creation time (~1-2s) on top of code cold start
- Warming pings (scheduled invocations) do not guarantee the warm instance handles your real request

## Verification

- Measure p99 latency, not average -- cold starts are tail latency events
- Monitor `Init Duration` metric in CloudWatch to track actual cold start time
- Load test with burst traffic to validate provisioned concurrency handles spikes
- Verify SnapStart functions have no class initialization side effects (network, randomness)
- Compare cost of provisioned concurrency vs. tolerating occasional cold starts
