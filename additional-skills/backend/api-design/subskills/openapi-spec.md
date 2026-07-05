---
type: subskill
title: "OpenAPI Spec Authoring"
---

# OpenAPI Spec Authoring

## When to Load

Writing or reviewing OpenAPI 3.1 specifications: component reuse, schema composition, discriminators, webhooks, code generation optimization.

## Rules

1. OpenAPI 3.1 uses JSON Schema 2020-12  -  `nullable` keyword removed, use `type: ["string", "null"]` instead
2. Every reusable schema goes in `#/components/schemas`  -  inline schemas block codegen naming
3. Use `$ref` for all shared types; never duplicate schema definitions
4. Discriminators require `propertyName` + `mapping`  -  don't rely on implicit matching
5. Every operation needs `operationId` in camelCase  -  this becomes the SDK method name
6. Request bodies and responses include `example` or `examples`  -  these drive mock servers and docs
7. Security schemes defined once in `components/securitySchemes`, applied globally or per-operation
8. Path parameters validated with `pattern`, `minimum`, `maximum`  -  don't accept any string as an ID
9. Use `readOnly`/`writeOnly` to distinguish create vs read shapes from single schema
10. Webhooks section (`webhooks:`) for event payloads  -  separate from callback URLs

## Schema Composition Patterns

| Pattern | Use | Syntax |
|---------|-----|--------|
| Inheritance | Base + variants | `allOf: [$ref base, variant fields]` |
| Polymorphism | Multiple types, one field | `oneOf` + `discriminator` |
| Mixin | Shared field groups | `allOf` with multiple `$ref` |
| Enumeration | Fixed values | `enum` with descriptions via `x-enum-descriptions` |
| Conditional | Field presence changes shape | `if/then/else` (JSON Schema 2020-12) |

## Component Organization

```yaml
components:
  schemas:        # Domain models (Order, User, Address)
  parameters:     # Reusable params (pagination, filtering)
  responses:      # Standard responses (404, 401, 429, 500)
  requestBodies:  # Shared request shapes
  headers:        # Standard headers (X-Request-Id, RateLimit-*)
  securitySchemes: # Auth methods
  pathItems:      # Reusable path definitions
```

## Anti-Patterns

- Inline schemas everywhere  -  generates `Anonymous1`, `Anonymous2` in SDKs
- Missing `operationId`  -  codegen produces unusable method names
- `additionalProperties: true` by default  -  allows any garbage through validation
- Discriminator without mapping  -  breaks when schema names don't match type values
- Using `allOf` when you mean `oneOf`  -  allOf requires ALL schemas valid simultaneously
- Putting examples only in description text instead of `example` field

## Code Generation Tips

| Tool | Optimize For |
|------|-------------|
| Speakeasy | Consistent `operationId` naming, `x-speakeasy-group` tags |
| openapi-generator | `x-enum-varnames` for clean enum names, `title` on schemas |
| Fern | `x-fern-sdk-group-name`, discriminated unions via `oneOf` |
| Prism | Complete `examples` for accurate mock responses |

## Verification

- `spectral lint --ruleset .spectral.yaml openapi.yaml` passes
- All `$ref` resolve (no dangling references)
- Every operation has `operationId`, summary, at least one response example
- Discriminators have explicit `mapping` object
- No `additionalProperties: true` without documented reason
- Schema validates with JSON Schema 2020-12 meta-schema
