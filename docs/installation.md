# Installation

## Prerequisites

- **Node.js 22+** (uses `node:sqlite` built-in)
- **OpenCode AI** (primary runtime) or compatible MCP host
- **Platform**: macOS, Linux, or Windows
- **Bash** (Windows: install via Git for Windows or WSL)

## Quick Start

```bash
# Clone the repo
git clone <repo-url> zara-agent-opc
cd zara-agent-opc

# Run the installer
./scripts/install.sh              # macOS/Linux
# or on Windows:
.\scripts\install.bat             # CMD
.\scripts\apply-zara.ps1          # PowerShell (recommended)
```

The installer will:
1. Create `~/.zara/` runtime directory (memory, skills, sessions)
2. Install `zara` CLI to `~/.local/bin/`
3. Link `.opencode/` to OpenCode global config
4. Configure Claude Code integration (if available)

## Platform-Specific Notes

### macOS / Linux
- `install.sh` auto-detects OS and sets up paths
- CLI available via `zara` command (add `~/.local/bin` to PATH)

### Windows
- **Option A - CMD**: Run `install.bat` - creates directory structure, CLI wrapper, and OpenCode junction
- **Option B - PowerShell**: Run `apply-zara.ps1` - full PowerShell experience with junction symlinks, global/project/uninstall modes
- **Option C - Git Bash/WSL**: Run `install.sh` - same experience as Linux
- All Windows scripts handle `%APPDATA%` vs `%USERPROFILE%` paths and create `zara.cmd` CLI wrapper

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
│   ├── plugin/               ← Plugin modules (10 domains)
│   └── commands/             ← Slash commands (/handoff, /resume, etc.)
├── tools/
│   ├── mcp/                  ← MCP server (8 domains, 31 tools)
│   │   ├── index.mjs        ← Entry point
│   │   ├── server.mjs       ← JSON-RPC 2.0 server
│   │   ├── infra.mjs        ← Platform utilities
│   │   └── domain/           ← Tool modules (memory, knowledge, reflection, etc.)
│   ├── memory-db.mjs         ← SQLite memory layer (FTS5)
│   ├── dashboard.mjs         ← CLI dashboard
│   └── zara.sh               ← CLI helper
├── knowledge/                ← 254+ DevIQ articles across 13 sections
├── prompts/
│   └── philosophy.md         ← Engineering philosophy
├── scripts/                  ← Install/uninstall/validate scripts
├── docs/                     ← Documentation
└── examples/                 ← Usage examples
```

## Agent Configuration (opencode.json)

All agent config lives in `opencode.json`. JSON keys are stable runtime identifiers:

```json
{
  "default_agent": "zara",
  "agent": {
    "zara": {
      "description": "Zara - senior engineering partner",
      "mode": "primary",
      "prompt": "{file:.opencode/agent/zara.md}",
      "temperature": 0.3
    },
    "plan":       { "prompt": "{file:.opencode/agent/sketch.md}" },
    "architect":  { "prompt": "{file:.opencode/agent/atlas.md}" },
    "code-reviewer": { "prompt": "{file:.opencode/agent/lens.md}" },
    "testing-lead":  { "prompt": "{file:.opencode/agent/probe.md}" },
    "security-reviewer": { "prompt": "{file:.opencode/agent/shield.md}" },
    "delivery-lead": { "prompt": "{file:.opencode/agent/pulse.md}" },
    "loop-engineer": { "prompt": "{file:.opencode/agent/rhythm.md}" },
    "swarm":      { "prompt": "{file:.opencode/agent/hive.md}" },
    "implementation": { "prompt": "{file:.opencode/agent/forge.md}" }
  }
}
```

## MCP Server

The MCP server (8 domains, 31 tools) runs locally via stdio:

```json
{
  "Orchestrator": {
    "type": "local",
    "command": ["node", "tools/mcp/index.mjs"],
    "timeout": 5000
  }
}
```

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
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node tools/mcp/index.mjs

# Check agent files
ls .opencode/agent/*.md | wc -l    # Should show 10

# Check knowledge base
find knowledge -name "*.md" ! -name "_index.md" | wc -l   # 254+

# Check CLI
zara status
```
