# OWASP Top 10:2025

Source: https://owasp.org/Top10/2025/

## A01: Broken Access Control

Users act outside intended permissions. Includes IDOR, privilege escalation, CORS misconfiguration, force browsing, and missing access controls on APIs. Found in 100% of tested applications.

**Prevention:**
- Deny by default except for public resources
- Implement access control once and reuse throughout the app
- Enforce record ownership in model layer
- Log access control failures and alert on repeated attempts
- Use short-lived JWTs with proper invalidation on logout

```java
// BAD: user-controlled ID without ownership check
pstmt.setString(1, request.getParameter("acct"));
// GOOD: enforce ownership
pstmt.setString(1, currentUser.getAccountId());
```

## A02: Security Misconfiguration

Incorrect security settings across the stack: unnecessary features enabled, default credentials, verbose errors, missing security headers, permissive cloud storage. Found in 100% of tested applications.

**Prevention:**
- Automate repeatable hardening processes across all environments
- Remove unused features, frameworks, and sample apps
- Send security headers (HSTS, CSP, X-Frame-Options)
- Review cloud storage permissions (S3 buckets, etc.)
- Use identity federation and short-lived credentials over static keys

```yaml
# GOOD: security headers in nginx
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

## A03: Software Supply Chain Failures

Vulnerabilities or malicious changes in third-party code, tools, CI/CD pipelines, or transitive dependencies. Includes using components with known vulnerabilities, unmaintained packages, and compromised build systems.

**Prevention:**
- Generate and maintain an SBOM of all dependencies (including transitive)
- Continuously monitor CVE/NVD/OSV for vulnerabilities in your components
- Only obtain packages from trusted sources with signature verification
- Pin dependency versions; use lockfiles
- Harden CI/CD with separation of duties, signed builds, and access control

```json
// package.json: pin exact versions
"dependencies": {
  "express": "4.18.2",
  "helmet": "7.1.0"
}
```

## A04: Cryptographic Failures

Missing or weak encryption, key leakage, deprecated algorithms (MD5, SHA1), missing TLS, unsalted password hashes, or predictable random number generators.

**Prevention:**
- Encrypt all data in transit with TLS 1.2+ with forward secrecy
- Hash passwords with Argon2, scrypt, or bcrypt (never MD5/SHA1)
- Never store crypto keys in source code; use HSMs or vault services
- Enforce HSTS; disable caching for sensitive responses
- Use authenticated encryption (GCM) over plain encryption (CBC)

```python
# BAD
hashlib.md5(password.encode()).hexdigest()
# GOOD
from argon2 import PasswordHasher
ph = PasswordHasher()
ph.hash(password)
```

## A05: Injection

Untrusted input sent to an interpreter (SQL, OS, LDAP, XSS) causing unintended command execution. Includes SQL injection, XSS, command injection, and template injection.

**Prevention:**
- Use parameterized queries / prepared statements for all database access
- Use safe APIs that avoid the interpreter entirely (ORMs with bind params)
- Apply positive server-side input validation
- Escape output contextually (HTML, JS, URL, CSS)
- Add SAST/DAST tools to CI/CD pipeline

```java
// BAD: string concatenation
String q = "SELECT * FROM users WHERE id='" + input + "'";
// GOOD: parameterized
PreparedStatement ps = conn.prepareStatement("SELECT * FROM users WHERE id=?");
ps.setString(1, input);
```

## A06: Insecure Design

Missing or ineffective security controls at the architecture level. Unlike implementation bugs, these are design flaws that cannot be fixed by better code alone. Includes missing threat modeling, business logic flaws, and lack of rate limiting.

**Prevention:**
- Use threat modeling for critical authentication, access control, and business logic flows
- Establish secure design patterns and a paved-road component library
- Integrate plausibility checks at each tier (frontend through backend)
- Write unit/integration tests for both use-cases and misuse-cases
- Segregate tenants and tier layers by exposure and protection needs

```python
# Design-level control: rate limit ticket purchases
@rate_limit(max_calls=5, period=60)
def purchase_tickets(user, quantity):
    if quantity > MAX_PER_USER:
        raise BusinessRuleViolation("Max 15 tickets per booking")
```

## A07: Authentication Failures

Credential stuffing, brute force, default passwords, weak session management, missing MFA, and improper session invalidation on logout.

**Prevention:**
- Implement MFA on all critical systems
- Never ship default credentials; check passwords against breach lists
- Follow NIST 800-63b guidelines (no forced rotation, minimum length over complexity)
- Generate new high-entropy session ID after login; invalidate on logout
- Rate-limit and log failed login attempts

```javascript
// GOOD: regenerate session after login
req.session.regenerate((err) => {
  req.session.userId = user.id;
  req.session.save();
});
```

## A08: Software or Data Integrity Failures

Failure to verify integrity of code, data, or updates. Includes insecure deserialization, unsigned updates, CDN/plugin inclusion without integrity checks, and insecure CI/CD pipelines.

**Prevention:**
- Verify digital signatures on all software updates and dependencies
- Use Subresource Integrity (SRI) for CDN-loaded scripts
- Ensure CI/CD has proper segregation, configuration, and access control
- Never deserialize untrusted data without integrity verification
- Host an internal vetted repository for high-risk environments

```html
<!-- GOOD: SRI for CDN scripts -->
<script src="https://cdn.example.com/lib.js"
  integrity="sha384-abc123..."
  crossorigin="anonymous"></script>
```

## A09: Security Logging and Alerting Failures

Insufficient logging of security events, no monitoring, no alerting on attacks. Without this, breaches go undetected for months or years.

**Prevention:**
- Log all login attempts (success and failure), access control failures, and input validation failures
- Generate logs in a format consumable by log management tools (structured JSON)
- Encode log data to prevent log injection attacks
- Use append-only storage with integrity controls for audit trails
- Establish alerting thresholds and incident response playbooks

```go
// GOOD: structured security logging
logger.Warn("auth_failure",
    "ip", req.RemoteAddr,
    "user", username,
    "reason", "invalid_password",
    "attempt", failCount,
)
```

## A10: Mishandling of Exceptional Conditions

New in 2025. Improper error handling that leads to crashes, information leakage, failing open, resource exhaustion, or state corruption. Includes unchecked return values, generic exception handlers, and missing rollbacks.

**Prevention:**
- Catch errors at the point they occur; never let infrastructure handle them
- Always fail closed: roll back partial transactions completely
- Never expose stack traces or internal details to users
- Implement rate limiting and resource quotas to prevent exhaustion
- Use a centralized error handling strategy across the application

```go
// GOOD: fail closed with rollback
tx, err := db.Begin()
if err != nil {
    return fmt.Errorf("tx start: %w", err)
}
defer tx.Rollback()

if err := debit(tx, from, amount); err != nil {
    return err // entire tx rolls back
}
if err := credit(tx, to, amount); err != nil {
    return err // entire tx rolls back
}
return tx.Commit()
```
