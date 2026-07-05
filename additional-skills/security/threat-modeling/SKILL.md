---
name: threat-modeling
description: "Threat modeling: STRIDE, attack trees, DFDs, risk scoring, LINDDUN for privacy"
---

# Threat Modeling

Identify and prioritize threats during design -- find problems before writing code.

## Scope

STRIDE threat categorization, data flow diagrams (DFDs) with trust boundaries, attack tree construction, risk scoring (5x5 matrix), LINDDUN privacy threat analysis, threat-to-mitigation mapping, architecture security review, threat model maintenance lifecycle.

## First Action

Obtain or create the system's data flow diagram -- identify assets, actors, entry points, and trust boundaries before enumerating threats.

## Constraints

1. Threat model created during design phase -- not after implementation
2. STRIDE applied per element in DFD (process, data store, data flow, external entity)
3. Trust boundaries explicitly marked -- every crossing is an attack surface
4. Every identified threat has a corresponding mitigation or accepted risk
5. Risk scored on 5x5 matrix: likelihood (1-5) x impact (1-5)
6. Attack trees decomposed to leaf-level actions an attacker would take
7. Model updated when architecture changes -- not a one-time document
8. Review conducted with engineering team -- not security team alone
9. LINDDUN applied when system processes personal data
10. Threat model scope matches deployment boundary -- include infra
11. Assumptions documented explicitly -- they become threats when wrong
12. Prioritization: critical assets and internet-facing surfaces first
13. Output actionable: specific controls, not generic "use encryption"

## DO NOT

- Threat model after the system is built and deployed (too late for design changes)
- List threats without mitigations or explicit risk acceptance
- Use STRIDE without a DFD -- threats need context
- Ignore data-at-rest and data-in-transit as separate threat surfaces
- Skip privacy threats when PII is processed
- Produce 50-page documents nobody reads -- keep it actionable
- Model once and never update
- Assume trust within network boundaries
- Forget denial-of-service and availability threats

## Route to Subskill

| Signal | Target |
|--------|--------|
| Implementing mitigations in code | secure-code |
| IAM-related threats | identity-access |
| Cloud architecture threats | cloud-security |
| Validate threats with testing | penetration-testing |
| App-level vulnerability from model | appsec |
| Regulatory/privacy requirements | compliance |

## Verification

- [ ] DFD created with all components, data flows, and trust boundaries
- [ ] STRIDE applied per DFD element
- [ ] Attack trees reach leaf-level attacker actions
- [ ] Risk scores assigned (likelihood x impact) for each threat
- [ ] Every threat has mitigation, transfer, or documented acceptance
- [ ] LINDDUN applied for PII-processing components
- [ ] Model reviewed with engineering team
- [ ] Update trigger defined (arch change, new feature, incident)

## Knowledge

- STRIDE (Microsoft Threat Modeling)
- LINDDUN privacy threat framework
- Attack Tree methodology (Bruce Schneier)
- OWASP Threat Modeling Playbook
- NIST SP 800-30 (Risk Assessment)
- Threat Modeling Manifesto

## AI-Era Context (2026)

- AI/ML systems need threat models covering: training data poisoning, model extraction, prompt injection, output manipulation
- LLM-integrated applications: new trust boundaries between user, prompt, model, and tools
- AI agents with tool access require per-tool threat analysis (confused deputy)
- Automated threat modeling tools (IriusRisk, Threagile) generate initial models from IaC
- Privacy threats amplified: AI can correlate anonymized data -- LINDDUN more critical
- Threat models should include supply chain (dependencies, build pipeline, model registries)

## Related Skills

- secure-code
- identity-access
- cloud-security
- penetration-testing
- compliance
