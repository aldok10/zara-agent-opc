---
name: linear
description: "Linear: opinionated PM for speed-focused engineering teams"
---

# Linear PM Skill

## Scope

Manage engineering work in Linear: triage, cycles, projects, roadmaps, integrations. Keyboard-first, speed-optimized, opinion-driven.

## Core Principles

1. Triage inbox daily (Linear recommends regular triage via accept/decline/snooze).
2. Cycles = sprints. 1-2 week cadence, strict scope lock after start.
3. Projects = epics. Cross-cycle initiatives with clear milestones.
4. Initiatives = multi-project strategic bets with progress tracking (replaced Projects for long-term).
5. Status flow: Backlog > Todo > In Progress > Done > Canceled. No custom states unless team >20.
6. Every issue gets: priority + assignee + team. Or gets declined.
7. Labels for cross-cutting concerns (platform, tech-debt, UX), not ownership.
8. Teams own their backlog. No central PM bottleneck on prioritization.
9. Sub-issues sparingly. Flat > nested. Max 1 level deep.
10. Auto-close stale issues (configurable threshold per team, e.g., 30-90 days). Resurface if needed.
11. Keyboard-first. Mouse is fallback. Speed is the product.

## DO NOT

1. Create issues without priority and team assignment.
2. Allow cycles to exceed 110% capacity. Scope lock is sacred.
3. Nest sub-issues more than 1 level deep.
4. Use labels for team ownership (use Teams feature).
5. Skip cooldown between cycles. Rest enables velocity.

## Route to Subskill

| Situation | Subskill |
|-----------|----------|
| Daily inbox processing | `subskills/triage-workflow.md` |
| Sprint/cycle planning | `subskills/cycles-projects.md` |
| GitHub/Slack/API setup | `subskills/integrations.md` |
| Timeline communication | `subskills/roadmaps.md` |
| Need shortcut reference | `knowledge/keyboard-shortcuts.md` |
| API automation | `knowledge/api-patterns.md` |

## Decision Matrix

| Signal | Action |
|--------|--------|
| New issue, no priority | Triage immediately |
| Issue stale >30 days | Ping assignee, mark at-risk |
| Issue stale >90 days | Auto-close with comment |
| Cycle at capacity | Reject new scope, defer to next |
| Carry-over >20% | Retrospect on estimation |
| Bug + customer impact | Priority Urgent, assign same day |
| Feature request, no project | Backlog + tag requestor |

## Verification

- Inbox count = 0 at EOD
- All active cycle issues have assignee + priority
- No issue in "In Progress" >5 days without update
- Cycle carry-over <20%
- Projects have target date + confidence level

## AI-Era Context (2026)

Linear's built-in AI handles triage (auto-labeling, priority suggestion, duplicate detection), generates project insights from cycle data, and drafts issue descriptions from Slack threads or PR context. Auto-labeling reduces manual grooming overhead significantly. Project health dashboards surface bottlenecks and scope creep signals automatically. However, human prioritization remains essential -- AI suggests priority based on patterns, but strategic alignment, team context, and stakeholder commitments require human decision-making.

## Knowledge

- `knowledge/api-patterns.md` -- Linear API and integration patterns
- `knowledge/keyboard-shortcuts.md` -- productivity shortcuts reference
