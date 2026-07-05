# API Penetration Testing

BOLA, BFLA, rate limiting bypass, mass assignment, and GraphQL-specific testing techniques.

## When to Load

- Testing REST or GraphQL APIs for security vulnerabilities
- Assessing authorization logic (object and function level)
- Evaluating rate limiting and resource consumption controls
- Testing API-specific attack vectors not covered by web app testing

## Key Concepts

**OWASP API Security Top 10 (2023)**
1. Broken Object Level Authorization (BOLA): accessing other users' objects
2. Broken Authentication: weak auth mechanisms, token handling
3. Broken Object Property Level Authorization: mass assignment, excessive data exposure
4. Unrestricted Resource Consumption: no rate limits, expensive queries
5. Broken Function Level Authorization (BFLA): calling admin endpoints as user
6. Unrestricted Access to Sensitive Business Flows: automation abuse
7. Server-Side Request Forgery: internal service access via API parameters
8. Security Misconfiguration: verbose errors, default settings, missing headers
9. Improper Inventory Management: undocumented/deprecated endpoints
10. Unsafe Consumption of APIs: trusting third-party API responses

**BOLA Testing Methodology**
- Identify all endpoints that reference resource IDs
- Authenticate as User A, note resource IDs
- Authenticate as User B, attempt to access User A's resources
- Test with: sequential IDs, UUIDs (guessable?), predictable patterns
- Test both read AND write operations
- Check cascading access (user -> org -> resource chains)

**BFLA Testing Methodology**
- Map all endpoints by required role (admin, user, anonymous)
- Test each admin endpoint with user-level tokens
- Test user endpoints with anonymous access
- Check horizontal privilege escalation (user A's admin accessing user B's org)
- Test HTTP method switching (GET allowed but POST on same path blocked?)

## Patterns

```bash
# BOLA testing with curl
# Step 1: Get User A's resource
curl -H "Authorization: Bearer $TOKEN_A" https://api.example.com/orders/123

# Step 2: Try accessing User A's resource as User B
curl -H "Authorization: Bearer $TOKEN_B" https://api.example.com/orders/123
# If 200 with User A's data -> BOLA vulnerability

# Mass assignment testing
# Step 1: Normal update
curl -X PUT -H "Authorization: Bearer $TOKEN" \
  -d '{"name": "test"}' \
  https://api.example.com/users/me

# Step 2: Inject admin fields
curl -X PUT -H "Authorization: Bearer $TOKEN" \
  -d '{"name": "test", "role": "admin", "is_admin": true, "plan": "enterprise"}' \
  https://api.example.com/users/me
```

**GraphQL-Specific Attacks**
- Introspection: query __schema for full API map (should be disabled in prod)
- Batching: send multiple queries in one request to bypass rate limits
- Deep nesting: recursive queries causing DoS (query depth limits needed)
- Field suggestion: error messages revealing field names
- Alias-based batching: same query aliased N times in one request

```graphql
# GraphQL depth attack
query {
  user(id: 1) {
    friends {
      friends {
        friends {
          friends { name }
        }
      }
    }
  }
}

# Alias-based rate limit bypass
query {
  a1: login(email: "user@test.com", password: "pass1") { token }
  a2: login(email: "user@test.com", password: "pass2") { token }
  a3: login(email: "user@test.com", password: "pass3") { token }
}
```

## Gotchas

- UUIDs don't prevent BOLA -- they just make guessing harder (not impossible)
- API versioning: old versions may lack security fixes (test /v1/ and /v2/)
- Webhook endpoints often skip authentication entirely
- Pagination parameters (limit=99999) can dump entire datasets
- Content-type confusion: JSON body accepted even when docs say form-encoded
- API gateways may cache responses, masking authorization bugs in testing

## Verification

- Each BOLA/BFLA finding includes both legitimate and unauthorized request/response
- Rate limiting tested with concurrent requests (not sequential)
- GraphQL depth/complexity limits confirmed with actual query execution
- Mass assignment tested against all writable endpoints
- Undocumented endpoints discovered via wordlist, OpenAPI diff, or traffic analysis
