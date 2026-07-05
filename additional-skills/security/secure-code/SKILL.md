---
name: secure-code
description: "Secure coding: input validation, injection prevention, crypto, memory safety, supply chain"
---

# Secure Coding Practices

Write code that is correct under adversarial conditions -- defense built into logic, not bolted on.

## Scope

Input validation and sanitization, injection prevention (SQL, XSS, command, template), cryptographic implementation, memory safety patterns, supply chain security, secrets management in code, error handling without information disclosure, secure deserialization, output encoding, race condition prevention.

## First Action

Identify the language, framework, and existing security patterns in the codebase before writing or reviewing secure code.

## Constraints

1. All external input is untrusted -- validate, sanitize, encode at boundaries
2. Parameterized queries only -- no string concatenation for SQL/LDAP/commands
3. Output encoding context-aware: HTML, JS, URL, CSS each encoded differently
4. Cryptography: use vetted libraries (libsodium, tink) -- never roll your own
5. Secrets never in source, logs, error messages, or stack traces
6. Deserialization of untrusted data: avoid or use allowlist-based typing
7. Error messages: generic to users, detailed to logs (structured, no PII)
8. TOCTOU and race conditions prevented with atomic operations or locking
9. Dependencies pinned to exact versions with integrity hashes
10. Transitive dependency vulnerabilities tracked and patched
11. Memory-unsafe languages: bounds checking, use-after-free prevention, fuzzing
12. File operations: validate paths, prevent traversal, use least-privilege handles
13. Regular expressions reviewed for ReDoS -- use RE2 or timeout
14. Security-relevant code changes require review by security-aware engineer
15. Type system used as security boundary where language supports it

## DO NOT

- Concatenate user input into queries, commands, or templates
- Implement custom encryption, hashing, or signing algorithms
- Catch and swallow exceptions silently
- Use eval() or equivalent dynamic code execution with external input
- Trust client-side validation as security control
- Log sensitive data (tokens, passwords, PII, keys)
- Use deprecated crypto (MD5, SHA1 for integrity, DES, RC4)
- Disable TLS verification in production code
- Use wildcard dependency versions

## Route to Subskill

| Signal | Target |
|--------|--------|
| Vulnerability in deployed app | appsec |
| Auth/session implementation | identity-access |
| Cloud secrets/KMS usage | cloud-security |
| Threat model for new feature | threat-modeling |
| Exploit validation needed | penetration-testing |
| Data handling compliance | compliance |

## Verification

- [ ] Input validation at all trust boundaries
- [ ] No string-concatenated queries or commands
- [ ] Crypto uses vetted library with current algorithms
- [ ] No secrets in source or logs
- [ ] Error handling prevents information leakage
- [ ] Dependencies pinned with integrity verification
- [ ] Deserialization safe or absent
- [ ] Security-sensitive paths have test coverage
- [ ] Code passes SAST with zero high/critical findings

## Knowledge

- OWASP Secure Coding Practices Quick Reference
- CWE Top 25 (2025)
- Language-specific guides (Go: golang.org/security, Rust: RustSec, Node: Snyk best practices)
- NIST Secure Software Development Framework (SSDF)
- Supply chain: SLSA framework, Sigstore, in-toto

## AI-Era Context (2026)

- AI-generated code frequently contains injection vulnerabilities and improper error handling -- always review
- LLM code suggestions may reference non-existent packages (package hallucination attacks)
- Supply chain verification: SLSA Level 3+ for critical dependencies
- Memory-safe languages (Rust, Go) preferred for new security-critical components
- SBOM generation integrated into build -- every artifact traceable
- AI coding assistants should have SAST in-loop -- validate before accepting suggestions

## Related Skills

- appsec
- identity-access
- threat-modeling
- penetration-testing
