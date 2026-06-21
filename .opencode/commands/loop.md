---
description: Start a recurring reminder/task loop (e.g. /loop 5m check tests)
---

Parse my arguments to understand what loop to create.

**Format**: `/loop [interval] [prompt]` or `/loop stop [id]` or `/loop list` or `/loop clear`

Examples:
- `/loop 5m run tests` → remind every 5 minutes to run tests
- `/loop 30m commit progress` → remind every 30 minutes
- `/loop 1h take a break` → hourly break reminder
- `/loop list` → show active loops
- `/loop stop abc123` → stop a specific loop
- `/loop clear` → stop all loops

**Parse rules:**
1. If first arg matches `list|clear|stop` → that's the action
2. If first arg matches `\d+(s|m|h|d)` → that's the interval, rest is the prompt
3. Default interval: 10m

Use the `loop` tool to execute:
- `list` → action="list"
- `clear` → action="clear"  
- `stop [id]` → action="stop", id="..."
- `[interval] [prompt]` → action="start", interval="...", prompt="..."

Arguments: $ARGUMENTS
