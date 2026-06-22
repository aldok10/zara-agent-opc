---
description: Install Zara to global OpenCode config. One command, zero config.
---

When this command is invoked, you are installing Zara as your global engineering partner.

$ARGUMENTS

## What `/zara install` does

1. **Symlink** `.opencode/` → `~/.config/opencode/zara`
2. **Update** `~/.config/opencode/opencode.json` with Zara agent, sub-agents, plugins, commands, MCP
3. **Create** `~/.zara/` runtime directory (state, skills, memory, sessions, agents)
4. **Install** `zara` CLI to `~/.local/bin/zara`
5. **Register** plugin: `zara.mjs` - unified composition root with 10 modules
   (dev, empathy, evolve, flow, infra, memory, observe, relationship, social, voice)

## Sub-commands

| Command | What it does |
|---------|-------------|
| `/zara install` | Full global install |
| `/zara uninstall` | Remove Zara from global config (preserves ~/.zara data) |
| `/zara status` | Check what's installed |

## After install

Restart OpenCode to activate Zara. You'll then have:

- `/zara <question>` - talk to Zara
- `/zara install` - re-run any time
- `/handoff` - save session state
- `/resume` - restore from checkpoint
- 9 sub-agents (Atlas, Lens, Probe, Shield, Pulse, Rhythm, Hive, Sketch, Forge)
- Context-mode sandbox (ctx_execute, ctx_fetch)
- Auto-resume (sessions persist across restarts)
- Approval gates for risky operations
