---
name: agile
description: "Agile delivery: Scrum, Kanban, SAFe, flow metrics, ceremonies"
---

# Agile Delivery Skill

## Scope

Guide teams through agile framework selection, ceremony facilitation, flow optimization, and metrics-driven delivery. Applicable to Scrum, Kanban, SAFe, and hybrid approaches.

## Core Principles

1. Sprint goal = 1 sentence, outcome-focused, not a task list
2. WIP limits are essential enabling constraints, collaboratively agreed; chronic violations = systemic failure signal
3. Historical throughput (past performance) is a planning input, never a performance metric. Note: 'velocity' is not in the Scrum Guide 2020.
4. Ceremonies are time-boxed strictly; overrun = facilitation failure
5. Daily Scrum: focus on progress toward Sprint Goal; 15min timebox. Walk the board (common practice, not prescribed by Scrum Guide)
6. Cycle time > velocity for predictability measurement
7. Plan to 80% capacity max; slack enables quality and learning
8. Working software is the primary measure of progress
9. Retrospective actions must be tracked and reviewed next sprint
10. Pull-based systems outperform push-based; let teams pull work

## DO NOT

1. Use velocity to compare teams or measure individual performance
2. Skip retrospectives under delivery pressure
3. Allow sprint scope changes after commitment without re-negotiation
4. Recommend SAFe for orgs under 50 people
5. Treat story points as time estimates or normalize across teams

## Route to Subskill

| Signal | Subskill | Path |
|--------|----------|------|
| Sprint planning, daily, review, retro, refinement | Scrum Ceremonies | subskills/scrum-ceremonies.md |
| Cycle time, throughput, WIP age, CFD, SLE | Kanban Metrics | subskills/kanban-metrics.md |
| PI planning, ART, program board, confidence vote | SAFe PI Planning | subskills/safe-pi-planning.md |
| Hybrid, WIP in sprints, pull-based, transition | Scrumban | subskills/scrumban.md |

## Decision Matrix

| Context | Recommendation |
|---------|---------------|
| New team, needs structure, 2-week cadence | Scrum |
| Ops/support, unpredictable work, continuous flow | Kanban |
| Mature Scrum team, continuous delivery ready | Scrumban |
| 50+ people, cross-team dependencies, portfolio | SAFe (lean) |
| Solo/pair, no ceremony overhead needed | Personal Kanban |
| Small product team (6), appetite-based, 6-week cycles | Shape Up |

## Verification Criteria

- Framework recommendation matches team size/context
- Metrics advice uses percentile-based analysis (50/70/85/95)
- Ceremony guidance includes timebox and anti-patterns
- WIP limits suggested with rationale (not arbitrary)
- Sprint goals are outcome-focused, testable

## AI-Era Context (2026)

AI automates ceremony preparation: generates retro summaries from Slack/PR activity, drafts sprint reports from completed tickets, and pre-fills refinement notes from specs. Sprint planning benefits from AI-suggested capacity allocation based on historical throughput. However, prioritization, trade-off decisions, and team morale assessment still require human judgment. Risk: teams over-rely on AI-generated metrics without questioning underlying data quality or context shifts.

## Knowledge References

- knowledge/frameworks.md - Framework comparison reference
- knowledge/metrics-reference.md - Metrics quick-reference
- examples/sprint-planning.md - Sprint planning example
- examples/kanban-board.md - Kanban board example
- tools/cycle-time-calculator.md - Cycle time calculation
- tools/sprint-goal-writer.md - Sprint goal writing template
