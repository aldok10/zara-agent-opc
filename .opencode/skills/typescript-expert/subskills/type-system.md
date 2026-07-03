# Subskill: Advanced Type System

When you need types to do real work. Use sparingly, comment always, prefer the simplest thing that works.

## Discriminated unions (the workhorse)

The single most valuable pattern. A shared literal `kind`/`type`/`tag` field lets TS narrow exhaustively.

```typescript
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "rect"; w: number; h: number };

function area(s: Shape): number {
  switch (s.kind) {
    case "circle": return Math.PI * s.radius ** 2;
    case "rect":   return s.w * s.h;
    default: {
      const _exhaustive: never = s; // compile error if a case is unhandled
      return _exhaustive;
    }
  }
}
```
The `never` default is the exhaustiveness guarantee: add a new variant, the compiler forces you to handle it.

## `Result` type (errors as values)

```typescript
type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

function parse(s: string): Result<number> {
  const n = Number(s);
  return Number.isNaN(n) ? { ok: false, error: new Error("NaN") } : { ok: true, value: n };
}
```
For heavy error-flow apps, graduate to Effect (see effect.md). For most, `Result` + discriminated union is enough.

## Type guards (custom narrowing)

```typescript
function isUser(x: unknown): x is User {
  return typeof x === "object" && x !== null && "id" in x && typeof (x as any).id === "string";
}
```
Prefer a real validator (Zod) for anything non-trivial; hand-rolled guards drift from the type.

## `satisfies` (check without widening)

```typescript
const routes = {
  home: "/", user: "/user/:id",
} satisfies Record<string, string>;
// routes.home is "/" (literal kept), and the shape is checked
```

## Mapped types

```typescript
type Nullable<T> = { [K in keyof T]: T[K] | null };
type Getters<T> = { [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K] };
```
Key remapping (`as`) + template literals build APIs. Powerful; keep readable.

## Conditional types + `infer`

```typescript
type ElementType<T> = T extends (infer U)[] ? U : never;
type Awaited2<T> = T extends Promise<infer U> ? U : T;
```
`infer` extracts. Beware distribution over unions (wrap in `[T]` to stop it). Cap recursion depth; deep conditionals kill compiler speed.

## `const` type parameters (5.0+)

```typescript
declare function first<const T extends readonly unknown[]>(arr: T): T[0];
const x = first(["a", "b"]); // x: "a" (literal), not string
```
Keeps literal inference without forcing callers to write `as const`.

## Branded / nominal types

```typescript
declare const brand: unique symbol;
type Brand<T, B> = T & { readonly [brand]: B };
type UserId = Brand<string, "UserId">;
type OrderId = Brand<string, "OrderId">;
// UserId and OrderId no longer interchangeable despite both being string
const asUserId = (s: string) => s as UserId; // single controlled cast at the boundary
```

## Utility types you should reach for first

`Partial<T>` `Required<T>` `Readonly<T>` `Pick<T,K>` `Omit<T,K>` `Record<K,V>` `Exclude<U,E>` `Extract<U,E>` `NonNullable<T>` `ReturnType<F>` `Parameters<F>` `Awaited<T>` `InstanceType<C>`. Compose these before writing a mapped/conditional type by hand.

## When to STOP

If your type is recursive, distributes over unions, and needs a comment longer than the type: step back. A runtime check or a simpler type + validation is usually correct. Type-golf is a maintenance tax. The compiler slowing to a crawl in the editor is the signal you went too far.
