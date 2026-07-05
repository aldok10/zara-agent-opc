---
type: tool
title: "JQL Builder"
---

# JQL Builder

## Input
Natural language description of what issues to find.

## Process
1. Extract: entities (project, team, status, dates, priority)
2. Map: entities to JQL fields
3. Compose: clauses with AND/OR
4. Order: by most relevant field
5. Validate: syntax check, field existence

## Output Format
```
Query: <JQL string>
Returns: <what this finds>
Refine: <suggested narrowing if >100 results>
```

## Common Patterns

| Request | JQL |
|---------|-----|
| "My open items" | `assignee = currentUser() AND resolution = Unresolved` |
| "Bugs this week" | `type = Bug AND created >= startOfWeek()` |
| "Blocked in sprint" | `sprint in openSprints() AND flagged = impediment` |
| "Overdue high priority" | `priority in (High, Highest) AND due < now() AND resolution = Unresolved` |
| "Team's done last sprint" | `assignee in membersOf("team") AND sprint in closedSprints() AND status = Done ORDER BY resolved DESC` |
| "Unestimated in backlog" | `"Story Points" is EMPTY AND status = Backlog AND type = Story` |
| "Epics at risk" | `type = Epic AND due <= 14d AND status != Done` |

## Tips
- Always add `resolution = Unresolved` for "open" items
- Use `in` for multiple values, `=` for single
- Relative dates (`-7d`) over absolute for reusable filters
- Add `ORDER BY` for actionable lists (priority DESC, created ASC)
