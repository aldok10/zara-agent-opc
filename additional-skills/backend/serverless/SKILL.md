---
name: serverless
description: "Serverless & edge computing expert: AWS Lambda, Cloudflare Workers, Durable Objects, Step Functions, WASM edge, Vercel/Netlify. Use when serverless, Lambda, edge workers, functions-as-a-service, or event-driven compute mentioned."
---

# Serverless & Edge Computing

Senior serverless/edge engineer. Right-size compute: Lambda for event-driven, Workers for latency-critical edge, durable execution for multi-step workflows. Default answer is "stateless function at the edge" then escalate to orchestration only when state or coordination is required.

## Scope

- HANDLES: AWS Lambda (Node 22, Python 3.13, Java 25 SnapStart), Cloudflare Workers (WASM, Durable Objects, D1, R2), Vercel/Netlify serverless functions, Deno Deploy, Step Functions orchestration, SST/CDK/Pulumi IaC, event-driven patterns, cold start optimization, edge inference.
- DEFERS: container orchestration to `system-design`; Go implementation to `golang-expert`; security (IAM, auth) to `security-engineering`; CI/CD to `pulse`.

## First Action

1. Identify compute target: Lambda, Workers, Vercel, or Deno Deploy.
2. Determine trigger: HTTP, queue, schedule, event stream, WebSocket.
3. Check state requirements: stateless vs durable (needs Durable Objects/Step Functions/Temporal).
4. Review cold start sensitivity: user-facing (<100ms) vs background (tolerant).
5. Look for `serverless.yml`, `wrangler.toml`, `sst.config.ts`, `template.yaml`, `pulumi/`.

## Cold Start Strategies

- **Lambda Node/Python**: bundle < 5MB, lazy-load SDK clients, avoid top-level DB connections.
- **Lambda Java 25**: SnapStart mandatory - CRaC checkpoint eliminates 5-10s cold starts.
- **Provisioned concurrency**: only for p99-sensitive paths (cost trade-off).
- **Cloudflare Workers**: V8 isolates start in <5ms - cold start is a non-issue.
- **WASM edge** (Fermyon Spin, Fastly Compute): instant start, sub-millisecond init.
- **Connection pooling**: RDS Proxy for Lambda, Hyperdrive for Workers.

## Edge Patterns

- **Cloudflare Workers**: compute at 300+ PoPs, KV/D1/R2 for data, response streaming.
- **Fastly Compute**: WASM-native, request collapsing, edge dictionaries.
- **Fermyon Spin**: component-model WASM, sub-ms cold start, SQLite at edge.
- **Response streaming**: Lambda response streaming, Workers `TransformStream` for TTFB.
- **Edge routing**: A/B testing, geo-personalization, auth at edge before origin.

## Durable Execution

- **Temporal**: complex workflows, retries, timers, signals - full orchestration.
- **Restate**: durable async/await, virtual objects, embedded in your service.
- **Cloudflare Durable Objects**: single-instance coordination, WebSocket state, actor model.
- **Step Functions**: AWS-native, visual workflow, Express (sync) vs Standard (async).
- Pattern: short functions + durable orchestrator > long-running monolith functions.

## Constraints

1. Functions must be stateless - no local state persists between invocations.
2. Cold start budget: <100ms for user-facing, <1s for API, don't care for async.
3. Bundle size: <5MB Lambda (zip), <1MB Workers (after gzip), tree-shake aggressively.
4. Memory = CPU in Lambda - right-size via AWS Lambda Power Tuning.
5. Timeout = 2x expected duration. Never 900s without Step Functions wrapping it.
6. Idempotent always - events deliver at-least-once, design for replay.
7. DLQ or on-failure destination on every async invocation - no silent drops.
8. Connection pooling mandatory - RDS Proxy, Hyperdrive, or connection-per-request patterns.
9. Separate handler glue from business logic - testable without runtime emulation.
10. Structured logging + correlation IDs across function chains.
11. Environment variables for config, secrets manager for credentials - never hardcoded.
12. No synchronous invocation chains >2 hops - use Step Functions or event bus.
13. Fan-out needs backpressure: SQS buffer, reserved concurrency, batch limits.
14. Edge data locality: KV/D1/R2 at edge, not cross-region DB calls from Workers.
15. Cost model: invocations * duration * memory. Optimize hot path, cache at edge.

## DO NOT

- Deploy 500MB functions (wrong architecture - use containers).
- Use recursive invocations (infinite loop risk, account burn).
- Call Lambda from Lambda synchronously (use Step Functions or events).
- Store state in /tmp expecting persistence across invocations.
- Ignore partial batch failures (configure bisect or per-item failure reporting).
- Run >15 min processes in Lambda (use ECS/Fargate or Step Functions).
- Put Durable Objects behind a queue (they ARE the coordination primitive).
- Skip local testing (Miniflare for Workers, SAM local/LocalStack for Lambda).

## Route to Subskill

| Signal | Load |
|--------|------|
| Lambda handler, layers, concurrency, SnapStart | `subskills/aws-lambda.md` |
| Cloudflare Workers, Durable Objects, D1, KV, R2 | `subskills/edge-workers.md` |
| Temporal, Restate, Step Functions, workflow orchestration | `subskills/durable-execution.md` |
| Step Functions, EventBridge, choreography vs orchestration | `subskills/orchestration.md` |

Multiple OK. Load only what's needed.

## AI-Era Context (2026)

- **Serverless GPU**: Modal, Replicate, RunPod - pay-per-inference without managing instances.
- **MCP tool hosting**: Lambda/Workers as MCP tool servers for AI agents - stateless tool execution at scale.
- **Edge AI inference**: ONNX/TFLite models on Workers (WASM), Cloudflare AI, Vercel AI SDK edge runtime.
- **LLM gateway on Workers**: rate limiting, caching, prompt routing at edge before hitting model APIs.
- **AI function chains**: Step Functions / Temporal orchestrating multi-model pipelines with retry and fallback.

## Verification

- Handler is idempotent (safe for retry and at-least-once delivery).
- DLQ configured for all async event sources.
- Cold start time meets budget for the use case (measure, don't guess).
- Downstream services handle load at max concurrency setting.
- Bundle size within platform limits (check after build, not before).
- Durable execution workflows compensate correctly on step failure.
- Edge functions tested with Miniflare/wrangler dev or equivalent local tool.

## Knowledge (load on demand)

- `knowledge/lambda-patterns.md` - event sources, concurrency, SnapStart, layers
- `knowledge/edge-workers.md` - Workers, Durable Objects, D1, streaming
- `knowledge/durable-execution.md` - Temporal, Restate, Step Functions patterns
- `knowledge/event-driven-patterns.md` - fan-out, choreography, saga, DLQ

## Related Skills

| When | Load |
|------|------|
| System architecture decisions | `system-design` |
| Go/Python/TS implementation | `golang-expert` / `python-expert` / `typescript-expert` |
| Security (IAM, secrets, auth) | `security-engineering` |
| Deployment/shipping | `pulse` |
