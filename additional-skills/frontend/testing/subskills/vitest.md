---
type: subskill
name: vitest
trigger: "Vitest config, unit tests, integration tests, coverage, browser mode"
---

# Vitest

## Activation

User needs unit/integration tests, test configuration, coverage setup, or browser-mode testing.

## Core Principles

- Zero-config for Vite projects; explicit config for non-Vite
- Workspace mode for monorepos (separate configs per package)
- Browser mode for real DOM testing (no jsdom quirks)
- In-source testing for utility functions
- Coverage via v8 (fast) or istanbul (accurate)

## Configuration Decision Table

| Scenario | Config |
|----------|--------|
| Vite project, single package | `vitest.config.ts` extending vite config |
| Monorepo | `vitest.workspace.ts` with per-package configs |
| Non-Vite (Next.js etc) | Standalone `vitest.config.ts` with plugins |
| Real DOM needed | `browser: { enabled: true, provider: 'playwright' }` |
| React components | `environment: 'jsdom'` + `@testing-library/react` |
| Node utilities | `environment: 'node'` (default) |

## Patterns

### Basic config

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      thresholds: { statements: 80, branches: 75, functions: 80, lines: 80 },
    },
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
```

### Workspace config

```ts
import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  'packages/*/vitest.config.ts',
  {
    test: {
      name: 'unit',
      include: ['src/**/*.unit.test.ts'],
      environment: 'node',
    },
  },
  {
    test: {
      name: 'components',
      include: ['src/**/*.component.test.tsx'],
      environment: 'jsdom',
    },
  },
]);
```

### Setup file

```ts
// src/test/setup.ts
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
```

### Snapshot best practices

```ts
// Inline snapshots for small, stable values
expect(formatCurrency(1234.5)).toMatchInlineSnapshot(`"$1,234.50"`);

// File snapshots ONLY for serialized structures you actively review
expect(schema).toMatchSnapshot();

// Update: npx vitest --update
```

### Browser mode

```ts
// Vitest 3.x
export default defineConfig({
  test: {
    browser: {
      enabled: true,
      provider: 'playwright',
      instances: [{ browser: 'chromium' }],
    },
  },
});
```

```ts
// Vitest 4+ (stable Oct 2025)
// - provider is now an imported function, not a string
// - defineWorkspace deprecated; use `projects` config instead
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

export default defineConfig({
  test: {
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
    },
  },
});
```

> **Vitest 4 migration notes:**
> - `defineWorkspace` is deprecated. Use `projects` array in root config instead.
> - Browser `provider` changed from a string (`'playwright'`) to a function call (`playwright()` from `@vitest/browser-playwright`).

## Coverage Commands

```bash
# Run with coverage
npx vitest run --coverage

# Watch mode (no coverage  -  too slow)
npx vitest

# Single file
npx vitest run src/utils/format.test.ts
```
