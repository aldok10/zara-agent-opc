---
type: subskill
title: "Automation Rules"
---

# Automation Rules

## Scope

Triggers, conditions, actions, scheduled rules, smart values. Cloud Automation (built-in) and ScriptRunner patterns.

## Anatomy

```
TRIGGER (when) > CONDITION (if) > ACTION (then)
```

## Top 10 Recipes

### 1. Auto-assign on transition
Trigger: Status changed to "In Review"
Action: Assign to lead from component

### 2. Transition on PR merge
Trigger: Development > PR merged
Condition: Status = "In Review"
Action: Transition to "Done"

### 3. Stale issue cleanup
Trigger: Scheduled (weekly)
Condition: `updated <= -30d AND status != Done AND type != Epic`
Action: Comment warning > if still stale next week, move to Backlog

### 4. SLA breach alert
Trigger: Scheduled (daily)
Condition: `priority = Highest AND created <= -2d AND status = "To Do"`
Action: Notify channel, add label "sla-risk"

### 5. Sprint rollover
Trigger: Sprint completed
Condition: Issue status != Done
Action: Move to next sprint, add comment "Rolled from Sprint X"

### 6. Sub-task completion → parent transition
Trigger: All sub-tasks done
Action: Transition parent to "In Review"

### 7. Bug priority auto-set
Trigger: Issue created, type = Bug
Condition: Component = "payments" OR label = "security"
Action: Set priority = High

### 8. Due date from sprint end
Trigger: Issue added to sprint
Action: Set due date = sprint end date - 1d

### 9. Blocked notification
Trigger: Issue linked as "is blocked by"
Action: Notify assignee of blocking issue, add flag

### 10. Release notes generation
Trigger: Version released
Condition: Issues in version with label "release-note"
Action: Create Confluence page with issue summaries

## Smart Values

- `{{issue.key}}` - current issue key
- `{{issue.assignee.displayName}}` - assignee name
- `{{sprint.name}}` - current sprint
- `{{now.plusDays(7)}}` - date arithmetic
- `{{issue.changelog.status.from}}` - previous status

## Anti-Patterns

| Problem | Why Bad | Fix |
|---------|---------|-----|
| Circular triggers | Rule A triggers Rule B triggers Rule A | Add condition checking last updater != automation |
| Over-automation | Removes human judgment | Automate admin only, not decisions |
| No error handling | Silent failures | Add "else" branch with notification |
| Too many scheduled rules | Performance impact | Consolidate, run off-peak |
| Automation edits triggering other automations | Cascade storms | Use "actor is not automation" condition |

## Verification

1. Test with single issue manually
2. Check automation audit log (success/failure)
3. Confirm no unintended side effects on related issues
4. Monitor for 1 sprint before declaring stable
