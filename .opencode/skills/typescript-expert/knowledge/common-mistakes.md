---
type: fact
title: "TypeScript & Node.js Common Mistakes - Production Lessons"
---

# TypeScript & Node.js Common Mistakes - Production Lessons

Runtime and architecture mistakes from production systems. 45+ distinct issues across event loop, memory, streams, async, ESM, frameworks, bundles, supply chain, and resource management.

## 1. Event Loop & Runtime

| Mistake | Impact | Fix |
|---------|--------|-----|
| Synchronous `JSON.parse` on multi-MB strings | Blocks event loop 100ms+, all concurrent I/O stalls | Streaming parsers (`stream-json`), or `worker_threads` |
| CPU-intensive operations on main thread | All I/O stalls until computation completes | `worker_threads`, job queue service, or thread pool |
| Regex backtracking on user input (ReDoS) | Single request blocks loop indefinitely, full DoS | `re2` library, input length validation, avoid nested quantifiers |
| Top-level await in page/layout blocking render | Disables streaming, white screen until resolved | Move async work to child Suspense components |
| Synchronous crypto (`pbkdf2Sync`, `scryptSync`) | 100ms+ block per call, all requests stall | Async variants (`crypto.pbkdf2`), or worker thread |
| Creating child processes per request | Fork ~30ms each, PID exhaustion under load | Worker thread pool, pre-spawned process pool |
| No `server.close()` on SIGTERM | Requests dropped mid-flight during deploys | Signal handler: stop accepting, drain in-flight, close pools, exit |

## 2. Memory Leaks

| Mistake | Impact | Fix |
|---------|--------|-----|
| Event listeners never removed | Heap grows unbounded, eventual OOM | Pair with `removeEventListener`; use `AbortSignal` |
| Closures capturing large outer-scope variables | GC cannot reclaim referenced objects | Null references after use, minimize closure scope |
| `setInterval` never cleared | Callback and its closure retained forever | Store ID, `clearInterval` on cleanup/shutdown |
| Unbounded in-memory caches (Maps growing) | Linear heap growth, no eviction | LRU with max size (`lru-cache`), or external cache (Redis) |
| Unclosed DB connections and streams | fd leak, connection pool exhaustion | `try/finally`, `using` keyword (TC39), `pipeline()` |
| Global module state retaining request data | Stale data between invocations, cross-request leakage | Scope to request lifecycle (AsyncLocalStorage) |
| WeakRef/FinalizationRegistry misuse | Non-deterministic cleanup, logic depends on GC timing | Explicit resource management, don't rely on GC for correctness |

## 3. Streams & Backpressure

| Mistake | Impact | Fix |
|---------|--------|-----|
| Ignoring `.write()` return value | Silent unbounded buffer growth, memory spike | Check return value, await `'drain'` event |
| Using `.pipe()` instead of `pipeline()` | Errors don't propagate, fd/resource leak | Always `pipeline()` for stream chains |
| `objectMode` streams with default `highWaterMark` | Gigabytes buffered (16 objects = 16 huge objects) | Set explicit low `highWaterMark` for object streams |
| `.on('data')` without pause/resume | Bypasses backpressure entirely | Async iterators or `pipeline()` |
| Node 22 raised default `highWaterMark` to 64KB | 4x more buffering than Node 20, silent memory increase | `setDefaultHighWaterMark()` if constrained |
| Not destroying streams on error | Leaked file descriptors, stuck connections | Always `stream.destroy()` in error paths |

## 4. Promise & Async Patterns

| Mistake | Impact | Fix |
|---------|--------|-----|
| Missing `.catch()` on fire-and-forget promises | Process crash on unhandled rejection (Node 15+) | Always attach error handler, or `void promise.catch(log)` |
| `async` event handlers without try/catch | Silent errors or process crash | Wrap body in try/catch, report to error tracker |
| `Promise.all` with no partial failure handling | One rejection loses all completed work | `Promise.allSettled` or individual `.catch()` wrappers |
| `async` function in `Array.forEach` | Iterations run uncontrolled parallel, no await point | `for...of` (sequential) or `Promise.all(arr.map(...))` |
| Race condition: read-modify-write without lock | Last write wins, data loss | Mutex (`async-mutex`), optimistic locking, or queue |
| `await` inside loop when parallelizable | N items = N * latency sequentially | `Promise.all` for independent ops, `p-limit` for bounded |
| No timeout on external calls | Hangs forever, pool exhaustion, cascading failure | `AbortSignal.timeout()`, DB query timeouts, gRPC deadlines |
| Retry without exponential backoff + jitter | Thundering herd keeps service down | Exponential backoff, jitter, circuit breaker |

## 5. ESM/CJS Interop

| Mistake | Impact | Fix |
|---------|--------|-----|
| `require()` of ESM-only packages | `ERR_REQUIRE_ESM` crash at runtime | Dynamic `import()` or convert consumer to ESM |
| Named imports from CJS in ESM | `SyntaxError` at module load | Default import + destructure |
| Mixing `"type": "module"` with CJS syntax | Confusing `SyntaxError` messages | Use `.cjs`/`.mjs` extensions or commit fully to one system |
| `__dirname` not available in ESM | Path resolution breaks at runtime | `import.meta.dirname` (Node 21+) or `fileURLToPath` |
| Dual package hazard (loaded as both ESM and CJS) | Two instances of same module, `instanceof` fails, singletons break | Single format per package, `exports` field to enforce |
| `tsconfig` module setting mismatches runtime | Compiled output has wrong syntax for target runtime | Use `"module": "Node16"` or `"NodeNext"` |
| Top-level await blocking module graph | All downstream imports wait, slow startup | Explicit `init()` function called at app start |
| Missing `.js` extension in ESM imports | Works in bundler, `ERR_MODULE_NOT_FOUND` in Node | Always use `.js` extension in source ESM files |

