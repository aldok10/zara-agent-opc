---
type: reference
title: "TypeScript 5.5-7.0 Features"
---

# TypeScript 5.5-7.0 Features

## Inferred Type Predicates (5.5)

Functions that return boolean after narrowing now automatically infer type predicates.

```typescript
// TS 5.5 infers: (value: unknown) => value is string
function isString(value: unknown) {
  return typeof value === "string";
}

// Array.filter now narrows correctly
const mixed: (string | number)[] = ["a", 1, "b", 2];
const strings = mixed.filter((x) => typeof x === "string");
// TS 5.5: string[] (previously: (string | number)[])
```

## Control Flow Narrowing for Computed Access (5.5)

```typescript
interface Obj {
  [key: string]: string | number | undefined;
}
function process(obj: Obj, key: string) {
  if (typeof obj[key] === "string") {
    // TS 5.5: obj[key] is narrowed to string here
    console.log(obj[key].toUpperCase());
  }
}
```

## Regular Expression Syntax Checking (5.5)

TypeScript now validates regex syntax at compile time:
```typescript
// Error in TS 5.5: Invalid regular expression
const bad = /(?<=a{2,1})/; // quantifier out of order
```

## Isolated Declarations (5.5)

`isolatedDeclarations: true` in tsconfig — ensures `.d.ts` can be generated without type inference (parallel builds).

```typescript
// Error with isolatedDeclarations: must annotate return type
export function add(a: number, b: number) { // needs `: number`
  return a + b;
}

// Correct
export function add(a: number, b: number): number {
  return a + b;
}
```

## Config Extends from node_modules (5.5)

```jsonc
{
  "extends": "@my-org/tsconfig/base.json"
  // resolves from node_modules without relative path
}
```

## The `${configDir}` Template Variable (5.5)

```jsonc
{
  "compilerOptions": {
    "outDir": "${configDir}/dist",
    "rootDir": "${configDir}/src"
  }
}
```

## Decorator Metadata (5.5)

```typescript
function meta(key: string, value: unknown) {
  return (target: unknown, context: ClassFieldDecoratorContext) => {
    context.metadata[key] = value;
  };
}

class User {
  @meta("label", "Full Name")
  name: string = "";
}
```

## Import Attributes (5.3+, stable 5.5)

```typescript
import config from "./config.json" with { type: "json" };
import styles from "./app.css" with { type: "css" };
```

## Using Declarations (5.2+)

```typescript
function readFile(path: string) {
  using handle = openFile(path); // auto-disposed at end of scope
  return handle.read();
}

// Async version
async function connect() {
  await using conn = await getConnection();
  return conn.query("SELECT 1");
}
```

## Const Type Parameters (5.0+)

```typescript
function createTuple<const T extends readonly unknown[]>(...args: T): T {
  return args;
}

const tuple = createTuple(1, "hello", true);
// Type: readonly [1, "hello", true] (not (string | number | boolean)[])
```

## satisfies Operator (4.9+, essential pattern)

```typescript
type Colors = Record<string, [number, number, number] | string>;

const palette = {
  red: [255, 0, 0],
  green: "#00ff00",
} satisfies Colors;

// palette.red is [number, number, number], not string | [...]
palette.red.map((c) => c / 255); // works
```

## NoInfer Utility Type (5.4)

Prevents inference from specific positions:
```typescript
function createFSM<TState extends string>(
  initial: TState,
  transitions: Record<TState, NoInfer<TState>[]>
) { ... }

// TState inferred only from `initial`, not from transition values
createFSM("idle", {
  idle: ["loading"],
  loading: ["success", "error"],
  success: ["idle"],
  error: ["idle"],
});
```

## TypeScript 5.6

- **Disallowed Nullish and Truthy Checks**: compiler errors on always-truthy/nullish checks (e.g., `if (/regex/)` or `if (fn)` when always defined).
- **Iterator Helper Types**: built-in `IteratorObject`, `Iterator`, `AsyncIterator` types for iterator helpers (`map`, `filter`, `take` on iterators).
- **`--noUncheckedSideEffectImports`**: flags bare `import "module"` that can't be resolved, catching typos in side-effect imports.

## TypeScript 5.7

- **Path Rewriting for Relative Paths**: `--rewriteRelativeImportExtensions` rewrites `.ts` imports to `.js` in output, enabling direct `.ts` imports in source.
- **`--target es2024`**: supports `Promise.withResolvers`, `Object.groupBy`, `Map.groupBy`.
- Checks that `require()` calls resolve correctly under `--moduleResolution nodenext`.

## TypeScript 5.8

- **Granular Checks in Return Expressions**: control-flow narrowing now applies inside returned ternaries and logical expressions.
- **`--erasableSyntaxOnly`**: ensures no TypeScript syntax emits runtime code (enums, namespaces banned), enabling direct ts-stripping by Node/Bun.
- `require()` of ESM modules works when the module has no top-level `await` (Node 22+ interop).

## TypeScript 5.9

- **`--isolatedDeclarations` improvements**: better auto-fix suggestions, fewer false positives for complex return types.
- **Import Elision improvements**: more precise removal of type-only imports, fewer false retentions.
- Performance improvements to editor responsiveness and project loading.

## TypeScript 6.0

- **`--strict` now includes `noUncheckedIndexedAccess`** by default — indexed access returns `T | undefined`.
- Several previously deprecated options removed (`out`, `prepend`, legacy module modes).
- Stricter `--module nodenext` resolution by default.

## TypeScript 7.0 RC (tsgo)

- **Go-based rewrite**: `tsgo` — native compiler written in Go, ~10x faster compilation and editor startup.
- Same TypeScript semantics and type system — drop-in replacement for `tsc`.
- Available as `@typescript/native` on npm. Still RC as of mid-2025; `tsc` remains stable default.
