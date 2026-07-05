# ESM Patterns

ECMAScript Modules in Node.js: the module system for all new projects. No CommonJS, no require().

## Setup

```jsonc
// package.json
{
  "type": "module",  // ALL .js files are ESM
  "exports": {
    ".": { "import": "./dist/index.js", "types": "./dist/index.d.ts" },
    "./utils": { "import": "./dist/utils.js", "types": "./dist/utils.d.ts" }
  },
  "files": ["dist"]
}
```

## Dynamic Import

```typescript
// Lazy loading -- only load when needed
const { heavy } = await import('./heavy-module.js');

// Conditional loading
const adapter = await import(`./adapters/${runtime}.js`);

// Loading JSON
const pkg = await import('./package.json', { with: { type: 'json' } });
// or using import attributes (Node 22+)
import config from './config.json' with { type: 'json' };
```

## import.meta

```typescript
// import.meta.url -- file:// URL of current module
console.log(import.meta.url); // file:///app/src/index.ts

// import.meta.dirname / import.meta.filename (Node 21+)
console.log(import.meta.dirname);  // /app/src
console.log(import.meta.filename); // /app/src/index.ts

// Fallback for older Node
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// import.meta.resolve -- resolve specifier to URL
const resolved = import.meta.resolve('./config.json'); // synchronous in Node 22+
```

## Top-Level Await

```typescript
// Works in ESM modules -- no async IIFE wrapper needed
const config = await loadConfig();
const db = await connectDatabase(config.databaseUrl);

export { db, config };
```

## Conditional Exports (Package entry points)

```jsonc
// package.json
{
  "exports": {
    ".": {
      "node": { "import": "./dist/node.js" },
      "default": { "import": "./dist/browser.js" }
    },
    "./worker": { "import": "./dist/worker.js" }
  }
}
```

Resolution order: most specific condition first. Node checks `node` > `import` > `default`.

## Dual Package Pattern (Avoid if possible)

```jsonc
// Only needed when supporting CJS consumers
{
  "exports": {
    ".": {
      "import": { "types": "./dist/index.d.ts", "default": "./dist/index.mjs" },
      "require": { "types": "./dist/index.d.cts", "default": "./dist/index.cjs" }
    }
  }
}
```

Recommendation: ESM-only for new packages. CJS consumers can use dynamic `import()`.

## Named Exports Only

```typescript
// GOOD -- tree-shakeable, refactorable
export function createServer(opts: ServerOptions): Server { /* ... */ }
export function createClient(opts: ClientOptions): Client { /* ... */ }
export type { ServerOptions, ClientOptions, Server, Client };

// BAD -- default exports
export default class Server { /* ... */ }
```

## Re-exports (Barrel files)

```typescript
// src/index.ts -- public API surface
export { createServer } from './server.js';
export { createClient } from './client.js';
export type { Config } from './config.js';

// Note: barrel files can hurt tree-shaking in large packages
// For internal code, import directly from the source module
```

## Interop with CJS dependencies

```typescript
// Named imports from CJS packages work in most cases
import { Router } from 'express'; // works if package has proper exports

// If named imports fail, use default + destructure
import pg from 'pg';
const { Pool } = pg;

// Or namespace import
import * as lodash from 'lodash';
```

## Module Resolution (tsconfig)

```jsonc
// tsconfig.json for ESM Node.js
{
  "compilerOptions": {
    "module": "Node16",          // or "NodeNext"
    "moduleResolution": "Node16", // or "NodeNext"
    "outDir": "dist",
    "rootDir": "src",
    // MUST use .js extension in imports even for .ts files
    // import { foo } from './utils.js';  <-- yes, .js even if source is .ts
  }
}
```

## File Extensions

- Always use explicit `.js` extensions in imports (even when source is `.ts`)
- TypeScript with `Node16` resolution requires this
- Directory imports (`./utils/`) do NOT work -- must specify file

```typescript
// Correct
import { helper } from './utils/helper.js';
import { config } from '../config/index.js';

// Wrong (will fail at runtime)
import { helper } from './utils/helper';
import { config } from '../config';
```
