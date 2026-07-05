---
type: fact
title: "Linear Workflow Patterns"
---

# Linear Workflow Patterns

## Core Concepts

Linear is built around speed and keyboard-first interaction. Key entities:
- **Issues**: work items with status, priority, assignee
- **Projects**: group related issues toward a goal (time-bounded)
- **Cycles**: time-boxed iterations (like sprints)
- **Views**: custom filtered/sorted issue lists

## Cycles

### Cycle Configuration
- Duration: 1 or 2 weeks (most teams use 1-week cycles)
- Auto-start: cycles begin automatically on configured day
- Cooldown: optional 1-day buffer between cycles
- Auto-archive: completed cycles auto-archive after period

### Cycle Workflow
```
Upcoming → Active → Completed
   ↓
Issues not started roll to next cycle automatically
```

### Best Practices
- Scope cycle to what team can realistically complete
- Use "Upcoming" cycle for next-sprint planning
- Review cycle progress mid-week (not just at end)
- Track velocity as issues completed per cycle (not story points)

## Projects

### Project Lifecycle
```
Planned → In Progress → Completed → Cancelled
```

### Project vs Cycle
| Aspect | Project | Cycle |
|---|---|---|
| Duration | Weeks to months | 1-2 weeks |
| Scope | Feature/initiative | Time-boxed work batch |
| Completion | When all issues done | When time expires |
| Planning | Lead-based | Team-based |

### Milestones
- Break projects into milestones for progress tracking
- Each milestone = subset of project issues
- Target dates on milestones (not individual issues)
- Progress bar shows milestone completion percentage

## Triage

### Triage Workflow
```
New Issue → Triage (no project/cycle) → Prioritized → Scheduled
```

### Triage Responsibility
- Team lead reviews triage inbox daily (5-10 min)
- Assign priority, project, and cycle
- Decline/close issues that won't be addressed
- Merge duplicates immediately

### Triage Automation
- Auto-assign based on team or label
- Auto-set priority from issue source (bug report = urgent review)
- Auto-add to triage view when created without project
- Slack notification when triage inbox exceeds threshold

## SLA Tracking

### Priority-Based SLAs
| Priority | First Response | Resolution Target |
|---|---|---|
| Urgent | 1 hour | 4 hours |
| High | 4 hours | 1 business day |
| Medium | 1 business day | 1 week |
| Low | 3 business days | Best effort |

### Tracking in Linear
- Use due dates aligned with SLA targets
- Custom views filtered by "past due" and priority
- Labels for SLA status: "SLA at risk", "SLA breached"
- Cycle reports show SLA compliance percentage

### Automation for SLA
```
Trigger: Issue priority = Urgent AND no assignee after 30 min
Action: Auto-assign to on-call, post to #urgent-bugs
```

## Integrations

### GitHub/GitLab
- Auto-link PRs to issues via branch naming: `team-123-feature-name`
- Auto-transition issue to "In Progress" when PR opened
- Auto-transition to "Done" when PR merged
- Show PR status on issue detail

### Slack
- Create issues from Slack messages
- Notifications for mentions and status changes
- Thread updates when issue progresses
- `/linear` slash command for quick issue creation

### Figma
- Embed Figma links as previews in issue descriptions
- Link design files to issues for spec reference

### Custom Webhooks
```json
{
  "action": "update",
  "type": "Issue",
  "data": {
    "id": "issue-id",
    "state": { "name": "Done" },
    "project": { "name": "Q1 Launch" }
  }
}
```

## Workflow Patterns

### Feature Development
```
1. Project created with milestone breakdown
2. Issues created per milestone
3. Assigned to cycles based on priority and capacity
4. PRs linked via branch naming convention
5. Issues auto-close on merge
6. Project completes when all milestones done
```

### Bug Triage
```
1. Bug reported (via Slack, support, or direct)
2. Lands in triage inbox
3. Lead assigns priority within SLA response window
4. Urgent: pulled into current cycle immediately
5. High: next cycle, Medium/Low: backlog
```

### Customer Request Tracking
```
1. Issue created with "customer-request" label
2. Link to customer in CRM or support ticket
3. Track in dedicated "Customer Requests" view
4. Priority influenced by customer tier/ARR impact
5. Resolution communicated back to requester
```

## Tips for Speed

- Use keyboard shortcuts exclusively (G+I for issues, C for create)
- Set up saved views per workflow (My Work, Triage, Team Board)
- Use templates for recurring issue types (bug report, feature request)
- Batch triage: process inbox in one session, not throughout day
- Use sub-issues for task breakdown (avoid separate tracking tools)
