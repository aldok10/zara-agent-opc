# Web Application Penetration Testing

OWASP Testing Guide methodology, injection attacks, authentication bypass, and session management flaws.

## When to Load

- Conducting web application security assessments
- Testing for OWASP Top 10 vulnerabilities
- Evaluating authentication and session management
- Assessing input validation and output encoding

## Key Concepts

**OWASP Testing Methodology**
1. Information gathering: technology stack, entry points, functionality mapping
2. Configuration and deployment testing: default credentials, verbose errors, CORS
3. Identity management: registration, account enumeration, password policies
4. Authentication: brute force, credential stuffing, MFA bypass
5. Authorization: IDOR, privilege escalation, forced browsing
6. Session management: token entropy, fixation, timeout, cookie flags
7. Input validation: injection, XSS, file upload, SSRF
8. Error handling: stack traces, error codes revealing internals
9. Cryptography: weak algorithms, improper implementation
10. Business logic: workflow bypass, race conditions, rate limiting

**Injection Types**
- SQL injection: UNION, blind (boolean/time), second-order, out-of-band
- NoSQL injection: operator injection ($gt, $ne), JavaScript injection
- Command injection: OS command concatenation via user input
- LDAP injection: filter manipulation for auth bypass
- Template injection (SSTI): Jinja2, Twig, Freemarker code execution
- XPath injection: XML data extraction via malformed queries

**Authentication Attack Vectors**
- Credential stuffing: leaked password databases against login
- Password spraying: common passwords across many accounts
- JWT attacks: none algorithm, weak signing key, claim manipulation
- OAuth flaws: open redirects, CSRF in auth flow, token leakage
- MFA bypass: backup codes, session persistence after MFA, race conditions

## Patterns

```python
# SQLMap-style detection (conceptual)
test_payloads = {
    "boolean_blind": ["' AND 1=1--", "' AND 1=2--"],
    "time_blind": ["'; WAITFOR DELAY '0:0:5'--", "' AND SLEEP(5)--"],
    "error_based": ["' AND EXTRACTVALUE(1,CONCAT(0x7e,VERSION()))--"],
    "union": ["' UNION SELECT NULL,NULL,NULL--"],
}

# SSRF detection payloads
ssrf_targets = [
    "http://169.254.169.254/latest/meta-data/",  # AWS metadata
    "http://metadata.google.internal/",            # GCP metadata
    "http://169.254.169.254/metadata/instance",   # Azure metadata
    "http://127.0.0.1:6379/",                     # Internal Redis
]
```

**Testing Checklist (per endpoint)**
- [ ] Input validation: test all parameters with injection payloads
- [ ] Authentication: test without token, expired token, other user's token
- [ ] Authorization: test accessing other users' resources (IDOR)
- [ ] Rate limiting: verify brute force protection exists
- [ ] File upload: test extension bypass, content-type manipulation
- [ ] CORS: test with arbitrary Origin header
- [ ] CSP: check for unsafe-inline, unsafe-eval, overly broad sources

## Gotchas

- Automated scanners miss logic flaws -- manual testing required for auth/authz
- WAF may block payloads -- test with encoding/obfuscation variants
- Second-order injection: payload stored now, triggered later in different context
- Testing in production requires explicit authorization and care
- Rate limiting may lock out test accounts -- coordinate with app team
- Some vulnerabilities only appear under specific state (logged in, specific role)

## Verification

- Each finding is reproducible with step-by-step proof of concept
- Severity rating matches actual exploitability (not just theoretical)
- False positives confirmed by manual verification before reporting
- Test coverage documented: which endpoints/functions were tested
- Retesting confirms remediation actually fixes the vulnerability
