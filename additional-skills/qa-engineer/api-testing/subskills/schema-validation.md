# Schema Validation

## OpenAPI Spec as Source of Truth

The OpenAPI spec defines the contract. All validation, mocking, documentation, and code generation derive from it. Never let implementation drift from spec without CI enforcement.

## Response Validation

```typescript
import { OpenApiValidator } from "@seriousme/openapi-schema-validator";
import Ajv from "ajv";
import addFormats from "ajv-formats";

// Validate spec itself is well-formed
const validator = new OpenApiValidator();
const result = await validator.validate("./openapi.yaml");
if (!result.valid) throw new Error(`Invalid spec: ${result.errors}`);

// Validate response against schema at runtime (test assertions)
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const schema = extractResponseSchema(spec, "GET", "/users/{id}", 200);
const validate = ajv.compile(schema);
const valid = validate(response.body);
expect(valid).toBe(true);
if (!valid) console.error(validate.errors);
```

## Spectral Linting

```yaml
# .spectral.yaml
extends: ["spectral:oas"]
rules:
  operation-operationId: error
  operation-description: warn
  no-eval-in-markdown: error
  # Custom rules
  require-pagination:
    given: "$.paths[*].get.responses.200.content.application/json.schema"
    then:
      field: properties.pagination
      function: truthy
    message: "GET list endpoints must include pagination metadata"
```

```bash
spectral lint openapi.yaml --ruleset .spectral.yaml --fail-severity=error
```

## Breaking Change Detection in CI

```bash
# oasdiff - structural diff
oasdiff breaking --base main:openapi.yaml --revision openapi.yaml
oasdiff changelog --base main:openapi.yaml --revision openapi.yaml --format=json

# optic - semantic diff with CI integration
optic diff openapi.yaml --base main --check
optic ci --provider=github  # posts diff as PR comment
```

Breaking changes: removing endpoints, required fields added to request, response fields removed, type narrowing.

## AsyncAPI for Event-Driven

```yaml
asyncapi: 3.0.0
info:
  title: Order Events
channels:
  orderCreated:
    messages:
      OrderCreatedEvent:
        payload:
          $ref: "#/components/schemas/OrderCreated"
```

- Validate event payloads against AsyncAPI schemas in integration tests
- Use `@asyncapi/generator` for consumer stubs
- Same Spectral linting applies (`extends: ["spectral:asyncapi"]`)

## Schema Registry (Kafka/Avro/Protobuf)

- Confluent Schema Registry: register schemas, enforce compatibility (BACKWARD, FORWARD, FULL)
- Producers register schema on publish; consumers fetch schema by ID from message header
- Compatibility modes prevent breaking changes at the broker level
- Test with: `confluent schema-registry compatibility --subject=orders-value --version=latest`

## JSON Schema $ref Composition

```yaml
# Reusable components
components:
  schemas:
    Pagination:
      type: object
      properties:
        page: { type: integer }
        totalPages: { type: integer }
    UserBase:
      type: object
      properties:
        id: { type: string, format: uuid }
        email: { type: string, format: email }
    UserResponse:
      allOf:
        - $ref: "#/components/schemas/UserBase"
        - type: object
          properties:
            createdAt: { type: string, format: date-time }
```

- Use `$ref` to avoid duplication across endpoints
- `allOf` for inheritance, `oneOf`/`anyOf` for polymorphism
- Keep schemas in `components/schemas` and reference everywhere
- Bundlers (`@redocly/cli bundle`) resolve refs for tools that don't support them
