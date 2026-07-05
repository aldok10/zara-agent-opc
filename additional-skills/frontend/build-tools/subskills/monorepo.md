# Monorepo

## Activation

Turborepo setup, pnpm workspaces, internal packages, changesets, shared configs, CI caching.

## Core Principles

- pnpm workspaces for dependency management. Strict mode prevents phantom deps.
- Turborepo for task orchestration: caching, parallelism, topological ordering.
- Internal packages: shared code that isn't published. Use `"main": "./src/index.ts"` for source sharing.
- Changesets for versioning published packages. Not needed for internal-only packages.
- Remote caching (Vercel/custom) saves CI time by sharing build outputs.

## Decision Table

| Need | Solution |
|------|----------|
| Task orchestration | Turborepo |
| Package management | pnpm workspaces |
| Versioning/publishing | Changesets |
| Shared tsconfig | `@repo/typescript-config` internal package |
| Shared ESLint | `@repo/eslint-config` internal package |
| Shared UI components | `@repo/ui` internal package |
| Dev utilities | `@repo/utils` internal package |

## Structure

```
monorepo/
├── apps/
│   ├── web/           # Next.js app
│   ├── docs/          # Documentation site
│   └── api/           # Backend service
├── packages/
│   ├── ui/            # Shared component library
│   ├── utils/         # Shared utilities
│   ├── tsconfig/      # Shared TypeScript configs
│   └── eslint-config/ # Shared ESLint configs
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

## Patterns

### pnpm-workspace.yaml

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### Root package.json

```json
{
  "name": "monorepo",
  "private": true,
  "scripts": {
    "build": "turbo build",
    "dev": "turbo dev",
    "lint": "turbo lint",
    "test": "turbo test",
    "clean": "turbo clean"
  },
  "devDependencies": {
    "turbo": "^2.0.0"
  },
  "packageManager": "pnpm@9.0.0"
}
```

### Internal Package (no build step)

```json
{
  "name": "@repo/ui",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./button": "./src/button.tsx"
  },
  "peerDependencies": {
    "react": "^19.0.0"
  }
}
```

### turbo.json Task Dependencies

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["build"]
    },
    "clean": {
      "cache": false
    }
  }
}
```

### Filtering

```bash
# Run dev only for web app and its dependencies
pnpm turbo dev --filter=web...

# Build only packages that changed since main
pnpm turbo build --filter='...[main]'

# Run tests for a specific package
pnpm turbo test --filter=@repo/ui
```

## Anti-patterns

- Publishing internal packages  -  they don't need versions or build steps.
- Circular dependencies between packages  -  restructure.
- `*` version ranges for workspace deps  -  use `workspace:*`.
- Running all tasks sequentially in CI  -  Turborepo parallelizes.
- Not using remote caching  -  wasted CI minutes.
