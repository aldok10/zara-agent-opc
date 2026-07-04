# AI Security Review

Security review of AI-generated code. Treat every AI PR like code from a confident, fast, untrusted junior.

## The core danger

Stanford finding: developers using AI write LESS secure code AND feel MORE confident. Double danger — lower quality, higher trust.

## AI security blind spots

- **Injection**: generates SQL/shell commands from user input without sanitization
- **Hardcoded secrets**: places placeholder secrets that look real and get committed
- **Over-permissive**: broad permissions (`SELECT *`, admin roles, public endpoints)
- **Missing auth checks**: implements the happy path, forgets access control
- **Insecure defaults**: HTTP not HTTPS, disables TLS verification for convenience
- **Dependency risks**: imports unknown packages that may be typosquatting

## Security checklist for AI output

1. All user inputs validated and sanitized?
2. SQL uses parameterized queries (never string interpolation)?
3. Auth/authz checks on every endpoint?
4. No hardcoded secrets, tokens, or passwords?
5. Dependencies well-known, pinned versions, no typosquats?
6. Error messages don't leak internal details?
7. File operations use safe paths (no path traversal)?
8. Crypto uses standard libraries, not custom implementations?
9. CORS/CSP headers configured correctly?
10. Rate limiting on auth endpoints?

## Automated tools (MUST run on all AI code)

- **Go**: gosec, staticcheck
- **Python**: bandit, safety
- **TypeScript**: eslint-plugin-security, snyk
- **PHP**: phpstan (security rules), composer audit
- **General**: semgrep (custom rules), Snyk, Dependabot

## Mental model

"AI generated this" = untrusted junior contribution. Confident, fast, but potentially dangerous. Review accordingly.

## Anti-patterns

- Trusting AI because it "looks right"
- No SAST in pipeline
- Reviewing logic without checking security
- Skipping dependency audit
