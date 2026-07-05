---
type: tool
title: "Node.js Code Review"
---

# Node.js Code Review

## Purpose

Review Node.js code for correctness, performance, and idiomatic patterns. Focuses on event loop awareness, stream usage, ESM conventions, and async error handling.

## When to Use

- Reviewing Express/Fastify/Hono handlers and middleware
- Evaluating stream usage and back-pressure handling
- Checking async patterns for unhandled rejections or leaks
- Reviewing ESM module structure and dependency management

## Prompt Template

```
CONTEXT:
- Node version: [20 | 22 | 24]
- Module system: [ESM | CJS | hybrid]
- Framework: [Express | Fastify | Hono | Koa | none]
- Code to review: [paste code or file path]
- Runtime: [Node.js | Bun | Deno]

REVIEW AGAINST:
1. Event loop: no blocking the main thread (crypto, JSON.parse large payload,
   sync fs in request path), offload CPU-heavy work to worker_threads
2. Streams: proper back-pressure (pipe/pipeline), destroy on error,
   no buffering entire payload in memory
3. Async patterns: proper error propagation, no floating promises,
   AbortController for cancellation, async iterators where appropriate
4. ESM: proper imports (file extensions), no require() in ESM,
   package.json type:"module", exports field
5. Error handling: operational vs programmer errors, process-level handlers
   (unhandledRejection, uncaughtException), graceful shutdown
6. Memory: avoid closures capturing large objects, WeakRef/FinalizationRegistry
   for caches, monitor event listener count
7. Security: input validation (zod/joi), parameterized queries,
   no eval/Function constructor, helmet/rate-limiting middleware
8. Testing: native test runner or vitest, proper mocking (no monkey-patching),
   integration tests for middleware chains

IDENTIFY:
- Event loop blocking in hot paths
- Memory leaks (unremoved listeners, growing closures, unclosed handles)
- Unhandled promise rejections
- Missing error handling in stream pipelines
- Callback/promise anti-patterns (callback hell, unnecessary await)
- Security: unsanitized user input reaching fs/exec/eval
```

## Output Format

```
## Node.js Review: [module/file name]

### Summary
[1-2 sentence verdict]

### Issues
| # | Category | Severity | Line/Area | Description | Fix |
|---|----------|----------|-----------|-------------|-----|
| 1 | ...      | ...      | ...       | ...         | ... |

### Event Loop Assessment
- [Blocking risk: none/low/high]
- [Async patterns: correct/issues-found]

### Positive Patterns
- [What's done well]

### Suggested Changes
1. [Specific improvement]
2. ...
```
