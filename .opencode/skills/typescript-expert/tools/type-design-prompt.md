---
type: tool
title: "Type-Safe API Design Prompt"
---

# Type-Safe API Design Prompt

You are designing type-safe APIs in TypeScript. The goal is to catch errors at compile time, provide excellent DX through autocompletion, and make invalid states unrepresentable.

## Input

**API surface:** {{what_the_api_does}}
**Consumers:** {{who_calls_this -- internal_team | public_sdk | both}}
**Constraints:** {{runtime, bundle size, backward compat}}

## Instructions

### 1. Define the Domain Types

Start with the core types. Use:
- Branded types for IDs and validated strings
- Discriminated unions for states
- Template literal types for string patterns
- `readonly` by default, mutable only when justified

### 2. Design the API Surface

For each operation:
```typescript
// Name: [operation]
// Input: [type] -- what the caller provides
// Output: [type] -- what they get back
// Errors: [type] -- how failures are represented
// Invariants: [what must be true]
```

### 3. Make Invalid States Unrepresentable

- If two fields are mutually exclusive, use a discriminated union (not optional both)
- If a field is only valid in certain states, model states as separate types
- If ordering matters, use the builder pattern with phantom types
- If a value has constraints, brand it

### 4. Error Handling Strategy

Choose one (consistency matters more than choice):
- **Exceptions** -- for truly unexpected failures
- **Result<T, E>** -- for expected failures (parsing, validation, not-found)
- **Effect** -- for complex dependency/error compositions

### 5. Versioning Strategy

- Use `satisfies` to verify backward compat at compile time
- Use branded version types for schema evolution
- Design extension points (generics, plugin interfaces)

## Quality Criteria

- No `any` in the public API
- All public types have JSDoc
- All operations have explicit error types
- Consumers get red squiggles immediately on misuse
- API is impossible to call incorrectly from TypeScript

## Output Format

1. Type definitions (the core domain model)
2. API interface (the operations)
3. Usage examples (happy path + error handling)
4. Migration notes (if evolving an existing API)
