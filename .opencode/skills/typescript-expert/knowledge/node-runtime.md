---
type: fact
title: "Node.js Runtime"
---
# Node.js Runtime

## Node.js 22-24 Features

Watch mode (built-in, no nodemon):
```bash
node --watch app.ts          # Restart on file changes
node --watch-path=src app.ts # Watch specific directory
```

Built-in test runner:
```bash
node --test                  # Run all test files
node --test --watch          # Watch mode for tests
node --test --coverage       # With coverage reporting
```

Permission model (22+):
```bash
node --experimental-permission --allow-fs-read=/app --allow-fs-write=/tmp app.js
node --allow-child-process --allow-worker app.js
```

Other notable features:
- `--env-file=.env` for loading environment variables
- `require()` of ES modules (22.x+, unflagged in 23+)
- WebSocket client (global `WebSocket`)
- `node --run <script>` as faster alternative to `npm run`
- Glob support: `fs.glob("**/*.ts")`
- Stable `node:sqlite` module (22.5+)

## ESM Migration

package.json setup:
```json
{
  "type": "module",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  }
}
```

Module resolution rules:
- `"type": "module"` makes `.js` files ESM by default
- Use `.cjs` extension for CommonJS files in ESM packages
- Relative imports require file extensions: `import { foo } from "./bar.js"`
- `__dirname` replacement: `import.meta.dirname` (21+) or `fileURLToPath(import.meta.url)`
- `require` replacement: `import.meta.require` (non-standard) or `createRequire`

tsconfig for ESM:
```json
{
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist"
  }
}
```

## Worker Threads

```typescript
import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";

if (isMainThread) {
  const worker = new Worker(new URL("./worker.ts", import.meta.url), {
    workerData: { input: largeDataset },
  });
  worker.on("message", (result) => console.log(result));
  worker.on("error", (err) => console.error(err));
} else {
  const result = heavyComputation(workerData.input);
  parentPort!.postMessage(result);
}
```

Use cases: CPU-intensive work (parsing, compression, crypto).
NOT for I/O -- use async/await for I/O.

Worker pool pattern:
- `workerpool` or `piscina` for managed thread pools
- Transferable objects (ArrayBuffer) for zero-copy data passing

## Performance

V8 optimization tips:
- Monomorphic functions (consistent argument types)
- Avoid `delete` operator (deoptimizes objects)
- Hidden class stability (initialize all properties in constructor)
- Use `Map`/`Set` over plain objects for dynamic keys

Memory management:
- `--max-old-space-size=4096` for large heaps
- `--expose-gc` + `global.gc()` for manual GC in specific scenarios
- `WeakRef` and `FinalizationRegistry` for caches
- Streaming over buffering for large data

## Native Node APIs

```typescript
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { pipeline } from "node:stream/promises";

const hash = createHash("sha256").update(data).digest("hex");
const id = randomUUID();

const response = await fetch("https://api.example.com/data");
await pipeline(response.body, createWriteStream("output.json"));
```

Key built-in modules:
- `node:fs/promises` -- async file operations
- `node:crypto` -- hashing, encryption, random values
- `node:test` -- test runner with describe/it/assert
- `node:stream/promises` -- pipeline, finished
- `node:util` -- parseArgs, styleText, promisify

## Bun and Deno

Bun:
- Drop-in Node replacement, significantly faster startup
- Built-in bundler, test runner, package manager
- Native SQLite via `bun:sqlite`
- `Bun.serve()` for HTTP (faster than node:http)

Deno:
- Secure by default (permissions required)
- Built-in TypeScript, formatter, linter, test runner
- Web standard APIs (fetch, Request, Response)
- `deno compile` for single-binary executables
- npm compatibility via `npm:` specifiers
