# OWASP Top 10 2025

Reference for the 2025 revision of OWASP's most critical web application security risks.

## A01: Broken Access Control

Remains #1. Failures in enforcing user permissions after authentication.

**Patterns:**
- Insecure direct object references (IDOR) -- user can access other users' data by changing ID
- Missing function-level access control on API endpoints
- CORS misconfiguration allowing unauthorized origins
- Metadata manipulation (JWT claims, cookies, hidden fields)

**Mitigations:**
- Deny by default -- every endpoint requires explicit authorization
- Server-side access control enforced per request (not just UI hiding)
- Rate limit and log access control failures
- Disable directory listing; remove metadata files from webroot
- Invalidate stateful session identifiers on logout
- Use attribute-based access control (ABAC) or ReBAC for complex policies

## A02: Cryptographic Failures

Exposure of sensitive data due to weak or missing cryptography.

**Patterns:**
- Data transmitted in cleartext (HTTP, SMTP, FTP)
- Deprecated algorithms: MD5, SHA1, DES, RC4, PKCS1v1.5
- Hard-coded keys or insufficient key rotation
- Missing encryption at rest for PII/PHI/financial data

**Mitigations:**
- TLS 1.3 for all transit; HSTS preloading
- AES-256-GCM or ChaCha20-Poly1305 for symmetric encryption
- Ed25519 or ECDSA P-256 for signatures
- Argon2id for password hashing (memory: 64MB, iterations: 3, parallelism: 1)
- Key management via cloud KMS -- never application-managed raw keys
- Classify data; encrypt based on sensitivity tier

## A03: Injection

Hostile data sent to interpreter as part of command/query.

**Patterns:**
- SQL injection via string concatenation
- XSS (reflected, stored, DOM-based)
- Server-side template injection (SSTI)
- OS command injection
- LDAP/XPath/NoSQL injection
- LLM prompt injection (2025 addition)

**Mitigations:**
- Parameterized queries (prepared statements) everywhere
- Context-aware output encoding (HTML, JS, URL, CSS)
- Content Security Policy (CSP) with nonce-based scripts
- Input validation: allowlist patterns, reject unexpected types
- Structured prompt templates for LLM interactions
- Sandboxed execution for dynamic content

## A04: Insecure Design

Flaws in architecture and design patterns -- not fixable by code alone.

**Patterns:**
- Missing rate limiting on business-critical flows
- No fraud prevention in purchase/transfer logic
- Trust boundaries not defined between components
- Missing abuse cases in requirements

**Mitigations:**
- Threat modeling during design (STRIDE per element)
- Secure design patterns: least privilege, defense in depth, fail-safe defaults
- Abuse case stories alongside user stories
- Unit and integration tests for security requirements
- Segregation of tenants at design level

## A05: Security Misconfiguration

Insecure default settings, incomplete configuration, verbose errors.

**Patterns:**
- Default credentials left active
- Unnecessary features enabled (methods, ports, services)
- Stack traces exposed to users
- Missing security headers
- Cloud storage publicly accessible

**Mitigations:**
- Hardened baseline configs enforced via IaC
- Minimal platform: remove unused features, frameworks, dependencies
- Automated configuration drift detection (CSPM)
- Segmented environments with different credentials
- Review all cloud permission policies quarterly

## A06: Vulnerable and Outdated Components

Known vulnerabilities in dependencies, libraries, frameworks.

**Patterns:**
- Unpatched libraries with public CVEs
- Abandoned dependencies with no maintainer
- Nested transitive vulnerabilities invisible to manifest scan
- Using components beyond their support lifecycle

**Mitigations:**
- SCA scanning against lockfile in CI (not just manifest)
- Critical CVE patches within 72 hours; high within 7 days
- SBOM generation (CycloneDX) in every build
- Dependency update automation (Renovate/Dependabot with merge policies)
- Monitor OpenSSF Scorecard for dependency health
- Pin exact versions with integrity hashes

## A07: Identification and Authentication Failures

Weak authentication allowing credential stuffing, brute force, session hijacking.

**Patterns:**
- Missing MFA on sensitive operations
- Weak password policies or no breach-password checks
- Session fixation or token not rotated post-auth
- Credential stuffing with no rate limiting

**Mitigations:**
- Passkeys/WebAuthn as primary authentication where possible
- Argon2id password hashing with breach detection (HaveIBeenPwned k-anonymity)
- Session tokens: high entropy, HttpOnly, Secure, SameSite=Strict
- Account lockout with exponential backoff
- MFA enforcement for admin and financial operations

## A08: Software and Data Integrity Failures

Assumptions about integrity without verification.

**Patterns:**
- CI/CD pipeline without artifact signing
- Deserialization of untrusted data
- Auto-update mechanisms without signature verification
- CDN-served scripts without SRI hashes

**Mitigations:**
- SLSA Level 3+ for release artifacts
- Subresource Integrity (SRI) for all external scripts
- Signed commits and verified build provenance
- Avoid native deserialization; use schema-validated formats (JSON with strict types)
- Review and pin GitHub Actions/plugins by SHA

## A09: Security Logging and Monitoring Failures

Insufficient logging preventing breach detection.

**Patterns:**
- Auth failures not logged
- Logs lack context (who, what, when, from where)
- No alerting on suspicious patterns
- Logs stored without integrity protection

**Mitigations:**
- Structured logging: actor, action, resource, outcome, timestamp, source IP
- Alert on: repeated auth failures, privilege escalation, unusual data export
- Log retention aligned to compliance (minimum 90 days hot, 1 year cold)
- Tamper-evident log storage (append-only, signed)
- SIEM integration with correlation rules

## A10: Server-Side Request Forgery (SSRF)

Application fetches remote resources without validating user-supplied URLs.

**Patterns:**
- URL fetcher hitting internal metadata endpoints (169.254.169.254)
- DNS rebinding bypassing allowlists
- File scheme access to local filesystem
- Redirect chains escaping validation

**Mitigations:**
- Allowlist valid URL schemes, ports, and destinations
- Block RFC1918 and link-local addresses at network layer
- Disable HTTP redirects in fetcher or re-validate after redirect
- Use IMDS v2 (instance metadata service) requiring PUT token
- DNS resolution pinning -- validate resolved IP, not just hostname
