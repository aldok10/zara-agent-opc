---
name: jira
description: "Jira: workflow management, JQL, automation, dashboards"
---

# Jira Skill

## Scope

Jira project configuration, workflow design, JQL queries, automation rules, dashboards, issue hierarchy, board management. Cloud and Data Center.

## Core Principles

1. Keep statuses minimal (recommended: 4-7). Not an Atlassian official limit, but complexity increases exponentially with states.
2. JQL for everything queryable. Never manual filtering.
3. Minimize custom fields. Each is maintenance debt.
4. Dashboards answer ONE question clearly.
5. Automation for repetitive transitions only. Never over-automate.
6. Issue hierarchy: Epic (parent) > Story/Task/Bug (peers) > Sub-task. Story, Task, Bug are same level, not cascading.
7. Components for ownership. Labels for cross-cutting concerns.
8. Boards reflect team workflow, not org chart.
9. Archive done items regularly (team convention, e.g., after 2 sprints).
10. Required fields on transitions, not on creation.

## DO NOT

1. Create circular workflow paths (A->B->A without resolution)
2. Add custom fields without documented owner and retirement date
3. Build dashboards with >6 gadgets (cognitive overload)
4. Automate what humans should decide (priority, assignment of complex work)
5. Use labels for what components handle (ownership, routing)

## Route to Subskill

| Need | Subskill |
|------|----------|
| Complex queries, filters, bulk ops | `subskills/jql-advanced.md` |
| Rule triggers, scheduled actions | `subskills/automation-rules.md` |
| Status/transition design | `subskills/workflow-design.md` |
| Reporting, charts, stakeholder views | `subskills/dashboards.md` |
| Quick JQL syntax lookup | `knowledge/jql-reference.md` |
| Automation recipe catalog | `knowledge/automation-recipes.md` |
| JQL from natural language | `tools/jql-builder.md` |

## Decision Matrix

| Situation | Action |
|-----------|--------|
| "How do I find issues..." | JQL subskill |
| "Automate when..." | Automation subskill |
| "Set up a workflow for..." | Workflow subskill |
| "Show me metrics on..." | Dashboard subskill |
| "What field type for..." | Minimize. Use existing. Check custom field audit first. |
| "Board not showing..." | Check filter, check workflow mapping, check permissions |

## Verification

- Workflow: walk every path manually. Dead ends = fail.
- JQL: run query, confirm result count matches expectation.
- Automation: trigger manually, check audit log for success.
- Dashboard: loads <3s, answers its stated question, no stale filters.

## AI-Era Context (2026)

Atlassian AI (Rovo) integrates across Jira: natural language to JQL, auto-triage based on historical patterns, smart assignment suggestions, and AI-generated issue summaries. JQL generation from plain English eliminates syntax barrier for non-technical stakeholders. Auto-triage labels and prioritizes incoming bugs based on component, severity signals, and past resolution patterns. However, workflow design, permission schemes, and cross-project governance remain manual -- structural decisions need human oversight. Jira Goals connects work to strategic objectives. Plans includes AI-assisted capacity planning and scenario modeling.

## Knowledge

- `knowledge/automation-recipes.md` -- Jira automation rule patterns
- `knowledge/jql-reference.md` -- JQL syntax and advanced query patterns
