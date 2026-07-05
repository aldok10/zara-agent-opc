---
type: fact
title: "TypeScript Type System - Conditional, Mapped, Template Literal, Branded Types"
---

# TypeScript Type System Deep Dive

Advanced type-level programming patterns for production TypeScript.

---

## Conditional Types

### Basic Shape

```typescript
type IsString<T> = T extends string ? true : false;
type A = IsString<"hello">; // true
type B = IsString<42>;      // false
```

### `infer` - Extract Types from Structures

```typescript
// Extract return type from a function
type ReturnOf<T> = T extends (...args: any[]) => infer R ? R : never;

// Extract element type from array
type Unpack<T> = T extends Array<infer U> ? U : T;
type X = Unpack<string[]>; // string

// Extract Promise inner type (recursive)
type Awaited<T> = T extends Promise<infer U> ? Awaited<U> : T;
type Y = Awaited<Promise<Promise<number>>>; // number

// Multiple infer positions
type FirstArg<T> = T extends (first: infer A, ...rest: any[]) => any ? A : never;
type SecondArg<T> = T extends (a: any, second: infer B, ...rest: any[]) => any ? B : never;
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

// Exclude specific members
type Without<T, U> = T extends U ? never : T;
type NoStrings = Without<string | number | boolean, string>; // number | boolean
```

---

## Mapped Types

### Basic Transformation

```typescript
type Readonly<T> = { readonly [K in keyof T]: T[K] };
type Partial<T> = { [K in keyof T]?: T[K] };
type Nullable<T> = { [K in keyof T]: T[K] | null };
```

### Key Remapping with `as` Clause

```typescript
// Rename keys
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

// Remove specific keys
type OmitByName<T, Names extends string> = {
  [K in keyof T as K extends Names ? never : K]: T[K];
};
```

### Modifier Manipulation

```typescript
// Remove readonly
type Mutable<T> = { -readonly [K in keyof T]: T[K] };

// Remove optional
type Required<T> = { [K in keyof T]-?: T[K] };

// Deep readonly
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

### Intrinsic String Types

```typescript
type Upper = Uppercase<"hello">;     // "HELLO"
type Lower = Lowercase<"HELLO">;     // "hello"
type Cap = Capitalize<"hello">;      // "Hello"
type Uncap = Uncapitalize<"Hello">;  // "hello"
```

### Pattern Matching with Template Literals

```typescript
// Extract parts from string type
type ExtractRoute<T> = T extends `/${infer Segment}/${infer Rest}`
  ? [Segment, ...ExtractRoute<`/${Rest}`>]
  : T extends `/${infer Last}`
  ? [Last]
  : [];

type Segments = ExtractRoute<"/users/123/posts">; // ["users", "123", "posts"]

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

Explicit variance makes intent clear and improves compiler performance:

```typescript
// out = covariant (producer)
interface Producer<out T> {
  get(): T;
}

// in = contravariant (consumer)
interface Consumer<in T> {
  accept(value: T): void;
}

// in out = invariant
interface State<in out T> {
  get(): T;
  set(value: T): void;
}
```

Practical effect: `Producer<Dog>` is assignable to `Producer<Animal>` (covariant). `Consumer<Animal>` is assignable to `Consumer<Dog>` (contravariant).

---

## Type Predicates (`is` / `asserts`)

### Narrowing with `is`

```typescript
interface Fish { swim(): void; }
interface Bird { fly(): void; }

function isFish(pet: Fish | Bird): pet is Fish {
  return "swim" in pet;
}

// Use in filter (fixes the Array<T | undefined> problem)
function isDefined<T>(value: T | null | undefined): value is T {
  return value != null;
}

const items: (string | null)[] = ["a", null, "b"];
const defined: string[] = items.filter(isDefined); // Correctly typed
```

### Assertion Functions with `asserts`

```typescript
function assertDefined<T>(value: T | null | undefined, msg?: string): asserts value is T {
  if (value == null) throw new Error(msg ?? "Value is null/undefined");
}

function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${value}`);
}

// Narrows from this point forward (no need for if/else)
function process(input: unknown) {
  assertDefined(input);
  // input is now non-nullable here
}
```

---

## Branded / Nominal Types

Structural typing means `number` is `number` regardless of domain meaning. Brands fix this:

```typescript
// Approach 1: intersection brand
type Brand<T, B extends string> = T & { readonly __brand: B };

type UserId = Brand<string, "UserId">;
type OrderId = Brand<string, "OrderId">;

function getUser(id: UserId): User { /* ... */ }
function getOrder(id: OrderId): Order { /* ... */ }

// Construction must go through validated factories
function createUserId(raw: string): UserId {
  if (!raw.startsWith("usr_")) throw new Error("Invalid user ID");
  return raw as UserId;
}

