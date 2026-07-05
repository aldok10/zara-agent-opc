---
type: fact
title: "Error Documentation"
---

# Error Documentation

Guide for documenting API errors following RFC 9457 Problem Details and building error catalogs.

## RFC 9457 Problem Details

The standard format for HTTP API error responses:

```json
{
  "type": "https://api.example.com/errors/insufficient-funds",
  "title": "Insufficient Funds",
  "status": 422,
  "detail": "Account balance is $5.00 but transfer requires $10.00",
  "instance": "/transfers/abc123"
}
```

### Required Fields

| Field | Purpose | Format |
|-------|---------|--------|
| `type` | Machine-readable error identifier | URI (dereferenceable to human docs) |
| `title` | Short summary of the problem type | Static per error type |
| `status` | HTTP status code | Integer |

### Optional Fields

| Field | Purpose | When to include |
|-------|---------|-----------------|
| `detail` | Instance-specific explanation | Always (best practice) |
| `instance` | URI of the failing resource | When a specific resource triggered the error |

### Extension Fields

Add domain-specific fields alongside standard ones:

```json
{
  "type": "https://api.example.com/errors/validation-failed",
  "title": "Validation Failed",
  "status": 400,
  "detail": "Request body contains 2 validation errors",
  "errors": [
    {"field": "email", "message": "Invalid email format"},
    {"field": "age", "message": "Must be 18 or older"}
  ]
}
```

## Error Catalog Structure

Organize errors by HTTP status code category, then by domain:

```
errors/
  4xx/
    400-validation.md
    401-authentication.md
    403-authorization.md
    404-not-found.md
    409-conflict.md
    422-business-logic.md
    429-rate-limit.md
  5xx/
    500-internal.md
    502-upstream.md
    503-unavailable.md
```

## Error Entry Format

Each documented error should include:

1. **Error type URI** -- the `type` value returned in responses
2. **HTTP status code** -- when this error is returned
3. **Title** -- static human-readable summary
4. **Description** -- when and why this error occurs
5. **Possible causes** -- enumerated list of triggers
6. **Resolution steps** -- what the caller should do
7. **Example response** -- complete JSON body
8. **Related errors** -- similar errors the caller might confuse with this one

## Writing Error Descriptions

Good error documentation tells the developer:
- What went wrong (title + detail)
- Why it went wrong (causes)
- How to fix it (resolution)
- How to prevent it (best practices)

Avoid:
- Generic messages: "An error occurred" -- be specific
- Exposing internals: "NullPointerException at line 42" -- abstract to user impact
- Blame language: "You sent invalid data" -- use neutral framing

## Rate Limit Error Pattern

```json
{
  "type": "https://api.example.com/errors/rate-limit-exceeded",
  "title": "Rate Limit Exceeded",
  "status": 429,
  "detail": "Request quota of 100 requests per minute exceeded",
  "retry_after": 32
}
```

Document alongside:
- Rate limit headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- Retry strategy: honor `Retry-After` header, implement exponential backoff
- Quota tiers: different limits per plan/tier

## Error Taxonomy

Categorize errors by responsibility:

| Category | HTTP Range | Responsibility | Example |
|----------|-----------|----------------|---------|
| Client validation | 400 | Caller fixes request | Missing required field |
| Authentication | 401 | Caller provides credentials | Expired token |
| Authorization | 403 | Caller requests access | Insufficient scope |
| Not found | 404 | Caller checks resource ID | Deleted resource |
| Business rule | 422 | Caller adjusts workflow | Insufficient balance |
| Rate limit | 429 | Caller slows down | Quota exceeded |
| Server error | 5xx | Provider investigates | Internal failure |

## Testing Error Documentation

- Every documented error code must be reproducible with a test request
- Error response bodies must validate against the ProblemDetail schema
- Extension fields must be consistent across all errors of the same type
- `type` URIs must resolve to documentation pages (test with link checker)
