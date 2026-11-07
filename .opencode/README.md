# Zara Agent - OpenCode Directory

Extensions loaded by OpenCode V2 from this directory.

## Structure

```
.opencode/
├── agent/               # Agent markdown definitions (auto-loaded)
│   ├── zara.md          # Primary agent
│   ├── atlas.md         # Subagent: architecture
│   ├── forge.md         # Subagent: implementation
│   ├── lens.md          # Subagent: code review
│   ├── probe.md         # Subagent: testing
│   ├── shield.md        # Subagent: security
│   ├── pulse.md         # Subagent: delivery
│   ├── rhythm.md        # Subagent: loop engineering
│   ├── hive.md          # Subagent: parallel coordination
│   ├── scout.md         # Subagent: requirements
│   ├── refiner.md       # Subagent: answer quality
│   ├── plan.md          # Read-only planning agent
│   └── compaction.md    # Context compaction prompt
├── instructions/        # Canonical system instructions
├── commands/            # Slash command templates
└── skills/              # Core skills (zara-core carries the knowledge tree)
```

## How it loads

1. `opencode.json` (project root) - agent, command, mcp, permission entries
2. `AGENTS.md` (project root) - auto-loaded project instructions
3. `.opencode/agent/*.md` - agent prompts with YAML frontmatter
4. `.opencode/skills/*` and `additional-skills/*` - registered as skill paths in the
   global config by `zara-merge.py`

## Not here anymore

The v1 Node plugin (`.opencode/plugin/`) and the Node MCP server (`tools/`) were
removed. Memory and knowledge are served by `zmem-mcp` in `mcp/zarust-memory`.
