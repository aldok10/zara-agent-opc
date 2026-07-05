# REST Patterns

## When to Load

Designing REST APIs: resource modeling, HTTP method selection, status code usage, content negotiation, HATEOAS links, collection patterns.

## Rules

1. Resources are nouns, never verbs  -  model the domain, not the operations
2. Use sub-resources for relationships: `/users/{id}/orders` (max 2 levels deep)
3. Non-CRUD actions use POST to a sub-resource: `POST /orders/{id}/cancel` (not `/cancelOrder`)
4. GET is safe + idempotent; PUT is idempotent (full replace); DELETE is idempotent; POST is neither
5. PATCH uses JSON Merge Patch (RFC 7396) by default; document which fields are patchable
6. Collection GET returns stable sort order  -  default by creation time descending if unspecified
7. Filter via query params (`?status=active`), never request body on GET
8. Bulk operations: `POST /orders/batch` with `{"operations": [...]}`, return per-item results
9. 204 No Content for successful DELETE  -  no body, no `Content-Type`
10. Long-running: return 202 + `Location` header pointing to status resource

## Patterns

| Pattern | When | Example |
|---------|------|---------|
| Singleton sub-resource | 1:1 relation | `GET /users/{id}/profile` |
| Collection filter | Query subset | `GET /orders?status=pending&created_after=2024-01-01` |
| Expand/embed | Reduce round-trips | `GET /orders/{id}?expand=customer,items` |
| Sparse fields | Bandwidth | `GET /orders?fields=id,status,total` |
| Conditional GET | Caching | `If-None-Match` / `ETag` → 304 |
| Optimistic locking | Concurrency | `If-Match: "etag"` on PUT/PATCH → 412 on conflict |
| Content negotiation | Format flexibility | `Accept: application/json` / `Accept: text/csv` |

## Anti-Patterns

- `/api/getUsers`  -  RPC-style naming in REST
- `POST /users/search` when GET + query params suffices (POST search only for complex query bodies)
- Returning 200 with `{"success": false}`  -  use proper status codes
- Nested creation `POST /users/{id}/orders/{oid}/items` beyond 2 levels  -  flatten or use batch
- Using query params for resource identity (`/orders?id=123` instead of `/orders/123`)

## Status Code Quick-Reference

| Code | Use When |
|------|----------|
| 200 | Successful GET, PUT, PATCH |
| 201 | Successful POST creating resource (include `Location`) |
| 202 | Accepted for async processing |
| 204 | Successful DELETE or PUT with no body |
| 304 | Conditional GET, resource unchanged |
| 400 | Malformed request syntax |
| 401 | Missing/invalid authentication |
| 403 | Authenticated but unauthorized |
| 404 | Resource not found (after auth check) |
| 409 | Conflict (duplicate, state violation) |
| 412 | Precondition failed (ETag mismatch) |
| 422 | Valid syntax but semantic validation failed |
| 429 | Rate limited |
| 500 | Unexpected server error |
| 503 | Temporarily unavailable (include `Retry-After`) |

## Verification

- Every resource has GET (read), POST (create), and DELETE at minimum documented
- PUT/PATCH semantics explicitly documented per resource
- No verbs in URL paths
- All collections support pagination parameters
- ETag/Last-Modified present on cacheable resources
