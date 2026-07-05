---
type: fact
title: "API Security Testing"
---

# API Security Testing

Testing methodology for BOLA, BFLA, injection, rate limiting, and API-specific vulnerabilities.

## API Attack Surface

APIs differ from traditional web apps:
- No UI to guide attack surface -- documentation (or lack thereof) is the map
- Machine-to-machine communication often skips auth controls
- Batch operations amplify single vulnerabilities
- Versioning creates legacy attack surfaces
- Rate limiting is the only defense against abuse at scale

## OWASP API Security Top 10 (2023) -- Testing Guide

### API1: Broken Object Level Authorization (BOLA/IDOR)

The most common and impactful API vulnerability. User A can access User B's resources.

**Testing Approach:**
1. Authenticate as User A, note resource IDs in responses
2. Authenticate as User B, replace IDs with User A's resources
3. Test across: GET (read), PUT/PATCH (modify), DELETE (remove)
4. Try sequential IDs, UUIDs from different accounts, encoded variants

**Patterns to Test:**
```
GET /api/v1/users/{user_id}/orders      # Change user_id
GET /api/v1/documents/{doc_id}           # Change doc_id
PUT /api/v1/accounts/{account_id}        # Modify another's account
DELETE /api/v1/messages/{msg_id}          # Delete another's message
GET /api/v1/invoices?user=other_user     # Filter manipulation
```

**Bypass Techniques:**
- URL encoding: `%2e%2e%2f` for path traversal
- Case variation: `userId` vs `user_id` vs `UserID`
- Wrapping in arrays: `{"id": [1, 2, 3]}` for batch access
- GraphQL field access: query adjacent user's nested objects
- Numeric vs UUID: try both formats for the same endpoint

### API2: Broken Authentication

**Testing Approach:**
- JWT analysis: algorithm confusion (none, HS256 vs RS256)
- Token lifetime: do expired tokens still work?
- Refresh flow: can refresh tokens be replayed?
- API key scope: does a read-only key allow writes?
- Service-to-service: shared secrets, missing auth on internal endpoints

### API3: Broken Object Property Level Authorization (BOPLA)

Accessing or modifying properties you shouldn't have access to.

**Testing Approach:**
```
# Mass assignment: add admin fields to update request
PUT /api/v1/users/me
{"name": "attacker", "role": "admin", "verified": true}

# Excessive data exposure: check response for extra fields
GET /api/v1/users/me
# Response includes: password_hash, internal_id, other users' data?
```

### API4: Unrestricted Resource Consumption

No limits on API usage leading to DoS or financial damage.

**Testing Approach:**
- Send rapid requests: does rate limiting engage?
- Large payloads: upload 100MB file to 1MB-limited endpoint
- Complex queries: deeply nested GraphQL, expensive JOINs
- Batch operations: request 10000 items in single call
- Long-running operations: can you exhaust thread pool?
- SMS/email triggers: can you generate cost by triggering notifications?

### API5: Broken Function Level Authorization (BFLA)

Accessing admin/privileged endpoints with regular user credentials.

**Testing Approach:**
```
# Try admin endpoints with user token
GET /api/v1/admin/users
POST /api/v1/admin/config
DELETE /api/v1/admin/cache

# HTTP method manipulation
GET /api/v1/users (allowed) -- try PUT, DELETE, PATCH
OPTIONS preflight may reveal allowed methods

# Version downgrade
/api/v2/secure-endpoint (403) -- try /api/v1/secure-endpoint
```

### API6: Unrestricted Access to Sensitive Business Flows

Automated abuse of legitimate functionality.

**Testing Approach:**
- Scalping: automate purchase flow faster than humans
- Credential stuffing: login endpoint without rate limiting
- Spam: automated content creation/messaging
- Referral abuse: automated account creation for bonuses
- Scraping: bulk data extraction via API pagination

### API7: Server-Side Request Forgery (SSRF)

**Testing Approach:**
```
# URL parameters that fetch remote resources
POST /api/v1/webhook {"url": "http://169.254.169.254/latest/meta-data/"}
POST /api/v1/import {"source": "http://internal-service:8080/admin"}
POST /api/v1/pdf-export {"template_url": "file:///etc/passwd"}

# DNS rebinding: domain resolves to external then internal IP
# Redirect chains: external URL redirects to internal target
```

### API8: Security Misconfiguration

**Testing Approach:**
- Verbose error messages (stack traces, DB errors)
- Default credentials on management endpoints
- CORS: `Origin: evil.com` reflected in `Access-Control-Allow-Origin`?
- HTTP methods: TRACE, DEBUG enabled?
- TLS configuration: cipher suites, certificate validity
- Missing security headers
- GraphQL introspection enabled in production

### API9: Improper Inventory Management

**Testing Approach:**
- Old API versions still accessible (`/v1/` when `/v3/` is current)
- Undocumented endpoints (discovered via JS analysis, path fuzzing)
- Debug/test endpoints left in production
- Shadow APIs: endpoints not in official documentation
- Third-party integrations with overly broad access

### API10: Unsafe Consumption of Third-Party APIs

**Testing Approach:**
- Inject malicious data through third-party webhooks
- SSRF via third-party redirect URLs
- Deserialization attacks via third-party payloads
- Does the app validate TLS when calling third-party APIs?

## GraphQL-Specific Testing

```graphql
# Introspection (should be disabled in production)
{ __schema { types { name fields { name } } } }

# Nested query DoS
{ users { friends { friends { friends { friends { name } } } } } }

# Batch query abuse
[
  { "query": "{ user(id: 1) { email } }" },
  { "query": "{ user(id: 2) { email } }" },
  ... (1000 queries)
]

# Field suggestion exploitation (info disclosure via errors)
{ usr { name } }  # Error: "Did you mean 'user'? Fields: user, userAdmin, userInternal"

# Alias-based rate limit bypass
{ a: login(user:"admin", pass:"pass1") b: login(user:"admin", pass:"pass2") ... }
```

## gRPC Testing

- Reflection API enabled? (`grpc.reflection.v1.ServerReflection`)
- Unary vs streaming: different auth requirements?
- Proto definition leak: can you enumerate services/methods?
- Large message attacks: proto doesn't enforce size limits by default
- Metadata header manipulation (equivalent to HTTP headers)

## Automation Patterns

### Burp Suite Macros (Session Handling)
- Automatic token refresh when 401 received
- Multi-step auth to obtain valid session
- Parameter extraction from response for next request

### Custom Scripts
- Parameterized BOLA testing across all endpoints
- Automated role matrix validation (user X can/cannot access endpoint Y)
- Rate limit profiling (binary search for threshold)
- Response comparison (authorized vs unauthorized should differ)

## 2026 Context

- API gateways add auth and rate limiting but introduce new bypass opportunities
- AI-generated API clients may not validate TLS or handle errors securely
- WebSocket/SSE APIs often lack the same auth rigor as REST endpoints
- API-first architecture means the API IS the application -- test it like one
- OpenAPI/GraphQL schemas are attack surface documentation -- use them
- Machine identity (workload identity, service mesh mTLS) needs testing too
