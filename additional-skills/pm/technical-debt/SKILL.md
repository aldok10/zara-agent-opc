---
name: technical-debt
description: "Technical debt: strategic management with portfolio approach"
---

# Technical Debt Management

## Scope

Classify, prioritize, budget, track, and retire technical debt. Treat debt as investment decisions, not failures.

## Core Principles

1. Debt is a first-class backlog item with owner, cost, and repayment plan
2. Reserve 15-20% sprint capacity for debt reduction (industry consensus, sources vary from 10-30%) - non-negotiable
3. Classify via Fowler's quadrant: reckless/prudent × deliberate/inadvertent
4. Prioritize: blast radius × frequency of pain / fix cost
5. Pay interest (workarounds) or pay principal (fix root cause) - choose deliberately
6. Record deliberate debt decisions in ADRs with trigger conditions for payoff
7. Pair refactoring with feature work when paths overlap
8. Measure: cycle time increase, incident frequency, developer friction
9. Quarterly debt review with engineering leadership - mandatory
10. Never accept reckless-inadvertent debt; fix immediately or invest in training

## DO NOT

1. Hide debt work inside feature tickets - track separately for visibility
2. Raid debt allocation when feature work falls behind
3. Gold-plate under the guise of debt reduction
4. Accept "we'll fix it later" without a concrete repayment trigger
5. Measure debt solely by static analysis - combine with human friction signals

## Route to Subskill

| Situation | Subskill |
|-----------|----------|
| New debt identified, need to categorize | `debt-classification` |
| Backlog of debt items, need ranking | `prioritization-matrix` |
| Sprint planning, protecting capacity | `sprint-allocation` |
| Reporting progress, justifying investment | `measurement` |

## Decision Matrix

| Signal | Action |
|--------|--------|
| Cycle time up >20% quarter-over-quarter | Escalate: increase debt allocation |
| Incident from known debt item | Promote to immediate fix |
| Score >8 on priority formula | Next sprint, no negotiation |
| Score 4-8 | Plan within quarter |
| Score <4 | Accept and monitor |
| Reckless-inadvertent identified | Stop and fix now + training |

## Verification

- [ ] Every debt item has: type, quadrant, score, owner, repayment plan
- [ ] Sprint allocation 15-20% protected and visible in planning
- [ ] Quarterly review completed with leadership sign-off
- [ ] Metrics tracked: cycle time, incident rate, friction score
- [ ] ADR exists for every deliberate debt decision >1 sprint of work

## AI-Era Context (2026)

AI identifies code smells at scale -- SonarQube + AI-powered analysis surfaces debt patterns across the entire codebase continuously. Debt registers can be auto-updated from static analysis output, with severity scoring informed by change frequency and incident correlation. AI generates refactoring proposals and impact estimates. The risk: AI suggests refactoring that is locally optimal but architecturally misaligned. Human validates that debt repayment aligns with product direction and team capacity. Debt scoring still needs business context (cost of delay, customer impact) that only humans provide.

## Knowledge

- `knowledge/debt-quadrant.md` -- deliberate/inadvertent, reckless/prudent classification
- `knowledge/measurement-metrics.md` -- tracking metrics and scoring models
