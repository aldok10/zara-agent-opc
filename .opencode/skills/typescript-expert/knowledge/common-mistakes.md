---
type: fact
title: "TypeScript Common Mistakes - Production Lessons"
---

# TypeScript Common Mistakes - Production Lessons

Runtime and architecture mistakes from production systems. Complements gotchas.md (type system traps).

## 1. Node.js Runtime Mistakes

| Mistake | What Happens | Fix/Prevention |
|---------|--------------|----------------|
| Synchronous file I/O in request path | Event loop blocks, all concurrent requests stall. 100ms `readFileSync` = 100ms freeze for every user | Use `fs/promises`. If sync needed (startup config), do it once at boot |
| JSON.parse on large payloads without streaming | Allocates full string + parsed object in memory. 50MB payload = OOM kill | Use streaming JSON parsers (`stream-json`, `JSONStream`). Set `--max-old-space-size` as safety net |
| Not limiting concurrent connections/work | Memory grows unbounded under load. Process crashes or gets OOM-killed | Use `p-limit`, semaphores, or worker pools. Set connection pool max |
| Forgetting `server.close()` on SIGTERM | Connections drop mid-request during deploys. Health checks pass while draining | Graceful shutdown: stop accepting, drain in-flight, close DB pools, then `process.exit(0)` |
| Leaking event listeners | `MaxListenersExceededWarning`, then memory leak. Often from re-subscribing in loops | Always `removeListener`/`off` in cleanup. Use `AbortController` for cancelable subscriptions |
| Unhandled promise rejections | Silent failures in Node 16+; crashes in Node 22+ (`--unhandled-rejections=throw` default) | Global handler + `no-floating-promises` lint rule. Log and exit on unrecoverable |
| Stream backpressure ignored | Producer floods consumer. Memory spikes, data loss, or crash | Always check `writable.write()` return value. Use pipeline/pipe which handles backpressure. Use `highWaterMark` |
| Creating child processes per request | Process spawn is expensive (fork ~30ms). Under load, system runs out of PIDs | Use worker threads for CPU work. Pool child processes. Rate-limit spawns |

## 2. Async Patterns Gone Wrong

| Mistake | What Happens | Fix/Prevention |
|---------|--------------|----------------|
| `Promise.all` with no partial failure handling | One rejection kills all. Completed work is wasted. No partial results | Use `Promise.allSettled` when you need all results. Or wrap individual promises with catch |
| Floating promises (no await, no catch) | Rejection goes unhandled. Error disappears. State corrupts silently | `@typescript-eslint/no-floating-promises`. Prefix intentional fire-and-forget with `void` |
| `async` function in `Array.forEach` | forEach ignores returned promise. Iterations run in parallel unintentionally, no await point | Use `for...of` for sequential, `Promise.all(arr.map(...))` for parallel |
| Race condition: read-modify-write without lock | Two concurrent handlers read same state, both write. Last write wins, first is lost | Use mutex/semaphore (`async-mutex`), optimistic locking (version field), or queue serialization |
| Retry without exponential backoff | Thundering herd. Service stays down because every client retries simultaneously | Exponential backoff + jitter. Circuit breaker for cascading failures |
| `setTimeout` in async flow without cleanup | Timer fires after context is gone. Writes to closed connections, stale state | Store timer ref and `clearTimeout` on abort/cleanup. Use `AbortSignal.timeout()` |
| Deadlock from nested locks or pool exhaustion | Two operations each hold a resource the other needs. System freezes | Consistent lock ordering. Connection pool size > max concurrent transactions. Timeout on acquire |
| `await` inside loop when parallelizable | Sequential when parallel is safe. N items take N * latency instead of max(latency) | `Promise.all` for independent items. `p-limit` for bounded concurrency |

## 3. ESM/CJS Interop Hell

