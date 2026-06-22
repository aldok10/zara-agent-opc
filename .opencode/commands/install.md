---
description: Install Zara globally — clones repo, symlinks config, merges opencode.json, verifies everything
---

# /install — Zara Global Install

Installs Zara as your global OpenCode engineering partner. Designed for a
**git-clone + symlink** workflow: clone once, update via `git pull`.

## Quick Start (2 ways)

### Option A: AI Agent does it (recommended)
Just tell your AI agent:

> "Install Zara from this repo."

The agent will follow these steps automatically.

### Option B: Manual
```bash
bash scripts/install-opencode.sh
```

---

## What This Command Does

$ARGUMENTS

If called with `--help` or `-h`, show the summary above and stop.

If called with `--uninstall`, remove symlinks, CLI, and cleanup.

If called with `--verify`, check installation completeness without changes.

Otherwise, run the full install sequence below.

---

## Install Sequence (for AI agent execution)

Execute these steps in order. Each step is critical for a complete install.

---

### Step 1: Detect Project Root

Detect the project root directory. This is the directory containing `opencode.json`.

```bash
# The AI agent's current working directory should be the project root.
# Verify by checking for opencode.json:
test -f opencode.json && echo "Project root: $(pwd)"
```

If `opencode.json` is not found, ask the user for the project path.

Extract the project name:
```bash
basename "$(pwd)"
```

---

### Step 2: Run the Install Script

Run the comprehensive install script. This handles all file operations reliably:

```bash
bash scripts/install-opencode.sh
```

This script does:
1. Creates directories (`~/.config/opencode/`, `~/.zara/`, `~/.local/bin/`)
2. Symlinks `.opencode/` → `~/.config/opencode/zara`
3. Symlinks `prompts/` → `~/.config/opencode/prompts`
4. Merges project `opencode.json` into global config
   - All 10 agents (Zara, Atlas, Lens, Shield, Probe, Pulse, Rhythm, Hive, Sketch, Forge)
   - All 19 commands (audit, auto, code, decide, focus, goal, handoff, install, loop, music, resume, review, shutdown, standup, swarm, think, zara, version, update)
   - Plugin registration (zara.mjs)
   - MCP servers (Orchestrator, context7) with absolute paths fixed
   - Instructions (system.md, philosophy.md)
5. Fixes absolute paths for MCP Orchestrator to point to actual clone location
6. Installs CLI to `~/.local/bin/zara`
7. Syncs project skills to global `~/.agents/skills/`
8. Copies agent definitions to `~/.zara/agents/`
9. Verifies everything (checks all files exist)

If the script succeeds, proceed to Step 3. If it fails, report the errors.

---

### Step 3: Verify Installation

Run the verification to confirm everything is complete:

```bash
bash scripts/install-opencode.sh --verify
```

Expected output — all checks should pass:

```
  ✓ Symlink: ~/.config/opencode/zara → .opencode/
  ✓ Symlink: ~/.config/opencode/prompts → prompts/
  ✓ Config:  opencode.json exists
  ✓ Agent:   zara, plan, architect, code-reviewer, testing-lead, security-reviewer, delivery-lead, swarm, loop-engineer, implementation
  ✓ Command: /audit, /auto, /code, /decide, /focus, /goal, /handoff, /install, /loop, /music, /resume, /review, /shutdown, /standup, /swarm, /think, /zara, /version, /update
  ✓ Plugin:  zara.mjs
  ✓ MCP:     Orchestrator server
  ✓ CLI:     ~/.local/bin/zara
  ✓ Runtime: ~/.zara/
All checks passed. Zara is fully installed.
```

If any checks fail, report which ones and suggest re-running the install script.

---

### Step 4: Confirm Global Config Merge

Verify the global opencode.json has all required sections:

