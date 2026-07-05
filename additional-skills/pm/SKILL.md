---
name: pm
description: "Product management: outcome-driven delivery, discovery, planning, stakeholder alignment"
---

# Product Management

Outcome-driven delivery. Bridge between user problems, business goals, and engineering capacity. Continuous discovery, data-informed decisions, ship small and iterate.

## Scope

- HANDLES: roadmapping, OKRs, stakeholder communication, sprint planning, estimation, retrospectives, product discovery, release management, technical debt strategy, team health metrics, Jira/Linear workflow, prioritization.
- DEFERS: code implementation to engineering skills; system architecture to `system-design`; security to `security-engineering`; career growth to `career-leadership`.

## Core Principles

1. Outcomes over outputs: measure impact, not velocity or story points.
2. Discovery is continuous, not a phase: validate before building.
3. Say no by default: focus > breadth. Every initiative ties to OKR.
4. Data-informed, not data-driven: data informs judgment, doesn't replace it.
5. Ship small, learn fast: smaller batches = faster feedback loops.
6. Deploy != Release: decouple technical deployment from business availability.
7. Protect maker time: 15-20% capacity for debt, 80% max sprint planning.
8. Psychological safety first: retros, feedback, team health require trust.
9. Audience-aware communication: exec (outcomes), team (details), customer (value).
10. Probabilistic thinking: ranges > point estimates, confidence > certainty.

## DO NOT

- Treat velocity as performance metric.
- Skip discovery for "obvious" features.
- Write solutions in tickets (write problems + acceptance criteria).
- Commit to dates without data and confidence intervals.
- Confuse deploy with release.
- Use DORA metrics for team comparison (context differs).
- Carry >5 retro action items (too many = none done).
- Put dates on roadmap items beyond current quarter.

## Route to Subskill

Load by signal. Multiple OK. Load only what's needed.

### Delivery & Process

| Signal | Load |
|--------|------|
| sprint, scrum, kanban, WIP, ceremony, daily, demo, refinement | `agile/SKILL.md` |
| estimate, forecast, monte carlo, story points, cycle time, sizing | `estimation/SKILL.md` |
| retro, retrospective, start/stop/continue, action items, facilitation | `retrospective/SKILL.md` |
| release, deploy, feature flag, canary, rollback, versioning, changelog | `release-management/SKILL.md` |

### Strategy & Planning

| Signal | Load |
|--------|------|
| OKR, objective, key result, goal, quarterly, scoring, alignment | `okr/SKILL.md` |
| roadmap, now/next/later, initiative, timeline, quarterly review | `roadmap/SKILL.md` |
| prioritization, RICE, ICE, MoSCoW, WSJF, Kano, scoring | `roadmap/SKILL.md` |
| discovery, opportunity, assumption, experiment, interview, validate | `product-discovery/SKILL.md` |
| JTBD, jobs to be done, switching interview, job map | `product-discovery/SKILL.md` |
| tech debt, refactoring, debt register, sprint allocation, SonarQube | `technical-debt/SKILL.md` |

### People & Tools

| Signal | Load |
|--------|------|
| stakeholder, status update, RAG, escalation, RACI, exec communication | `stakeholder/SKILL.md` |
| DORA, team health, DevEx, cognitive load, team topology, survey | `team-health/SKILL.md` |
| Jira, JQL, workflow, board, automation, dashboard, filter | `jira/SKILL.md` |
| Linear, triage, cycle, project, inbox, integration | `linear/SKILL.md` |

## Decision Matrix

| Situation | Action |
|-----------|--------|
| Unclear priority | Map to OKR > if no fit, deprioritize |
| Scope creep | Restate sprint goal > defer to backlog |
| Missed deadline | Root cause > adjust forecast > communicate |
| Stakeholder conflict | Align on outcome > data > escalate |
| New initiative | Discovery first > assumption map > smallest experiment |
| Slow delivery | DORA metrics > value stream map > remove bottleneck |
| Quality declining | Change failure rate + cycle time analysis > debt allocation |

## Verification

- Every initiative ties to a measurable outcome.
- Roadmap reviewed quarterly with stakeholders.
- Sprint goals achieved >80% of sprints.
- Decisions documented with context and rationale.
- Discovery running parallel to delivery (not sequential).
- DORA metrics tracked and trending positively.

## Rationalization Table

| Excuse | Reality |
|--------|---------|
| "The feature is obvious, skip discovery" | Most "obvious" features fail. Even 30min of assumption mapping saves weeks. |
| "We don't have time for estimation" | Estimation without data is guessing. Use cycle time from last 10 items instead. |
| "Stakeholders want dates, not ranges" | Single-point dates are lies. Teach them to read confidence intervals. |
| "Retros are a waste, nothing changes" | Action items without owners ARE a waste. Max 2-3, all owned, reviewed next sprint. |
| "OKRs are just more process" | OKRs without weekly check-ins are just aspirational statements. Cadence matters. |
| "Tech debt can wait" | Below 15% debt allocation, velocity compounds downward. You're already paying interest. |

## Stop and Ask

Do NOT proceed when:
- Requirements are ambiguous after 1 clarification attempt
- Stakeholder conflict blocks prioritization (escalate)
- Data contradicts assumptions (re-run discovery)
- Estimate exceeds 2x historical baseline (decompose or de-scope)
- Team health survey shows metric below threshold (address first)

## AI-Era Context (2026)

AI writes user stories, generates PRDs, and drafts roadmaps -- but consistently misses business context, political dynamics, and cross-team dependencies. The PM role shifts from authoring to curating and validating AI output. Data-informed beats data-driven: AI surfaces patterns, humans apply judgment. Probabilistic roadmapping (confidence intervals, Monte Carlo forecasts) becomes table stakes since AI makes generating scenarios trivial. The risk: AI-generated artifacts look polished but lack strategic coherence. Human validates alignment to OKRs, feasibility constraints, and stakeholder buy-in.

## Knowledge (load on demand)

- `Orchestrator_memory(action:"recall", query:"product management frameworks", layer:"knowledge")`
- `Orchestrator_memory(action:"recall", query:"agile estimation techniques", layer:"knowledge")`
- `Orchestrator_memory(action:"recall", query:"OKR methodology", layer:"knowledge")`
