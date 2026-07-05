---
type: fact
title: "Jira Automation Rules"
---

# Jira Automation Rules

## Automation Architecture

Jira automation consists of:
- **Trigger**: event that starts the rule (issue created, field changed, scheduled)
- **Conditions**: filters that must pass for actions to execute
- **Actions**: what happens (transition, assign, comment, webhook)
- **Branches**: operate on related issues (subtasks, linked issues, parent)

## Common Triggers

| Trigger | Fires When | Use Case |
|---|---|---|
| Issue created | New issue in project | Auto-assign, set defaults |
| Field value changed | Specific field updated | Status transitions, notifications |
| Issue transitioned | Status changes | Update parent, notify team |
| Comment added | Any comment posted | Escalation keywords |
| Scheduled | Cron-like schedule | Stale issue cleanup, reminders |
| Sprint started/ended | Sprint event | Auto-transition, reporting |
| Version released | Release published | Move issues, notify stakeholders |

## Conditions

### Basic Conditions
```
IF issue type = Bug
AND priority = Critical
AND assignee is EMPTY
```

### Advanced Conditions
- **JQL condition**: any JQL query as filter
- **User condition**: role-based (reporter, assignee, team member)
- **Date condition**: due date passed, created more than X days ago
- **Related issues**: has subtasks, linked to blocking issue

### Condition Examples
```
# Only fire for unassigned critical bugs
JQL: priority = Critical AND assignee is EMPTY AND type = Bug

# Only fire during business hours
Schedule condition: Monday-Friday, 09:00-17:00 project timezone

# Only fire if all subtasks are done
Related issues condition: ALL subtasks have status = Done
```

## Smart Values

Smart values are template variables that reference issue data.

### Common Smart Values
```
{{issue.key}}           → PROJ-123
{{issue.summary}}       → "Fix login timeout"
{{issue.assignee.displayName}} → "John Smith"
{{issue.priority.name}} → "High"
{{issue.status.name}}   → "In Progress"
{{now.format("yyyy-MM-dd")}} → "2024-01-15"
{{issue.created.diff(now).days}} → 5
```

### In Comments
```
Automatically assigned to {{issue.assignee.displayName}}.
This issue has been open for {{issue.created.diff(now).days}} days.
Sprint: {{issue.sprint.name}}
```

### In Field Updates
```
# Set due date to 5 business days from now
{{now.plusBusinessDays(5)}}

# Copy reporter to custom field
{{issue.reporter.accountId}}
```

## Practical Automation Recipes

### 1. Auto-Assign by Component
```yaml
Trigger: Issue created
Condition: Component = "Authentication"
Action: Assign to "auth-team-lead"
Action: Add label "auth-team"
```

### 2. Parent Status Sync
```yaml
Trigger: Issue transitioned to "Done"
Condition: Issue is a subtask
Branch: Parent issue
Condition: ALL subtasks have status "Done"
Action: Transition parent to "Done"
```

### 3. Stale Issue Reminder
```yaml
Trigger: Scheduled (daily at 09:00)
Condition: JQL "status = 'In Progress' AND updated <= -7d"
Action: Comment "@{{issue.assignee.displayName}} this issue has had no activity for 7 days. Please update or move to blocked."
Action: Add label "stale"
```

### 4. Critical Bug Escalation
```yaml
Trigger: Issue created
Condition: Type = Bug AND Priority = Critical
Action: Assign to on-call (round-robin)
Action: Send Slack message to #incidents
Action: Set due date to {{now.plusBusinessDays(1)}}
```

### 5. Sprint Cleanup on Sprint End
```yaml
Trigger: Sprint completed
Condition: Issue status != Done
Action: Comment "Carried over from {{sprint.name}}"
Action: Add label "carryover"
```

### 6. Auto-Link Duplicates
```yaml
Trigger: Comment added containing "duplicate of"
Condition: Comment matches regex "duplicate of (\w+-\d+)"
Action: Link issue as "is duplicated by" to mentioned key
Action: Transition to "Closed"
Action: Set resolution to "Duplicate"
```

## Workflow Optimization

### Reduce Manual Transitions
- Auto-transition to "In Progress" when branch created (via dev tool integration)
- Auto-transition to "In Review" when PR opened
- Auto-transition to "Done" when PR merged to main
- Auto-reopen when linked bug report created against closed issue

### Reduce Notification Noise
- Batch notifications (don't fire for every sub-task change)
- Condition on significant changes only (status, not comments)
- Use @mentions in auto-comments only when action needed
- Avoid duplicate notifications (check if already notified today)

### Cross-Project Coordination
```yaml
Trigger: Issue transitioned to "Ready for QA"
Action: Create linked issue in QA project
  Summary: "Test: {{triggerIssue.summary}}"
  Link type: "is tested by"
  Fields: copy priority, copy component
```

## Performance and Limits

### Jira Cloud Limits
- Max 1000 rules per site
- Rules execute within seconds (not instant)
- Rate limiting on actions (500 executions/hour per rule)
- Branch actions limited to 100 related issues
- Scheduled rules: minimum 1-hour interval

### Optimization Tips
- Combine related conditions to reduce rule count
- Use JQL conditions early (fail fast, skip unnecessary processing)
- Avoid triggering cascading rules (rule A triggers rule B triggers rule C)
- Test rules in sandbox project first
- Monitor rule audit log for failures and unexpected behavior

## Debugging

### Common Failures
- Smart value returns empty (field not set on issue)
- Condition never matches (JQL syntax or field name wrong)
- Circular triggers (rule triggers itself)
- Permission errors (automation user lacks required permissions)

### Audit Log
- Check: Administration → Automation → Audit log
- Shows: trigger event, conditions evaluated, actions executed/failed
- Filter by: rule name, date range, success/failure
