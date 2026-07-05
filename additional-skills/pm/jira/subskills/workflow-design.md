# Workflow Design

## Scope

Status configuration, transitions, validators, post-functions, conditions, screens. Workflow schemes.

## Principles

- Fewer statuses = less confusion. Max 7.
- Every status must have exit path. No dead ends.
- No circular paths without resolution between.
- Required fields enforced on transitions, not creation.
- One workflow per issue type (or shared if identical).
- Name statuses as present state ("In Progress"), not actions ("Start Work").

## Templates

### Simple (4-state) - Small teams, simple projects
```
To Do → In Progress → In Review → Done
```

### Standard (5-state) - Most dev teams
```
Backlog → To Do → In Progress → In Review → Done
                 ↘ Blocked ↗
```

### Complex (7-state max) - Regulated/enterprise
```
Backlog → Ready → In Progress → Code Review → QA → UAT → Done
                  ↘ Blocked ↗
```

## Transition Configuration

| From | To | Condition | Validator | Post-Function |
|------|----|-----------|-----------|---------------|
| To Do | In Progress | Assignee set | - | Set "Start Date" |
| In Progress | In Review | - | "Fix Version" required | Notify reviewer |
| In Review | Done | User in "reviewers" | Resolution set | Remove from sprint board |
| Any | Blocked | - | "Blocked Reason" required | Flag issue, notify PM |
| Blocked | In Progress | - | Blocker resolved | Remove flag |

## Validators (enforce on transition)

- Required fields: resolution, fix version, story points
- Permission: only tech lead can approve "To Production"
- Regex: commit reference in comment before "Done"
- Custom: all sub-tasks resolved before parent moves to Done

## Post-Functions (execute after transition)

- Set field value (resolution date, assignee)
- Fire event (for automation pickup)
- Update parent (all children done → move parent)
- Add comment (audit trail)
- Notify (watchers, specific role)

## Conditions (who can trigger transition)

- Role-based: only "Developers" can move to "In Review"
- Status-based: sub-tasks must be resolved
- Field-based: story points estimated before sprint commitment

## Common Mistakes

| Mistake | Impact | Fix |
|---------|--------|-----|
| Status = action ("Review This") | Confusing reports | Name as state ("In Review") |
| >7 statuses | Nobody remembers | Collapse similar states |
| No "Blocked" path | Work disappears | Add blocked + flag |
| Skippable required transitions | Data quality drops | Enforce validators |
| Different workflows for similar types | Admin overhead | Consolidate with conditions |

## Verification

- Walk every transition path. Confirm no dead ends.
- Test each validator fires correctly.
- Verify post-functions execute (check field values after transition).
- Board columns map 1:1 to workflow statuses.
