---
type: tool
title: "TypeScript Monorepo Setup Prompt"
---

# TypeScript Monorepo Setup Prompt

You are helping set up or restructure a TypeScript monorepo with proper project references, shared configs, and build orchestration.

## Input

**Tool:** {{nx | turborepo | pnpm_workspaces | yarn_workspaces | custom}}
**Package manager:** {{pnpm | yarn | npm}}
**Packages:** {{list of packages/apps and their relationships}}
**Build target:** {{library | app | mixed}}
**Shared needs:** {{eslint | tsconfig | prettier | testing | ui_components}}

## Directory Structure

```
monorepo/
├── package.json            # root workspace config
├── pnpm-workspace.yaml     # (pnpm) or workspaces in package.json
├── turbo.json              # (turborepo) or nx.json
├── tsconfig.base.json      # shared compiler options
├── packages/
│   ├── shared/             # shared library
│   │   ├── package.json
│   │   ├── tsconfig.json   # extends base, declares composite
│   │   └── src/
│   ├── api/                # backend app
│   │   ├── package.json
│   │   ├── tsconfig.json   # references shared
│   │   └── src/
│   └── web/                # frontend app
│       ├── package.json
│       ├── tsconfig.json   # references shared
│       └── src/
└── configs/
    ├── tsconfig/           # shared tsconfig presets
    ├── eslint/             # shared eslint config
    └── prettier/           # shared prettier config
```

## TypeScript Project References

### Base tsconfig (root)

```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "composite": true,
    "incremental": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true
  }
}
```

### Package tsconfig (extends base)

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "references": [
    { "path": "../shared" }
  ]
}
```

### Key Settings

- `composite: true` -- required for referenced projects
- `declarationMap: true` -- enables "go to source" across packages
- `incremental: true` -- faster rebuilds
- `references` -- declares build dependencies

## Build Orchestration

### Turborepo (turbo.json)

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["build"]
    },
    "lint": {},
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

### Nx (nx.json)

```json
{
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["{projectRoot}/dist"]
    },
    "test": {
      "dependsOn": ["build"]
    }
  },
  "namedInputs": {
    "default": ["{projectRoot}/**/*"],
    "production": ["default", "!{projectRoot}/**/*.spec.ts"]
  }
}
```

## Package Linking

### Internal Package Resolution

```json
// packages/shared/package.json
{
  "name": "@myorg/shared",
  "version": "0.0.0",
  "type": "module",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc --build",
    "dev": "tsc --build --watch"
  }
}

// packages/api/package.json
{
  "name": "@myorg/api",
  "dependencies": {
    "@myorg/shared": "workspace:*"
  }
}
```

### pnpm-workspace.yaml

```yaml
packages:
  - "packages/*"
  - "apps/*"
  - "configs/*"
```

## Shared Configuration Packages

### ESLint Config Package

```json
// configs/eslint/package.json
{
  "name": "@myorg/eslint-config",
  "type": "module",
  "exports": {
    ".": "./index.js",
    "./node": "./node.js",
    "./react": "./react.js"
  }
}
```

### TypeScript Config Package

```json
// configs/tsconfig/package.json
{
  "name": "@myorg/tsconfig",
  "files": ["base.json", "node.json", "react.json"]
}

// configs/tsconfig/node.json
{
  "extends": "./base.json",
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "target": "ES2022"
  }
}
```

## Setup Checklist

- [ ] Root workspace config (pnpm-workspace.yaml or package.json workspaces)
- [ ] Base tsconfig with `composite: true`
- [ ] Each package has own tsconfig extending base
- [ ] Project references declared for internal dependencies
- [ ] Package exports map configured for each library
- [ ] Build orchestrator configured (dependency ordering)
- [ ] Shared lint/format configs as workspace packages
- [ ] CI builds use `--filter` for affected packages only
- [ ] `.gitignore` excludes all `dist/` and `node_modules/`
- [ ] Root scripts for common operations (`build:all`, `test:all`, `lint:all`)

## Output Format

```
## Monorepo Structure
[directory tree]

## Configuration Files
### [file path]
[content]

## Dependency Graph
[package] -> [depends on]

## Build Commands
- Full build: [command]
- Single package: [command]
- Affected only: [command]
- Dev mode: [command]

## Migration Steps (if converting existing)
1. [step]
2. ...
```

## Rules

- `composite` must be true on any project that is referenced by another.
- Never use path aliases (`paths`) for cross-package imports in a monorepo. Use proper package references.
- Workspace protocol (`workspace:*`) ensures local resolution during development.
- Build order must respect the dependency graph. Use `^build` in Turborepo or `dependsOn` in Nx.
- Keep shared configs as separate workspace packages, not just files at root.
- Test that clean builds work (`rm -rf **/dist && build`).
