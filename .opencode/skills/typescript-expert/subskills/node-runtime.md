# Subskill: Node 24+ / Bun / ESM Runtime

## ESM is the default now. Get it right.

- `package.json`: `"type": "module"`. This makes `.js` files ESM. Without it you're in CJS land and half your imports fight you.
- NodeNext imports need the **`.js` extension** even for `.ts` source: `import { x } from "./util.js"` (yes, `.js` pointing at `util.ts`). This trips everyone once.
- `import type` for types under `verbatimModuleSyntax`. Runtime imports vs type imports are now explicit.
- No `require()` in ESM. Use `import`, or `createRequire` if you must interop with a CJS-only dep.

## package.json exports (libraries)

```jsonc
{
  "type": "module",
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" },
    "./sub": { "types": "./dist/sub.d.ts", "import": "./dist/sub.js" }
  }
}
```
`exports` is the modern gate: controls what's importable, maps types + runtime. `types` must come first in each condition. No `exports` = your internals are public API by accident.

## Node 24+ native TypeScript

- Node strips types and runs `.ts` directly (type stripping). **It does NOT type-check.** You still need `tsc --noEmit` in CI, or Node happily runs type-broken code.
- `erasableSyntaxOnly: true` bans constructs Node can't strip: `enum`, `namespace` with runtime, parameter properties (`constructor(private x)`). Aligns your code with what Node can run.
- Full ESM, top-level await, `node:` prefix for builtins (`import { readFile } from "node:fs/promises"`).

## Bun

- Runs `.ts` and `.tsx` directly, fast. `moduleResolution: "bundler"`.
- `bun test` built-in (Vitest-compatible-ish API). `Bun.serve`, `Bun.file`, native SQLite.
- Still run `tsc --noEmit` for real type checking; Bun executes, doesn't check.

## Async patterns

- `Promise.all` (fail-fast parallel), `Promise.allSettled` (partial-failure OK), `Promise.race` (first wins), `Promise.any` (first success).
- `AbortController` + `AbortSignal` for cancellation/timeouts: `fetch(url, { signal: AbortSignal.timeout(5000) })`.
- No floating promises. `await`, `void`, or `.catch()`. Enforce with `no-floating-promises`.
- Worker threads for CPU-bound; the event loop is single-threaded.

## Common pitfalls

- `__dirname`/`__filename` don't exist in ESM. Use `import.meta.dirname` (Node 20.11+) or `fileURLToPath(import.meta.url)`.
- JSON imports need `with { type: "json" }` (import attributes) in strict ESM.
- Dual CJS/ESM packages are painful; ship ESM-only if you can, it's the future.