| Mistake | What Happens | Fix/Prevention |
|---------|--------------|----------------|
| Dual package hazard (same package loaded as both ESM and CJS) | Two separate module instances. Singletons break, `instanceof` fails across boundaries | Single format per package. Use `exports` field to enforce one entry. Test with both consumer types |
| Missing `.js` extension in ESM imports | Works in bundler, fails in Node ESM runtime. `ERR_MODULE_NOT_FOUND` | Always use `.js` extension in source (even for `.ts` files in ESM). Or use bundler/loader |
| Using `__dirname`/`__filename` in ESM | `ReferenceError: __dirname is not defined` | `import.meta.dirname` (Node 21.2+) or `path.dirname(fileURLToPath(import.meta.url))` |
| `require()` of ESM module | `ERR_REQUIRE_ESM`. CJS cannot synchronously import ESM | Dynamic `import()` from CJS (returns promise). Or compile ESM dep to CJS |
| Conditional exports misconfigured | Wrong entry point loaded. Types don't match runtime code. Tests pass, production breaks | Test with `node --conditions` flag. Verify with `npm pack` + consumer project. Use `attw` to validate |
| `"type": "module"` breaks dependencies | Some deps ship CJS-only code, fail when imported from ESM context | Use `--experimental-require-module` (Node 22+). Or keep CJS and use `.mts` for ESM files |
| Top-level await blocking module graph | Other modules wait for this module to resolve. Slow startup if network call at import time | Move async init into explicit `init()` function called at application start |
| `tsconfig` module setting doesn't match runtime | `"module": "ESNext"` but runtime is CJS. Compiled output has `import` statements that Node CJS rejects | Match `module`/`moduleResolution` to actual runtime. Use `"module": "Node16"` or `"NodeNext"` |

## 4. API Design Mistakes

| Mistake | What Happens | Fix/Prevention |
|---------|--------------|----------------|
| Over-typing (exact runtime types in interfaces) | Every API change is breaking. Consumers coupled to implementation shape | Expose minimal interfaces. Use `Pick`/`Omit` for public types. Version your API types |
| Barrel files (`index.ts` re-exports) at scale | Tree-shaking fails. Importing one util loads entire module graph. Build times explode | Direct imports. Remove barrel files in libraries. Use `sideEffects: false` |
| Circular dependencies | Undefined imports at runtime (half-initialized module). Works in dev, breaks in production build | Dependency graph tools (`madge`). Extract shared code to leaf module. Lazy `import()` |
| Leaky abstraction: exposing ORM/DB types to API layer | Schema change = API break. Consumers depend on internal field names, nullable patterns | Separate DTO/response types from domain/DB types. Map explicitly at boundaries |
| Default exports everywhere | Refactoring renames silently (import can use any name). Auto-import inconsistent | Named exports. Reserve default for single-purpose modules (React components) |
| Throwing from library code without typed errors | Consumer has no idea what to catch. `catch (e: unknown)` gives no useful narrowing | Return `Result<T, E>` or throw typed error classes. Document error types in JSDoc |
| Generic function signatures that are too broad | `<T extends object>` accepts anything. No useful type narrowing for consumers | Constrain generics to the minimum useful shape. Prefer overloads for distinct cases |
| Mutable public state (exported `let`, shared object) | Any consumer can mutate, breaks encapsulation. Race conditions in concurrent handlers | Export functions, not state. Use `Object.freeze` for constants. Immutable patterns |

## 5. Error Handling Anti-patterns

| Mistake | What Happens | Fix/Prevention |
|---------|--------------|----------------|
| `catch (e) {}` (catch and ignore) | Errors disappear. Bugs are invisible. Debugging becomes archaeology | At minimum: log. Better: rethrow or return typed error. Lint rule: `no-empty` |
| Catching `Error` base class when specific handling needed | All errors treated the same. Transient network error handled like validation error | Custom error classes with `instanceof` checks. Or error codes on a base class |
| No error boundary in async middleware chain | One unhandled error crashes the process. Express: unhandled async = hung request | Global error middleware. `express-async-errors` or wrap handlers. Fastify handles natively |
| Retry without idempotency | Network timeout but request succeeded. Retry = duplicate. Double charge, double write | Idempotency keys for mutations. Check if operation already completed before retry |
| Logging error without context | `console.error(e.message)` - no request ID, no user, no input that caused it | Structured logging. Include correlation ID, relevant input, operation name |
| Wrapping errors without preserving cause | Stack trace lost. Original error context gone. Debugging requires reproducing | Use `new Error("msg", { cause: originalError })`. Chain preserves full trace |
| Using exceptions for control flow | Throw/catch is expensive (stack capture). Pollutes error monitoring with expected "errors" | Return discriminated unions or result types for expected failures. Reserve throw for unexpected |
| Missing timeout on external calls | HTTP call hangs forever. Connection pool exhausted. Cascading failure | Always set timeout: `fetch` with `AbortSignal.timeout()`, DB query timeouts, gRPC deadlines |

