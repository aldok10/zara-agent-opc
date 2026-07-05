---
name: penetration-testing
description: "Offensive security: penetration testing methodology, web/API testing, reporting"
---

# Penetration Testing

Simulate adversary techniques to identify exploitable weaknesses before real attackers do.

## Scope

Web application penetration testing, API security testing (REST/GraphQL/gRPC), network penetration testing, cloud infrastructure testing, mobile application testing, social engineering assessment scoping, purple team exercises, vulnerability chaining, proof-of-concept development, risk-rated reporting.

## First Action

Define scope, rules of engagement, and authorization documentation before any testing activity. Confirm legal authorization in writing.

## Constraints

1. Written authorization required before any testing -- no exceptions
2. Scope boundaries strictly respected -- out-of-scope systems never touched
3. Testing follows methodology: recon > enumeration > exploitation > post-exploitation > reporting
4. Every finding has proof-of-concept demonstrating impact
5. Findings rated by CVSS 4.0 and business impact
6. Critical/high findings communicated immediately -- not held for final report
7. Testing does not cause denial of service unless explicitly authorized
8. Data accessed during testing: documented, not exfiltrated, deleted post-engagement
9. Credential reuse tested across discovered services
10. Authentication bypass and privilege escalation tested for every role
11. Business logic flaws tested -- not just technical vulnerabilities
12. API testing covers: broken auth, BOLA/BFLA, injection, rate limiting, mass assignment
13. Remediation guidance specific and actionable -- not generic CWE descriptions
14. Retest included to verify fixes
15. Document every action with timestamps during engagement for reproducibility
16. Responsible disclosure -- notify vendor first, follow agreed timeline
17. Test in isolated environments; production only with explicit written approval

## DO NOT

- Test without written authorization and defined scope
- Cause production outages or data loss
- Exfiltrate real user data as proof of exploitation
- Use zero-day exploits without explicit approval
- Skip business logic testing because scanners don't find it
- Report scanner output without manual verification
- Leave backdoors, shells, or test accounts after engagement
- Share findings with unauthorized parties
- Test third-party services without their authorization

## Route to Subskill

| Signal | Target |
|--------|--------|
| Remediation code patterns | secure-code |
| Threat model from findings | threat-modeling |
| IAM weakness exploitation | identity-access |
| Cloud misconfig exploitation | cloud-security |
| SDLC integration of findings | appsec |
| Compliance impact of findings | compliance |

## Verification

- [ ] Authorization and scope documented before testing
- [ ] Methodology followed systematically (no ad-hoc only)
- [ ] All findings have reproducible proof-of-concept
- [ ] CVSS 4.0 scores assigned with business context
- [ ] Critical findings communicated within 24h of discovery
- [ ] Report includes attack narrative showing chain of exploitation
- [ ] Remediation guidance is specific and implementable
- [ ] Cleanup confirmed -- no artifacts left in target environment

## Knowledge

- OWASP Testing Guide v5
- OWASP API Security Top 10 (2023)
- PTES (Penetration Testing Execution Standard)
- NIST SP 800-115 (Technical Guide to Information Security Testing)
- Burp Suite / Caido / Nuclei
- OWASP ZAP, Nmap, Metasploit, ffuf, Amass, Subfinder
- MITRE ATT&CK for technique mapping
- CVSS 4.0 scoring methodology
- Assume-Breach: internal assessment from compromised position
- Reconnaissance: OSINT, subdomain enumeration, fingerprinting
- Automation: Nuclei templates, custom scripts, CI integration

## AI-Era Context (2026)

- AI-assisted recon and fuzzing accelerates coverage but requires human judgment for logic flaws
- LLM-powered applications introduce prompt injection, training data extraction, agent manipulation
- AI APIs tested for: model inversion, membership inference, adversarial inputs
- Automated exploit generation (AI) raises bar for defense -- purple team validates detection
- Bug bounty programs increasingly use AI triage -- reports must be precise and deduplicated

## Related Skills

- appsec
- secure-code
- threat-modeling
- identity-access
- cloud-security
