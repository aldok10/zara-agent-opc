---
name: api-design
description: "API design: OpenAPI 3.1, REST, gRPC, versioning, error standards"
---

# API Design Expert

Design APIs that are correct, evolvable, and developer-friendly. Protocol-agnostic thinking with protocol-specific execution across REST, gRPC, and GraphQL.

## Scope

API contract design, schema authoring, protocol selection, versioning strategy, error modeling, pagination, idempotency, and backward compatibility analysis. Not implementation code  -  contracts and specifications.

## First Action

Identify the protocol context (REST/gRPC/GraphQL), audience (public/internal/partner), and existing constraints (legacy contracts, client diversity). Then route to appropriate subskill.

## Constraints

1. Spec-first always  -  write OpenAPI/protobuf/GraphQL schema BEFORE any implementation code touches the endpoint
2. Every endpoint must define all possible response codes in the spec, including 4xx/5xx with response bodies
3. Collection endpoints must support pagination from day one  -  retrofitting pagination is a breaking change (cursor-based for feeds/streams/infinite scroll; offset acceptable for bounded admin views with known total counts)
4. All state-changing operations must accept an `Idempotency-Key` header; server must enforce deduplication within a TTL window
5. Resource names are plural nouns (`/orders`, not `/order`); actions use sub-resources (`/orders/{id}/cancel`), never verbs in URL path
6. Field names in JSON responses use `camelCase`; query parameters use `snake_case` for URL readability
7. Every response includes `X-Request-Id`; every error response includes `X-Request-Id` + RFC 9457 body
8. Nullable fields must be explicitly marked `nullable: true` in OpenAPI or `optional` in protobuf  -  implicit null is a bug
9. Enum values are UPPER_SNAKE_CASE strings, never integers  -  integers break when you insert values
10. Date/time fields use RFC 3339 (`2024-01-15T09:30:00Z`); durations use ISO 8601 (`PT30M`); money uses string with explicit currency field
11. List responses wrap items in an object (`{"data": [...], "pagination": {...}}`), never return bare arrays  -  bare arrays block future metadata additions
12. Authentication errors (401) never leak whether a resource exists  -  return 401 before checking 404
13. Deprecation requires `Sunset` header with date + `Deprecation` header + migration guide link in docs; minimum 6-month sunset window for public APIs
14. Breaking change = removing field, renaming field, changing type, adding required field, narrowing enum, changing URL  -  all forbidden post-publish without version bump
15. Maximum response payload target: 1MB. If larger, provide streaming endpoint or pagination. Document expected sizes.
16. Rate limit all public endpoints; return 429 with `Retry-After` header and `RateLimit-Limit`/`RateLimit-Remaining`/`RateLimit-Reset` headers

## DO NOT

- Use PATCH without defining merge semantics (JSON Merge Patch RFC 7396 or JSON Patch RFC 6902)
- Return 200 for creation (use 201 + `Location` header)
- Accept unbounded lists in request bodies without `maxItems` validation
- Use `PUT` for partial updates  -  PUT replaces entire resource
- Embed authentication tokens in URL query parameters (leaked in logs/referer headers)
- Design RPC-style URLs (`/api/getUserById`)  -  use resource-oriented paths
- Mix singular and plural resource names in the same API
- Version individual endpoints differently  -  version the entire API surface together

## Route to Subskill

| Signal | Subskill | Path |
|--------|----------|------|
| REST resources, HTTP methods, status codes, HATEOAS | REST Patterns | subskills/rest-patterns.md |
| Protobuf, streaming, deadlines, gRPC interceptors | gRPC Patterns | subskills/grpc-patterns.md |
| OpenAPI authoring, $ref, discriminators, codegen | OpenAPI Spec | subskills/openapi-spec.md |
| Breaking changes, sunset, migration, version strategy | Versioning | subskills/versioning-strategies.md |
| Error codes, RFC 9457, retry, error catalog | Error Handling | subskills/error-handling.md |

## Verification

- OpenAPI spec validates: `spectral lint openapi.yaml`
- No breaking changes: `oasdiff breaking base.yaml revision.yaml`
- Contract tests pass: Prism mock server or Pact broker green
- Error responses validate against RFC 9457 JSON Schema
- All endpoints have request/response examples that pass schema validation
- Pagination cursors are opaque (base64-encoded, not raw IDs)

## Knowledge

- knowledge/openapi-patterns.md  -  Schema composition, discriminators, webhooks
- knowledge/rest-maturity.md  -  Richardson Maturity Model, hypermedia controls
- knowledge/grpc-best-practices.md  -  Protobuf design, streaming, error details
- knowledge/http-status-codes.md  -  When to use each status code
- knowledge/breaking-changes.md  -  Breaking change taxonomy, detection, sunset policy

## AI-Era Context (2026)

- AI agents consume APIs  -  machine-readable errors, consistent schemas, and discoverable endpoints matter more than ever
- OpenAPI 3.1.1 is the baseline; tools generate SDKs, test suites, and documentation from specs
- API-first platforms (Speakeasy, Fern, Buf) generate type-safe clients from specs  -  invest in spec quality
- LLM function-calling requires precise parameter schemas with descriptions  -  write specs as if an LLM will read them
- gRPC + Connect protocol enables browser-native gRPC without proxies
- API gateways handle rate limiting, auth, and observability  -  don't rebuild in application code

## Related Skills

- `backend/graphql`  -  GraphQL-specific schema design
- `backend/microservices`  -  Service-to-service communication patterns
- `backend/auth`  -  Authentication and authorization schemes
- `qa-engineer/api-testing`  -  Contract testing and API verification
- `technical-writer/api-docs`  -  Developer portal and documentation
