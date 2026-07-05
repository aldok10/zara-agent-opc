---
type: fact
title: "TypeScript Type System - Conditional, Mapped, Template Literal, Branded Types"
---

# TypeScript Type System Deep Dive

Advanced type-level programming patterns for production TypeScript.

---

## Conditional Types

### `infer` - Extract Types from Structures

```typescript
type ReturnOf<T> = T extends (...args: any[]) => infer R ? R : never;
type Unpack<T> = T extends Array<infer U> ? U : T;

// Recursive unwrap
type Awaited<T> = T extends Promise<infer U> ? Awaited<U> : T;
type Y = Awaited<Promise<Promise<number>>>; // number

// Multiple infer positions
type FirstArg<T> = T extends (first: infer A, ...rest: any[]) => any ? A : never;
```

### Distributive Conditional Types

Naked type parameters distribute over unions:

```typescript
type ToArray<T> = T extends any ? T[] : never;
type Distributed = ToArray<string | number>; // string[] | number[]

// Prevent distribution by wrapping in tuple
type ToArrayNoDist<T> = [T] extends [any] ? T[] : never;
type NonDist = ToArrayNoDist<string | number>; // (string | number)[]
```

### Filtering with `never`

```typescript
type ExtractStrings<T> = T extends string ? T : never;
type R = ExtractStrings<"a" | 1 | "b" | true>; // "a" | "b"

type Without<T, U> = T extends U ? never : T;
type NoStrings = Without<string | number | boolean, string>; // number | boolean
```

---

## Mapped Types

### Key Remapping with `as` Clause

```typescript
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

interface Person { name: string; age: number; }
type PersonGetters = Getters<Person>;
// { getName: () => string; getAge: () => number }

// Filter keys by value type
type OnlyStrings<T> = {
  [K in keyof T as T[K] extends string ? K : never]: T[K];
};
```

### Modifier Manipulation

```typescript
type Mutable<T> = { -readonly [K in keyof T]: T[K] };
type Required<T> = { [K in keyof T]-?: T[K] };

// Deep readonly (recursive)
type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K];
};
```

---

## Template Literal Types

### String Manipulation at Type Level

```typescript
type EventName<T extends string> = `on${Capitalize<T>}`;
type ClickEvent = EventName<"click">; // "onClick"

// Union expansion
type Color = "red" | "blue";
type Size = "sm" | "lg";
type ClassName = `${Color}-${Size}`; // "red-sm" | "red-lg" | "blue-sm" | "blue-lg"
```

### Pattern Matching

```typescript
// Route param extraction
type ExtractParams<T extends string> =
  T extends `${string}:${infer Param}/${infer Rest}`
    ? Param | ExtractParams<`/${Rest}`>
    : T extends `${string}:${infer Param}`
    ? Param
    : never;

type Params = ExtractParams<"/users/:id/posts/:postId">; // "id" | "postId"
```

---

## Variance Annotations (`in`/`out`)

Explicit variance improves intent clarity and compiler performance:

```typescript
interface Producer<out T> { get(): T; }           // covariant
interface Consumer<in T> { accept(value: T): void; } // contravariant
interface State<in out T> { get(): T; set(value: T): void; } // invariant
```

`Producer<Dog>` assignable to `Producer<Animal>` (covariant). `Consumer<Animal>` assignable to `Consumer<Dog>` (contravariant).

---

## Type Predicates (`is` / `asserts`)

```typescript
// Narrowing guard
function isDefined<T>(value: T | null | undefined): value is T {
  return value != null;
}
const items: (string | null)[] = ["a", null, "b"];
const defined: string[] = items.filter(isDefined); // Correctly typed

// Assertion function (narrows from call point forward)
function assertDefined<T>(value: T | null | undefined, msg?: string): asserts value is T {
  if (value == null) throw new Error(msg ?? "Value is null/undefined");
}

// Exhaustiveness check
function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${value}`);
}
```

---

## Branded / Nominal Types

Structural typing means `number` is `number` regardless of domain. Brands fix this:

```typescript
type Brand<T, B extends string> = T & { readonly __brand: B };

type UserId = Brand<string, "UserId">;
type OrderId = Brand<string, "OrderId">;