## 6. Next.js / React

| Mistake | Impact | Fix |
|---------|--------|-----|
| Passing large serialized data across server-client boundary | Bloated HTML payload, slow hydration, large TTFB | Shape data to minimum needed, use references |
| `"use client"` too high in component tree | Entire subtree hydrated, loses server component benefits | Push `"use client"` to leaf components |
| Not calling `revalidatePath` after server actions | Stale UI persists until cache TTL expires | Always revalidate affected paths after mutations |
| Hydration mismatch from render divergence | Console errors, visual flickers, broken state | Identical server/client output, no `Date.now()` in render |
| Server/client boundary confusion | Build errors or runtime crash from wrong imports | `"use client"` at boundary, serializable props only |
| Fetching in client when server component suffices | Waterfall: shell renders, then client fetches | Fetch in server components, pass data down |
| Layout re-mounting on navigation | State lost between pages unexpectedly | Shared state in `layout.tsx`, pages as children |
| Missing `loading.tsx` / `error.tsx` boundaries | Unhandled errors crash page, no loading feedback | Add at route segment level, global fallback at root |

## 7. Bundle & Performance

| Mistake | Impact | Fix |
|---------|--------|-----|
| Importing entire libraries (`import _ from 'lodash'`) | Hundreds of KB added to bundle | Tree-shakeable imports (`lodash-es`), or native equivalents |
| Not code-splitting routes | Initial load downloads entire app | Dynamic `import()`, `React.lazy`, route-based splitting |
| Shipping server-only code to client | Bundle bloat + potential secret exposure | `server-only` package, bundle analyzer in CI |
| Barrel files (`index.ts` re-exports) at scale | Tree-shaking fails, importing one util loads everything | Direct imports, remove barrel files in libraries |
| Dev dependencies in production bundle | Unnecessary bloat, potential type-only imports at runtime | Verify bundle content with size analysis tools |
| N+1 queries (fetch list, then fetch each item) | 100 items = 101 queries, linear latency growth | Batch: `WHERE id IN(...)`, DataLoader pattern |
| Unbounded in-memory cache as "optimization" | Memory leak disguised as performance feature | LRU with max size, TTL, monitor cache metrics |

## 8. npm Supply Chain Security

| Mistake | Impact | Fix |
|---------|--------|-----|
| Typosquatted packages | Malware execution, credential theft | Lockfiles, verify package names, Socket.dev |
| `postinstall` scripts from untrusted packages | Arbitrary code execution at install time | `--ignore-scripts`, audit scripts before allowing |
| Open ranges (`^`, `*`, `~`) in production | Malicious update auto-installed on next deploy | Pin exact versions in production |
| Compromised maintainer (event-stream pattern) | Trusted package becomes attack vector | 2FA enforcement, provenance attestation, audit deps |
| No lockfile committed | Non-reproducible builds, different versions per environment | Always commit `package-lock.json` / `pnpm-lock.yaml` |
| Running `npm install` in CI (not `ci`) | Lockfile can be modified, non-deterministic | Always `npm ci` / `pnpm install --frozen-lockfile` in CI |

## 9. Prototype Pollution

| Mistake | Impact | Fix |
|---------|--------|-----|
| Deep-merging user-controlled objects | `__proto__` manipulation, property injection, potential RCE | `Object.create(null)` for maps, sanitize keys |
| `Object.assign`/spread from untrusted input | Prototype chain poisoned for all objects | Input validation, strip `__proto__`/`constructor`/`prototype` keys |
| Lodash `_.merge`/`_.defaultsDeep` on user data | Known prototype pollution vector | Update to patched version, validate input shape first |

## 10. Resource Management

| Mistake | Impact | Fix |
|---------|--------|-----|
| No graceful shutdown (SIGTERM handling) | Requests dropped, data corruption, incomplete writes | Signal handler: drain connections, flush queues, exit |
| Connection starvation from slow client drain | Pool exhaustion, new requests rejected | Query timeouts, dedicated pools per priority |
| No connection pooling for DB/HTTP | New connection per request (TCP + TLS + auth overhead) | Pool with min/max, monitor saturation |
| File descriptors never closed | fd exhaustion, `EMFILE` errors under load | `try/finally`, `using` keyword, explicit `.close()` |
| Missing health check endpoint | Load balancer sends traffic to unhealthy instances | `/health` with DB/dependency checks, readiness vs liveness |
| No circuit breaker for downstream services | Cascading failures, all retries hit dead service | Circuit breaker pattern (`cockatiel`, `opossum`) |

---

## Sources

- Node.js documentation: Event Loop, Streams, ESM (nodejs.org/docs)
- Matteo Collina - Streams, Backpressure, and Performance talks (NodeConf, Node.js Collaborator Summit)
- Snyk - JavaScript Security Best Practices (snyk.io/blog)
- Socket.dev - Supply Chain Security research (socket.dev/blog)
- Next.js documentation: App Router, Server Components, Caching (nextjs.org/docs)
- James Snell (Node.js TSC) - ESM/CJS Interop and Worker Threads
- Node.js Best Practices (github.com/goldbergyoni/nodebestpractices)
- V8 Blog - Memory management, GC pauses (v8.dev/blog)
- OWASP - Prototype Pollution, ReDoS (owasp.org)
- Evan You, Sindre Sorhus - ESM migration guides and tooling
