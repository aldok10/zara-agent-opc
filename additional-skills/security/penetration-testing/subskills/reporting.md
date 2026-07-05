---
type: subskill
title: "Penetration Test Reporting"
---

# Penetration Test Reporting

Findings documentation, severity classification, remediation guidance, and retesting procedures.

## When to Load

- Writing penetration test reports for clients
- Classifying vulnerability severity consistently
- Providing actionable remediation guidance
- Planning and executing retesting of fixed vulnerabilities

## Key Concepts

**Report Structure**
1. Executive Summary: business impact, overall risk, key recommendations (1 page)
2. Scope and Methodology: what was tested, how, limitations
3. Findings Summary: table of all findings with severity
4. Detailed Findings: individual vulnerability write-ups
5. Remediation Roadmap: prioritized fix plan
6. Appendices: tools used, raw data, compliance mapping

**Severity Classification (CVSS-aligned)**
- Critical (9.0-10.0): RCE, full data breach, auth bypass to all data
- High (7.0-8.9): significant data access, privilege escalation, account takeover
- Medium (4.0-6.9): limited data exposure, requires user interaction, DoS
- Low (0.1-3.9): information disclosure, minor misconfiguration
- Informational: best practice recommendations, no direct exploitation

**Finding Write-up Template**
```
Title: [Clear, specific vulnerability name]
Severity: [Critical/High/Medium/Low/Info]
CVSS Score: [X.X] (Vector: AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N)
CWE: [CWE-XXX - Name]
Affected Asset: [URL/endpoint/system]
Status: [Open/Remediated/Accepted Risk]

DESCRIPTION
[What the vulnerability is, in plain language]

PROOF OF CONCEPT
[Step-by-step reproduction with screenshots/requests]

IMPACT
[What an attacker could achieve by exploiting this]

REMEDIATION
[Specific fix with code examples where applicable]

REFERENCES
[OWASP, CVE, vendor advisory links]
```

## Patterns

**Effective Proof of Concept**
```http
# Request showing IDOR vulnerability
GET /api/v2/invoices/INV-2024-0042 HTTP/1.1
Host: app.example.com
Authorization: Bearer eyJ...user_b_token...
Cookie: session=abc123

# Response (User B accessing User A's invoice)
HTTP/1.1 200 OK
Content-Type: application/json

{
  "invoice_id": "INV-2024-0042",
  "customer": "User A",
  "amount": 15000.00,
  "items": [...]
}
```

**Remediation Quality Levels**
- Bad: "Fix the SQL injection" (too vague)
- OK: "Use parameterized queries instead of string concatenation"
- Good: "Replace line 42 in UserController.java with PreparedStatement using ? placeholders. Example: `stmt = conn.prepareStatement("SELECT * FROM users WHERE id = ?"); stmt.setInt(1, userId);`"

**Retesting Protocol**
1. Client confirms fix deployed and ready for retest
2. Reproduce original PoC exactly -- should fail now
3. Test bypass variants (encoding, alternate paths, edge cases)
4. Verify fix doesn't introduce new issues
5. Update finding status: Remediated / Partially Remediated / Not Remediated
6. Document retest evidence (screenshots, request/response)

## Gotchas

- Screenshots should be timestamped and show full URL/context
- Avoid "theoretical" findings without PoC -- reduces credibility
- Severity should reflect actual exploitability, not worst-case scenario
- Client may dispute severity -- have CVSS calculation ready to justify
- Sensitive data in screenshots must be redacted (other users' PII)
- Reports are legal documents -- precision in language matters

## Verification

- Every finding has reproducible PoC (another tester can follow steps)
- Severity ratings are consistent across all findings
- Remediation guidance is specific enough to implement without guessing
- Executive summary accurately reflects the technical findings
- Report reviewed by second tester before delivery
