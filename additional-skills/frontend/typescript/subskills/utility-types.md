---
name: utility-types
trigger: Pick, Omit, Record, Partial, Required, satisfies, mapped types, key remapping
---

# Utility Types

Built-in and custom utility types for transforming, selecting, and composing types.

## Activation

- Selecting/excluding properties from existing types
- Creating derived types from a source type
- Using `satisfies` for validation without widening
- Building form/API types from domain models
- Key remapping or filtering

## Core Principles

1. **Derive, don't duplicate**: create types from existing ones
2. **`satisfies` over `as`**: validates shape without losing literal types
3. **Mapped types for transformations**: systematic, not manual
4. **Intersect over extend** when combining independent concerns
5. **Readonly by default** for data flowing through components

## Built-in Utilities Quick Reference

| Utility | Use When |
|---------|----------|
| `Partial<T>` | All properties optional (form drafts, patches) |
| `Required<T>` | All properties required (validated/complete objects) |
| `Readonly<T>` | Immutable version (props, state snapshots) |
| `Pick<T, K>` | Subset of properties (API response subsets) |
| `Omit<T, K>` | All except specific properties (remove internal fields) |
| `Record<K, V>` | Object with known key type (lookup tables) |
| `Extract<T, U>` | Members of union assignable to U |
| `Exclude<T, U>` | Members of union NOT assignable to U |
| `NonNullable<T>` | Remove null/undefined from union |
| `ReturnType<T>` | Extract return type of function |
| `Parameters<T>` | Extract parameter types as tuple |
| `Awaited<T>` | Unwrap Promise type |

## Satisfies Pattern

```typescript
// Validates structure while preserving literal types
const ROUTES = {
  home: "/",
  users: "/users",
  userDetail: "/users/:id",
} satisfies Record<string, `/${string}`>;

// Type is preserved as literal — autocomplete works
type Route = (typeof ROUTES)[keyof typeof ROUTES];
// "/", "/users", "/users/:id"

// Compare: `as const` + satisfies = best of both
const STATUS_CODES = {
  ok: 200,
  notFound: 404,
  serverError: 500,
} as const satisfies Record<string, number>;
```

## Custom Utility Types

### Make specific keys optional
```typescript
type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Usage: User with optional avatar and bio
type CreateUserInput = PartialBy<User, "avatar" | "bio">;
```

### Make specific keys required
```typescript
type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

// Usage: Draft with required title
type PublishableDraft = RequiredBy<Draft, "title" | "body">;
```

### Deep readonly
```typescript
type DeepReadonly<T> = T extends primitive
  ? T
  : T extends Array<infer U>
    ? ReadonlyArray<DeepReadonly<U>>
    : { readonly [K in keyof T]: DeepReadonly<T[K]> };

type primitive = string | number | boolean | null | undefined;
```

### Object value type
```typescript
type ValueOf<T> = T[keyof T];

const THEMES = { light: "light", dark: "dark", system: "system" } as const;
type Theme = ValueOf<typeof THEMES>; // "light" | "dark" | "system"
```

### Key remapping
```typescript
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

type Setters<T> = {
  [K in keyof T as `set${Capitalize<string & K>}`]: (value: T[K]) => void;
};
```

### Filter keys by value type
```typescript
type KeysOfType<T, V> = {
  [K in keyof T]: T[K] extends V ? K : never;
}[keyof T];

type StringKeys = KeysOfType<User, string>; // "name" | "email" | ...
```

## Const Objects Instead of Enums

```typescript
// Instead of: enum Status { Active, Inactive, Pending }
const Status = {
  Active: "active",
  Inactive: "inactive",
  Pending: "pending",
} as const;

type Status = (typeof Status)[keyof typeof Status];
// "active" | "inactive" | "pending"

// Exhaustive check
function handleStatus(status: Status): string {
  switch (status) {
    case Status.Active: return "Active";
    case Status.Inactive: return "Inactive";
    case Status.Pending: return "Pending";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}
```

## Decision Table

| Need | Pattern |
|------|---------|
| Validate object shape without widening | `satisfies` |
| Literal union from object values | `as const` + `ValueOf<typeof X>` |
| Subset of props for a component | `Pick<Model, "a" \| "b">` |
| Model without internal fields | `Omit<Model, "id" \| "createdAt">` |
| Optional fields for creation | `PartialBy<Model, "id">` |
| Transform all keys | Mapped type with key remapping |

## Anti-Patterns

```typescript
// BAD: manual type that duplicates model
interface UserFormData {
  name: string;
  email: string;
}

// GOOD: derived from source
type UserFormData = Pick<User, "name" | "email">;

// BAD: as const without satisfies (no shape validation)
const config = { port: "not-a-number" } as const; // no error

// GOOD: satisfies validates, as const preserves literals
const config = { port: 3000 } as const satisfies { port: number };
```

## Delegates To

- `generics` — for building reusable utility types with type params
- `branded-types` — for branded versions of utility patterns
