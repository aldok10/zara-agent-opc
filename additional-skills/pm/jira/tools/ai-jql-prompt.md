# AI JQL Prompt Template

Convert natural language to JQL. Use project context when available.

## Prompt

Given: "{user_question}"
Project: {project_key} | User: {current_user}

Generate valid JQL. Use functions (currentUser, openSprints, startOfWeek). Prefer relative dates over absolute.

## Common Patterns

| Natural Language | JQL |
|-----------------|-----|
| My bugs created this week | `assignee = currentUser() AND type = Bug AND created >= startOfWeek()` |
| Unresolved blockers in current sprint | `issueLinkType = "blocks" AND status != Done AND sprint in openSprints()` |
| High-priority items nobody's working on | `priority in (High, Highest) AND assignee is EMPTY AND status = "To Do"` |
| What did the team finish last week | `status changed TO "Done" DURING (startOfWeek(-1), endOfWeek(-1))` |
| Stale in-progress work | `status = "In Progress" AND updated <= -7d` |

## Rules

- Always scope to project if user implies one
- Use `currentUser()` when user says "my" / "mine"
- Use `openSprints()` for "current sprint"
- Prefer `changed` operator for state transitions
- Add `ORDER BY priority DESC, created DESC` unless user specifies order
