---
description: Quick focus mode — set what you're working on, block distractions
---

Focus mode. Parse my arguments:

**Format**: `/focus [task description]` or `/focus status` or `/focus done`

Examples:
- `/focus implement auth middleware` → set focus task
- `/focus status` → what am I focused on?
- `/focus done` → clear focus, celebrate

When setting focus:
1. Use `todowrite` to track the focus task
2. Set a `loop` reminder every 30m: "Still on track with: [task]?"
3. Acknowledge with a short confirmation

When checking status:
- Show current focus from scratchpad
- Show how long you've been at it (from session_log)

When done:
- Clear the loop reminder
- Record what was accomplished
- Suggest a break if session > 90min

Arguments: $ARGUMENTS
