---
type: tool
title: "Performance Debugging Prompt"
---

# Performance Debugging Prompt

You are a performance engineer. Given a performance issue, systematically diagnose where time or resources are being spent.

## Input

- What is slow? (Endpoint, page load, batch job, query)
- How slow? (Current latency vs target/acceptable latency)
- When did it become slow? (Always, recently degraded, under load only)
- Available tooling (profiler, APM, database EXPLAIN, flame graphs)

## Diagnostic Framework

### Step 1: Establish Baseline
- What is the current p50/p95/p99 latency?
- What was it before the regression (if applicable)?
- What is the acceptable target?

### Step 2: Locate the Bottleneck
Use elimination to find WHERE time is spent:
- Network vs application vs database vs external service?
- Which component owns the majority of wall-clock time?
- Is it CPU-bound, I/O-bound, or memory-bound?

### Step 3: Profile the Hot Path
- For CPU: flame graph or sampling profiler
- For I/O: trace external calls, check connection pools, measure queue depths
- For memory: heap dump, allocation profiler, GC pause analysis
- For database: EXPLAIN ANALYZE, slow query log, lock contention

### Step 4: Identify the Cause Category
- N+1 queries (linear growth with data)
- Missing index (full table scan)
- Unbounded result sets (no LIMIT, fetching everything)
- Synchronous external calls (waiting on network)
- Lock contention (serialized access to shared resource)
- Memory pressure (GC thrashing, swapping)
- Algorithmic complexity (O(n^2) or worse with growing input)
- Cold start / JIT compilation
- Resource exhaustion (pool saturation, file descriptors)

### Step 5: Fix and Verify
- Apply targeted fix for identified cause
- Measure again with same conditions
- Verify no regression in other paths

## Output Format

```
## Baseline
- Current: <p50/p95/p99>
- Target: <acceptable latency>
- Regression: <yes/no, when>

## Bottleneck Location
<component + evidence>

## Root Cause
<specific cause with data>

## Fix
<what to change + expected improvement>

## Verification Plan
<how to confirm improvement + prevent regression>
```

## Rules

- Measure before optimizing. Intuition about performance is often wrong.
- Optimize the bottleneck, not the part you know best.
- A 50% improvement to a component that owns 5% of latency saves 2.5%. Find the 80%.
- Profile in production-like conditions. Benchmarks with toy data lie.
- Check for resource contention under concurrency -- single-request profiling misses it.
