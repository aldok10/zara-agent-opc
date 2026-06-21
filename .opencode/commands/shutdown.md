---
description: Wind-down ritual — check bedtime, trigger sleep transition, snooze
---

Parse my arguments to manage the shutdown ritual.

**Format**: `/shutdown [action]` or `/shutdown` (defaults to "check")

Examples:
- `/shutdown` → check if it's near bedtime
- `/shutdown configure 23:00` → set bedtime to 11 PM
- `/shutdown trigger` → start the wind-down sequence
- `/shutdown snooze` → snooze 15 minutes
- `/shutdown snooze 30` → snooze 30 minutes
- `/shutdown status` → show current config

**Parse rules:**
1. No args → action="check"
2. `configure HH:MM` → action="configure", bedtime="HH:MM"
3. `trigger` → action="trigger" (also switch music to sleep/calm playlist)
4. `snooze [N]` → action="snooze", snooze_minutes=N (default 15)
5. `status` → action="status"

Use the `shutdown` tool to execute.

When trigger is called:
1. Execute shutdown tool with action="trigger"
2. Stop current music and play sleep/calm radio
3. Help user write their "state save" (what was done, what's next)

Arguments: $ARGUMENTS