const uid = createUserId("usr_abc123");
getUser(uid);      // OK
getOrder(uid);     // ERROR: UserId not assignable to OrderId
```

```typescript
// Approach 2: unique symbol brand (stricter, no accidental collision)
declare const __brand: unique symbol;
type Branded<T, B> = T & { [__brand]: B };

type Email = Branded<string, "Email">;
type URL = Branded<string, "URL">;
```

---

## Recursive Types

### Recursive Object Types

```typescript
// JSON type
type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

// Deep partial
type DeepPartial<T> = T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;

// Path type (dot notation access)
type Path<T, K extends keyof T = keyof T> = K extends string
  ? T[K] extends object
    ? K | `${K}.${Path<T[K]>}`
    : K
  : never;

interface Config {
  db: { host: string; port: number; };
  cache: { ttl: number; };
}
type ConfigPath = Path<Config>; // "db" | "cache" | "db.host" | "db.port" | "cache.ttl"
```

### Recursive Tuple Manipulation

```typescript
// Reverse a tuple
type Reverse<T extends any[]> = T extends [infer First, ...infer Rest]
  ? [...Reverse<Rest>, First]
  : [];

type Rev = Reverse<[1, 2, 3]>; // [3, 2, 1]

// Flatten nested arrays
type Flatten<T extends any[]> = T extends [infer First, ...infer Rest]
  ? First extends any[]
    ? [...Flatten<First>, ...Flatten<Rest>]
    : [First, ...Flatten<Rest>]
  : [];
```

---

## Type-Level Programming Patterns

### Type-Safe Builder Pattern

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

  // Only callable when all fields are set
  build(this: ConnectionBuilder<{ host: true; port: true; db: true }>): Connection {
    return new Connection(this.config as Required<typeof this.config>);
  }
}

new ConnectionBuilder().host("localhost").port(5432).db("mydb").build(); // OK
new ConnectionBuilder().host("localhost").build(); // ERROR: missing port and db
```

### HKT Simulation (Higher-Kinded Types)

TypeScript lacks native HKTs, but you can simulate them:

```typescript
// Define a "type function" interface
interface TypeFn {
  readonly input: unknown;
  readonly output: unknown;
}

// Concrete type functions
interface ArrayFn extends TypeFn {
  readonly output: Array<this["input"]>;
}

interface PromiseFn extends TypeFn {
  readonly output: Promise<this["input"]>;
}

// Apply a type function
type Apply<F extends TypeFn, A> = (F & { readonly input: A })["output"];

type R1 = Apply<ArrayFn, string>;   // string[]
type R2 = Apply<PromiseFn, number>; // Promise<number>

// Generic map over a type function
interface Mappable<F extends TypeFn> {
  map<A, B>(fa: Apply<F, A>, f: (a: A) => B): Apply<F, B>;
}
```

### Discriminated Union Exhaustiveness

```typescript
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "rect"; width: number; height: number }
  | { kind: "triangle"; base: number; height: number };

function area(s: Shape): number {
  switch (s.kind) {
    case "circle": return Math.PI * s.radius ** 2;
    case "rect": return s.width * s.height;
    case "triangle": return (s.base * s.height) / 2;
    default: {
      const _exhaustive: never = s; // Compile error if new variant added
      return _exhaustive;
    }
  }
}
```

### Constrained Identity for Inference

```typescript
// Force the compiler to infer a narrow literal type
function defineRoutes<const T extends Record<string, { method: string; path: string }>>(routes: T): T {
  return routes;
}

const routes = defineRoutes({
  getUser: { method: "GET", path: "/users/:id" },
  createUser: { method: "POST", path: "/users" },
});
// typeof routes preserves literal types for method and path
```

---

## Practical Combinations

### Type-safe Event Emitter

```typescript
type EventMap = {
  login: { userId: string; timestamp: number };
  logout: { userId: string };
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

const emitter = new TypedEmitter<EventMap>();
emitter.on("login", (e) => console.log(e.userId));  // e is { userId: string; timestamp: number }
emitter.emit("error", { code: 500, message: "fail" }); // Fully checked
```

### Validation Schema to Type

```typescript
// Schema defines runtime validation AND static type
const schema = {
  name: { type: "string" as const, required: true as const },
  age: { type: "number" as const, required: false as const },
} satisfies Record<string, { type: "string" | "number" | "boolean"; required: boolean }>;

type InferSchema<S extends Record<string, { type: string; required: boolean }>> = {
  [K in keyof S as S[K]["required"] extends true ? K : never]:
    S[K]["type"] extends "string" ? string :
    S[K]["type"] extends "number" ? number :
    S[K]["type"] extends "boolean" ? boolean : never;
} & {
  [K in keyof S as S[K]["required"] extends false ? K : never]?:
    S[K]["type"] extends "string" ? string :
    S[K]["type"] extends "number" ? number :
    S[K]["type"] extends "boolean" ? boolean : never;
};

type FromSchema = InferSchema<typeof schema>; // { name: string } & { age?: number }
```
