# Installation

## Prerequisites

| Requirement | Minimum | Notes |
|-------------|---------|-------|
| **Node.js** | 22.14.0 | Must support `node:sqlite` with **FTS5** (see below) |
| **OpenCode** | latest | Primary runtime. Install from [opencode.ai](https://opencode.ai) |
| **Platform** | — | Windows 10/11, macOS, or Linux |
| **Bash** | — | Windows: Git for Windows, WSL, or MSYS2 |

### Node.js Version Requirement

Zara uses Node.js built-in `node:sqlite` for the MCP memory server. **FTS5 (full-text search)** support was added in Node.js **v22.14.0**.

Check your current Node.js version and FTS5 availability:

```bash
node --version
```

Test FTS5 support:

```bash
node --experimental-sqlite -e "
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE VIRTUAL TABLE t USING fts5(content)');
  console.log('FTS5 OK');
"
```

If this prints `FTS5 OK`, you're good. If it throws `no such module: fts5`, you need to upgrade Node.js (see platform-specific sections below).

> **Note:** The `--experimental-sqlite` flag is **required** for Node.js **22.x** (where `node:sqlite` is experimental). On Node.js **23+** (including v24.x via scoop), `node:sqlite` is available without the flag. The flag is harmless on newer versions — using it won't break anything.

---

## Windows Installation (Step by Step)

### Overview

This guide covers installing Zara on **Windows 10/11** with native tooling (no WSL required). The MCP server and memory system work with the standard Windows environment.

### 1. Install Node.js (with FTS5 Support)

Node.js v22.5.1 (the current LTS installers from nodejs.org) does **not** include FTS5 in `node:sqlite`. You need **v22.14.0 or later**.

#### Option A: Scoop (Recommended)

[Scoop](https://scoop.sh) is a command-line installer for Windows.

```powershell
# Install Scoop (if not installed)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex

# Install Node.js LTS (scoop installs the latest LTS)
scoop install nodejs-lts

# Verify FTS5 support
node --experimental-sqlite -e "const{DatabaseSync}=require('node:sqlite');const db=new DatabaseSync(':memory:');db.exec('CREATE VIRTUAL TABLE t USING fts5(content)');console.log('FTS5 OK')"
```

The scoop `nodejs-lts` package tracks the latest LTS release, which as of June 2026 is **v24.17.0** with full FTS5 support.

#### Option B: nvm-windows

If you already use [nvm-windows](https://github.com/coreybutler/nvm-windows):

```powershell
# Install nvm-windows (download from GitHub releases)
# Then install a Node version with FTS5:
nvm install 22.14.0
nvm use 22.14.0

# Verify
node --experimental-sqlite -e "const{DatabaseSync}=require('node:sqlite');const db=new DatabaseSync(':memory:');db.exec('CREATE VIRTUAL TABLE t USING fts5(content)');console.log('FTS5 OK')"
```

#### Option C: Manual Download

Download Node.js **v22.14.0 or later** from [nodejs.org](https://nodejs.org/) and run the installer.

> **Important for scoop users:** If you already have Node.js from nodejs.org installed globally (`C:\Program Files\nodejs\`), the scoop-installed version may not be first in `PATH`. Use the **absolute path to scoop's node** in the MCP config (see step 5), or update your `PATH` environment variable to put `%USERPROFILE%\scoop\apps\nodejs-lts\current` before `C:\Program Files\nodejs`.

### 2. Install OpenCode

Download and install OpenCode from [opencode.ai](https://opencode.ai). The installer adds `opencode` to your PATH.

Verify:

```powershell
opencode --version
```

### 3. Clone Zara Agent

```powershell
# Clone the repository
git clone https://gitlab.com/aldo_k/zara-agent-opc.git
cd zara-agent-opc

# Install npm dependencies (for the plugin system)
npm install
```

### 4. Link Zara to OpenCode Global Config

Zara needs to be accessible globally (not per-project). Create a **junction symlink** from the OpenCode config directory:

```powershell
# Path to your OpenCode global config
$openCodeDir = "$env:USERPROFILE\.config\opencode"
if (-not (Test-Path $openCodeDir)) {
    New-Item -ItemType Directory -Path $openCodeDir -Force
}

# Create junction symlink
New-Item -ItemType Junction -Path "$openCodeDir\zara" -Target "$(Get-Location)\zara-agent-opc" -Force
```

Verify the link:

```powershell
(Get-Item "$openCodeDir\zara").LinkType   # Should print "Junction"
```

### 5. Configure opencode.json

Create or update `$env:USERPROFILE\.config\opencode\opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "default_agent": "zara",
  "plugin": [
    "file:///C:/Users/<YOUR_USERNAME>/.config/opencode/zara/.opencode/plugin/zara.mjs"
  ],
  "instructions": [
    "C:/Users/<YOUR_USERNAME>/.config/opencode/zara/.opencode/instructions/system.md"
  ],
  "agent": {
    "zara": {
      "description": "Zara — senior engineering partner, warm and ambitious",
      "mode": "primary",
      "prompt": "{file:C:/Users/<YOUR_USERNAME>/.config/opencode/zara/.opencode/agent/zara.md}",
      "temperature": 0.3
    },
    "plan": {
      "description": "Sketch — planning mode, analysis only",
      "mode": "primary",
      "prompt": "{file:C:/Users/<YOUR_USERNAME>/.config/opencode/zara/.opencode/agent/sketch.md}",
      "temperature": 0.2,
      "tools": { "write": false, "edit": false, "bash": false, "patch": false }
    },
    "architect": {
      "description": "Atlas — architecture specialist",
      "mode": "subagent",
      "prompt": "{file:C:/Users/<YOUR_USERNAME>/.config/opencode/zara/.opencode/agent/atlas.md}",
      "temperature": 0.2,
      "tools": { "write": false, "edit": false, "bash": false }
    },
    "code-reviewer": {
      "description": "Lens — code review specialist",
      "mode": "subagent",
      "prompt": "{file:C:/Users/<YOUR_USERNAME>/.config/opencode/zara/.opencode/agent/lens.md}",
      "temperature": 0.1,
      "tools": { "write": false, "edit": false, "bash": false }
    },
    "testing-lead": {
      "description": "Probe — testing specialist",
      "mode": "subagent",
      "prompt": "{file:C:/Users/<YOUR_USERNAME>/.config/opencode/zara/.opencode/agent/probe.md}",
      "temperature": 0.2,
      "tools": { "write": false, "edit": false, "bash": false }
    },
    "security-reviewer": {
      "description": "Shield — security specialist",
      "mode": "subagent",
      "prompt": "{file:C:/Users/<YOUR_USERNAME>/.config/opencode/zara/.opencode/agent/shield.md}",
      "temperature": 0.1,
      "tools": { "write": false, "edit": false, "bash": false }
    },
    "delivery-lead": {
      "description": "Pulse — delivery specialist",
      "mode": "subagent",
      "prompt": "{file:C:/Users/<YOUR_USERNAME>/.config/opencode/zara/.opencode/agent/pulse.md}",
      "temperature": 0.3,
      "tools": { "write": false, "edit": false, "bash": false }
    },
    "swarm": {
      "description": "Hive — swarm coordinator",
      "mode": "subagent",
      "prompt": "{file:C:/Users/<YOUR_USERNAME>/.config/opencode/zara/.opencode/agent/hive.md}",
      "temperature": 0.2
    },
    "loop-engineer": {
      "description": "Rhythm — loop engineering specialist",
      "mode": "subagent",
      "prompt": "{file:C:/Users/<YOUR_USERNAME>/.config/opencode/zara/.opencode/agent/rhythm.md}",
      "temperature": 0.2,
      "tools": { "write": false, "edit": false, "bash": false }
    },
    "mt5-manager": {
      "description": "MT5 Manager API specialist",
      "mode": "subagent",
      "permission": { "edit": "allow", "bash": "allow" },
      "prompt": "MT5 Manager API specialist"
    }
  },
  "skills": {
    "paths": [
      "C:/Users/<YOUR_USERNAME>/.config/opencode/zara/.opencode/skills"
    ]
  },
  "command": {
    "audit":    { "template": "{file:C:/Users/<YOUR_USERNAME>/.config/opencode/zara/.opencode/commands/audit.md}" },
    "auto":     { "template": "{file:C:/Users/<YOUR_USERNAME>/.config/opencode/zara/.opencode/commands/auto.md}" },
    "decide":   { "template": "{file:C:/Users/<YOUR_USERNAME>/.config/opencode/zara/.opencode/commands/decide.md}", "agent": "architect" },
    "focus":    { "template": "{file:C:/Users/<YOUR_USERNAME>/.config/opencode/zara/.opencode/commands/focus.md}" },
    "goal":     { "template": "{file:C:/Users/<YOUR_USERNAME>/.config/opencode/zara/.opencode/commands/goal.md}" },
    "handoff":  { "template": "{file:C:/Users/<YOUR_USERNAME>/.config/opencode/zara/.opencode/commands/handoff.md}" },
    "loop":     { "template": "{file:C:/Users/<YOUR_USERNAME>/.config/opencode/zara/.opencode/commands/loop.md}" },
    "music":    { "template": "{file:C:/Users/<YOUR_USERNAME>/.config/opencode/zara/.opencode/commands/music.md}" },
    "resume":   { "template": "{file:C:/Users/<YOUR_USERNAME>/.config/opencode/zara/.opencode/commands/resume.md}" },
    "review":   { "template": "{file:C:/Users/<YOUR_USERNAME>/.config/opencode/zara/.opencode/commands/review.md}", "agent": "code-reviewer" },
    "shutdown": { "template": "{file:C:/Users/<YOUR_USERNAME>/.config/opencode/zara/.opencode/commands/shutdown.md}" },
    "standup":  { "template": "{file:C:/Users/<YOUR_USERNAME>/.config/opencode/zara/.opencode/commands/standup.md}" },
    "swarm":    { "template": "{file:C:/Users/<YOUR_USERNAME>/.config/opencode/zara/.opencode/commands/swarm.md}", "agent": "swarm" },
    "think":    { "template": "{file:C:/Users/<YOUR_USERNAME>/.config/opencode/zara/.opencode/commands/think.md}" },
    "zara":     { "template": "{file:C:/Users/<YOUR_USERNAME>/.config/opencode/zara/.opencode/commands/zara.md}" }
  },
  "mcp": {
    "Orchestrator": {
      "type": "local",
      "command": [
        "C:/Users/<YOUR_USERNAME>/scoop/apps/nodejs-lts/current/node.exe",
        "--experimental-sqlite",
        "C:/Users/<YOUR_USERNAME>/.config/opencode/zara/tools/mcp/index.mjs"
      ],
      "timeout": 5000,
      "enabled": true
    }
  },
  "permission": {
    "bash": "allow"
  }
}
```

> **Replace `<YOUR_USERNAME>`** with your actual Windows username.

**Important MCP command notes:**
- Use the **absolute path** to the Node.js binary that supports FTS5 (scoop path shown above, adjust if using nvm-windows or manual install)
- The `--experimental-sqlite` flag is **required** for Node.js **22.x** (you'll get `ERR_UNKNOWN_BUILTIN` without it). On Node.js **23+**, it's optional.
- If using scoop's `nodejs-lts` (v24+), you can omit the flag entirely. The config above keeps it for clarity; it won't cause issues.
- Use **forward slashes** (`C:/Users/...`) or double-escaped backslashes in JSON

### 6. Test the MCP Server

Before using OpenCode, verify the MCP server starts correctly:

```powershell
# Using the same Node.js binary from your MCP config
& "C:\Users\<YOUR_USERNAME>\scoop\apps\nodejs-lts\current\node.exe" `
  --experimental-sqlite `
  "C:\Users\<YOUR_USERNAME>\.config\opencode\zara\tools\mcp\index.mjs"
```

Expected output:

```
Zara MCP server v0.1.0 running (stdio)
```

Press **Ctrl+C** to stop. If you see this, the MCP server works.

### 7. Launch OpenCode

Start (or restart) OpenCode in any project directory:

```powershell
opencode --project .
```

Zara should activate as the default agent. Type `/audit` to verify all systems are running.

---

## Platform-Specific Notes

### macOS / Linux

```bash
# Prerequisites
# - Node.js 22.14+
# - OpenCode
# - Bash

# Clone and install
git clone <repo-url> zara-agent-opc
cd zara-agent-opc
npm install

# Run the installer
./scripts/install.sh

# Verify
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node --experimental-sqlite tools/mcp/index.mjs
```

The `install.sh` script auto-detects your OS, creates `~/.zara/` runtime directory, installs the `zara` CLI, and links to the OpenCode global config.

### Windows (Summary)

See the full step-by-step Windows guide above. Quick reference:

| Step | Command |
|------|---------|
| Install Node.js | `scoop install nodejs-lts` |
| Verify FTS5 | `node --experimental-sqlite -e "..."` |
| Clone repo | `git clone <url> && cd zara-agent-opc && npm install` |
| Link to OpenCode | `New-Item -ItemType Junction ...` |
| Write config | Copy `opencode.json` template above |
| Test MCP | `node --experimental-sqlite tools/mcp/index.mjs` |

---

## Quick Start

```bash
# Clone the repo
git clone <repo-url> zara-agent-opc
cd zara-agent-opc

# Install dependencies
npm install

# macOS/Linux — run installer
./scripts/install.sh

# Windows (Git Bash / WSL) — run installer
bash scripts/install.sh

# Verify installation
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node --experimental-sqlite tools/mcp/index.mjs
```
## Project Structure

```
zara-agent-opc/
├── opencode.json             ← Project config (agents, MCP, plugins, commands)
├── .opencode/
│   ├── agent/                ← 10 agent definitions (zara.md + 9 specialists)
│   │   ├── zara.md          ← Primary agent - full identity
│   │   ├── sketch.md        ← Planning mode (JSON key: plan)
│   │   ├── atlas.md         ← Architecture (JSON key: architect)
│   │   ├── lens.md          ← Code review (JSON key: code-reviewer)
│   │   ├── probe.md         ← Testing (JSON key: testing-lead)
│   │   ├── shield.md        ← Security (JSON key: security-reviewer)
│   │   ├── pulse.md         ← Delivery (JSON key: delivery-lead)
│   │   ├── rhythm.md        ← Loop engineering (JSON key: loop-engineer)
│   │   ├── hive.md          ← Parallel coordination (JSON key: swarm)
│   │   └── forge.md         ← Implementation (JSON key: implementation)
│   ├── instructions/         ← system.md + prompt injection
│   ├── skills/               ← 27 project skills
│   ├── plugin/               ← Plugin modules (11 domains)
│   └── commands/             ← Slash commands (/handoff, /resume, etc.)
├── tools/
│   ├── mcp/                  ← MCP server (7 domains, 22 tools)
│   │   ├── index.mjs        ← Entry point
│   │   ├── server.mjs       ← JSON-RPC 2.0 server
│   │   ├── infra.mjs        ← Platform utilities
│   │   └── domain/           ← Tool modules (memory, knowledge, reflection, etc.)
│   ├── memory-db.mjs         ← SQLite memory layer (FTS5 with LIKE fallback)
│   ├── dashboard.mjs         ← CLI dashboard
│   └── zara.sh               ← CLI helper
├── knowledge/                ← 254+ DevIQ articles across 13 sections
├── scripts/                  ← Install/uninstall/validate scripts
├── docs/                     ← Documentation
└── examples/                 ← Usage examples
```


## MCP Server

The MCP server (7 domains, 22 tools) runs locally via stdio:

```json
{
  "Orchestrator": {
    "type": "local",
    "command": [
      "node",
      "--experimental-sqlite",
      "tools/mcp/index.mjs"
    ],
    "timeout": 5000,
    "enabled": true
  }
}
```

On Windows, replace `"node"` with the absolute path to a Node.js binary that supports FTS5.

> **Flag note:** `--experimental-sqlite` is required for Node.js 22.x. On Node.js 23+ (v24.x via scoop), you can omit it. Keeping it won't cause issues either way.

## Data Storage

| Path | Purpose |
|------|---------|
| `~/.zara/memory.db` | SQLite - authoritative memory store |
| `~/.zara/memory/` | JSON - legacy/backup |
| `~/.zara/reflections/` | Pattern log |
| `~/.zara/metrics/` | Daily tool usage |
| `~/.zara/state/` | Session handoff |
| `~/.agents/skills/` | Global skills (100+) |

## Verify Installation

```bash
# Check MCP server responds
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node --experimental-sqlite tools/mcp/index.mjs

# Check agent files
ls .opencode/agent/*.md | wc -l    # Should show 10

# Check knowledge base
find knowledge -name "*.md" ! -name "_index.md" | wc -l   # 254+

# Check CLI
zara status

# Check FTS5 fallback (if Node.js doesn't support FTS5)
# The memory server will log:
#   [zara-memory] FTS5 unavailable, using LIKE fallback: ...
```

## Troubleshooting

### Windows-Specific

| Problem | Likely Cause | Solution |
|---------|-------------|----------|
| `no such module: fts5` | Node.js version too old | Install nodejs-lts via scoop (v22.14+) |
| `ERR_UNKNOWN_BUILTIN` on `node:sqlite` | Node.js 22.x without `--experimental-sqlite` flag | Add `--experimental-sqlite` to MCP config |
| `Private field '#initSchema' must be declared` | Syntax error in memory-db.mjs | Check for corrupted string in line 522 (literal newlines in template) |
| MCP server won't start | Node.js missing `--experimental-sqlite` | Add the flag to `opencode.json` MCP config (not needed on Node 23+) |
| Junction symlink shows as directory | Non-elevated PowerShell | Run PowerShell as Administrator, or use `New-Item -ItemType Junction` |
| `0xc0000139` DLL error | Wrong Node.js binary | Use absolute path to scoop node in MCP command |
| Slow first startup | Knowledge base seeding | First run loads 254+ articles. Normal. Wait for completion. |

### General

| Problem | Likely Cause | Solution |
|---------|-------------|----------|
| Agent not found | Config path mismatch | Check file paths in `opencode.json` use correct separators |
| Commands not working | Plugin not loaded | Verify `plugin` path in `opencode.json` is correct |
| Memory not persisting | SQLite path issue | Check `~/.zara/memory.db` exists and is writable |
| MCP tools not listed | Server not running | Check `opencode.json` MCP config and test with direct invocation |
