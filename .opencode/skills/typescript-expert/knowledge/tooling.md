# TypeScript Tooling

## tsconfig.json

Strict options (recommended baseline):
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "verbatimModuleSyntax": true
  }
}
```

Module resolution:
- `"module": "NodeNext"` -- for Node.js (ESM + CJS interop)
- `"module": "ESNext"` -- for bundlers (Vite, webpack, esbuild)
- `"moduleResolution": "Bundler"` -- relaxed resolution for bundler environments

Composite projects (project references):
```json
{
  "compilerOptions": { "composite": true, "outDir": "dist" },
  "references": [{ "path": "../shared" }]
}
```

- `tsc --build` for incremental multi-project builds
- Each referenced project must have `composite: true`
- Enables cross-package type checking without publishing

## Biome

Replaces ESLint + Prettier in one tool (written in Rust):
```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.0/schema.json",
  "organizeImports": { "enabled": true },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "complexity": { "noForEach": "warn" },
      "suspicious": { "noExplicitAny": "error" }
    }
  },
  "formatter": {
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  }
}
```

Commands:
```bash
biome check .              # Lint + format check
biome check --write .      # Lint + format with auto-fix
biome ci .                 # CI mode (no writes, exits non-zero)
biome format --write .     # Format only
```

- 10-40x faster than ESLint
- IDE support via LSP (VS Code extension)
- Import sorting built-in
- Migration from ESLint: `biome migrate eslint`

## Build Tools

tsup (esbuild-powered bundler for libraries):
```typescript
import { defineConfig } from "tsup";
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  splitting: true,
  clean: true,
});
```

unbuild (zero-config, auto-infers from package.json):
```typescript
import { defineBuildConfig } from "unbuild";
export default defineBuildConfig({
  entries: ["src/index"],
  rollup: { emitCJS: true },
  declaration: true,
});
```

tsdown (next-gen tsup alternative, Rolldown-based):
- Faster builds via Rolldown (Rust-based Rollup)
- Same DX as tsup, drop-in replacement

tsx (TypeScript execute, for dev):
```bash
tsx src/server.ts            # Run TypeScript directly
tsx watch src/server.ts      # Watch mode
```

## Package Publishing

Dual CJS/ESM package.json:
```json
{
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
      "require": { "types": "./dist/index.d.cts", "default": "./dist/index.cjs" }
    },
    "./utils": {
      "import": { "types": "./dist/utils.d.ts", "default": "./dist/utils.js" },
      "require": { "types": "./dist/utils.d.cts", "default": "./dist/utils.cjs" }
    }
  },
  "files": ["dist"]
}
```

- `types` condition must come first in exports
- `files` array to control what gets published
- `npm pack --dry-run` to verify package contents
- `publint` and `arethetypeswrong` for validation
- Provenance via `--provenance` flag (npm 9.5+)

## Monorepo

Turborepo:
```json
{
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "test": { "dependsOn": ["build"] },
    "lint": {}
  }
}
```
- Remote caching (Vercel or self-hosted)
- `turbo run build test --filter=./apps/*`
- Topological task ordering

Nx:
- Project graph visualization
- Affected commands (only run on changed projects)
- Generators for scaffolding
- Distributed task execution

TypeScript project references:
- Zero-runtime-cost for type checking
- `tsc --build --watch` for incremental compilation
- Works without any external tool
- Best for pure TypeScript monorepos without bundling needs
