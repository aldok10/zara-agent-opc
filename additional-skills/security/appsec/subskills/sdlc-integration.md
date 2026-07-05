---
type: subskill
title: "SDLC Integration"
---

# SDLC Integration

## Core Concepts

- Security shifts left: integrate checks at every development phase, not just before release
- Threat modeling during design prevents architectural vulnerabilities that are expensive to fix later
- Automated security gates in CI/CD catch issues before they reach production
- Developer enablement > enforcement: provide secure defaults, libraries, and templates
- Security debt accumulates like technical debt: track, prioritize, and pay it down continuously

## Key Practices

- Add SAST (static analysis) to CI: run on every PR, block merge on high/critical findings
- Perform threat modeling during design phase: STRIDE or attack trees for new features
- Include security acceptance criteria in user stories: auth, input validation, data protection
- Run DAST (dynamic testing) in staging environments before production deployment
- Provide secure coding guidelines with examples specific to your tech stack

## Common Mistakes

- Security review only at the end: findings require expensive rework or get shipped anyway
- Too many false positives from SAST: developers ignore all findings, including real ones
- Treating security as a separate team's problem rather than a shared engineering responsibility

## When to Apply

- Setting up or improving CI/CD pipelines for any application
- Onboarding new teams to secure development practices
- Post-incident: need to prevent similar vulnerabilities from recurring
- Compliance requirements mandate evidence of security controls in the development process
