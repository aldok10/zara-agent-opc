# Global State Patterns

## Activation

Deciding global vs local state, lifting state, component composition, state sharing patterns, prop drilling alternatives.

## Core Principles

- Default to local. Lift only when siblings need it. Go global only when distant components share it.
- Composition > context > global store. Each level adds coupling.
- Global state categories: auth, theme, feature flags, toast/notifications, layout. Everything else: local or URL.
- If two components need the same server data, that's not global state  -  it's a shared query key.

## Decision Tree: Where Does This State Live?

```
Is it server data (fetched from API)?
├── YES → TanStack Query / framework data loading
└── NO → Is it needed by only one component?
    ├── YES → Component local state
    └── NO → Is it needed by parent + children (same subtree)?
        ├── YES → Lift to nearest common ancestor
        └── NO → Is it URL-representable (filters, tabs, pages)?
            ├── YES → URL searchParams
            └── NO → Is it needed app-wide?
                ├── YES → Global store (Zustand/Pinia/signals)
                └── NO → Scoped context or module-level signal
```

## Patterns

### Composition Over Props (React)

```typescript
// BAD: Prop drilling
function App() {
  const [user, setUser] = useState<User | null>(null);
  return <Layout user={user}><Sidebar user={user}><Avatar user={user} /></Sidebar></Layout>;
}

// GOOD: Composition  -  pass rendered elements
function App() {
  const [user, setUser] = useState<User | null>(null);
  return (
    <Layout sidebar={<Sidebar avatar={<Avatar user={user} />} />}>
      <MainContent />
    </Layout>
  );
}
```

### Scoped Provider (React Context)

```typescript
// For subtree-scoped state that doesn't belong globally
const FormContext = createContext<FormState | null>(null);

function FormProvider({ children }: { children: ReactNode }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  return (
    <FormContext.Provider value={{ values, errors, setValues, setErrors }}>
      {children}
    </FormContext.Provider>
  );
}

function useFormContext() {
  const ctx = useContext(FormContext);
  if (!ctx) throw new Error('useFormContext must be used within FormProvider');
  return ctx;
}
```

### URL State for Filters

```typescript
// Next.js App Router pattern
'use client';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

function useUrlState(key: string, defaultValue: string) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const value = searchParams.get(key) ?? defaultValue;

  const setValue = (newValue: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newValue === defaultValue) params.delete(key);
    else params.set(key, newValue);
    router.replace(`${pathname}?${params.toString()}`);
  };

  return [value, setValue] as const;
}
```

### Module-Level Singleton (Framework-Agnostic)

```typescript
// For truly global state that doesn't need reactivity framework
class FeatureFlags {
  private flags = new Map<string, boolean>();

  async load() {
    const response = await fetch('/api/flags');
    const data = await response.json();
    this.flags = new Map(Object.entries(data));
  }

  isEnabled(flag: string): boolean {
    return this.flags.get(flag) ?? false;
  }
}

export const featureFlags = new FeatureFlags();
```

## When Global is Justified

| State | Why Global |
|-------|-----------|
| Auth/session | Every route guard, header, API call needs it |
| Theme/locale | Affects entire render tree |
| Toast/notifications | Triggered from anywhere, rendered in root |
| Feature flags | Checked across all features |
| WebSocket connection | Single connection, many consumers |

## Anti-patterns

- Everything in one global store  -  makes testing and code splitting impossible.
- Context for frequently-changing values  -  re-renders all consumers.
- Duplicating server state in global store  -  use query cache.
- Global state for form values  -  scope to form component.
- Using global state to avoid passing 2 levels of props  -  composition solves this.
