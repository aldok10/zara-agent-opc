# OpenAPI 3.1 Schema Patterns

## Schema Composition

### Inheritance (allOf)

```yaml
components:
  schemas:
    Pet:
      type: object
      required: [name, petType]
      properties:
        name: { type: string }
        petType: { type: string }
      discriminator:
        propertyName: petType
        mapping:
          dog: '#/components/schemas/Dog'
          cat: '#/components/schemas/Cat'
    Dog:
      allOf:
        - $ref: '#/components/schemas/Pet'
        - type: object
          properties:
            breed: { type: string }
    Cat:
      allOf:
        - $ref: '#/components/schemas/Pet'
        - type: object
          properties:
            indoor: { type: boolean }
```

### Polymorphism (oneOf + discriminator)

```yaml
Payment:
  oneOf:
    - $ref: '#/components/schemas/CreditCard'
    - $ref: '#/components/schemas/BankTransfer'
  discriminator:
    propertyName: method
    mapping:
      credit_card: '#/components/schemas/CreditCard'
      bank_transfer: '#/components/schemas/BankTransfer'
```

### Nullable Fields (3.1 style)

```yaml
# OpenAPI 3.1  -  no more nullable keyword
middleName:
  type: ["string", "null"]
  description: "User's middle name, null if not provided"
```

## Reusable Components

### Pagination Parameters

```yaml
components:
  parameters:
    PageSize:
      name: page_size
      in: query
      schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
    PageToken:
      name: page_token
      in: query
      schema: { type: string, description: "Opaque cursor from previous response" }
```

### Standard Error Response

```yaml
components:
  responses:
    NotFound:
      description: Resource not found
      content:
        application/problem+json:
          schema: { $ref: '#/components/schemas/ProblemDetail' }
  schemas:
    ProblemDetail:
      type: object
      required: [type, title, status]
      properties:
        type: { type: string, format: uri }
        title: { type: string }
        status: { type: integer }
        detail: { type: string }
        instance: { type: string }
```

## Webhooks (3.1)

```yaml
webhooks:
  orderCompleted:
    post:
      summary: Order completion notification
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/OrderCompletedEvent'
      responses:
        '200': { description: Webhook processed }
```

## Key Differences: OpenAPI 3.0 vs 3.1

| Feature | 3.0 | 3.1 |
|---------|-----|-----|
| JSON Schema | Extended subset | Full 2020-12 |
| Nullable | `nullable: true` | `type: ["string", "null"]` |
| Exclusive min/max | Boolean on min/max | Separate keywords |
| Webhooks | Not supported | Top-level `webhooks` |
| Path items | Inline only | Reusable via `$ref` |
| `if/then/else` | Not supported | Supported |
