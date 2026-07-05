---
type: subskill
title: "Mitigation Mapping"
---

# Mitigation Mapping

## Core Concepts
- Mitigation mapping connects identified threats to specific countermeasures
- Each threat gets: likelihood rating, impact rating, and one or more mitigations
- Mitigations fall into categories: prevent, detect, respond, recover
- Residual risk = risk remaining after mitigations are applied; must be explicitly accepted
- Traceability: threat → mitigation → implementation → verification test

## Key Practices
- Map each STRIDE threat to at least one mitigation; document accepted risks with rationale
- Prioritize mitigations by risk score (likelihood × impact) and implementation cost
- Prefer preventive controls (input validation, auth) over detective controls (logging, alerts)
- Link mitigations to specific code, configuration, or infrastructure that implements them
- Define verification criteria: how to prove the mitigation works (test case, scan rule, audit check)

## Common Mistakes
- Listing mitigations without assigning ownership or implementation timeline
- Applying the same generic mitigation ("add logging") to every threat without specificity
- Not tracking residual risk—assuming mitigated threats are fully eliminated

## When to Apply
- After threat identification phase to prioritize and assign security work
- During sprint planning to convert security findings into actionable tickets
- In compliance documentation to demonstrate control coverage (SOC2, ISO 27001)
