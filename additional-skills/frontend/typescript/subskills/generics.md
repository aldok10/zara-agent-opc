---
type: subskill
name: generics
trigger: Generic function, class, conditional types, mapped types, infer keyword, template literals
---

# Generics

Advanced generic patterns for type-safe, reusable frontend code.

## Activation

- Writing a function that works with multiple types
- Need conditional type logic or type extraction
- Building type-safe wrappers, factories, or builders
- Template literal type composition

## Core Principles

1. **Constrain early**: always use `extends` to limit what generics accept
2. **Infer at call site**: let TS infer generics from arguments when possible
3. **Max 3 type params**: more = redesign the API
4. **Name meaningfully**: `TData`, `TError`, not `T`, `U`, `V`
5. **Default when sensible**: `T = unknown` reduces boilerplate for callers

## Decision Table

| Situation | Pattern |
|-----------|---------|
| Function works on subset of types | Constrained generic `<T extends Base>` |
| Extract part of a type | `infer` in conditional type |
| Transform all keys of an object | Mapped type `{ [K in keyof T]: ... }` |
| Different return type based on input | Conditional type / overloads |
| String pattern matching | Template literal type |
| Recursive data structure | Self-referencing type with base case |

## Patterns

### Constrained Generic
```typescript
function getProperty<TObj, TKey extends keyof TObj>(obj: TObj, key: TKey): TObj[TKey] {
  return obj[key];
}
```

### Conditional Type with Infer
```typescript
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;
type ArrayItem<T> = T extends ReadonlyArray<infer U> ? U : never;
```

### Mapped Type with Constraint
```typescript
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};
```

### Template Literal Types
```typescript
type EventName<T extends string> = `on${Capitalize<T>}`;
type Route<T extends string> = `/${T}` | `/${T}/${string}`;
```

### Generic Factory with Defaults
```typescript
function createStore<TState, TActions extends Record<string, (state: TState) => TState>>(
  initialState: TState,
  actions: TActions
) {
  let state = initialState;
  type ActionKeys = keyof TActions;

  return {
    getState: () => state,
    dispatch(action: ActionKeys) {
      state = actions[action](state);
    },
  };
}
```

### Recursive Type
```typescript
type DeepPartial<T> = T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;

type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue };
```

### Function Overloads vs Conditional Return
```typescript
// Prefer overloads for 2-3 cases (better DX)
function parse(input: string): object;
function parse(input: string, asArray: true): object[];
function parse(input: string, asArray?: boolean): object | object[] {
  const result = JSON.parse(input) as unknown;
  if (asArray) return Array.isArray(result) ? result : [result];
  return result as object;
}

// Prefer conditional for type-level computation
type ParseResult<T extends boolean> = T extends true ? object[] : object;
```

## Anti-Patterns

```typescript
// BAD: unconstrained, meaningless names
function bad<T, U>(a: T, b: U): T & U { ... }

// GOOD: constrained, named
function merge<TBase extends object, TExtension extends object>(
  base: TBase,
  extension: TExtension
): TBase & TExtension { ... }

// BAD: generic when concrete works
function getLength<T extends { length: number }>(x: T): number {
  return x.length;
}

// GOOD: no generic needed
function getLength(x: { length: number }): number {
  return x.length;
}
```

## Delegates To

- `utility-types`  -  for Pick/Omit/Record patterns using mapped types
- `branded-types`  -  for branded generics in domain modeling
