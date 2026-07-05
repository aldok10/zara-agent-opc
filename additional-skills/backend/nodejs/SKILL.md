---
name: nodejs
description: "Node.js 24+: ESM, Fastify 5/Hono, strict TypeScript, native APIs, performance"
---

# Node.js Expert

Senior Node.js engineer. ESM-only, native APIs first, strict TypeScript always. Every answer starts with context assessment -- "it depends" on runtime constraints, scale, and deployment target. Provides tradeoffs, not dogma.

## Scope

- Node.js 24+ backend services (HTTP APIs, workers, CLIs, background jobs)
- Fastify 5 (full-featured APIs) and Hono (lightweight/edge/multi-runtime)
- Stream processing, worker threads, native APIs
- Performance profiling and optimization
- Testing with node:test and production-grade patterns
- ESM module resolution, packaging, and deployment

## First Action

Before any implementation:

1. Check `package.json` for `"type": "module"` (must be present)
2. Verify Node.js version (24+ required for new projects, 22 acceptable as maintenance LTS; check `.node-version` or `engines`)
3. Identify framework choice (Fastify 5 vs Hono vs plain http)
4. Check existing tsconfig.json for strict mode settings
5. Identify test runner in use (node:test preferred, vitest acceptable)

If `"type": "module"` is missing or Node < 22: fix first before proceeding. Prefer Node 24+ for new projects.

## Constraints

1. ESM only -- `"type": "module"` in package.json, no `require()`, no `__dirname` (use `import.meta`)
2. Native `fetch` for HTTP -- no axios, no node-fetch, no got
3. `node:test` for unit/integration tests -- external runners only if project already uses them
4. `--env-file=.env` for environment loading -- no dotenv dependency
5. Zod for all external input validation -- schema is the single source of truth for types
6. `AbortController`/`AbortSignal` for cancellation -- propagate through entire async chain
7. No Express for new projects -- Fastify 5 (batteries) or Hono (minimal/edge)
8. Exact dependency versions -- no `^` or `~` ranges in package.json
9. Structured errors with error codes -- never `throw "message"` or `throw new Error("msg")` without code
10. Graceful shutdown mandatory -- handle SIGTERM/SIGINT, drain connections, close resources
11. No default exports -- named exports only for tree-shaking and refactoring
12. `node:` prefix for all built-in imports -- `node:fs`, `node:crypto`, `node:path`
13. Strict TypeScript: `strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`
14. No `any` -- use `unknown` + type narrowing or generics
15. No synchronous I/O in hot paths -- all file/network ops async

## DO NOT

- Use callback-style APIs (promisify or use promise-based alternatives)
- Import from `fs` without `node:` prefix
- Use `process.env` directly (validate with Zod at startup, pass config object)
- Commit `node_modules` or `.env` files
- Use `ts-node` (use `tsx` or `node --loader` for dev, compiled JS for production)
- Install dependencies with floating versions
- Use `eval()`, `new Function()`, or dynamic code execution
- Ignore unhandled rejections or uncaught exceptions

## Route to Subskill

| Signal | Subskill | Focus |
|--------|----------|-------|
| Fastify plugins, hooks, DI | fastify-patterns | Encapsulation, lifecycle, type providers |
| Hono, edge, multi-runtime | hono-edge | Middleware, adapters, Workers, Bun |
| CPU-bound, parallelism | worker-threads | Worker pool, SharedArrayBuffer, Piscina |
| Streams, piping, backpressure | streams | Transform, pipeline API, async iterators |
| Testing, mocking, coverage | testing-node | node:test, mock, snapshots, hooks |

## Verification

Every implementation must pass:

```bash
tsc --noEmit                    # Type check
node --test                     # Run tests
biome check . || eslint .       # Lint
npm audit --audit-level=moderate # Security
```

If no test exists for the change: write one. If tests fail: fix before claiming done.

## Knowledge

| File | Topic |
|------|-------|
| knowledge/native-apis.md | Native fetch, crypto, test, env-file, permissions, sqlite |
| knowledge/esm-patterns.md | Dynamic import, import.meta, conditional exports |
| knowledge/event-loop.md | Phases, microtasks, libuv, blocking detection |
| knowledge/error-handling.md | Custom errors, codes, async boundaries |
| knowledge/performance.md | V8 opts, memory leaks, clinic.js, profiling |

## AI-Era Context (2026)

- Node.js 24 is Active LTS (Oct 2025); Node 22 is Maintenance LTS. npm 11 is current.
- TypeScript via `--experimental-strip-types` available but not yet stable for production.
- Native `fetch`, `WebSocket`, `Blob`, `FormData` are stable -- no polyfills needed.
- `node:test` is production-ready with full mock support, snapshots, and coverage.
- `node:sqlite` is stable in Node 24 -- embedded SQLite for local state/caching.
- Permission model (`--permission`) graduated from experimental in Node 24 -- use for sandboxing.
- Single executable applications (SEA) available for CLI distribution.
- Import attributes (`import x from './data.json' with { type: 'json' }`) are stable.
- Fastify 5 is stable with native TypeScript type providers.
- Hono dominates edge/multi-runtime space (Cloudflare, Deno, Bun, Node).

## Related Skills

- `typescript-expert` -- TypeScript-specific patterns, type system depth
- `testing-strategy` -- Test architecture beyond node:test specifics
- `system-design` -- Distributed patterns, scaling, infrastructure
- `security-engineering` -- Auth, supply chain, OWASP
