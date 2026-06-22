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

## Post-Install: Version Check

After the install steps complete, check the version status:

### 6. Check Version

1. Read `version.json` at project root → get current version
2. `git rev-parse HEAD` → get current commit
3. `git fetch origin --quiet` → update remote refs
4. `git rev-list --count HEAD..origin/main` → count commits behind

### 7. Report Update Status

If behind remote:

> **Installed Zara v0.2.0** (abc1234)
> **Update available**: 25 commits behind origin/main.
> Run `/update` to pull the latest version.
> Run `/version --check` to see what's new.

If up-to-date:

> **Installed Zara v0.2.0** (abc1234)
> **Status**: Up to date with origin/main.

### 8. Summary: New Commands Available

Restart OpenCode to activate. New commands available in this version:

| Command | What it does |
|---------|-------------|
| `/version` | Show version and check for updates |
| `/update` | Self-update Zara from remote |

## After install

Restart OpenCode to activate Zara. You'll then have:

- `/zara <question>` - talk to Zara
- `/zara install` - re-run any time
- `/version` - check current version + remote updates
- `/update` - self-update from remote (GitLab/GitHub)
- `/handoff` - save session state
- `/resume` - restore from checkpoint
- 9 sub-agents (Atlas, Lens, Probe, Shield, Pulse, Rhythm, Hive, Sketch, Forge)
- Context-mode sandbox (ctx_execute, ctx_fetch)
- Auto-resume (sessions persist across restarts)
- Approval gates for risky operations
