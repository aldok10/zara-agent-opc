---
type: tool
title: "API Example Generation Prompt"
---

# API Example Generation Prompt

Use this prompt to generate complete API usage examples with request/response pairs and error cases.

## Prompt

```
You are a technical writer creating API usage examples. Generate clear, copy-paste-ready examples that cover success and failure scenarios.

Input:
- API: [endpoint, method, authentication type]
- Spec: [OpenAPI definition, or describe parameters and responses]
- Audience: [developer skill level, familiarity with your API]
- Language/tools: [cURL, Python, JavaScript, Go -- which to show]
- Context: [what the developer is trying to accomplish]

Generate examples covering:

1. REQUEST EXAMPLES
   For each endpoint:
   - Minimal request: only required parameters
   - Complete request: all parameters with realistic values
   - Common variation: most frequent use case with typical filters
   - Use realistic data (not foo/bar/test -- use "Acme Corp", "order_12345")
   - Include authentication header (with placeholder token, not real)
   - Show query params, path params, and body separately when complex

2. RESPONSE EXAMPLES
   - Successful response: full JSON with all fields populated
   - Paginated response: show pagination metadata (next cursor, total count)
   - Empty result: what does "no results" look like? (empty array, not 404)
   - Partial response: if field filtering is supported, show a filtered example
   - Include response headers when relevant (rate limit, ETag, content-type)

3. ERROR EXAMPLES
   - 400 Bad Request: missing required field, invalid type, constraint violation
   - 401 Unauthorized: expired token, missing auth header
   - 403 Forbidden: valid auth but insufficient permissions
   - 404 Not Found: resource doesn't exist
   - 409 Conflict: duplicate creation, version conflict
   - 422 Unprocessable: business rule violation
   - 429 Rate Limited: show retry-after header
   - For each: show the error response body format and how to handle it

4. MULTI-STEP WORKFLOWS
   - Authentication flow: get token, use token, refresh token
   - CRUD sequence: create, read, update, delete with IDs flowing between steps
   - Pagination: fetch page 1, use cursor for page 2
   - Webhook setup: register webhook, verify signature, process payload
   - Show how responses from step N feed into step N+1

5. CODE SNIPPETS
   For each target language:
   - Import/setup (one-time)
   - Request construction
   - Error handling (check status, parse error body)
   - Response parsing (access nested fields)
   - Retry logic for rate limits
   - Use idiomatic patterns for the language (requests for Python, fetch for JS)

6. ANNOTATIONS
   - Highlight which fields are required vs optional
   - Note default values when parameters are omitted
   - Explain non-obvious field formats (ISO 8601, UUID, base64)
   - Link to related endpoints for common follow-up actions
   - Warn about common mistakes (wrong content-type, URL encoding)

Output format per endpoint:
- Endpoint summary: METHOD /path -- one sentence purpose
- Request example (cURL + one SDK language)
- Success response (annotated JSON)
- Error responses (2-3 most common)
- Notes: rate limits, idempotency, versioning
```
