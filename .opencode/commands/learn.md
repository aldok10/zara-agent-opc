---
description: Learn a project or an external repo
---
Learn target: $ARGUMENTS

1. If the target is this repo: `Orchestrator_code_index(project:".")` then `Orchestrator_code_search` for the symbol in question. Read `AGENTS.md` and `PROGRESS.md` first.
2. If the target is an external repo: fetch the README and the entry point, then map its modules to this repo's vocabulary.
3. Store the durable lesson: `Orchestrator_memory(action:"learn", key:"<topic>", value:"<30-50 tokens>", type:"fact|decision|pitfall", source:"<path or url>")`.
4. Show what you learned in 5 lines, then ask for corrections.
