# TypeScript Migration Prompt

You are helping migrate a TypeScript project: either upgrading TS versions or converting from CJS to ESM.

## Input

**Migration type:** {{cjs_to_esm | version_upgrade | both}}
**Current TS version:** {{version}}
**Target TS version:** {{version}}
**Runtime:** {{node | bun | deno | browser}}
**Node version:** {{version}}
**Package manager:** {{npm | pnpm | yarn}}
**Module bundler:** {{none | webpack | vite | esbuild | rollup}}

## CJS to ESM Migration

### Phase 1: package.json

```json
{
  "type": "module",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  }
}
```

Checklist:
- [ ] Add `"type": "module"`
- [ ] Replace `"main"` with `"exports"` map
- [ ] Add `"types"` condition in exports
- [ ] Update `"files"` array if needed
- [ ] Add `.cjs` output if dual-publishing

### Phase 2: tsconfig.json

```json
{
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "target": "ES2022",
    "outDir": "./dist",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "verbatimModuleSyntax": true
  }
}
```

Key changes:
- [ ] `module`: `"NodeNext"` (or `"ESNext"` for bundlers)
- [ ] `moduleResolution`: `"NodeNext"` (or `"bundler"` for Vite/webpack)
- [ ] `verbatimModuleSyntax`: `true` (replaces `esModuleInterop` + `isolatedModules`)
- [ ] Remove `esModuleInterop` (handled by verbatimModuleSyntax)
- [ ] Remove `allowSyntheticDefaultImports`

### Phase 3: Import Statements

```typescript
// BEFORE (CJS-style)
import fs from "fs";
import { something } from "./utils";
const pkg = require("./package.json");

// AFTER (ESM)
import fs from "node:fs";
import { something } from "./utils.js";  // <-- .js extension required
import pkg from "./package.json" with { type: "json" };
```

Changes required:
- [ ] Add `.js` extension to all relative imports
- [ ] Add `node:` prefix to Node.js built-ins
- [ ] Replace `require()` with `import` or `createRequire()`
- [ ] Replace `__dirname`/`__filename` with `import.meta`
- [ ] Replace `module.exports` / `exports.` with `export`

```typescript
// __dirname replacement
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = dirname(fileURLToPath(import.meta.url));
```

### Phase 4: Dynamic Imports

```typescript
// BEFORE
const module = require(dynamicPath);

// AFTER
const module = await import(dynamicPath);
// Note: top-level await requires module context
```

### Phase 5: Dependencies

- [ ] Check each dependency supports ESM (look for `"exports"` in their package.json)
- [ ] CJS-only deps: use `import` (Node handles CJS interop) or `createRequire()`
- [ ] Update test runner config (Jest needs transform, Vitest is ESM-native)
- [ ] Update build scripts and CI

## Version Upgrade Guide

### To TypeScript 5.5+
- `isolatedDeclarations` -- add if publishing library types
- Inferred type predicates -- remove manual ones where TS infers correctly
- `@import` in JSDoc for type-only imports

### To TypeScript 5.7+
- `--rewriteRelativeImportExtensions` -- auto-rewrite `.ts` to `.js` in output
- Path rewriting for declaration files

### To TypeScript 5.8+
- `erasableSyntaxOnly` -- for Node.js `--experimental-strip-types`
- `require()` of ESM in `--module nodenext`

### To TypeScript 5.9+
- `--isolatedDeclarations` stable
- Narrowing improvements (less need for manual type guards)

### Breaking Change Checklist

- [ ] Run `tsc --noEmit` after upgrade -- note new errors
- [ ] Check deprecated compiler options removed
- [ ] Verify `strict` mode additions (each version tightens)
- [ ] Test declaration file output (`.d.ts`) still works for consumers
- [ ] Update `@types/*` packages to compatible versions

## Output Format

```
## Migration Plan
- Type: [CJS->ESM | Version X->Y | Both]
- Files affected: [count]
- Breaking changes: [list]
- Estimated effort: [hours]

## Changes by Category
### tsconfig.json
[diff]

### package.json
[diff]

### Import Updates
- [file]: [what changed]
- ...

### Dependency Issues
- [package]: [issue and resolution]

## Verification
- tsc --noEmit: [pass/fail]
- Tests: [pass/fail]
- Runtime: [verified working]

## Known Issues
- [anything that needs manual attention]
```

## Rules

- Always verify with `tsc --noEmit` after each phase.
- ESM requires file extensions in imports -- there is no workaround in Node.js without a bundler.
- `moduleResolution: "bundler"` is valid only if you always use a bundler. Raw Node.js needs `"NodeNext"`.
- Test both `import` and `require` paths if dual-publishing.
- Check that source maps still work after migration.
