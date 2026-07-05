---
type: fact
title: "Performance"
---

# Performance

Node.js performance optimization: V8 internals, profiling, memory management, and production monitoring.

## V8 Optimization Tips

```typescript
// Monomorphic functions (same shape objects) -- V8 optimizes these
// GOOD: always call with same object shape
function process(item: { id: string; value: number }) { return item.value * 2; }

// BAD: polymorphic -- different shapes deoptimize
function process(item: any) { return item.value * 2; } // could be anything

// Hidden classes -- objects with same property order share optimization
const a = { x: 1, y: 2 }; // shape A
const b = { y: 2, x: 1 }; // shape B -- different hidden class!

// Avoid delete operator (changes hidden class)
// BAD: delete obj.prop;
// GOOD: obj.prop = undefined;
```

## Profiling with --inspect

```bash
# Start with inspector
node --inspect src/index.js

# CPU profile from CLI (no Chrome needed)
node --cpu-prof --cpu-prof-dir=./profiles src/index.js
# Generates .cpuprofile file -- open in Chrome DevTools or speedscope.app

# Heap snapshot
node --heap-prof --heap-prof-dir=./profiles src/index.js
```

## 0x (Flamegraph)

```bash
npx 0x src/index.js
# Generates flamegraph HTML -- identifies hot functions
```

## clinic.js Suite

```bash
# Doctor: detect event loop issues
npx clinic doctor -- node src/index.js

# Flame: CPU flamegraph
npx clinic flame -- node src/index.js

# Bubbleprof: async flow visualization
npx clinic bubbleprof -- node src/index.js
```

## Memory Leak Detection

```typescript
// Track heap usage
setInterval(() => {
  const { heapUsed, heapTotal, rss } = process.memoryUsage();
  logger.info({
    heapUsedMB: Math.round(heapUsed / 1024 / 1024),
    heapTotalMB: Math.round(heapTotal / 1024 / 1024),
    rssMB: Math.round(rss / 1024 / 1024),
  });
}, 30_000);
```

Common leak sources:
- Event listeners not removed (use `once()` or `AbortSignal`)
- Closures retaining large objects
- Global caches without eviction (use LRU with max size)
- Unresolved promises accumulating
- Timer references not cleared

## Heap Snapshots (Programmatic)

```typescript
import { writeHeapSnapshot } from 'node:v8';

// Trigger on demand (e.g., via admin endpoint)
app.get('/debug/heapdump', { config: { admin: true } }, async () => {
  const filename = writeHeapSnapshot();
  return { filename }; // analyze in Chrome DevTools Memory tab
});
```

## Benchmark with node:perf_hooks

```typescript
import { performance, PerformanceObserver } from 'node:perf_hooks';

const obs = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log(`${entry.name}: ${entry.duration.toFixed(2)}ms`);
  }
});
obs.observe({ entryTypes: ['measure'] });

performance.mark('start');
await heavyOperation();
performance.mark('end');
performance.measure('heavy-op', 'start', 'end');
```

## HTTP Performance

```typescript
// Connection pooling (native fetch uses undici under the hood)
import { Agent, setGlobalDispatcher } from 'undici';

setGlobalDispatcher(new Agent({
  connections: 100,      // max connections per origin
  pipelining: 10,        // HTTP pipelining
  keepAliveTimeout: 30_000,
  keepAliveMaxTimeout: 60_000,
}));

// JSON serialization (Fastify's fast-json-stringify)
// Define response schemas -- Fastify auto-uses fast-json-stringify (2-5x faster)
```

## Streaming over Buffering

```typescript
// BAD: buffers entire response in memory
const data = await fetch(url);
const json = await data.json(); // entire body in memory
return processAll(json.items); // another copy

// GOOD: stream processing
import { pipeline } from 'node:stream/promises';
const response = await fetch(url);
// Process chunks as they arrive -- constant memory
```

## Worker Threads for CPU

Rule of thumb: if a sync operation takes >5ms, consider offloading:

```typescript
import Piscina from 'piscina';
const pool = new Piscina({ filename: './hash-worker.js' });

// Offload CPU work -- doesn't block event loop
app.post('/hash', async (req) => {
  const result = await pool.run(req.body.data);
  return { hash: result };
});
```

## Production Checklist

| Category | Action |
|----------|--------|
| Startup | Validate config, fail fast on misconfiguration |
| Memory | Set `--max-old-space-size` based on container limits (75% of available) |
| Connections | Pool DB/Redis connections, set timeouts |
| Logging | Structured JSON (pino), async transport, appropriate level |
| Monitoring | Track event loop lag, heap usage, active handles |
| GC | Don't tune GC flags unless profiled. `--expose-gc` only for testing |
| Cluster | Use container orchestration (k8s) over `node:cluster` |

## Quick Wins

1. Use `JSON.stringify` with replacer/space only in dev -- no extra allocations in prod
2. Pre-compile Zod schemas (don't create new schema per request)
3. Use `Buffer.allocUnsafe()` when you'll immediately fill the buffer
4. Avoid `Array.from()` on large iterables -- use for...of with push
5. Set `UV_THREADPOOL_SIZE` = CPU cores for fs-heavy workloads
6. Enable HTTP/2 for multiplexed connections
7. Use `response` schemas in Fastify for fast-json-stringify
