---
type: fact
title: "API Schema Validation"
---

# API Schema Validation

## JSON Schema Fundamentals

JSON Schema (draft 2020-12) defines the structure, types, and constraints of JSON data.

### Core Keywords

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["id", "name", "email"],
  "properties": {
    "id": { "type": "integer", "minimum": 1 },
    "name": { "type": "string", "minLength": 1, "maxLength": 100 },
    "email": { "type": "string", "format": "email" },
    "role": { "type": "string", "enum": ["admin", "user", "viewer"] },
    "tags": {
      "type": "array",
      "items": { "type": "string" },
      "uniqueItems": true
    }
  },
  "additionalProperties": false
}
```

### Composition Keywords
- `allOf` — must match all schemas (intersection)
- `anyOf` — must match at least one (union)
- `oneOf` — must match exactly one (exclusive)
- `not` — must NOT match the schema

## OpenAPI Validation

OpenAPI 3.1 uses JSON Schema 2020-12 natively. Earlier versions (3.0.x) used a subset.

### Response Validation Strategy

```yaml
paths:
  /users/{id}:
    get:
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        '404':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
```

### Validation Layers
1. **Status code** — correct code for the scenario
2. **Content-Type** — matches declared media type
3. **Headers** — required headers present (pagination, rate-limit)
4. **Body structure** — matches schema shape
5. **Value constraints** — enums, ranges, formats honored
6. **Additional properties** — no undeclared fields leak

## Contract Testing vs Schema Validation

| Aspect | Schema Validation | Contract Testing |
|---|---|---|
| What it checks | Response shape matches spec | Consumer expectations met |
| Scope | Single service | Cross-service boundaries |
| When it breaks | Any structural deviation | Only consumer-impacting changes |
| Tools | Ajv, Spectral, Prism | Pact, Spring Cloud Contract |
| CI stage | Unit/integration | Integration/pre-deploy |

### When Schema Validation Suffices
- Internal APIs with single consumer
- Stable APIs with strong typing (GraphQL)
- CRUD endpoints with simple schemas

### When Contract Testing Adds Value
- Multiple consumers with different field needs
- API evolution without tight version coupling
- Microservice boundaries crossing team ownership

## Validation Tools

### Ajv (JavaScript)
```javascript
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);

const validate = ajv.compile(schema);
const valid = validate(responseBody);
if (!valid) console.error(validate.errors);
```

### Spectral (OpenAPI Linting)
```yaml
# .spectral.yml
extends: ["spectral:oas"]
rules:
  operation-operationId: error
  oas3-valid-schema-example: warn
```

### Prism (Mock + Validate)
- Mock server from OpenAPI spec
- Proxy mode validates live traffic against spec
- Catches drift between implementation and documentation

## Response Structure Patterns

### Envelope Pattern
```json
{
  "data": { ... },
  "meta": { "page": 1, "total": 42 },
  "errors": []
}
```
Validate: `data` type varies per endpoint, `meta` and `errors` are consistent.

### Error Response Standard (RFC 7807)
```json
{
  "type": "https://api.example.com/errors/validation",
  "title": "Validation Error",
  "status": 422,
  "detail": "Field 'email' is not a valid email address",
  "instance": "/users/123"
}
```

## Testing Strategy

### Positive Validation
- Valid response matches schema exactly
- All required fields present
- Enum values are within allowed set

### Negative Validation
- Extra fields rejected when `additionalProperties: false`
- Wrong types cause validation failure
- Missing required fields caught
- Out-of-range values flagged

### Edge Cases
- Empty arrays vs null vs missing field
- Unicode strings in constrained length fields
- Numeric precision (float vs integer boundaries)
- Nested object depth limits
- Circular `$ref` handling

## CI Integration

1. Generate schema from code (source of truth: code or spec?)
2. Validate responses in integration tests against schema
3. Run Spectral on OpenAPI spec in lint stage
4. Compare schema snapshots to detect unintentional breaking changes
5. Block merge if schema validation fails on any endpoint
