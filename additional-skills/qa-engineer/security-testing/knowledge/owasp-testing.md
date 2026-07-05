---
type: fact
title: "OWASP Testing Guide Patterns"
---

# OWASP Testing Guide Patterns

## OWASP Top 10 (2021) - Testing Approach

### A01: Broken Access Control
**Test for:**
- Accessing other users' resources by changing IDs (IDOR)
- Accessing admin endpoints as regular user
- Bypassing access checks by modifying requests
- Accessing API endpoints without proper authorization headers

**Test patterns:**
```
1. Authenticate as User A
2. Note resource ID owned by User A: /api/orders/123
3. Authenticate as User B
4. Request /api/orders/123 as User B → should get 403
5. Try: /api/orders/124, /api/orders/122 (adjacent IDs)
6. Try unauthenticated access → should get 401
```

### A02: Cryptographic Failures
**Test for:**
- Data transmitted over HTTP (not HTTPS)
- Weak TLS configuration (TLS 1.0/1.1, weak ciphers)
- Sensitive data in URLs (tokens in query strings)
- Sensitive data in logs or error messages
- Weak password hashing (MD5, SHA1 without salt)

**Test tools:**
```bash
# Check TLS config
nmap --script ssl-enum-ciphers -p 443 target.com
testssl.sh target.com

# Check for HTTPS redirect
curl -I http://target.com  # Should 301 to https://
```

### A03: Injection
**Test for:**
- SQL injection in all input fields
- NoSQL injection (MongoDB operators in JSON)
- OS command injection in file operations
- LDAP injection in directory lookups
- XSS (reflected, stored, DOM-based)

**SQL injection tests:**
```
' OR '1'='1' --
" OR ""="
1; DROP TABLE users--
' UNION SELECT null,null,null--
1' AND SLEEP(5)--  (blind/time-based)
```

**XSS tests:**
```
<script>alert(1)</script>
<img src=x onerror=alert(1)>
javascript:alert(1)
"><svg onload=alert(1)>
{{7*7}}  (template injection)
```

### A04: Insecure Design
**Test for:**
- Missing rate limiting on sensitive operations
- No account lockout after failed attempts
- Predictable resource identifiers
- Missing business logic validation
- Insufficient fraud prevention

### A05: Security Misconfiguration
**Test for:**
- Default credentials still active
- Unnecessary HTTP methods enabled (PUT, DELETE, TRACE)
- Directory listing enabled
- Stack traces in error responses
- Missing security headers
- Unnecessary ports/services exposed

**Security headers check:**
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY (or SAMEORIGIN)
Strict-Transport-Security: max-age=31536000
Content-Security-Policy: default-src 'self'
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=()
```

### A06: Vulnerable Components
**Test for:**
- Known CVEs in dependencies
- Outdated frameworks with security patches available
- Components with no maintenance (abandoned libraries)

```bash
npm audit
pip-audit
snyk test
trivy image myapp:latest
```

### A07: Auth Failures
**Test for:**
- Credential stuffing (no rate limit)
- Weak password policies accepted
- Session tokens in URL
- Sessions not invalidated on logout
- Missing MFA on sensitive operations
- Password reset token reuse

**Session tests:**
```
1. Login, note session token
2. Logout
3. Replay the old session token → should be rejected
4. Login with two sessions, logout one → only that one expires
5. Check session timeout (idle for 30+ min)
```

### A08: Software and Data Integrity
**Test for:**
- CI/CD pipeline can be compromised
- Auto-update without verification
- Serialization attacks (unsafe deserialization)
- Missing integrity checks on downloads

### A09: Logging and Monitoring Failures
**Test for:**
- Failed logins not logged
- Successful logins not logged
- High-value transactions not logged
- Logs don't have enough context for investigation
- No alerting on suspicious patterns

### A10: Server-Side Request Forgery (SSRF)
**Test for:**
- URL inputs that fetch remote resources
- Webhook URLs pointing to internal services
- File import from URL features
- Image/avatar URL fetch

**SSRF payloads:**
```
http://127.0.0.1/admin
http://localhost:6379  (Redis)
http://169.254.169.254/latest/meta-data/  (AWS metadata)
http://[::1]/admin
file:///etc/passwd
```

## Testing Workflow

### Phase 1: Reconnaissance
- Map application surface (pages, APIs, forms)
- Identify technology stack (headers, response patterns)
- Enumerate endpoints and parameters
- Identify authentication mechanisms

### Phase 2: Automated Scanning
- Run SAST on source code
- Run DAST against deployed application
- Run dependency scanner
- Check security headers and TLS

### Phase 3: Manual Testing
- Test access control (IDOR, privilege escalation)
- Test authentication flows (bypass, session handling)
- Test input handling (injection, XSS)
- Test business logic (rate limits, state manipulation)

### Phase 4: Reporting
- Classify findings by severity (Critical/High/Medium/Low)
- Include reproduction steps
- Suggest remediation
- Prioritize by exploitability × impact

## Quick Checklist Per Feature

For any new feature, test:
- [ ] All inputs validated (type, length, format)
- [ ] Authorization checked (who can access what)
- [ ] Data not leaked in errors or logs
- [ ] Rate limiting on sensitive operations
- [ ] Secure defaults (deny by default)
- [ ] No hardcoded secrets
- [ ] HTTPS enforced
