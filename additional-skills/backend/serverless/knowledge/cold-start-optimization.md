---
type: fact
title: "Cold Start Optimization"
---

# Cold Start Optimization

## What Causes Cold Starts

1. Provision execution environment (microVM/container)
2. Download + extract deployment package
3. Initialize runtime (JVM, Node, Python interpreter)
4. Run application init code (DI, DB connections)

## Cold Start by Runtime (2026)

| Runtime | Cold Start | Notes |
|---------|-----------|-------|
| Rust (custom) | 10-30ms | Fastest possible |
| Go | 30-80ms | Static binary, no VM |
| Node.js 22 | 100-300ms | V8 startup |
| Python 3.13 | 150-400ms | Interpreter + imports |
| Java 21 (SnapStart) | 100-200ms | Pre-warmed snapshot |
| Java 21 (no SnapStart) | 800-3000ms | JVM + class loading |
| .NET 8 (AOT) | 100-200ms | Ahead-of-time compiled |

## Provisioned Concurrency

Keeps N environments pre-warmed. No cold starts for first N concurrent requests.

```yaml
functions:
  api:
    handler: src/handler.main
    provisionedConcurrency: 5
```

Use when: latency-sensitive APIs (p99 <100ms target), predictable traffic.
Skip when: spiky traffic, background jobs, low-traffic functions.

## SnapStart (AWS Lambda, Java)

Takes Firecracker microVM snapshot after init. Restores from snapshot on cold start (2-3s → ~200ms).

Gotchas:
- Random seeds/UUIDs from init are shared across restores → regenerate in `afterRestore`
- DB connections from snapshot are stale → reconnect in restore hook

## Bundle Size Optimization

Larger package = longer download + extraction.

**Node.js**: Bundle with esbuild, externalize AWS SDK (already in runtime), minify.
```bash
esbuild src/handler.ts --bundle --platform=node --external:@aws-sdk --outfile=dist/handler.js --minify
# 500KB instead of 50MB node_modules
```

**Python**: Strip .pyc, tests, dist-info. Use layers for large deps (pandas, numpy).

**Java**: Micronaut/Quarkus over Spring Boot. GraalVM native image eliminates JVM.

## Lazy Initialization

Don't initialize what every invocation doesn't need:
```typescript
let dbPool: Pool | null = null;
function getDb(): Pool {
  if (!dbPool) dbPool = new Pool({ host: process.env.DB_HOST, max: 1 });
  return dbPool;
}
```

Python conditional imports:
```python
def handler(event, context):
    if event.get('action') == 'report':
        import pandas as pd  # only imported when needed
        return generate_report(event, pd)
    return {'statusCode': 200, 'body': 'pong'}
```

## Runtime Selection

| Priority | Choose | Reason |
|----------|--------|--------|
| Min cold start | Rust or Go | No VM, static binary |
| Team knows JS | Node.js + esbuild | Fast enough, good DX |
| Team knows Java | Java 21 + SnapStart | Brings Java in line with Node |
| Must use .NET | .NET 8 Native AOT | Eliminates JIT cold start |

## Architecture Patterns

1. **Keep warm** (cheap): ping every 5 min, handler checks `event.warmup` and returns early
2. **Separate hot/cold**: latency-critical = small fast functions; async = accept cold starts
3. **Response streaming**: start sending response before heavy init completes
