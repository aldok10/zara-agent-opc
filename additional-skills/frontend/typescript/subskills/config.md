---
type: subskill
name: config
trigger: tsconfig, module resolution, path aliases, project references, strict flags, compilation
---

# TypeScript Config

TSConfig optimization for frontend projects. Strict by default, fast builds, correct module resolution.

## Activation

- Setting up a new TypeScript project
- Debugging module resolution issues
- Optimizing build speed with project references
- Configuring path aliases
- Enabling/understanding strict flags

## Core Principles

1. **Strict everything**: never weaken for convenience
2. **Module resolution matches runtime**: bundler for Vite/webpack, nodenext for Node
3. **Project references for monorepos**: isolate compilation units
4. **Path aliases must match bundler config**: TS aliases alone don't resolve at runtime

## Recommended Base Config

```jsonc
{
  "compilerOptions": {
    // Strict
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,

    // Module
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,

    // Emit
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,

    // Output
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

## Strict Flags Explained

| Flag | What It Does | Why It Matters |
|------|-------------|----------------|
| `strict` | Enables all strict checks | Baseline safety |
| `noUncheckedIndexedAccess` | Array/object index returns `T \| undefined` | Prevents runtime undefined errors |
| `exactOptionalPropertyTypes` | `prop?: string` means "missing" not "undefined" | Distinguishes absent from explicitly undefined |
| `noPropertyAccessFromIndexSignature` | Forces bracket notation for index signatures | Makes dynamic access explicit |
| `noImplicitOverride` | Requires `override` keyword | Catches accidental overrides |
| `verbatimModuleSyntax` | Import/export must match emit | Prevents CJS/ESM confusion |

## Module Resolution Decision Table

| Runtime/Bundler | moduleResolution | module |
|----------------|-----------------|--------|
| Vite / Webpack / esbuild | `bundler` | `ESNext` |
| Node.js (ESM) | `nodenext` | `nodenext` |
| Node.js (CJS legacy) | `node16` | `node16` |
| Library (dual CJS+ESM) | `nodenext` | `nodenext` |

## Path Aliases

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@lib/*": ["src/lib/*"],
      "@types/*": ["src/types/*"]
    }
  }
}
```

**Must also configure in bundler:**
```typescript
// vite.config.ts
import { resolve } from "path";
export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      "@components": resolve(__dirname, "src/components"),
      "@lib": resolve(__dirname, "src/lib"),
      "@types": resolve(__dirname, "src/types"),
    },
  },
});
```

## Project References (Monorepo)

```jsonc
// tsconfig.json (root)
{
  "references": [
    { "path": "packages/shared" },
    { "path": "packages/web" },
    { "path": "packages/api" }
  ],
  "files": [] // root doesn't compile anything
}

// packages/shared/tsconfig.json
{
  "compilerOptions": {
    "composite": true,
    "outDir": "dist",
    "rootDir": "src"
  }
}

// packages/web/tsconfig.json
{
  "compilerOptions": { ... },
  "references": [{ "path": "../shared" }]
}
```

Build with: `tsc --build` (incremental, dependency-aware)

## Framework-Specific Configs

### Vite + React
```jsonc
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "moduleResolution": "bundler",
    "types": ["vite/client"]
  }
}
```

### Next.js
```jsonc
{
  "compilerOptions": {
    "jsx": "preserve",
    "moduleResolution": "bundler",
    "plugins": [{ "name": "next" }],
    "incremental": true
  }
}
```

### Library Package
```jsonc
{
  "compilerOptions": {
    "moduleResolution": "nodenext",
    "module": "nodenext",
    "declaration": true,
    "declarationMap": true,
    "outDir": "dist"
  }
}
```

## Common Issues

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| "Cannot find module" | Wrong moduleResolution | Match to runtime (bundler/nodenext) |
| Path alias not resolving | Missing bundler config | Add alias to vite/webpack config |
| Slow builds in monorepo | No project references | Add `composite` + `references` |
| "implicitly has an 'any' type" | Missing @types package | `npm i -D @types/package` |
| ESM/CJS confusion | Missing verbatimModuleSyntax | Enable it, fix imports |

## Delegates To

- `generics`  -  for declaration files and type exports
- `utility-types`  -  for shared type definitions across packages