```bash
python3 -c "
import json
with open('$HOME/.config/opencode/opencode.json') as f:
    cfg = json.load(f)

print('Default agent:', cfg.get('default_agent'))
print('Agents:', list(cfg.get('agent', {}).keys()))
print('Commands:', list(cfg.get('command', {}).keys()))
print('MCP:', list(cfg.get('mcp', {}).keys()))
print('Plugin:', cfg.get('plugin', []))
"
```

Ensure all 10 agents and all 19 commands are present.

---

### Step 5: Knowledge Seeding (First Run Only)

If this is a fresh installation (no knowledge seeded):

```bash
# Check if knowledge is already seeded
python3 -c "
import os, json
if os.path.exists('$HOME/.zara/knowledge'):
    print('Knowledge directory exists')
else:
    print('Knowledge not seeded — will seed on first Zara activation')
"
```

Knowledge seeding happens automatically when Zara starts for the first time
(via `knowledge_load_init` in the connection DNA protocol). No manual action needed.

---

### Step 6: Check PATH

Verify the Zara CLI is accessible:

```bash
# Check if ~/.local/bin is in PATH
if command -v zara &>/dev/null; then
  echo "✓ zara CLI available: $(command -v zara)"
else
  echo "⚠ Add to your shell rc file:"
  echo '  export PATH="$PATH:$HOME/.local/bin"'
fi
```

If not in PATH, suggest adding it.

---

### Step 7: Version Check

Show the installed version:

```bash
# Read version
python3 -c "import json; d=json.load(open('version.json')); print(f\"Zara {d['version']} installed\")"
git rev-parse --short HEAD
```

Check if an update is available (optional, network call):

```bash
git fetch origin --quiet 2>/dev/null && \
  BEHIND=$(git rev-list --count HEAD..origin/main 2>/dev/null || echo "0") && \
  if [ "$BEHIND" -gt 0 ]; then \
    echo "Update available ($BEHIND commits behind). Run /update later."; \
  else \
    echo "Up to date with origin/main."; \
  fi
```

---

### Step 8: Summary & Final Instructions

Present a clean summary to the user:

```
╔══════════════════════════════════════════════════════════════╗
║  ✅ Zara Installation Complete                              ║
╠══════════════════════════════════════════════════════════════╣
║  Version:   v0.2.0 (abc1234)                                ║
║  Agents:    10 (Zara, Atlas, Lens, Shield, Probe, Pulse,   ║
║              Rhythm, Hive, Sketch, Forge)                   ║
║  Commands:  19                                              ║
║  Plugin:    zara.mjs (active)                               ║
║  MCP:       Orchestrator + context7                         ║
║  CLI:       ~/.local/bin/zara                               ║
║  Runtime:   ~/.zara/                                        ║
╠══════════════════════════════════════════════════════════════╣
║  To start:                                                  ║
║  1. Restart OpenCode                                        ║
║  2. Start chatting with Zara                                ║
║  3. Run /version to check                                   ║
║  4. Run /update when a new version is available             ║
╠══════════════════════════════════════════════════════════════╣
║  Updating: git pull (in the project directory),             ║
║  then re-run this install script                            ║
╚══════════════════════════════════════════════════════════════╝
```

Also mention:
- `CONTEXT7_API_KEY` environment variable for live documentation lookups
- The project can be cloned anywhere — symlinks handle the rest
- To update: `git pull` in the project directory, then re-run install

---

## Update Flow (for User Reference)

When a new version is released:

```bash
# Go to your clone
cd /path/to/zara-agent-opc

# Pull latest version
git pull origin main
# OR checkout a specific tag:
# git checkout v0.3.0

# Re-install (refreshes symlinks, merges config)
bash scripts/install-opencode.sh

# Or, if inside OpenCode, just run:
# /update
```

The symlinks mean your global config always points to the clone. Updating the
clone and re-running install keeps everything in sync.

---

## Uninstall

```bash
bash scripts/install-opencode.sh --uninstall
```

This removes symlinks and CLI. Runtime data (`~/.zara/`) and the clone are
preserved. To fully remove runtime data too:

```bash
rm -rf ~/.zara
```
