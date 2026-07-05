---
type: tool
title: "API Design Review"
---

# API Design Review

## Purpose

Structured review of REST or gRPC API endpoints for consistency, usability, and correctness. Evaluates naming, versioning, error handling, pagination, and HTTP semantics.

## When to Use

- Designing a new API endpoint or resource
- Reviewing an existing API for breaking changes
- Migrating between REST and gRPC
- Validating API contract against consumer expectations

## Prompt Template

```
CONTEXT:
- API style: [REST | gRPC | hybrid]
- Endpoint/service: [path or service name]
- HTTP method / RPC verb: [GET/POST/PUT/PATCH/DELETE | unary/streaming]
- Request schema: [fields, types, required/optional]
- Response schema: [fields, types, envelope structure]
- Auth mechanism: [bearer/API key/mTLS/none]
- Consumers: [internal services | public clients | mobile apps]

REVIEW AGAINST:
1. Naming: plural nouns for collections, consistent casing, no verbs in paths
2. HTTP semantics: correct status codes, idempotency of PUT/DELETE
3. Versioning: strategy (URL path / header / content-type)
4. Error format: structured error body with code, message, details
5. Pagination: cursor-based vs offset, consistent across endpoints
6. Filtering/sorting: query param conventions, field validation
7. Rate limiting: headers (X-RateLimit-*), 429 response shape
8. Breaking changes: additive-only contract evolution

IDENTIFY:
- Violations of the above principles
- Inconsistencies with existing API surface
- Missing fields consumers will need
- Security gaps (mass assignment, over-fetching, missing auth)
```

## Output Format

```
## API Review: [endpoint]

### Summary
[1-2 sentence verdict: pass/needs-work/redesign]

### Issues Found
| # | Category | Severity | Description | Suggestion |
|---|----------|----------|-------------|------------|
| 1 | ...      | high/med/low | ... | ... |

### Positive Patterns
- [What's done well]

### Recommended Changes
1. [Specific actionable change]
2. ...
```
