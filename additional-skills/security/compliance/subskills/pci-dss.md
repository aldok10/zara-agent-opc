---
type: subskill
title: "PCI DSS Compliance"
---

# PCI DSS Compliance

Scope reduction, Self-Assessment Questionnaires, compensating controls, and payment security.

## When to Load

- Determining PCI DSS scope and reducing it
- Selecting the appropriate SAQ type
- Implementing compensating controls for non-standard environments
- Integrating payment processors to minimize compliance burden

## Key Concepts

**Scope Reduction Strategies**
- Tokenization: replace card data with non-sensitive tokens (biggest win)
- P2PE (Point-to-Point Encryption): encrypted from terminal to processor
- Network segmentation: isolate CDE from general network
- Outsource to PCI-compliant processor: Stripe, Adyen, Braintree
- iFrame/redirect: card data never touches your servers

**PCI DSS v4.0 Requirements (12 categories)**
1. Network security controls (firewalls/NSCs)
2. Secure configurations (no defaults)
3. Protect stored account data
4. Encrypt transmission over open networks
5. Protect against malware
6. Secure systems and software
7. Restrict access by business need
8. Identify and authenticate users
9. Physical access controls
10. Log and monitor access
11. Test security regularly
12. Organizational policies

**SAQ Types**
- SAQ A: card-not-present, fully outsourced (iFrame/redirect) -- least burden
- SAQ A-EP: e-commerce with website that affects card data security
- SAQ B: imprint machines or standalone terminals only
- SAQ C: payment terminals connected to internet
- SAQ D: everyone else (full assessment) -- merchants or service providers

**Compensating Controls**
- Used when a requirement cannot be met as stated
- Must: meet intent of original requirement
- Must: provide equivalent level of defense
- Must: be "above and beyond" other PCI requirements
- Document in Compensating Controls Worksheet (CCW)
- Reassessed annually

## Patterns

```text
Scope Reduction Architecture (SAQ A target):

[Customer Browser]
    |
    v
[Your Web Server] -- serves page with payment iFrame
    |                 (no card data touches this server)
    v
[Payment Provider iFrame/JS] -- Stripe Elements, Adyen Drop-in
    |
    v
[Payment Provider] -- handles all card data
    |
    v
[Your Server] -- receives token/payment confirmation only
```

**Network Segmentation Validation**
- Annual penetration test must verify segmentation effectiveness
- Test from both inside and outside the CDE
- Confirm no routes exist between CDE and out-of-scope networks
- Document all inter-segment communication with business justification

**Key Technical Controls**
- TLS 1.2+ for all card data transmission
- Strong cryptography for stored card data (AES-256)
- Unique IDs for all users with CDE access
- MFA for all remote and administrative CDE access
- File integrity monitoring on critical system files
- Quarterly vulnerability scans (ASV for external, internal scans)

## Gotchas

- "We use Stripe" doesn't automatically mean SAQ A -- depends on integration method
- PCI v4.0 customized approach requires more documentation than compensating controls
- Scope creep: any system that can affect CDE security is in scope
- Quarterly ASV scans must pass (not just run) -- failing scan = non-compliant
- Log retention: 12 months minimum, 3 months immediately available
- v4.0 new requirements have future-dated enforcement (March 2025) -- plan ahead

## Verification

- Document complete data flow diagram showing where card data exists
- Confirm tokenization: search databases for PAN patterns (should find none)
- Validate segmentation: attempt connections from out-of-scope to CDE
- Run ASV scan and confirm passing result
- Verify MFA enforced for all administrative CDE access
- Review SAQ type justification against actual integration architecture
