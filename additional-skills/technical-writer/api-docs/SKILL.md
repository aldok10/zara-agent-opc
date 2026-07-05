---
name: api-docs
description: "API documentation: OpenAPI 3.1, endpoint references, multi-language examples, error docs, interactive playgrounds"
---

# API Documentation Specialist

Write and maintain API reference documentation that developers can ship with.

## Scope

Covers OpenAPI 3.1 spec authoring, endpoint reference pages, request/response examples in 3+ languages, error code catalogs, authentication guides, rate limit documentation, and interactive playground setup (Swagger UI, Redocly, Stoplight).

## First Action

When loaded: identify whether the task is writing a new API spec, documenting existing endpoints, generating code examples, or setting up a playground. Read existing OpenAPI files and endpoint code before proposing documentation changes.

## Constraints

1. OpenAPI 3.1 (JSON Schema-compatible) -- do not use 3.0 or 2.0 for new specs
2. Every endpoint must have: summary, description, parameters, request body, response codes (2xx, 4xx, 5xx), and at least one example per response
3. Code examples in minimum 3 languages: cURL, JavaScript (fetch/axios), and one backend language (Python/Go/Ruby)
4. Error responses follow RFC 9457 (Problem Details) format with type, title, status, detail, instance
5. Authentication documented separately with full flow diagrams -- never buried inside endpoint docs
6. Pagination documented with cursor-based examples (offset-based as legacy fallback)
7. Rate limits documented with headers (X-RateLimit-Limit, X-RateLimit-Remaining, Retry-After)
8. Breaking changes flagged with `x-deprecated` and sunset headers per RFC 8594
9. Schema components reused via $ref -- never inline duplicate schemas
10. Discriminator used for polymorphic types with explicit mapping
11. Webhook/event payloads documented with same rigor as request endpoints
12. Examples must be copy-paste runnable -- no placeholder tokens without explanation
13. Version strategy documented (URL path vs header vs query param)
14. SDK generation validated against spec using openapi-generator or similar tooling
15. Response time expectations (SLO) documented per endpoint category

## DO NOT

1. Write specs that fail `spectral lint` or `redocly lint` validation
2. Use generic descriptions ("This endpoint does something") -- be specific about behavior
3. Document internal-only fields in public API specs
4. Mix authentication schemes without clear per-endpoint indication
5. Use `additionalProperties: true` without documenting the extension contract
6. Omit error responses -- document every error code the endpoint can return
7. Write examples with fake data that contradicts schema constraints
8. Assume readers know your domain -- define all domain terms in a glossary section
9. Skip webhook delivery guarantees (at-least-once, ordering, retry policy)

## Route to Subskill

| Signal | Subskill | Focus |
|--------|----------|-------|
| Writing OpenAPI from scratch | spec-authoring | Schema design, components, paths |
| Generating code examples | code-examples | Multi-language, runnable snippets |
| Error documentation | error-catalog | RFC 9457, error taxonomy, troubleshooting |
| Playground/explorer setup | interactive-docs | Swagger UI, Redocly, Stoplight config |
| SDK documentation | sdk-reference | Generated SDK guides, type docs |

## Verification

- [ ] OpenAPI spec passes `spectral lint` with zero errors
- [ ] Every endpoint has 3+ language examples that execute successfully
- [ ] Error responses match RFC 9457 structure
- [ ] Authentication flow documented with sequence diagram
- [ ] All $ref targets resolve correctly
- [ ] Pagination, rate limiting, and versioning sections present
- [ ] Playground renders spec without warnings

## Knowledge

- knowledge/openapi-3.1-patterns.md
- knowledge/rfc-9457-problem-details.md
- knowledge/api-style-guides.md
- knowledge/sdk-generation.md

## AI-Era Context (2026)

- OpenAPI 3.1 is the standard; 4.0 (Moonwalk) is in draft but not production-ready
- AI-assisted API exploration (Copilot for APIs, natural language query to endpoint mapping) requires rich descriptions and examples
- Overlay files (OpenAPI Overlays 1.0) allow separating documentation concerns from spec structure
- TypeSpec and Cadl are gaining adoption for spec-first API design with generated OpenAPI output
- Interactive docs now support WebSocket and SSE streaming endpoint documentation
- API governance tools (Optic, Bump.sh) automate breaking change detection from spec diffs

## Related Skills

- architecture-docs -- system context for API placement
- developer-portal -- hosting and DX for API docs
- style-guide -- consistent voice across API descriptions
- diagrams -- sequence diagrams for API flows
