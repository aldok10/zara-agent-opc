---
type: reference
title: Common TypeScript Frontend Mistakes
---

# 12 Common TypeScript Frontend Mistakes

## 1. Using `any` to Fix Type Errors

```typescript
// WRONG
const data: any = await response.json();
processUser(data); // no type safety

// RIGHT
const data: unknown = await response.json();
const user = UserSchema.parse(data); // runtime validation
processUser(user); // type-safe
```

## 2. Enums Instead of Const Objects

```typescript
// WRONG — enums have quirks (reverse mapping, tree-shaking issues)
enum Status {
  Active = "active",
  Inactive = "inactive",
}

// RIGHT — const object + union type
const Status = {
  Active: "active",
  Inactive: "inactive",
} as const;
type Status = (typeof Status)[keyof typeof Status];
```

## 3. Non-exhaustive Union Handling

```typescript
// WRONG — new variant silently falls through
type Theme = "light" | "dark" | "system";
function getIcon(theme: Theme) {
  if (theme === "light") return sunIcon;
  if (theme === "dark") return moonIcon;
  return defaultIcon; // "system" handled accidentally
}

// RIGHT — exhaustive check catches new variants at compile time
function getIcon(theme: Theme) {
  switch (theme) {
    case "light": return sunIcon;
    case "dark": return moonIcon;
    case "system": return autoIcon;
    default: {
      const _: never = theme;
      throw new Error(`Unhandled theme: ${_}`);
    }
  }
}
```

## 4. Optional Chaining Without Null Check on Result

```typescript
// WRONG — optional chain returns T | undefined, but treated as T
const name = user?.profile?.name;
document.title = name; // possibly undefined!

// RIGHT — handle the undefined case
const name = user?.profile?.name ?? "Anonymous";
document.title = name;
```

## 5. Type Assertion to Silence Errors

```typescript
// WRONG — masks real type mismatch
const element = document.getElementById("app") as HTMLDivElement;
element.style.color = "red"; // might be null!

// RIGHT — narrow properly
const element = document.getElementById("app");
if (!(element instanceof HTMLDivElement)) {
  throw new Error("Expected #app to be a div");
}
element.style.color = "red"; // safe
```

## 6. Forgetting `noUncheckedIndexedAccess`

```typescript
// WITHOUT the flag — silently assumes value exists
const items: string[] = ["a", "b"];
const first: string = items[5]; // no error, but undefined at runtime!

// WITH noUncheckedIndexedAccess — forces check
const first: string | undefined = items[5]; // correct type
if (first !== undefined) {
  console.log(first.toUpperCase()); // safe
}
```

## 7. Mutable Object as Prop/State

```typescript
// WRONG — mutation causes bugs, TS doesn't warn
interface Props {
  items: string[];
}
function addItem(props: Props) {
  props.items.push("new"); // mutates parent!
}

// RIGHT — readonly prevents mutation
interface Props {
  readonly items: readonly string[];
}
function addItem(props: Props) {
  props.items.push("new"); // Compile error!
  return [...props.items, "new"]; // immutable
}
```

## 8. Over-generic Functions

```typescript
// WRONG — generic adds nothing over concrete type
function getLength<T extends { length: number }>(arr: T): number {
  return arr.length;
}

// RIGHT — no generic needed
function getLength(arr: { length: number }): number {
  return arr.length;
}

// WRONG — too many type params, unreadable
function transform<A, B, C, D, E>(a: A, b: B, c: C): [D, E] { ... }

// RIGHT — max 3, with clear constraints
function transform<TInput extends Serializable, TOutput>(
  input: TInput,
  mapper: (data: TInput) => TOutput
): TOutput { ... }
```

## 9. Using Interface Merging Accidentally

```typescript
// WRONG — interface with same name merges (silent bug)
interface Config { port: number; }
interface Config { host: string; } // merges with above!

// RIGHT — type alias prevents accidental merging
type Config = { port: number; host: string; };
```

## 10. Mixing Up `undefined` and Optional

```typescript
// WITH exactOptionalPropertyTypes:
interface User {
  name: string;
  bio?: string; // means: key may be absent
}

// WRONG
const user: User = { name: "Jo", bio: undefined };
// Error! undefined !== absent with exactOptionalPropertyTypes

// RIGHT
const user: User = { name: "Jo" }; // key absent
// or
interface User {
  name: string;
  bio?: string | undefined; // explicit: key absent OR value undefined
}
```

## 11. Forgetting Discriminant in API Response Types

```typescript
// WRONG — no way to narrow
type ApiResponse<T> = {
  data?: T;
  error?: string;
};
// Both could be undefined, or both present

// RIGHT — discriminated union
type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };

function handle(res: ApiResponse<User>) {
  if (res.success) {
    console.log(res.data.name); // narrowed to { data: T }
  } else {
    console.log(res.error); // narrowed to { error: string }
  }
}
```

## 12. Trusting External Data Without Validation

```typescript
// WRONG — API response typed but not validated
interface User { id: string; name: string; role: "admin" | "user"; }
const user: User = await fetch("/api/user").then(r => r.json());
// Runtime: could be anything, TS thinks it's User

// RIGHT — validate at boundary
import { z } from "zod";
const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  role: z.enum(["admin", "user"]),
});
type User = z.infer<typeof UserSchema>;

const raw: unknown = await fetch("/api/user").then(r => r.json());
const user = UserSchema.parse(raw); // throws if invalid
```
