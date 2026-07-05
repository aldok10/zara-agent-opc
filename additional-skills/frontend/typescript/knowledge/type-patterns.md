---
type: reference
title: TypeScript Type Patterns
---

# 15 Essential Type Patterns

## 1. Discriminated Union (State Machine)

```typescript
type AsyncState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: Error };

function render(state: AsyncState<User>) {
  switch (state.status) {
    case "idle": return null;
    case "loading": return <Spinner />;
    case "success": return <Profile user={state.data} />;
    case "error": return <Error message={state.error.message} />;
  }
}
```

## 2. Exhaustive Switch (never Default)

```typescript
function assertNever(x: never): never {
  throw new Error(`Unexpected value: ${x}`);
}

function handle(action: Action) {
  switch (action.type) {
    case "increment": return state + 1;
    case "decrement": return state - 1;
    default: return assertNever(action);
  }
}
```

## 3. Type Guard (Type Predicate)

```typescript
function isUser(value: unknown): value is User {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "email" in value
  );
}

const items: unknown[] = await fetchItems();
const users = items.filter(isUser); // User[]
```

## 4. Builder Pattern (Chained Generics)

```typescript
class QueryBuilder<TSelect = {}, TWhere = {}> {
  select<T extends Record<string, unknown>>(fields: T): QueryBuilder<T, TWhere> {
    return this as unknown as QueryBuilder<T, TWhere>;
  }
  where<T extends Record<string, unknown>>(conditions: T): QueryBuilder<TSelect, T> {
    return this as unknown as QueryBuilder<TSelect, T>;
  }
  execute(): TSelect[] {
    return [] as TSelect[];
  }
}
```

## 5. Const Object as Enum

```typescript
const Direction = {
  Up: "UP",
  Down: "DOWN",
  Left: "LEFT",
  Right: "RIGHT",
} as const;

type Direction = (typeof Direction)[keyof typeof Direction];
// "UP" | "DOWN" | "LEFT" | "RIGHT"
```

## 6. Template Literal Routes

```typescript
type ApiRoute = `/api/${string}`;
type CrudRoute = `/api/${string}/${"create" | "read" | "update" | "delete"}`;

type EventName = `on${Capitalize<"click" | "focus" | "blur">}`;
// "onClick" | "onFocus" | "onBlur"
```

## 7. Mapped Type Transform

```typescript
type Optional<T> = { [K in keyof T]+?: T[K] };
type Nullable<T> = { [K in keyof T]: T[K] | null };
type Mutable<T> = { -readonly [K in keyof T]: T[K] };

// Filter by value type
type OnlyStrings<T> = {
  [K in keyof T as T[K] extends string ? K : never]: T[K];
};
```

## 8. Generic Fetch Wrapper

```typescript
async function typedFetch<T>(
  url: string,
  schema: { parse: (data: unknown) => T }
): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data: unknown = await response.json();
  return schema.parse(data);
}
```

## 9. Discriminated Event Map

```typescript
type EventMap = {
  userCreated: { userId: string; email: string };
  userDeleted: { userId: string };
  postPublished: { postId: string; authorId: string };
};

function emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void { ... }
function on<K extends keyof EventMap>(event: K, handler: (payload: EventMap[K]) => void): void { ... }
```

## 10. Polymorphic Component Props

```typescript
type PolymorphicProps<TElement extends React.ElementType, TProps = {}> = TProps &
  Omit<React.ComponentPropsWithoutRef<TElement>, keyof TProps> & {
    as?: TElement;
  };

type ButtonProps<T extends React.ElementType = "button"> = PolymorphicProps<T, {
  variant: "primary" | "secondary";
}>;
```

## 11. Branded Primitive

```typescript
declare const __brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [__brand]: B };

type UserId = Brand<string, "UserId">;
type PostId = Brand<string, "PostId">;

function getUser(id: UserId): User { ... }
// getUser(postId)  -  compile error
```

## 12. Record with Exhaustive Keys

```typescript
type Status = "active" | "inactive" | "pending";
const statusLabels: Record<Status, string> = {
  active: "Active",
  inactive: "Inactive",
  pending: "Pending",
  // Missing key = compile error
};
```

## 13. Infer Return Type from Config

```typescript
function defineRoutes<T extends Record<string, () => unknown>>(routes: T) {
  return routes;
}

const routes = defineRoutes({
  home: () => ({ title: "Home" }),
  about: () => ({ title: "About", year: 2024 }),
});

type HomeData = ReturnType<(typeof routes)["home"]>;
// { title: string }
```

## 14. Tuple Types for Fixed Structures

```typescript
type Coordinate = readonly [x: number, y: number];
type RGB = readonly [r: number, g: number, b: number];
type Result<T, E = Error> = [data: T, error: null] | [data: null, error: E];

function divide(a: number, b: number): Result<number> {
  if (b === 0) return [null, new Error("Division by zero")];
  return [a / b, null];
}

const [value, error] = divide(10, 2);
if (error) throw error;
console.log(value); // number (narrowed)
```

## 15. Variadic Tuple Types

```typescript
type Prepend<T, U extends unknown[]> = [T, ...U];
type Append<T extends unknown[], U> = [...T, U];

// Typed pipe/compose
type Pipe<Fns extends ((...args: any[]) => any)[]> = Fns extends [
  infer First extends (...args: any[]) => any,
  ...infer Rest extends ((...args: any[]) => any)[]
]
  ? Rest extends []
    ? First
    : (...args: Parameters<First>) => ReturnType<Pipe<Rest>>
  : never;
```
