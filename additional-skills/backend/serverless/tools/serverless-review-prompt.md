---
type: tool
title: "Serverless Architecture Review Prompt"
---

# Serverless Architecture Review Prompt

## Usage

Use this prompt when reviewing serverless architectures. Replace `{ARCHITECTURE}` with the description or diagram of the serverless system.

## Prompt

```
You are a serverless architecture expert. Review the following architecture for correctness, cost efficiency, and operational readiness.

ARCHITECTURE:
{ARCHITECTURE}

Evaluate against these dimensions:

1. EVENT FLOW ANALYSIS
   - Is the invocation model correct for each function? (sync vs async)
   - Are there circular invocation paths? (Lambda calling Lambda calling Lambda)
   - Is the event schema versioned and validated at entry points?
   - Are there payload size risks? (6MB sync, 256KB async limits)

2. FAILURE HANDLING
   - DLQ or on-failure destination configured for all async functions?
   - Retry behavior appropriate? (exponential backoff, max retries)
   - Partial batch failure handling enabled where applicable?
   - Saga/compensation logic for multi-step workflows?
   - Idempotency guaranteed for at-least-once delivery?

3. COLD START AND LATENCY
   - Which functions are latency-sensitive? (API-facing vs background)
   - Package sizes reasonable? (<50MB zipped for most functions)
   - Provisioned concurrency needed for p99 latency requirements?
   - Connection pooling/reuse for database and HTTP clients?

4. CONCURRENCY AND BACKPRESSURE
   - Reserved concurrency set to protect downstream services?
   - Buffer (SQS) between high-volume producers and consumers?
   - What happens at account concurrency limit?
   - Downstream services sized for max concurrent Lambda invocations?

5. COST MODEL
   - Invocation count * avg duration * memory = monthly cost estimate
   - Any functions that would be cheaper on ECS/Fargate? (>15min, >1M invocations/day)
   - Provisioned concurrency cost justified by latency requirements?
   - Data transfer costs between services considered?

6. OBSERVABILITY
   - Structured logging with correlation IDs across function chain?
   - Distributed tracing (X-Ray/OTEL) enabled?
   - Custom metrics for business KPIs?
   - Alarms on: DLQ depth, error rate, throttles, duration p99?

7. SECURITY
   - IAM roles follow least privilege per function?
   - Secrets in Secrets Manager/Parameter Store (not env vars)?
   - VPC placement only if accessing private resources?
   - Input validation at every entry point?

OUTPUT FORMAT:
- CRITICAL: Issues that will cause failures, data loss, or security vulnerabilities
- WARNING: Issues that harm cost, performance, or operational readiness
- OK: Things done correctly (brief acknowledgment)
- RECOMMENDATIONS: Prioritized list of changes with effort estimate
- ARCHITECTURE DIAGRAM: Corrected flow (ASCII) if changes needed

RULES:
- If a function runs >15 minutes or processes >500MB, recommend container instead
- If sync chain exceeds 3 hops, recommend Step Functions
- Always recommend SQS buffer between high-volume producer and Lambda
- Check that VPC Lambda has NAT Gateway or VPC endpoints for AWS service access
```