// Construction through validated factories
function createUserId(raw: string): UserId {
  if (!raw.startsWith("usr_")) throw new Error("Invalid user ID");
  return raw as UserId;
}

const uid = createUserId("usr_abc123");
getUser(uid);    // OK
getOrder(uid);   // ERROR: UserId not assignable to OrderId
```

```typescript
// Stricter: unique symbol brand (no accidental collision)
declare const __brand: unique symbol;
type Branded<T, B> = T & { [__brand]: B };
type Email = Branded<string, "Email">;
```

---

## Recursive Types

```typescript
// JSON type
type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

// Deep partial
type DeepPartial<T> = T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;

// Dot-notation path type
type Path<T, K extends keyof T = keyof T> = K extends string
  ? T[K] extends object
    ? K | `${K}.${Path<T[K]>}`
    : K
  : never;

interface Config { db: { host: string; port: number }; cache: { ttl: number } }
type ConfigPath = Path<Config>; // "db" | "cache" | "db.host" | "db.port" | "cache.ttl"
```

### Tuple Manipulation

```typescript
type Reverse<T extends any[]> = T extends [infer First, ...infer Rest]
  ? [...Reverse<Rest>, First]
  : [];
type Rev = Reverse<[1, 2, 3]>; // [3, 2, 1]
```

---

## Type-Safe Builder Pattern

```typescript
type BuilderState = { host: boolean; port: boolean; db: boolean };

class ConnectionBuilder<S extends BuilderState = { host: false; port: false; db: false }> {
  private config: Partial<{ host: string; port: number; db: string }> = {};

  host(h: string): ConnectionBuilder<S & { host: true }> {
    this.config.host = h;
    return this as any;
  }
  port(p: number): ConnectionBuilder<S & { port: true }> {
    this.config.port = p;
    return this as any;
  }
  db(d: string): ConnectionBuilder<S & { db: true }> {
    this.config.db = d;
    return this as any;
  }
  // Only callable when all required fields are set
  build(this: ConnectionBuilder<{ host: true; port: true; db: true }>): Connection {
    return new Connection(this.config as Required<typeof this.config>);
  }
}

new ConnectionBuilder().host("localhost").port(5432).db("mydb").build(); // OK
new ConnectionBuilder().host("localhost").build(); // ERROR: missing port and db
```

---

## HKT Simulation (Higher-Kinded Types)

TypeScript lacks native HKTs. Simulate with interface + indexed access:

```typescript
interface TypeFn { readonly input: unknown; readonly output: unknown; }

interface ArrayFn extends TypeFn { readonly output: Array<this["input"]>; }
interface PromiseFn extends TypeFn { readonly output: Promise<this["input"]>; }

type Apply<F extends TypeFn, A> = (F & { readonly input: A })["output"];
type R1 = Apply<ArrayFn, string>;   // string[]
type R2 = Apply<PromiseFn, number>; // Promise<number>

// Generic functor
interface Mappable<F extends TypeFn> {
  map<A, B>(fa: Apply<F, A>, f: (a: A) => B): Apply<F, B>;
}
```

---

## Practical Patterns

### Discriminated Union Exhaustiveness

```typescript
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "rect"; width: number; height: number };

function area(s: Shape): number {
  switch (s.kind) {
    case "circle": return Math.PI * s.radius ** 2;
    case "rect": return s.width * s.height;
    default: { const _: never = s; return _; } // Compile error if variant added
  }
}
```

### Constrained Identity for Narrow Inference

```typescript
function defineRoutes<const T extends Record<string, { method: string; path: string }>>(routes: T): T {
  return routes;
}
const routes = defineRoutes({
  getUser: { method: "GET", path: "/users/:id" },
  createUser: { method: "POST", path: "/users" },
});
// typeof routes preserves literal "GET", "/users/:id" etc.
```

### Type-safe Event Emitter

```typescript
type EventMap = {
  login: { userId: string; timestamp: number };
  error: { code: number; message: string };
};

class TypedEmitter<E extends Record<string, unknown>> {
  private handlers = new Map<keyof E, Set<Function>>();

  on<K extends keyof E>(event: K, handler: (payload: E[K]) => void): void {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler);
  }
  emit<K extends keyof E>(event: K, payload: E[K]): void {
    this.handlers.get(event)?.forEach((fn) => fn(payload));
  }
}
```
