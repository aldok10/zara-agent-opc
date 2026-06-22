---
description: System health audit - check agents, commands, skills, plugins, memory integrity
---

# Audit - Zara System Health Check

You invoked `/audit`. Let me run a full system audit to check configuration integrity, agent alignment, and overall health.

## What This Covers

1. **Config integrity** - agents declared vs prompt files on disk
2. **Command registry** - all `.opencode/commands/*.md` registered in `opencode.json`
3. **Agent alignment** - opencode.json agent entries match `.opencode/agent/*.md` files
4. **Plugin health** - plugin composition root imports match `plugin/zara/*` directories
5. **Knowledge coverage** - knowledge load status
6. **Memory health** - memory stats, contradictions, evolution progress
7. **Orphan detection** - any files that exist but aren't wired in

## Execution

Run these in parallel:
1. `Orchestrator_zara_self_audit` with map=true - main integrity scan
2. `Orchestrator_memory_stats` - memory health
3. `Orchestrator_zara_evolve_status` - learning evolution
4. `Orchestrator_metrics_today` - usage patterns
5. `Orchestrator_memory_contradictions` - detect conflicting memories

Then cross-reference:
- Glob `.opencode/commands/*.md` vs opencode.json `command` keys
- Glob `.opencode/agent/*.md` vs opencode.json `agent` keys
- Glob `.opencode/skills/*/SKILL.md` vs available skills listing

## Output

Present findings grouped as:

```
## ✅ Healthy
- <list of good things>

## ⚠️ Issues Found
- <list of problems>

## 📋 Summary
- Config integrity: ✅ / ⚠️ / ❌
- Command registration: X/Y registered
- Agent alignment: X/Y matched
- Memory health: X facts, Y episodes, Z patterns
```

Do not automatically fix anything. Just report. Let the user decide what to address.
