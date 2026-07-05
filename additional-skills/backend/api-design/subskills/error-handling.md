# Error Handling

## When to Load

Designing error responses, implementing RFC 9457 Problem Details, building error catalogs, adding retry guidance, or localizing error messages.

## Rules

1. All HTTP errors return RFC 9457 Problem Details body  -  no exceptions, no custom formats
2. `type` field is a URI that resolves to documentation for that error  -  not a random string
3. `title` is human-readable, stable (don't change wording)  -  clients may display it
4. `detail` is instance-specific context  -  what went wrong THIS time
5. `instance` is the request URI or a correlation ID URI  -  for support reference
6. Extend with custom fields for machine-readable data: `errors[]` for field-level, `retryAfter` for throttling
7. Error codes are string constants (e.g., `ORDER_ALREADY_CANCELLED`)  -  never use integers that require lookup tables
8. Validation errors include field path, rejected value, and constraint violated
9. 429 responses include `Retry-After` header (seconds)  -  clients must respect it
10. Never expose internal details: no stack traces, no SQL, no internal service names in production errors

## RFC 9457 Structure

```json
{
  "type": "https://api.example.com/errors/insufficient-funds",
  "title": "Insufficient Funds",
  "status": 422,
  "detail": "Account balance ($10.00) is below required amount ($25.00)",
  "instance": "/orders/12345",
  "balance": "10.00",
  "required": "25.00",
  "currency": "USD"
}
```

## Validation Error Pattern

```json
{
  "type": "https://api.example.com/errors/validation",
  "title": "Validation Failed",
  "status": 422,
  "detail": "2 field(s) failed validation",
  "errors": [
    {
      "field": "email",
      "code": "INVALID_FORMAT",
      "message": "Must be a valid email address",
      "rejected_value": "not-an-email"
    },
    {
      "field": "age",
      "code": "OUT_OF_RANGE",
      "message": "Must be between 18 and 150",
      "rejected_value": 12
    }
  ]
}
```

## Error Catalog Design

| Component | Purpose |
|-----------|---------|
| Error code (`ORDER_NOT_FOUND`) | Machine-readable, stable identifier |
| HTTP status | Transport-level semantics |
| Type URI | Links to documentation page |
| Title | Short human label (localizable) |
| Detail template | Instance-specific message pattern |
| Retry guidance | Is it retryable? After how long? |
| Resolution | What can the client/user do? |

## Anti-Patterns

- `{"error": "something went wrong"}`  -  no structure, no code, no guidance
- Different error shapes per endpoint  -  clients can't write generic error handlers
- Using HTTP 200 with error body  -  breaks client middleware, caching, monitoring
- Leaking `SQLException: column 'user_id' not found` to clients
- Error codes as integers (`1001`, `1002`)  -  meaningless without lookup table
- Localized messages without accept-language negotiation
- `{"success": false, "message": "..."}` envelope pattern  -  use HTTP semantics

## Retry Guidance

| Status | Retryable | Strategy |
|--------|-----------|----------|
| 400 | No | Fix request |
| 401 | Yes (once) | Refresh token, retry |
| 403 | No | Elevate permissions |
| 404 | No | Resource doesn't exist |
| 409 | Maybe | Re-fetch state, retry with updated data |
| 422 | No | Fix input |
| 429 | Yes | Wait `Retry-After` seconds |
| 500 | Yes | Exponential backoff (max 3 attempts) |
| 502/503 | Yes | Exponential backoff + jitter |
| 504 | Yes | Retry with shorter timeout |

## Verification

- All error responses validate against RFC 9457 JSON Schema
- Error `type` URIs resolve to documentation (even if placeholder URL structure)
- Validation errors include field-level detail with path and rejected value
- 429 responses include `Retry-After` header
- No stack traces or internal details in non-development environments
- Error catalog documented with all known error codes
