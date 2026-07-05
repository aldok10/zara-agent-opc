# Error Catalog

Reference for all error codes returned by the Task Management API.

## Error Response Format

All errors follow [RFC 9457 Problem Details](https://www.rfc-editor.org/rfc/rfc9457):

```json
{
  "type": "https://api.example.com/errors/{error-code}",
  "title": "Human-Readable Title",
  "status": 400,
  "detail": "Specific explanation for this occurrence",
  "instance": "/tasks/550e8400-e29b-41d4-a716-446655440000"
}
```

## Client Errors (4xx)

### validation-failed

| Field | Value |
|-------|-------|
| Status | 400 |
| Type URI | `https://api.example.com/errors/validation-failed` |
| When | Request body or parameters fail schema validation |

**Possible causes:**
- Missing required field
- Field value exceeds maximum length
- Invalid enum value
- Malformed date-time format

**Resolution:** Check the `errors` array for specific field violations. Fix each field and retry.

**Example:**
```json
{
  "type": "https://api.example.com/errors/validation-failed",
  "title": "Validation Failed",
  "status": 400,
  "detail": "Request body contains 2 validation errors",
  "errors": [
    {"field": "title", "message": "Required field missing"},
    {"field": "priority", "message": "Must be one of: low, medium, high, critical"}
  ]
}
```

---

### unauthorized

| Field | Value |
|-------|-------|
| Status | 401 |
| Type URI | `https://api.example.com/errors/unauthorized` |
| When | No token provided, token expired, or token invalid |

**Possible causes:**
- Missing `Authorization` header
- Token has expired (default TTL: 1 hour)
- Token was revoked
- Malformed Bearer token format

**Resolution:** Obtain a fresh token from `POST /auth/token` and retry with valid `Authorization: Bearer <token>` header.

---

### forbidden

| Field | Value |
|-------|-------|
| Status | 403 |
| Type URI | `https://api.example.com/errors/forbidden` |
| When | Authenticated user lacks permission for the requested operation |

**Possible causes:**
- User not a member of the target project
- Token scope insufficient for this operation
- Resource owned by another organization

**Resolution:** Verify your token has the required scope. Contact your organization admin if you need elevated access.

---

### not-found

| Field | Value |
|-------|-------|
| Status | 404 |
| Type URI | `https://api.example.com/errors/not-found` |
| When | Referenced resource does not exist or is not visible to the caller |

**Possible causes:**
- Resource ID is incorrect
- Resource was deleted
- Resource belongs to a different organization (returns 404 for security)

**Resolution:** Verify the resource ID. Use the list endpoint to find valid IDs.

---

### conflict

| Field | Value |
|-------|-------|
| Status | 409 |
| Type URI | `https://api.example.com/errors/conflict` |
| When | Request conflicts with current resource state |

**Possible causes:**
- Concurrent modification (optimistic locking failure)
- Duplicate resource creation (idempotency key collision)

**Resolution:** Fetch the current resource state and retry with updated data. For concurrent edits, use the `If-Match` header with the resource's `ETag`.

---

### project-archived

| Field | Value |
|-------|-------|
| Status | 422 |
| Type URI | `https://api.example.com/errors/project-archived` |
| When | Attempting to create or modify tasks in an archived project |

**Possible causes:**
- Project was archived by an admin
- Project auto-archived due to inactivity policy

**Resolution:** Unarchive the project first via `PATCH /projects/{id}` with `{"status": "active"}`, or create the task in a different project.

---

### rate-limit-exceeded

| Field | Value |
|-------|-------|
| Status | 429 |
| Type URI | `https://api.example.com/errors/rate-limit-exceeded` |
| When | Request exceeds the allowed rate for your plan |

**Rate limits by plan:**

| Plan | Requests/minute | Burst |
|------|----------------|-------|
| Free | 20 | 5 |
| Pro | 100 | 20 |
| Enterprise | 1000 | 100 |

**Resolution:** Wait for the duration specified in the `Retry-After` header. Implement exponential backoff. Consider upgrading your plan for higher limits.

## Server Errors (5xx)

### internal-error

| Field | Value |
|-------|-------|
| Status | 500 |
| Type URI | `https://api.example.com/errors/internal-error` |
| When | Unexpected server failure |

**Resolution:** Retry with exponential backoff (max 3 attempts). If persistent, check the [status page](https://status.example.com) and contact support with the `instance` value from the response.

---

### service-unavailable

| Field | Value |
|-------|-------|
| Status | 503 |
| Type URI | `https://api.example.com/errors/service-unavailable` |
| When | Service is temporarily unavailable (maintenance or overload) |

**Resolution:** Retry after the `Retry-After` header value. Check the [status page](https://status.example.com) for planned maintenance windows.
