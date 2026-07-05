# Module Federation

## Activation

Module Federation 2.0, micro-frontends, shared dependencies, runtime remotes, federated types.

## Core Principles

- Module Federation = load code from another build at runtime. No deploy coupling.
- Host: the shell app that consumes remotes. Remote: the app that exposes modules.
- Shared deps: deduplicated at runtime. Version negotiation built-in.
- Federation 2.0 (via `@module-federation/enhanced`): type safety, manifest, runtime API.
- Use sparingly. Micro-frontends add complexity. Justify with team autonomy needs.

## When to Use

| Scenario | Module Federation? |
|----------|--------------------|
| Independent teams, own deploy cadence | Yes |
| Shared component library (same repo) | No  -  internal package |
| A/B testing different app versions | Yes |
| Single team, multiple apps sharing code | No  -  monorepo |
| Legacy app embedding modern widget | Yes |
| Performance-critical path | No  -  adds runtime overhead |

## Patterns

### Host Configuration (Vite + Module Federation 2.0)

```typescript
// host app: vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { ModuleFederationPlugin } from '@module-federation/enhanced/vite';

export default defineConfig({
  plugins: [
    react(),
    ModuleFederationPlugin({
      name: 'host',
      remotes: {
        remoteApp: {
          type: 'module',
          name: 'remoteApp',
          entry: 'http://localhost:3001/mf-manifest.json',
        },
      },
      shared: {
        react: { singleton: true, requiredVersion: '^19.0.0' },
        'react-dom': { singleton: true, requiredVersion: '^19.0.0' },
      },
    }),
  ],
});
```

### Remote Configuration

```typescript
// remote app: vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { ModuleFederationPlugin } from '@module-federation/enhanced/vite';

export default defineConfig({
  plugins: [
    react(),
    ModuleFederationPlugin({
      name: 'remoteApp',
      exposes: {
        './Button': './src/components/Button.tsx',
        './UserWidget': './src/features/user/UserWidget.tsx',
      },
      shared: {
        react: { singleton: true, requiredVersion: '^19.0.0' },
        'react-dom': { singleton: true, requiredVersion: '^19.0.0' },
      },
    }),
  ],
});
```

### Consuming Remote in Host

```typescript
// host app: src/App.tsx
import { lazy, Suspense } from 'react';

const RemoteButton = lazy(() => import('remoteApp/Button'));
const UserWidget = lazy(() => import('remoteApp/UserWidget'));

function App() {
  return (
    <div>
      <Suspense fallback={<div>Loading...</div>}>
        <RemoteButton label="From Remote" />
        <UserWidget userId="123" />
      </Suspense>
    </div>
  );
}
```

### Type Safety (Federation 2.0)

```typescript
// Remote generates types automatically with @module-federation/enhanced
// Host consumes via path mapping in tsconfig.json:
{
  "compilerOptions": {
    "paths": {
      "remoteApp/*": ["./@mf-types/remoteApp/*"]
    }
  }
}

// Run type extraction: npx @module-federation/enhanced extract-types
```

### Shared Dependency Configuration

```typescript
// Shared dep options:
shared: {
  react: {
    singleton: true,         // Only one version loaded
    requiredVersion: '^19.0.0',
    eager: false,            // true = bundled, false = async loaded
  },
  lodash: {
    singleton: false,        // Allow multiple versions
    requiredVersion: '^4.0.0',
  },
  '@tanstack/react-query': {
    singleton: true,         // Query cache must be single instance
    requiredVersion: '^5.0.0',
  },
}
```

## Production Considerations

- Fallback UI for when remotes are unreachable (network errors).
- Version pinning: use manifest-based remotes, not hardcoded URLs.
- CSS isolation: CSS modules or shadow DOM to prevent style leaks.
- Error boundaries around every remote component.
- Health checks: verify remote manifest accessible before lazy load.

## Anti-patterns

- Sharing everything  -  increases coupling, defeats purpose.
- No error boundaries  -  one remote failure crashes whole app.
- Eager loading all shared deps  -  eliminates code-splitting benefit.
- No version constraints  -  runtime crashes from incompatible versions.
- Using for code sharing within same team/repo  -  monorepo is simpler.
