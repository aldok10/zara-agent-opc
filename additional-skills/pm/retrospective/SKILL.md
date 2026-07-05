---
name: retrospective
description: "Retrospectives: team reflection with actionable outcomes and safety"
---

# Retrospective Skill

## Scope

Run team retrospectives that produce actionable improvements. Cover format selection, facilitation, action tracking, psychological safety, and remote adaptation.

## Core Principles

1. Psychological safety first  -  no retro content until safety confirmed
2. Every action item has owner + due date + definition of done
3. Check previous actions at start of every retro
4. Rotate formats every 3-4 sprints to prevent staleness
5. Facilitator != team lead  -  rotate role
6. Time-boxed: up to 90min for 2-week sprint (Scrum Guide maximum), 60min often sufficient for focused teams. 3hr max for 4-week sprint.
7. Equal voice: silent writing before discussion (5min minimum)
8. Focus on system/process, not individuals  -  "what" not "who"
9. Limit 2-3 action items  -  completable > comprehensive
10. Celebrate wins explicitly  -  minimum 5min dedicated

## DO NOT

1. Skip safety check when team conflict is visible
2. Allow action items without owner or due date
3. Let facilitator dominate discussion or editorialize
4. Carry over same incomplete action 3+ sprints without escalation
5. Blame individuals  -  redirect to systemic causes

## Route to Subskill

| Signal | Subskill |
|--------|----------|
| Choosing/running a format | `subskills/facilitation-formats.md` |
| Tracking outcomes | `subskills/action-tracking.md` |
| Distributed/async team | `subskills/remote-retros.md` |
| Low trust or conflict signals | `subskills/safety-check.md` |
| Need format ideas | `knowledge/format-library.md` |
| Facilitation technique question | `knowledge/facilitation-tips.md` |
| Planning a retro session | `tools/retro-planner.md` |

## Decision Matrix

| Condition | Action |
|-----------|--------|
| New team (<3 sprints together) | Start with simple format (S/S/C), heavy safety check |
| Post-incident | Use Timeline format, extend to 90min |
| Energy low / end of quarter | Use Mad/Sad/Glad + energizer, shorten to 45min |
| Remote + multi-timezone | Async pre-write (24h) + 45min sync for top items |
| Same format 3+ times | Rotate  -  pick from format-library |
| Previous actions incomplete | Spend first 10min on blockers before new content |
| Safety score <3 | Pause retro content, run trust-building |

## Rationalization Table

| Excuse | Reality |
|--------|---------|
| "We're too busy for retros" | Skipping retros guarantees repeating mistakes. 60-90min saves days. |
| "Nothing went wrong this sprint" | Retros aren't only for problems. Celebrate wins, optimize what works. |
| "Same issues come up every time" | That means action items aren't being completed. Fix the tracking, not the format. |
| "The team won't speak up" | Safety check score <3 means trust problem. Address with 1:1s and norms first. |

## Verification Criteria

- [ ] Safety check conducted (score recorded)
- [ ] Previous action items reviewed
- [ ] Silent writing phase included
- [ ] All participants contributed (check board)
- [ ] Action items: max 3, each has owner + date + done-definition
- [ ] Session stayed within timebox
- [ ] Format differs from last 2 retros
- [ ] Wins/positives explicitly discussed

## AI-Era Context (2026)

AI summarizes action items from retro notes, tracks completion across sprints, and detects recurring themes that indicate systemic issues. It pre-generates retro boards from sprint activity (PRs merged, incidents, deploys, Slack sentiment). AI can suggest format rotation based on team patterns. However, facilitation must stay human -- psychological safety, reading the room, and creating space for vulnerability cannot be automated. The retro's value is in the conversation, not the artifact.

## Knowledge

- `knowledge/facilitation-tips.md` -- facilitation techniques and safety practices
- `knowledge/format-library.md` -- retro format catalog with context guidance
