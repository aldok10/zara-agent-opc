---
type: tool
title: "API Test Design Prompt"
---

# API Test Design Prompt

## Purpose
Generate a structured API test strategy for a given endpoint or API surface.

## Inputs Required
- Endpoint(s) to test (method, path, purpose)
- Authentication mechanism
- Request/response schema or example
- Dependencies (database, external services)
- Business rules and constraints

## Test Design Steps

### 1. Classify the Endpoint
- **Query** (GET): read-only, cacheable, idempotent
- **Command** (POST/PUT/PATCH): state-changing, may have side effects
- **Delete** (DELETE): destructive, may need soft-delete verification
- **Async** (triggers background job): needs polling/webhook verification

### 2. Identify Test Categories

#### Happy Path
- Valid request with minimum required fields
- Valid request with all optional fields populated
- Valid request with boundary values (max length strings, min/max numbers)

#### Authentication & Authorization
- Missing auth header → 401
- Expired token → 401
- Valid token, wrong role → 403
- Valid token, correct role → 200/201

#### Input Validation
- Missing required fields → 422
- Wrong data types → 400
- Empty strings vs null vs missing key
- Array: empty, one item, max items
- String: min length, max length, special characters
- Number: zero, negative, overflow
- Date: past, future, invalid format

#### State-Based
- Resource exists → expected response
- Resource doesn't exist → 404
- Resource in wrong state for operation → 409
- Concurrent modification → 409 (if optimistic locking)

#### Edge Cases
- Duplicate creation (idempotency)
- Large payload at size limit
- Unicode/emoji in string fields
- SQL injection attempts → no error leak
- XSS payloads in input → sanitized output

### 3. Generate Test Plan

```markdown
## Endpoint: [METHOD] [PATH]

### Unit Tests
- [ ] Input validation: [specific fields]
- [ ] Business logic: [specific rules]
- [ ] Error mapping: [error → status code]

### Integration Tests
- [ ] Happy path: valid request → expected response + DB state
- [ ] Auth: [each auth scenario]
- [ ] Validation: [top 3 invalid inputs]
- [ ] State: [resource states]
- [ ] Idempotency: [if applicable]

### Contract Tests
- [ ] Response shape matches consumer expectations
- [ ] Error response shape is consistent

### Performance
- [ ] Response time < [threshold]ms at p95
- [ ] Handles [N] concurrent requests
```

### 4. Output Format

```markdown
## API Test Strategy: [Endpoint Name]

### Endpoint Details
- Method: [GET/POST/PUT/DELETE]
- Path: [/resource/:id]
- Auth: [Bearer JWT / API Key / None]
- Rate Limit: [X requests/minute]

### Test Matrix
| Category | Scenario | Expected | Priority |
|----------|----------|----------|----------|

### Mock Requirements
- [External service X]: mock responses for [scenarios]
- [Database]: seed data for [states]

### Automation Notes
- Framework: [recommended]
- CI integration: [how to run]
- Data cleanup: [strategy]
```
