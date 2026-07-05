# OpenAPI 3.1 Patterns

Reference for writing well-structured OpenAPI specifications.

## Schema Design Principles

- Use `$ref` for all reusable schemas -- never inline duplicate definitions
- Place shared schemas in `components/schemas`, parameters in `components/parameters`
- Name schemas as singular nouns in PascalCase: `User`, `OrderItem`, `PaymentMethod`
- Use `readOnly`/`writeOnly` to differentiate request vs response fields
- Prefer `format` annotations: `date-time`, `email`, `uri`, `uuid`

## Component Organization

```yaml
components:
  schemas:       # Data models
  parameters:    # Reusable query/path/header params
  responses:     # Standard error responses (400, 401, 403, 404, 500)
  requestBodies: # Shared request payloads
  headers:       # Pagination, rate limit headers
  securitySchemes: # Auth definitions
  examples:      # Named examples for reuse
```

## Discriminator Pattern

Use discriminators for polymorphic types with explicit mapping:

```yaml
components:
  schemas:
    Notification:
      oneOf:
        - $ref: '#/components/schemas/EmailNotification'
        - $ref: '#/components/schemas/SmsNotification'
        - $ref: '#/components/schemas/PushNotification'
      discriminator:
        propertyName: type
        mapping:
          email: '#/components/schemas/EmailNotification'
          sms: '#/components/schemas/SmsNotification'
          push: '#/components/schemas/PushNotification'
```

Always include `mapping` -- do not rely on implicit resolution from schema names.

## Callbacks (Webhooks)

Document webhook delivery alongside the subscribing endpoint:

```yaml
paths:
  /webhooks:
    post:
      summary: Register webhook endpoint
      callbacks:
        orderCompleted:
          '{$request.body#/callbackUrl}':
            post:
              summary: Order completion notification
              requestBody:
                content:
                  application/json:
                    schema:
                      $ref: '#/components/schemas/OrderEvent'
              responses:
                '200':
                  description: Webhook processed
```

Document delivery guarantees: at-least-once, retry policy (exponential backoff with max retries), timeout expectations, and signature verification method.

## Pagination Pattern

```yaml
components:
  schemas:
    PaginatedResponse:
      type: object
      properties:
        data:
          type: array
          items: {}
        pagination:
          type: object
          properties:
            cursor:
              type: string
              description: Opaque cursor for next page
            has_more:
              type: boolean
  parameters:
    CursorParam:
      name: cursor
      in: query
      schema:
        type: string
      description: Cursor from previous response pagination object
    LimitParam:
      name: limit
      in: query
      schema:
        type: integer
        minimum: 1
        maximum: 100
        default: 20
```

## Error Response Pattern

Standardize on RFC 9457 Problem Details:

```yaml
components:
  schemas:
    ProblemDetail:
      type: object
      required: [type, title, status]
      properties:
        type:
          type: string
          format: uri
          description: URI reference identifying the problem type
        title:
          type: string
          description: Short human-readable summary
        status:
          type: integer
          description: HTTP status code
        detail:
          type: string
          description: Human-readable explanation specific to this occurrence
        instance:
          type: string
          format: uri
          description: URI identifying the specific occurrence
```

## Security Scheme Patterns

```yaml
components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key
    OAuth2:
      type: oauth2
      flows:
        authorizationCode:
          authorizationUrl: https://auth.example.com/authorize
          tokenUrl: https://auth.example.com/token
          scopes:
            read:users: Read user profiles
            write:orders: Create and modify orders
```

Apply security at operation level when endpoints differ. Apply globally only when all endpoints share the same scheme.

## Spec Hygiene Checklist

1. Every path operation has `operationId` (camelCase, unique across spec)
2. Every parameter has `description` and `example`
3. Every response code the API can return is documented (including 401, 403, 429)
4. `tags` group operations by resource -- one primary tag per operation
5. `x-deprecated` with `sunset` header for endpoints being removed
6. No `additionalProperties: true` without documenting extension contract
7. Examples pass schema validation (test with `spectral` or `redocly lint`)
