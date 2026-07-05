# Web Application Penetration Testing

Methodology based on OWASP Testing Guide v5 and PTES for web application security assessment.

## Testing Phases

### Phase 1: Reconnaissance and Mapping

**Passive Reconnaissance:**
- DNS enumeration (subdomains, MX, TXT records)
- Technology fingerprinting (Wappalyzer, HTTP headers, error pages)
- Search engine dorking (site:, inurl:, filetype:)
- Certificate transparency logs (crt.sh)
- Wayback Machine for historical endpoints
- GitHub/GitLab search for leaked credentials or configs

**Active Reconnaissance:**
- Port scanning (TCP/UDP top ports on target hosts)
- Web crawling and spidering (respect scope)
- Directory brute-forcing (common paths, backup files)
- API endpoint discovery (OpenAPI spec, common patterns)
- Parameter discovery (fuzzing query/body/header parameters)
- JavaScript analysis (endpoints, API keys, logic in client code)

### Phase 2: Authentication Testing

| Test | Technique | Expected Secure Behavior |
|------|-----------|------------------------|
| Credential stuffing | Automated login with breached pairs | Account lockout or CAPTCHA after 5 failures |
| Password policy | Register with weak passwords | Reject passwords <12 chars, check breach lists |
| MFA bypass | Replay codes, skip step, force SMS | MFA cannot be bypassed, codes single-use |
| Session fixation | Set session ID before auth | New session ID issued after successful login |
| Token analysis | Decode JWT, check expiry/signing | Short-lived, strong algorithm, proper validation |
| Account enumeration | Register/reset with existing emails | Generic responses regardless of account existence |
| OAuth misconfiguration | Redirect URI manipulation, CSRF | Exact URI matching, state parameter validated |
| Password reset | Token predictability, reuse | High-entropy token, single-use, time-limited |

### Phase 3: Authorization Testing

**Vertical Privilege Escalation:**
- Access admin endpoints with regular user token
- Modify role/privilege in request body
- Access other users' resources by changing ID
- Force-browse to administrative URLs

**Horizontal Privilege Escalation:**
- Change user/account identifiers in requests (IDOR)
- Access other tenants' data in multi-tenant apps
- Modify ownership references in update operations
- Export/download with manipulated scope

**Business Logic:**
- Skip steps in multi-step workflows
- Manipulate pricing/quantities in commerce flows
- Race conditions in balance/inventory operations
- Abuse promotional/referral mechanisms

### Phase 4: Injection Testing

**SQL Injection:**
- Single quote, boolean-based, time-based blind
- UNION-based extraction
- Second-order injection (stored then triggered)
- ORM bypass techniques

**Cross-Site Scripting (XSS):**
- Reflected: parameters echoed in response
- Stored: persisted in database, rendered to others
- DOM-based: client-side JavaScript sinks
- Context-aware payloads (HTML, attribute, JS, URL, CSS)

**Server-Side Template Injection (SSTI):**
- Template expression detection ({{7*7}}, ${7*7}, #{7*7})
- Engine identification from error messages
- Escalation to RCE via template engine features

**OS Command Injection:**
- Pipe/semicolon/backtick in parameters
- Blind injection with time-based or OOB techniques
- Input used in shell commands (file operations, DNS lookups)

**Other Injection:**
- LDAP injection in directory lookups
- NoSQL injection (MongoDB operators in JSON)
- GraphQL injection (introspection, nested queries)
- Header injection (CRLF, host header)

### Phase 5: Client-Side Testing

- CSP evaluation (bypasses, unsafe-inline, unsafe-eval)
- CORS misconfiguration (wildcard, reflected origin)
- Clickjacking (missing X-Frame-Options/CSP frame-ancestors)
- WebSocket security (origin validation, authentication)
- PostMessage handler validation
- Local storage sensitive data exposure
- Service worker scope and registration

### Phase 6: Server-Side Testing

- SSRF (internal network access, cloud metadata)
- XXE (XML external entity injection)
- File upload (type bypass, path traversal, polyglots)
- Deserialization (known gadget chains)
- Race conditions (parallel requests exploiting shared state)
- HTTP request smuggling (CL/TE, TE/CL, TE/TE)
- Cache poisoning (cache key manipulation)

## Testing Tools Stack

| Category | Tool | Use Case |
|----------|------|----------|
| Proxy | Burp Suite Pro | Request interception, modification, repeating |
| Scanner | Nuclei | Known vulnerability detection |
| Fuzzer | ffuf | Directory, parameter, and content discovery |
| SQLi | sqlmap | Automated SQL injection exploitation |
| XSS | Dalfox | Automated XSS detection and verification |
| Auth | Authz0 | Authorization testing framework |
| API | Postman + Newman | API workflow testing |
| Recon | Amass, subfinder | Subdomain enumeration |
| Wordlists | SecLists | Comprehensive payload and wordlist collection |

## Reporting Standards

### Finding Severity Scoring

Use CVSS 4.0 as base, adjust with:
- Exploitability in target environment (not just theoretical)
- Business impact of the specific data/function affected
- Existing compensating controls
- Likelihood based on attacker accessibility

### Finding Structure
```
Title: [Specific vulnerability, not generic category]
Severity: Critical/High/Medium/Low/Info
CVSS: X.X (vector string)
CWE: CWE-XXX
Location: URL/endpoint + parameter
Description: What the vulnerability is (1-2 paragraphs)
Impact: What an attacker can achieve (specific to this app)
Reproduction: Step-by-step with screenshots/requests
Evidence: HTTP request/response demonstrating the issue
Remediation: Specific fix with code example
References: OWASP, CWE, vendor documentation
```

## Scope and Rules of Engagement

Always document before testing:
- In-scope targets (domains, IPs, environments)
- Out-of-scope (production with real users, third-party services)
- Testing window (dates, hours)
- Rate limits (requests per second)
- Escalation contacts (who to call if something breaks)
- Data handling (no exfiltration of real user data)
- Credential scope (test accounts only vs credential stuffing)
- Social engineering: included or excluded?

## 2026 Context

- AI-assisted recon: LLMs analyze JavaScript bundles and identify API patterns
- GraphQL and gRPC are primary API surfaces (tools have matured)
- Server-side template injection now includes AI prompt injection as a variant
- WebAssembly targets: binary analysis required for client-side logic
- API gateway and service mesh add new attack surface between services
- Container escape testing: from application to host/cluster
- Supply chain: test dependency confusion, typosquatting in package managers
