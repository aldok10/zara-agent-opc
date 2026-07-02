# Configuration Guide

## Primary Configuration: `opencode.json`

Zara is configured through `opencode.json` in the project root. This is the single source of truth for agent definitions, MCP servers, plugins, permissions, and commands.

### Agent Definitions

10 agents are defined under the `agent` key. Each has a JSON key (runtime identifier), display description, prompt file path, temperature, and tool permissions.

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
    "plan": {
      "description": "Sketch - planning mode",
      "mode": "primary",
      "prompt": "{file:.opencode/agent/sketch.md}",
      "temperature": 0.2
    }
  }
}
```

JSON keys (architect, code-reviewer, etc.) are stable runtime identifiers. Display names and prompt content use the new personality names (Atlas, Lens, etc.).

**Agent reference:**

| JSON Key | Personality | Mode |
|----------|-------------|------|
| zara | Zara | primary |
| plan | Sketch | primary |
| architect | Atlas | subagent |
| code-reviewer | Lens | subagent |
| testing-lead | Probe | subagent |
| security-reviewer | Shield | subagent |
| delivery-lead | Pulse | subagent |
| swarm | Hive | subagent |
| loop-engineer | Rhythm | subagent |
| implementation | Forge | subagent |

### Instructions

Instruction file loaded at startup:

```json
"instructions": [
  ".opencode/instructions/system.md"
]
```

- `system.md` - Priority stack, runtime behavior, memory protocol, git safety, voice rules (philosophy merged in)

### MCP Servers

Two MCP servers:

| Key | Type | Purpose |
|-----|------|---------|
| `Orchestrator` | local (node) | Memory, reflection, knowledge, metrics, music |
| `context7` | remote | Live library documentation |

### Plugins

Single entry point:

```json
"plugin": [
  ".opencode/plugin/zara.mjs"
]
```

Composes 11 domain modules: observe, memory, flow, dev, social, evolve, empathy, relationship, voice, workspace, debate.

### Commands

Available slash commands via the `command` key:

| Command | Agent | Purpose |
|---------|-------|---------|
| `/audit` | - | System health check |
| `/auto` | - | Autonomous mode |
| `/code` | implementation | Structured coding workflow |
| `/decide` | architect | Architecture decision support |
| `/focus` | - | Focus mode |
| `/goal` | - | Session goal management |
| `/handoff` | - | Save session context |
| `/install` | - | Global install |
| `/loop` | - | Loop/timer management |
| `/music` | - | Music player |
| `/resume` | - | Restore previous session |
| `/review` | code-reviewer | Code review workflow |
| `/shutdown` | - | Wind-down ritual |
| `/standup` | - | Activity snapshot |
| `/swarm` | swarm | Parallel decomposition |
| `/think` | - | Structured planning |
| `/update` | - | Self-update from remote |
| `/version` | - | Version info + update check |
| `/zara` | - | General engineering |

### Permissions

```json
"permission": {
  "bash": "allow"
}
```

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `CONTEXT7_API_KEY` | No | Live library documentation via Context7 MCP |

## Memory & Runtime

Zara stores runtime data at `~/.zara/`:

| Path | Purpose |
|------|---------|
| `~/.zara/memory.db` | SQLite - authoritative memory store |
| `~/.zara/memory/` | JSON - legacy/backup |
| `~/.zara/reflections/` | Pattern log |
| `~/.zara/metrics/` | Daily tool usage |
| `~/.zara/state/` | Session handoff state |

### Vector backend (optional Chroma)

SQLite is the default and owns all metadata, FTS, trust, and decay scoring.
For larger memory sets you can offload KNN similarity search to a
[Chroma](https://www.trychroma.com/) server instead of the in-SQLite vector
scan. Embeddings are still produced by Zara's own MiniLM-L6-v2 model; Chroma
only stores and ranks the vectors.

```bash
# 1. start the server (persistent volume)
docker compose up -d chroma

# 2. install the optional client
npm install chromadb

# 3. point Zara at it
export ZARA_VECTOR=chroma
export ZARA_CHROMA_URL=http://localhost:8000   # default
```

| Env | Default | Purpose |
|-----|---------|---------|
| `ZARA_VECTOR` | `sqlite` | `chroma` to enable the Chroma backend |
| `ZARA_CHROMA_URL` | `http://localhost:8000` | Chroma server address |
| `ZARA_CHROMA_COLLECTION` | `zara_semantic` | collection name |

SQLite remains the source of truth: every write goes to SQLite first, then
mirrors to Chroma best-effort. If Chroma is unreachable or the client is not
installed, recall falls back to the SQLite vector scan automatically.
