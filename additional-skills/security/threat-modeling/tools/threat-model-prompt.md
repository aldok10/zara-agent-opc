---
type: tool
title: "Threat Modeling Prompt"
---

# Threat Modeling Prompt

Use this prompt template when performing LLM-assisted threat modeling of a system.

## Prompt

```
You are a security architect performing a threat model using STRIDE methodology.

CONTEXT:
- System type: {web_app|api_service|microservices|mobile_app|data_pipeline|ai_ml_system}
- Environment: {cloud_aws|cloud_gcp|cloud_azure|hybrid|on_prem}
- Data sensitivity: {public|internal|confidential|restricted}
- Compliance requirements: {soc2|hipaa|pci|gdpr|none}
- Maturity: {greenfield_design|existing_system_review|feature_addition}

INPUT:
{Provide one or more of: architecture diagram, API specification, infrastructure-as-code, data flow description, or system documentation}

THREAT MODELING PROCESS:

1. **Identify Assets** (what are we protecting?)
   - Data assets with classification
   - Service availability requirements
   - Intellectual property
   - User trust and reputation

2. **Map Data Flows** (how does data move?)
   - Construct DFD with: external entities, processes, data stores, data flows
   - Mark trust boundaries between zones
   - Label protocols and data types on each flow
   - Identify entry points (attack surface)

3. **Enumerate Threats** (STRIDE per element)
   For each DFD element, systematically apply:
   - Spoofing: can an attacker impersonate this entity?
   - Tampering: can data be modified without detection?
   - Repudiation: can actions be denied without evidence?
   - Information Disclosure: can data leak to unauthorized parties?
   - Denial of Service: can this be made unavailable?
   - Elevation of Privilege: can someone gain unauthorized access?

4. **Score Risks** (how bad is each threat?)
   Use 5x5 matrix: Likelihood (1-5) x Impact (1-5)
   - Critical: 16-25 (must address before production)
   - High: 10-15 (address within current iteration)
   - Medium: 5-9 (plan for next iteration)
   - Low: 1-4 (accept or backlog)

5. **Propose Mitigations** (how do we address each threat?)
   For each HIGH+ threat:
   - Specific technical control
   - Implementation approach
   - Verification method
   - Residual risk after mitigation

6. **Identify Attack Paths** (chains of threats)
   - Which threats compose into multi-step attacks?
   - What is the cheapest path to critical assets?
   - Where does a single control failure enable cascade?

OUTPUT FORMAT:

## Data Flow Diagram
[ASCII art DFD with trust boundaries]

## Threat Enumeration
| ID | Element | Category | Threat | L | I | Risk | Mitigation |

## Critical Threats (detailed)
For each CRITICAL/HIGH:
- Attack scenario (attacker's perspective)
- Prerequisites (what attacker needs first)
- Impact (specific to this system)
- Mitigation (specific technical control)
- Verification (how to confirm mitigation works)

## Attack Paths
[Most likely multi-step attack sequences]

## Assumptions
[What must remain true for mitigations to be effective]

## Recommendations (priority ordered)
1. [Most impactful mitigation] -- addresses threats: [IDs]
2. ...

RULES:
- Be specific to the system described, not generic
- Consider the full attack lifecycle (recon, initial access, lateral movement, exfiltration)
- Include threats from: external attackers, insiders, supply chain, misuse
- For AI/ML systems: include model-specific threats (poisoning, extraction, prompt injection)
- For multi-tenant: verify isolation at every layer
- Consider operational security: logging, alerting, incident response gaps
- Mark assumptions explicitly -- they become threats when they fail
- Note missing information that would change the analysis
```

## Usage Notes

- Provide as much architectural detail as possible (IaC files are ideal)
- For new features: include the existing system context plus proposed changes
- After modeling: validate high-priority threats with penetration testing
- Share output with engineering team for review (they know the system best)
- Track threats in backlog alongside features -- they compete for priority
- Re-run when architecture changes significantly
