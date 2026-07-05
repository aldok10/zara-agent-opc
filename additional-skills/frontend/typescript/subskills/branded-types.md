---
name: branded-types
trigger: Domain IDs, validated strings, nominal types, newtype pattern, type-safe identifiers
---

# Branded Types

Nominal typing in TypeScript's structural type system. Prevent mixing semantically different values that share the same primitive type.

## Activation

- Entity IDs that shouldn't be interchangeable (UserId vs PostId)
- Validated strings (Email, URL, Slug)
- Numeric units that shouldn't mix (Pixels vs Rem, USD vs EUR)
- Domain primitives with invariants

## Core Principles

1. **Brand at creation**: validate + brand in a single constructor
2. **Opaque externally**: consumers can't forge branded values
3. **Zero runtime cost**: brands exist only at type level
4. **Validate at boundaries**: API responses, form inputs, URL params
5. **Compose with generics**: `Brand<string, "Email">` pattern

## Brand Pattern

```typescript
// Base brand utility
declare const __brand: unique symbol;
type Brand<T, TBrand extends string> = T & { readonly [__brand]: TBrand };

// Domain types
type UserId = Brand<string, "UserId">;
type PostId = Brand<string, "PostId">;
type Email = Brand<string, "Email">;
type Slug = Brand<string, "Slug">;
type USD = Brand<number, "USD">;
type EUR = Brand<number, "EUR">;
```

## Constructor Patterns

### Simple Constructor (throws)
```typescript
function UserId(value: string): UserId {
  if (!value || value.length < 8) {
    throw new Error(`Invalid UserId: ${value}`);
  }
  return value as UserId;
}
```

### Result-based Constructor (no throw)
```typescript
type Result<T, E = string> =
  | { ok: true; value: T }
  | { ok: false; error: E };

function Email(value: string): Result<Email> {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) {
    return { ok: false, error: `Invalid email: ${value}` };
  }
  return { ok: true, value: value as Email };
}
```

### Zod Integration
```typescript
import { z } from "zod";

const EmailSchema = z
  .string()
  .email()
  .transform((val) => val as Email);

const UserIdSchema = z
  .string()
  .uuid()
  .transform((val) => val as UserId);

// Parse at boundary
function parseApiUser(raw: unknown) {
  return z.object({
    id: UserIdSchema,
    email: EmailSchema,
  }).parse(raw);
}
```

## Decision Table

| Situation | Approach |
|-----------|----------|
| IDs from API/DB | Brand + UUID validation |
| User input strings | Brand + format validation |
| Numeric units | Brand + constructor |
| Temporary/local IDs | Separate branded type (`TempId`) |
| Optional brand | Union: `string \| Email`  -  force validation before use |

## Usage Patterns

### Type-safe function signatures
```typescript
function getUser(id: UserId): Promise<User> { ... }
function sendEmail(to: Email, subject: string): void { ... }

// Compiler prevents:
// getUser(postId)  -  Error: PostId not assignable to UserId
// sendEmail(rawString)  -  Error: string not assignable to Email
```

### Extracting the base type
```typescript
type Unbrand<T> = T extends Brand<infer U, string> ? U : T;
type RawUserId = Unbrand<UserId>; // string
```

### Collections with branded keys
```typescript
type UserMap = Map<UserId, User>;
type PostsByUser = Record<UserId, Post[]>; // Note: needs index signature workaround
```

## Anti-Patterns

```typescript
// BAD: brand without validation (defeats the purpose)
const userId = someString as UserId;

// BAD: brand at every usage (should brand at boundary)
function process(id: string) {
  getUser(id as UserId); // casting everywhere = no safety
}

// GOOD: validate once at boundary, pass branded type through
function handleRequest(rawId: string) {
  const userId = UserId(rawId); // validates + brands
  return getUser(userId); // safe from here on
}
```

## Delegates To

- `generics`  -  for the `Brand<T, TBrand>` utility type itself
- `config`  -  for path alias setup to share brand types across packages
