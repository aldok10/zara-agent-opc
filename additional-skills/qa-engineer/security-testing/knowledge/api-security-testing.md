---
type: fact
title: "API Security Testing"
---

# API Security Testing

## BOLA (Broken Object Level Authorization)

OWASP API Security #1. The attacker modifies object IDs in requests to access other users' data.

### Testing Pattern
```http
# Authenticated as user A, access user B's resource
GET /api/users/USER_B_ID/orders HTTP/1.1
Authorization: Bearer TOKEN_OF_USER_A

# Try IDOR variants
GET /api/orders/12345       → change to /api/orders/12346
GET /api/documents?id=abc   → change to /api/documents?id=def
```

### What to Check
- Sequential IDs (easy to enumerate)
- UUID-based IDs (still vulnerable if no auth check)
- Nested resources: `/users/{id}/settings` — test with wrong user's token
- Batch endpoints: `POST /api/batch` with mixed-ownership IDs
- GraphQL: query nodes by ID without ownership validation

### Remediation Validation
- Confirm 403 (not 404) when accessing unauthorized resource
- Verify at the data layer, not just URL routing
- Test both direct access and indirect references (foreign keys)

## BFLA (Broken Function Level Authorization)

Attacker accesses admin or privileged endpoints using regular user credentials.

### Testing Pattern
```http
# Regular user attempting admin action
DELETE /api/admin/users/123 HTTP/1.1
Authorization: Bearer REGULAR_USER_TOKEN

# Method-based escalation
GET /api/users/123       → allowed
PUT /api/users/123       → should be restricted?
DELETE /api/users/123    → should be restricted?

# Hidden admin endpoints
GET /api/internal/metrics
POST /api/admin/config
```

### Discovery Techniques
- Review OpenAPI spec for admin-tagged endpoints
- Fuzz URL paths: `/admin/`, `/internal/`, `/debug/`, `/management/`
- Try HTTP method switching on known endpoints
- Check if role checks are in middleware vs controller

## Rate Limiting Bypass

### Common Bypass Techniques to Test
```http
# IP rotation headers (check if backend trusts these)
X-Forwarded-For: 1.2.3.4
X-Real-IP: 5.6.7.8
X-Originating-IP: 9.10.11.12

# Case manipulation
GET /api/Users vs /api/users vs /API/USERS

# Path parameter tricks
GET /api/users/../users/profile
GET /api/users/./profile

# API versioning bypass
GET /v1/api/login vs /v2/api/login (different rate limits?)
```

### What to Validate
- Rate limits apply per user, not just per IP
- Limits aren't bypassable via header injection
- Limits apply consistently across equivalent endpoint paths
- 429 response includes Retry-After header
- Limits reset correctly after window expires

## JWT Attacks

### Common Vulnerabilities
```
# Algorithm confusion (alg: none)
{"alg": "none", "typ": "JWT"}
# Sign with empty string

# Algorithm switch (RS256 → HS256)
# Use public key as HMAC secret to forge token

# Key ID injection
{"kid": "../../etc/passwd"}
{"kid": "key1' UNION SELECT 'secret' --"}

# Expired token acceptance
# Send token with exp in the past

# Missing signature validation
# Modify payload, keep original signature
```

### Testing Checklist
- [ ] `alg: none` rejected
- [ ] Algorithm mismatch rejected (RS256 token validated with HS256)
- [ ] Expired tokens rejected
- [ ] Tokens from different issuer rejected
- [ ] Modified payload with valid signature format rejected
- [ ] `kid` parameter sanitized (no path traversal/injection)
- [ ] Token revocation works (logout invalidates token)
- [ ] Refresh token rotation enforced

## Mass Assignment

Attacker sends extra fields that map to internal model properties.

### Testing Pattern
```http
# Normal user registration
POST /api/users
{"name": "Test", "email": "test@test.com"}

# Mass assignment attempt
POST /api/users
{"name": "Test", "email": "test@test.com", "role": "admin", "verified": true}

# Update endpoint
PUT /api/users/me
{"name": "Test", "balance": 99999, "subscription": "enterprise"}
```

### What to Check
- Can users set roles/permissions via API?
- Can users modify billing/subscription fields?
- Can users set internal flags (verified, approved, active)?
- Do nested objects allow setting related model fields?
- Does PATCH vs PUT have different protections?

### Detection in Tests
```javascript
// Verify extra fields are ignored
const response = await api.post('/users', {
  name: 'Test',
  role: 'admin'  // should be ignored
});

const user = await api.get(`/users/${response.body.id}`);
expect(user.body.role).toBe('user');  // default, not 'admin'
```

## Testing Methodology

### Tooling
- **Burp Suite**: intercept/modify requests, active scanning
- **OWASP ZAP**: open-source alternative, CI-friendly
- **Postman**: collection-based security test suites
- **nuclei**: template-based vulnerability scanning
- **jwt_tool**: JWT-specific attack automation

### CI Integration
```yaml
# OWASP ZAP in CI
- name: API Security Scan
  run: |
    zap-api-scan.py \
      -t http://localhost:3000/openapi.json \
      -f openapi \
      -r security-report.html \
      -c zap-rules.conf
```

### Priority Order for Testing
1. Authentication bypass (token handling, session management)
2. BOLA on all data-access endpoints
3. BFLA on privileged operations
4. Input validation (injection, overflow)
5. Rate limiting on authentication endpoints
6. Mass assignment on create/update endpoints
7. Information disclosure in error responses

## Common Findings Pattern

| Finding | Severity | Frequency |
|---|---|---|
| BOLA on GET endpoints | High | Very common |
| Missing rate limit on login | Medium | Common |
| JWT not validated properly | Critical | Occasional |
| Verbose error messages | Low | Very common |
| Mass assignment on registration | High | Common |
| BFLA on admin endpoints | Critical | Occasional |
| No input length limits | Medium | Common |
