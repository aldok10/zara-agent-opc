# Example: 5-State Dev Workflow

## Statuses
Backlog, To Do, In Progress, In Review, Done

## Transitions

| # | From | To | Validator | Post-Function |
|---|------|----|-----------|---------------|
| 1 | Backlog | To Do | Assignee set | - |
| 2 | To Do | In Progress | - | Set start date = now |
| 3 | In Progress | In Review | Fix version required | Notify component lead |
| 4 | In Review | Done | Resolution set | Set resolution date, remove flag |
| 5 | In Review | In Progress | Comment required ("reason for return") | Notify assignee |
| 6 | Any | Backlog | Permission: PM only | Clear assignee, add comment |

## Board Column Mapping
Backlog=Backlog, To Do=To Do, In Progress=In Progress, In Review=In Review, Done=Done

## Validation Checklist
- [ ] Every status reachable from at least one other
- [ ] No dead-end statuses (every status has exit)
- [ ] "Done" only reachable via "In Review" (enforces review)
- [ ] Validators fire on required transitions
- [ ] Board columns match workflow statuses 1:1
- [ ] Test with all issue types using this scheme
