---
name: serverless
description: "Lambda, Cloud Functions, event-driven. Cold starts, fan-out, DLQ, and serverless architecture patterns."
---

# Serverless

## Scope

AWS Lambda, Google Cloud Functions, Azure Functions. Event-driven architecture patterns including fan-out, choreography, saga, DLQ. Cold start optimization, concurrency management, deployment packaging, and cost modeling.

## First Action

Identify the event source (API Gateway, SQS, S3, EventBridge, etc.) and determine the execution model (sync request/response vs async fire-and-forget). Check existing function configuration for timeout, memory, concurrency limits, and environment variables.

## Constraints

1. Functions must be stateless -- no local state persists between invocations
2. Design for cold starts: minimize package size, use provisioned concurrency for latency-sensitive paths
3. Set timeout to 2x expected execution time (never max out at 900s without justification)
4. Configure DLQ or on-failure destinations for async invocations
5. Use structured logging with correlation IDs across function chains
6. Idempotent handlers -- events may be delivered more than once
7. Separate business logic from handler glue (testable without Lambda runtime)
8. Bundle only required dependencies -- tree-shake or use layers
9. Use environment variables for configuration, Secrets Manager for credentials
10. Memory = CPU allocation in Lambda -- tune based on profiling
11. Fan-out patterns need backpressure (SQS buffer, batch size limits)
12. Circuit breakers for downstream service calls
13. Prefer event-driven over polling
14. Cost model: invocation count * duration * memory -- optimize the hot path
15. Max payload limits: 6MB sync, 256KB async (SQS/SNS)

## DO NOT

1. Store state in /tmp and expect it to persist
2. Use recursive Lambda invocations (infinite loop risk)
3. Set max concurrency without understanding downstream capacity
4. Deploy 500MB functions (indicates wrong architecture choice)
5. Run long-running processes in Lambda (use ECS/Fargate instead)
6. Ignore partial batch failures (configure bisect or individual item failure reporting)
7. Hardcode account IDs or region in function code
8. Skip testing locally before deploying (use SAM local, LocalStack)
9. Use synchronous invocation chains longer than 3 hops

## Route to Subskill

| Signal | Subskill |
|--------|----------|
| Lambda handler design, layers, concurrency | knowledge/lambda-patterns.md |
| Event-driven patterns, saga, DLQ | knowledge/event-driven-patterns.md |
| Production handler example | examples/lambda-handler.py |
| Architecture review | tools/serverless-review-prompt.md |

## Verification

- [ ] Handler is idempotent (safe for retry and at-least-once delivery)
- [ ] DLQ configured for async event sources
- [ ] Timeout set appropriately (not default 3s, not max 900s)
- [ ] Cold start time acceptable for the use case
- [ ] Downstream services can handle concurrent load at max Lambda concurrency
- [ ] Structured logging with correlation ID
- [ ] Business logic separated from handler and unit-tested
- [ ] Package size minimized (tree-shaken or layered)

## Knowledge

- knowledge/lambda-patterns.md -- event sources, concurrency, layers
- knowledge/event-driven-patterns.md -- fan-out, choreography, saga, DLQ

## AI-Era Context (2026)

Serverless is the default compute choice for event-driven workloads and API backends with variable traffic. SnapStart (JVM) and provisioned concurrency address cold start concerns. Lambda Web Adapter enables running existing HTTP frameworks (Express, FastAPI, Gin) without code changes. Function URLs reduce API Gateway dependency for simple HTTP triggers. AI inference workloads increasingly run on Lambda with GPU-backed instances or offload to SageMaker endpoints called from Lambda.

## Related Skills

- system-design (event-driven architecture)
- python-expert (Lambda handler patterns)
- security-engineering (IAM least-privilege for functions)
