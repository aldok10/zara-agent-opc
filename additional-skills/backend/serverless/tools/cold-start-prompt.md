---
type: tool
title: "Cold Start Mitigation"
---

# Cold Start Mitigation

## Purpose

Design strategies to minimize serverless function cold start latency. Covers provisioned concurrency, bundle optimization, runtime selection, and architectural approaches to reduce initialization time.

## When to Use

- Cold start latency exceeding acceptable thresholds
- Choosing between runtimes for latency-sensitive workloads
- Optimizing function bundle size and initialization code
- Evaluating provisioned concurrency cost vs performance trade-off
- Designing architectures that tolerate or avoid cold starts

## Prompt Template

```
CONTEXT:
- Platform: [AWS Lambda | Azure Functions | GCP Cloud Functions | Cloudflare Workers]
- Runtime: [Node.js | Python | Java | Go | .NET | Rust | custom container]
- Current cold start: [measured P50, P95 in ms]
- Acceptable latency: [target P95 in ms]
- Function size: [bundle size MB, dependency count]
- Memory config: [MB allocated]
- Invocation pattern: [steady | bursty | scheduled | event-driven]
- VPC attached: [yes/no, ENI attachment time if yes]

MITIGATION STRATEGIES:
1. Provisioned concurrency / pre-warming
   - Reserved instances (platform-specific)
   - Scheduled scaling (match traffic patterns)
   - Keep-warm pings (anti-pattern but common)
   - Cost analysis: provisioned vs on-demand pricing

2. Bundle optimization
   - Tree-shaking unused dependencies
   - Lazy loading (import at use time, not init time)
   - Layer/extension for shared dependencies
   - Single-purpose functions (thin handler)
   - Minification and dead code elimination

3. Runtime selection
   - Go/Rust: near-zero cold start
   - Node.js/Python: moderate (fast init, larger ecosystem)
   - Java/.NET: highest cold start (mitigated by SnapStart/ReadyToRun)
   - Custom runtime: control initialization order

4. Initialization optimization
   - Move work from init to first invocation (lazy)
   - Connection pooling outside handler
   - Precompute/cache at build time (embed config)
   - Reduce SDK initialization (only import needed clients)

5. Architecture patterns
   - Edge functions for latency-critical paths
   - Hybrid: always-on for baseline + serverless for burst
   - Response streaming (start sending before full compute)
   - Async patterns (queue + worker, tolerate latency)

6. Platform-specific features
   - AWS: SnapStart (Java), Provisioned Concurrency, arm64
   - GCP: min instances, Cloud Run always-allocated
   - Azure: Premium plan with pre-warmed instances
   - Cloudflare: V8 isolates (no traditional cold start)

MEASUREMENT:
- Distinguish cold start from warm invocation in metrics
- Track: init duration vs handler duration
- Monitor provisioned concurrency utilization
- Alert on cold start rate exceeding threshold
```

## Output Format

```
## Cold Start Strategy: [function/service name]

### Current State
- Cold start P50/P95: [measured values]
- Root causes: [bundle size, runtime, VPC, init code]

### Recommended Mitigations
| Strategy | Expected Reduction | Effort | Cost Impact |
|----------|-------------------|--------|-------------|
| ... | ... | ... | ... |

### Implementation Plan
1. [Quick wins: bundle optimization, lazy imports]
2. [Medium term: runtime changes, provisioned concurrency]
3. [Long term: architectural changes if needed]

### Cost Analysis
- Current: [cost at current config]
- With provisioned: [additional cost]
- Break-even: [at what traffic level provisioned pays off]

### Monitoring
- [Metrics to track improvement]
- [Alerting thresholds]
```
