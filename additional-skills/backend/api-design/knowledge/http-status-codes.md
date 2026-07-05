# HTTP Status Codes Reference

## 2xx  -  Success

| Code | Name | When to Use |
|------|------|-------------|
| 200 | OK | GET success, PUT/PATCH success with body |
| 201 | Created | POST created resource. MUST include `Location` header |
| 202 | Accepted | Async operation started. Return status poll URL |
| 204 | No Content | DELETE success, PUT with no response body needed |
| 206 | Partial Content | Range request fulfilled (`Content-Range` header) |

## 3xx  -  Redirection

| Code | Name | When to Use |
|------|------|-------------|
| 301 | Moved Permanently | Resource URL changed permanently. Cache indefinitely |
| 302 | Found | Temporary redirect. Don't cache |
| 304 | Not Modified | Conditional GET, ETag/Last-Modified matched |
| 307 | Temporary Redirect | Redirect preserving method (POST stays POST) |
| 308 | Permanent Redirect | Like 301 but preserves method |

## 4xx  -  Client Errors

| Code | Name | When to Use |
|------|------|-------------|
| 400 | Bad Request | Malformed syntax: unparseable JSON, invalid Content-Type |
| 401 | Unauthorized | No credentials or invalid/expired credentials |
| 403 | Forbidden | Authenticated but insufficient permissions |
| 404 | Not Found | Resource doesn't exist (check auth first to avoid info leak) |
| 405 | Method Not Allowed | Valid resource, wrong HTTP method |
| 406 | Not Acceptable | Can't satisfy `Accept` header |
| 408 | Request Timeout | Client too slow sending request |
| 409 | Conflict | State conflict: duplicate, concurrent modification |
| 410 | Gone | Resource permanently removed (useful for sunset APIs) |
| 412 | Precondition Failed | `If-Match` / `If-Unmodified-Since` failed |
| 413 | Content Too Large | Request body exceeds server limit |
| 415 | Unsupported Media Type | Wrong `Content-Type` header |
| 422 | Unprocessable Content | Valid syntax but semantic validation failed |
| 429 | Too Many Requests | Rate limited. MUST include `Retry-After` header |

## 5xx  -  Server Errors

| Code | Name | When to Use |
|------|------|-------------|
| 500 | Internal Server Error | Unexpected failure. Log details server-side only |
| 501 | Not Implemented | Endpoint exists but feature not built yet |
| 502 | Bad Gateway | Upstream service returned invalid response |
| 503 | Service Unavailable | Temporarily down. Include `Retry-After` |
| 504 | Gateway Timeout | Upstream service didn't respond in time |

## Decision Tree

```
Request malformed?          → 400
No credentials?             → 401
Invalid credentials?        → 401
Valid creds, no permission? → 403
Resource not found?         → 404
State conflict?             → 409
Valid JSON, bad values?     → 422
Rate limited?               → 429
Server bug?                 → 500
Downstream failed?          → 502
Server overloaded?          → 503
Downstream timeout?         → 504
```

## Common Mistakes

| Mistake | Correct |
|---------|---------|
| 200 for creation | 201 + Location |
| 200 with error body | Proper 4xx/5xx + RFC 9457 |
| 403 for not found | 404 (unless existence is sensitive) |
| 400 for business validation | 422 (syntax ok, semantics bad) |
| 500 for bad input | 4xx (client's problem, not server's) |
| 401 after revealing 404 | 401 first, then check existence |
| 204 with response body | 200 if you need a body, 204 if not |
