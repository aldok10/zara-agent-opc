---
type: fact
title: "Richardson Maturity Model"
---

# Richardson Maturity Model

## Level 0  -  The Swamp of POX

Single URI, single HTTP method (POST), RPC-style. The API is a tunnel.

```
POST /api
{"action": "getUser", "id": 123}
```

Problems: no caching, no standard semantics, no discoverability.

## Level 1  -  Resources

Individual URIs per resource, but still misusing HTTP methods.

```
POST /users/123       (to read)
POST /users/123       (to update)
```

Improvement: addressable resources. Still missing HTTP semantics.

## Level 2  -  HTTP Verbs

Proper use of HTTP methods + status codes. This is where most "REST" APIs live.

```
GET    /users/123     → 200
POST   /users         → 201 + Location header
PUT    /users/123     → 200
DELETE /users/123     → 204
```

Improvement: standard semantics enable caching, intermediaries, tooling.

## Level 3  -  Hypermedia Controls (HATEOAS)

Responses include links to related actions/resources. Clients discover available transitions.

```json
{
  "id": 123,
  "status": "pending",
  "_links": {
    "self": {"href": "/orders/123"},
    "cancel": {"href": "/orders/123/cancel", "method": "POST"},
    "pay": {"href": "/orders/123/payment", "method": "POST"},
    "items": {"href": "/orders/123/items"}
  }
}
```

## HATEOAS Link Formats

### HAL (Hypertext Application Language)

```json
{
  "_links": {
    "self": {"href": "/orders/123"},
    "next": {"href": "/orders?page_token=abc"}
  },
  "_embedded": {
    "items": [{"_links": {"self": {"href": "/items/1"}}, "name": "Widget"}]
  }
}
```

### JSON:API links

```json
{
  "links": {
    "self": "https://api.example.com/orders/123",
    "related": "https://api.example.com/orders/123/items"
  }
}
```

### RFC 8288 Web Linking (headers)

```
Link: </orders?page_token=abc>; rel="next",
      </orders?page_token=xyz>; rel="prev"
```

## When HATEOAS Adds Value

| Scenario | Value |
|----------|-------|
| Public API, diverse unknown clients | High  -  clients discover capabilities |
| Workflow APIs (state machines) | High  -  available transitions vary by state |
| Internal API, typed SDK clients | Low  -  SDK handles routing |
| CRUD-only, no state transitions | Low  -  predictable URL patterns suffice |

## Practical HATEOAS Rules

1. Always include `self` link on every resource
2. Only include action links that are currently valid (e.g., no `cancel` link on already-cancelled order)
3. Use `rel` values from IANA link relations when applicable
4. Include `method` hint for non-GET links (not standard HAL, but practical)
5. Pagination links (`next`, `prev`, `first`, `last`) on all collections
6. Don't require clients to parse links  -  maintain stable URL patterns as well
