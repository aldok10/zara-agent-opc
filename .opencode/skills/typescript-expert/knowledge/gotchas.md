# TypeScript Gotchas: the traps seniors have been burned by

## Structural typing (duck typing) surprises

TS types are structural, not nominal. Two types with the same shape are interchangeable, even if semantically different.

```typescript
type Meters = number;
type Seconds = number;
function speed(d: Meters, t: Seconds) {}
speed(secondsValue, metersValue); // compiles fine, logically wrong
```
Fix: **branded types** for domain primitives that must not mix.
```typescript
type Meters = number & { readonly __brand: "Meters" };
```

Excess property checks only fire on object *literals*, not variables:
```typescript
type P = { x: number };
const o = { x: 1, y: 2 };
const p: P = o;        // OK! (variable, no excess check)
const p2: P = { x: 1, y: 2 }; // ERROR (literal, excess check fires)
```

## `strictNullChecks` + arrays lie without `noUncheckedIndexedAccess`

```typescript
const arr = [1, 2, 3];
const x = arr[10];     // typed as number, actually undefined at runtime!
```
`noUncheckedIndexedAccess` makes it `number | undefined`. Same for `record[key]`. Always on.

## `this` is not lexical in methods passed as callbacks

```typescript
class C { v = 1; get() { return this.v; } }
const c = new C();
const fn = c.get;
fn(); // `this` is undefined -> crash
```
Fix: arrow methods `get = () => this.v`, or `.bind(this)`, or pass `() => c.get()`.

## `enum` runtime + bundler surprises

Numeric enums are bidirectional maps (reverse lookup exists), add runtime code, and `const enum` is banned under `isolatedModules`/bundlers (inlining). Prefer:
```typescript
const Status = { Active: "active", Archived: "archived" } as const;
type Status = typeof Status[keyof typeof Status]; // "active" | "archived"
```

## `as const` vs annotation loses literals

```typescript
const config = { env: "prod" };          // env: string
const config2 = { env: "prod" } as const; // env: "prod"
const config3 = { env: "prod" } satisfies Config; // checked AND keeps literals
```

## Declaration merging is a footgun in app code

`interface` merges across declarations silently. Great for augmenting libs (`declare module`), dangerous when two files accidentally declare the same interface name. `type` errors on duplicate, which is usually what you want in app code.

## `Promise` variance / floating promises

```typescript
async function f() { doAsync(); } // fire-and-forget, rejection lost
```
`typescript-eslint` `no-floating-promises` catches it. Await, `void doAsync()`, or `.catch()`.

## `keyof` on index signatures widens

```typescript
type R = Record<string, number>;
type K = keyof R; // string | number (not just string!) because numeric keys coerce
```

## Conditional type distribution over unions

```typescript
type ToArray<T> = T extends any ? T[] : never;
type R = ToArray<string | number>; // string[] | number[], NOT (string|number)[]
```
Wrap in tuple to prevent distribution: `type ToArray<T> = [T] extends [any] ? T[] : never`.

## `unknown` in catch (strict)

```typescript
try {} catch (e) {
  e.message;                     // ERROR: e is unknown
  if (e instanceof Error) e.message; // OK
}
```

## Type widening of `let` vs `const`

```typescript
const s = "a";   // type "a"
let l = "a";     // type string (widened)
```

## `Object.keys` returns `string[]`, not `keyof T`

Deliberate (objects can have extra keys at runtime). Cast only if you own the object and know it's exact, or use a typed helper.

## `void` return type accepts any returning function

```typescript
type Fn = () => void;
const f: Fn = () => 42; // OK! return value ignored. Intentional (for forEach etc) but surprises
```

## Empty object type `{}` means "anything non-null"

```typescript
const x: {} = "hello"; // OK. {} is NOT "empty object", it's "not null/undefined"
```
Use `Record<string, never>` for truly-empty, or `object` for non-primitive.
