# Installation

## Prerequisites

- Node.js 22+ (uses `node:sqlite` built-in)
- OpenCode or Kiro CLI
- macOS/Linux/Windows (cross-platform)
- 7z (p7zip) for CHM conversion tool

## Quick Start (Global)

The global config lives at `~/.config/opencode/opencode.json`:

```json
{
  "plugin": [
    "./zara/plugin/zara-senior-dev.mjs",
    "./zara/plugin/zara-leadership.mjs",
    "./zara/plugin/zara-auto-resume.mjs",
    "./zara/plugin/zara-memory.mjs",
    "./zara/plugin/zara-reflection.mjs",
    "./zara/plugin/zara-metrics.mjs",
    "...14 more plugins"
  ],
  "mcp": {
    "Orchestrator": {
      "type": "local",
      "command": ["node", "/path/to/zara-agent-opc/tools/mcp/index.mjs"],
      "timeout": 5000
    }
  }
}
```

## Project Structure

```
zara-agent-opc/
├── tools/
│   ├── mcp/              ← MCP server (25 tools)
│   │   ├── index.mjs    ← Entry point
│   │   ├── server.mjs   ← McpServer class
│   │   ├── infra.mjs    ← Platform utils
│   │   └── domain/      ← Tool modules
│   ├── chm2md.mjs       ← CHM converter
│   ├── memory-db.mjs    ← SQLite memory layer
│   └── dashboard.mjs    ← CLI dashboard
├── .opencode/
│   ├── skills/           ← 26 project skills
│   ├── instructions/     ← system.md, philosophy.md
│   ├── agent/            ← subagent prompts
│   └── plugin/           ← project plugins (symlinks)
├── knowledge/            ← 254 DevIQ articles
├── prompts/              ← system.md, philosophy.md
└── opencode.json         ← project config
```

## Data Storage

- `~/.zara/` — memory, reflections, metrics, session state
- `~/.zara/memory.db` — SQLite database (FTS5)
- `~/.agents/skills/` — global skills (100+)

## Verify Installation

```bash
# Check MCP server
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node tools/mcp/index.mjs

# Check skills
ls ~/.agents/skills/ | wc -l
```