## 6. Testing Mistakes

| Mistake | What Happens | Fix/Prevention |
|---------|--------------|----------------|
| Mocking everything (unit test theater) | Tests pass, production breaks. Mocks drift from real behavior. False confidence | Test behavior at boundaries. Integration tests for I/O. Mock only what you don't own |
| Runtime type checking in tests (`typeof`, `instanceof`) | Testing TypeScript's compiler job. Brittle, adds no confidence about behavior | Test behavior and outputs. Trust the type system for shape. Test runtime validation separately |
| Snapshot abuse (large object snapshots) | Any change triggers snapshot update. Reviewers rubber-stamp diffs. Tests verify nothing | Small, focused snapshots. Prefer explicit assertions. Snapshot only stable serialization formats |
| Flaky async tests (timing-dependent) | Random CI failures. Team ignores test results. Skip/retry culture | Await specific conditions, not `setTimeout`. Use fake timers. Increase timeouts only as last resort |
| No test isolation (shared state between tests) | Tests pass in isolation, fail together. Order-dependent. Parallel execution impossible | Fresh state per test. `beforeEach` reset. Separate DB per test or transaction rollback |
| Testing private methods directly | Refactoring internals breaks tests. Tests coupled to implementation, not behavior | Test through public API. If private method needs direct testing, extract to separate module |
| Missing edge cases in async error paths | Happy path tested, error handling untested. Errors in production hit untested code | Test: timeout, rejection, partial failure, retry exhaustion, concurrent error |
| Slow test suite (30s+ for unit tests) | Developers skip tests locally. CI feedback loop too slow. Tests run only before merge | In-memory for unit tests. Parallelize. Split unit/integration. Profile and fix slow tests |

## 7. Performance Traps

| Mistake | What Happens | Fix/Prevention |
|---------|--------------|----------------|
| N+1 queries (fetch list, then fetch each related item) | 100 items = 101 DB queries. Linear latency growth. DB connection pool exhaustion | Batch queries: `WHERE id IN (...)`, DataLoader pattern, eager loading in ORM |
| No response streaming for large datasets | Server buffers entire result in memory. Client waits for full response. TTFB spikes | Use `Transfer-Encoding: chunked`, Node streams, async iterators. Stream from DB cursor |
| Unbounded in-memory cache | Cache grows forever. No eviction. Memory leak disguised as optimization | LRU with max size. TTL expiry. Monitor cache size. Use external cache (Redis) for large datasets |
| Re-rendering entire React tree on context change | Single context value change re-renders all consumers. UI janks on frequent updates | Split contexts by update frequency. Use `useMemo`/selectors. State management library for fine-grained |
| Bundle includes server code (secret leak risk) | Server-only imports pulled into client bundle. API keys, DB connections exposed | `"use server"` / `"use client"` boundaries. Separate packages. Bundle analyzer in CI |
| Synchronous crypto operations | `crypto.pbkdf2Sync` blocks event loop for 100ms+. All requests stall during hashing | Use async variants: `crypto.pbkdf2`, `crypto.scrypt`. Or offload to worker thread |
| Creating objects/closures in hot loops | GC pressure from millions of short-lived allocations. GC pauses cause latency spikes | Object pooling. Pre-allocate. Reuse buffers. Profile with `--trace-gc` |
| No connection pooling for DB/HTTP | New connection per request. TCP handshake + TLS + auth per query. Latency and resource waste | Pool connections. Set pool min/max. Monitor pool saturation. Reuse HTTP agents |

## 8. Security

| Mistake | What Happens | Fix/Prevention |
|---------|--------------|----------------|
| Prototype pollution via `Object.assign`/spread from user input | Attacker sets `__proto__` properties. Pollutes all objects. RCE possible | Validate/sanitize input. Use `Object.create(null)` for maps. Freeze prototypes. Use `Map` |
| ReDoS (catastrophic regex backtracking) | Crafted input makes regex take exponential time. Event loop frozen. DoS | Avoid nested quantifiers. Use `re2` library. Set timeout on regex operations. Test with long inputs |
| SSRF via user-controlled URLs | Server fetches attacker's URL. Internal network scanning. Cloud metadata endpoint access | Allowlist domains/IPs. Block private ranges. Validate URL scheme. Use DNS rebinding protection |
| Secrets in environment logged/exposed | `console.log(process.env)` in debug. Error serialization includes env. Bundle includes `process.env` | Named env access only. Redact in logs. Use secret manager. Never spread `process.env` |
| npm supply chain attack (typosquatting, malicious postinstall) | Malicious package executes code on install. Exfiltrates env/secrets. Backdoor in production | Lock dependencies. Review new deps. Use `--ignore-scripts`. Audit regularly. Pin exact versions |
| Path traversal via user input in file operations | `readFile(userInput)` reads `/etc/passwd`. Arbitrary file access | `path.resolve` + validate within allowed directory. Never concatenate user input into paths |
| Missing rate limiting on auth endpoints | Brute force attacks. Credential stuffing. Account takeover | Rate limit by IP + account. Exponential lockout. CAPTCHA after N failures |
| JWT stored in localStorage | XSS = token theft. No expiry enforcement client-side | HttpOnly secure cookies. Short-lived access tokens. Refresh token rotation |

