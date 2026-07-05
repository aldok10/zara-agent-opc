---
type: example
title: "Example: Team Topology Assessment"
---

# Example: Team Topology Assessment

## Context

4-team engineering org (28 engineers). All teams stream-aligned. No platform team.

## Observations

| Team | Domain | Services | On-call load | Cognitive load score |
|------|--------|----------|--------------|---------------------|
| Alpha | Checkout | 6 | High | 2.8 |
| Beta | Search | 4 | Medium | 3.6 |
| Gamma | User mgmt | 5 | High | 3.0 |
| Delta | Analytics | 3 | Low | 4.1 |

**Shared pain**: All teams maintain own CI/CD, infra, observability. ~35% time on non-differentiating work.

## Diagnosis

- Alpha/Gamma overloaded (score <3.5, high on-call).
- Every team re-solving same infra problems independently.
- Cross-team infra requests via tickets = 2-week avg wait.

## Recommendation

1. **Create Platform team** (3 engineers from shared infra work across teams).
   - Own: CI/CD, deploy pipeline, observability, dev environments.
   - Interface: self-service, no tickets.
   - Source: 1 from Alpha, 1 from Gamma, 1 new hire.

2. **Reduce Alpha scope**: move 2 non-core services to Gamma (related domain).

3. **Enabling engagement**: Platform team spends first 4 weeks collaborating with each stream-aligned team to understand needs before building.

## Expected Outcome

- Stream teams recover ~25% capacity (from infra toil reduction).
- Cognitive load scores target >3.5 across all teams within 2 quarters.
- Deploy frequency increases as pipeline ownership centralizes.
