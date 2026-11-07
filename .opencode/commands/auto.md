---
description: Autonomous work mode
---
Task: $ARGUMENTS

1. Read `PROGRESS.md` and `feature_list.json`. State the active feature or the next planned one.
2. `Orchestrator_reflect(action:"suggest", situation:"<the task>")` for known pitfalls. Load the matching skill.
3. Run `make test` and `make check` before changing anything. A red baseline is fixed first.
4. Execute in small steps. After each step: run the cheapest gate that can fail.
5. On error: one retry with a different approach. Identical error twice means stop and change approach. Three distinct failures: stop and escalate with WHAT/WHY/FIX.
6. Finish with `make verify-feature F=<id>` when a feature is active, then `make clean-check`.
7. Record: `Orchestrator_reflect(action:"record", ...)` and update `PROGRESS.md`. Report the commands you actually ran.