## 9. Monorepo/Build Mistakes

| Mistake | What Happens | Fix/Prevention |
|---------|--------------|----------------|
| `tsconfig` path aliases not resolved at runtime | TS compiles fine, Node crashes: `Cannot find module '@app/utils'` | `tsc-alias`, `tsconfig-paths`, or bundler resolves. Paths are compile-time only without tooling |
| `extends` in tsconfig not inheriting as expected | Child overrides `compilerOptions` entirely instead of merging. Strict settings lost | `compilerOptions` merges shallowly. `include`/`exclude` are NOT inherited. Be explicit |
| `package.json` `exports` field missing types condition | Consumers see `any` types. IDE has no intellisense for your library | Add `"types"` condition in exports map. Test with `attw` (Are The Types Wrong) |
| Workspace dependencies using `*` version | Non-deterministic resolution. Different versions in different lockfile states | Use `workspace:*` (pnpm/yarn) which resolves to exact version. Or pin explicitly |
| Build output not matching `package.json` entry points | `"main": "dist/index.js"` but build outputs to `build/`. Package publishes but consumers get 404 | CI step: `npm pack` + extract + verify entry points resolve. Script to check before publish |
| Shared config package changes break all consumers | Updating eslint config or tsconfig base requires all packages to rebuild/retest | Version shared configs. Changesets for coordinated updates. Test config changes against all consumers |
| Dev dependencies in production bundle | `devDependencies` types used in public API. Or bundler includes dev-only packages | Separate concerns: runtime deps in `dependencies`. Verify bundle content with size analysis |
| Watch mode + monorepo = stale builds | Package A changes, package B has stale cached build of A. Symptoms appear random | Use project references with `--build` mode. Or bundler with proper watch of workspace deps |

## 10. Next.js/React Production Mistakes

| Mistake | What Happens | Fix/Prevention |
|---------|--------------|----------------|
| Hydration mismatch (server HTML differs from client render) | React warns and re-renders entire subtree. Flash of wrong content. Performance hit | No `Date.now()`, `Math.random()` in render. Use `suppressHydrationWarning` only for timestamps. `useId` for dynamic IDs |
| Server/client boundary confusion | Server component imports client hook. Build error or runtime crash. Or client component accidentally becomes server-rendered | `"use client"` at boundary. Keep state/effects in client components. Props must be serializable across boundary |
| Fetching in client when server component suffices | Waterfall: server renders shell, client mounts, fetches data, re-renders. Slow TTFB | Fetch in server components. Pass data down. Use `Suspense` for streaming |
| Cache not invalidated after mutation | `revalidatePath`/`revalidateTag` missing after write. Stale data shown until TTL expires | Call `revalidatePath` in server actions after mutations. Tag-based revalidation for related data |
| Layout re-mounting on navigation | State lost between pages because layout is inside page, not in `layout.tsx` | Shared state goes in layout.tsx. Pages are children. Layout persists across same-segment navigation |
| Large client bundle from server-only imports | ORM, node crypto, or server utils imported in shared file. Client bundle explodes or crashes | `server-only` package to mark modules. Check bundle with `@next/bundle-analyzer`. Separate server/client code |
| Middleware doing heavy computation | Middleware runs on every request (including static). CPU work here = global latency | Middleware for lightweight checks (auth, redirect). Move heavy logic to API routes or server components |
| Missing `loading.tsx` / `error.tsx` boundaries | Unhandled errors crash the page. No loading state during navigation. Broken UX | Add error.tsx at route segment level. loading.tsx for instant navigation feedback. Global fallback at root |
