---
type: tool
title: "Node.js Memory Leak Diagnosis"
---

# Node.js Memory Leak Diagnosis

## Purpose

Systematic diagnosis of Node.js memory leaks using heap snapshots, allocation tracking, and event loop analysis. Guides from symptom identification through root cause to fix verification.

## When to Use

- Process RSS growing continuously over time
- OOMKilled events in container environments
- Heap snapshots showing retained objects growing
- Event loop lag increasing with uptime
- GC pauses getting longer over time

## Prompt Template

```
CONTEXT:
- Node.js version: [18 | 20 | 22]
- Runtime: [plain Node | Deno | Bun]
- Application type: [HTTP server | worker | CLI | SSR]
- Framework: [Express | Fastify | NestJS | Hono | none]
- Memory behavior: [growth rate per hour, current/max RSS]
- Container limits: [memory limit, current usage]
- Uptime before issue: [hours/days until noticeable]

DIAGNOSIS STEPS:
1. Baseline measurement
   - process.memoryUsage() snapshot (rss, heapUsed, heapTotal, external)
   - Interval logging (every 30s)
   - Track: arrayBuffers, external memory (native addons)

2. Heap snapshot analysis
   - Take 3 snapshots: startup, after load, after suspected leak
   - Compare: Objects allocated between snapshot 2 and 3
   - Look for: growing arrays, uncollected closures, detached DOM (SSR)
   - Tool: --inspect + Chrome DevTools, or heapdump module

3. Allocation tracking
   - --trace-gc flag for GC activity
   - Allocation timeline in DevTools
   - Track constructors with growing instance count
   - Identify retaining paths to GC root

4. Common leak patterns
   - Event listeners not removed (EventEmitter, DOM, streams)
   - Closures capturing large scope
   - Global caches without size limit or TTL
   - Unfinished promises/timers holding references
   - Circular references in WeakRef-free structures
   - Stream backpressure not handled (readable not consumed)

5. Event loop analysis
   - Event loop lag (measured via setTimeout drift)
   - Active handles and requests count
   - Timer queue growth
   - Pending async operations

6. Native memory (not in heap)
   - Buffer allocations (Buffer.alloc vs allocUnsafe)
   - Native addons (N-API, node-gyp modules)
   - Worker threads with shared ArrayBuffer
   - Child process stdio streams

VERIFICATION:
- Fix applied -> same load test -> memory stabilizes
- 24h+ observation with production traffic
- GC metrics return to baseline
```

## Output Format

```
## Memory Diagnosis: [service name]

### Symptoms
- RSS growth: [MB/hour]
- Heap used: [current vs expected]
- Trigger: [traffic pattern, specific endpoint, time-based]

### Root Cause
[Identified leak source with evidence]

### Evidence
- Snapshot comparison: [what's growing, retaining path]
- Reproduction: [minimal steps to trigger]

### Fix
[Code change with explanation]

### Verification Plan
1. [Apply fix in staging]
2. [Run load test for N hours]
3. [Compare memory curves before/after]
4. [Monitor production for 48h]

### Prevention
- [Coding practices to avoid recurrence]
- [Monitoring to detect early]
```
