---
description: Keep working autonomously until goal is met or max turns reached
---

Autonomous work mode. I'm stepping away — keep working on this:

**Task**: $ARGUMENTS

Instructions:
1. Set a goal using the `goal` tool: action="set", condition="$ARGUMENTS"
2. Break the task into steps
3. Execute each step
4. After each step, call `goal` with action="check" to track progress
5. When done, call `goal` with action="done"
6. If stuck after 3 attempts on the same step, note the blocker and move on

Work autonomously. Don't ask for confirmation on safe operations.
When finished or stuck, write a summary of what was done.
