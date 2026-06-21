---
description: Set a goal/exit condition — keep working until it's met (e.g. /goal all tests pass)
---

Parse my arguments to set or manage a goal.

**Format**: `/goal [condition]` or `/goal status` or `/goal done` or `/goal clear`

Examples:
- `/goal all auth tests pass and lint is clean` → set exit condition
- `/goal status` → check current goal progress
- `/goal done` → mark goal as achieved
- `/goal clear` → remove current goal

**Parse rules:**
1. If arg is `status|done|clear` → that's the action
2. Otherwise → action="set", condition=entire argument text

Use the `goal` tool to execute:
- `status` → action="status"
- `done` → action="done"
- `clear` → action="clear"
- anything else → action="set", condition="$ARGUMENTS"

After setting a goal, remind yourself to call `goal` with action="check" after each meaningful step.

Arguments: $ARGUMENTS
