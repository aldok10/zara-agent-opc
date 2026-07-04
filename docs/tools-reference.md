# MCP Tools Reference

## Architecture

| Component | Path | Role |
|-----------|------|------|
| Entry | `tools/mcp/index.mjs` | Bootstrap and stdio transport |
| Server | `tools/mcp/server.mjs` | McpServer class, JSON-RPC over stdio |
| Infrastructure | `tools/mcp/infra.mjs` | Platform utils (paths, file I/O) |
| Domain modules | `tools/mcp/domain/` | Tool implementations by domain |

## Memory Domain (`tools/mcp/domain/memory.mjs`)

All memory operations route through a single unified `Orchestrator_memory` MCP tool with action-based routing:

| Action | Description | Key Parameters |
|--------|-------------|----------------|
| `recall` | Search memory with scope/type filters | `query`, `layer` (all/semantic/episodic/procedural/knowledge), `k`, `section` |
| `learn` | Store fact with type classification | `key`, `value`, `type`, `source` (user_explicit/observed/inferred/external_unverified) |
| `episode` | Record event or reflect on task | `event`, `outcome`, `op` (reflect/blindspot/suggest/patterns) |
| `procedure` | Save reusable workflow | `name`, `steps[]`, `context` |
| `manage` | Consolidate, delete, update, seed, index | `op` (consolidate/delete/update/contradictions/seed/index) |
| `session` | Session state management | `op`, `notes`, `persist` |
| `system` | System info and diagnostics | `op` |

### Knowledge Recall (layer: "knowledge")

When `layer: "knowledge"` is specified, recall routes to passage search over indexed articles:

```
Orchestrator_memory(action:"recall", query:"<topic>", layer:"knowledge", section:"<optional>")
```

### Episode Reflect

Records task outcome with trust calibration:

```
Orchestrator_memory(action:"episode", op:"reflect", agent:"<name>", outcome:"success|partial|failure", worked:"<what>", failed:"<what>")
```
| `memory_contradictions` | Detect same-type facts that are similar but conflicting (flags, no auto-merge) | `threshold` (0-1, default 0.85) |
| `memory_delete` | Delete memories by pattern (substring match). Destructive. | `pattern`, `dry_run` |

## Reflection Domain (`tools/mcp/domain/reflection.mjs`)

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `reflect` | Record task reflection; `outcome` feeds success-weighted learning | `task`, `worked`, `failed`, `pattern`, `outcome` (success/partial/failure) |
| `reflect_suggest` | Recall best-scoring past approach for a situation | `situation` |
| `blindspot` | Record or check blindspots. action=log records, action=check matches context. | `action` (log/check), `area`, `observation`, `context` |

## Metrics Domain (`tools/mcp/domain/metrics.mjs`)

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `dashboard` | Full overview of memory, metrics, patterns, procedures, micro-tools, rules | `section` (all/memory/metrics/patterns/procedures/tools/rules) |

## Session Domain (`tools/mcp/domain/session.mjs`)

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `user_profile` | Get/update profile, or discover identity from all sources | `update`, `action` (get/discover), `persist`, `name` |
| `session_log` | Track work duration, rest reminders | `action` (start/end/check), `context` |
| `goal` | Set/check/done exit conditions | `action` (set/check/done/status/clear), `condition`, `max_turns` |
| `loop` | Recurring reminders at intervals | `action` (start/stop/list/clear/check), `prompt`, `interval` |
| `shutdown_ritual` | Wind-down helper | `action` (configure/check/trigger/status/snooze), `bedtime` |

## Music Domain (`tools/mcp/domain/music.mjs`)

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `play_music` | YouTube/local player with taste learning, playlist, radio mode | `action` (play/stop/pause/next/prev/like/dislike/radio/...), `query`, `source` |

## Knowledge Domain (`tools/mcp/domain/knowledge.mjs`)

### Knowledge Operations (via unified memory tool)

Knowledge operations are accessed through the same `Orchestrator_memory` tool:

| Operation | Invocation | Description |
|-----------|-----------|-------------|
| Index/seed | `action:"manage", op:"seed"` | Scan knowledge/ markdown, store summaries + chunk bodies |
| Section list | `action:"recall", layer:"knowledge", list_sections:true` | List available knowledge sections |
| Passage search | `action:"recall", query:"...", layer:"knowledge", section:"..."` | Semantic passage search over article bodies |

## Audit Domain (`tools/mcp/domain/audit.mjs`)

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `zara_self_audit` | Validate config integrity: agents vs prompt files, plugin modules, MCP domains | `map` |

## Identity Domain (`tools/mcp/domain/identity.mjs`)

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `user_profile` | Get/update user profile, or discover identity from all sources (env, git, OS, memory) | `action` (get/discover), `update`, `persist`, `name` |

## Project Domain (`tools/mcp/domain/project.mjs`)

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `project_learn` | Extract project knowledge (stack, structure, tests, CI) from workspace and store as scoped facts | `path` |

## Improve Domain (`tools/mcp/domain/improve.mjs`)

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `zara_self_improve` | Run self-improvement cycle: observe (gather signals) or orient (prioritize findings) | `phase` (observe/orient/full) |

## Tool Count Summary

| Domain | Tools |
|--------|-------|
| Memory | 7 |
| Reflection | 6 |
| Metrics | 3 |
| Session | 5 |
| Music | 1 |
| Knowledge | 4 |
| Audit | 2 |
| Project | 1 |
| Identity | 1 |
| Improve | 1 |
| **Total** | **31** |

## Removed Tools (consolidated into existing)

| Removed | Absorbed By |
|---------|-------------|
| `memory_stats` | `dashboard(section: "memory")` |
| `metrics_today` | `dashboard(section: "metrics")` |
| `micro_tools` | `dashboard(section: "tools")` |
| `workflow_rules` | `dashboard(section: "rules")` |
| `patterns` | `dashboard(section: "patterns")` |
| `zara_evolve_status` | `dashboard(section: "all")` |
| `blindspot_log` | `blindspot(action: "log")` |
| `blindspot_check` | `blindspot(action: "check")` |
| `user_identity` | `user_profile(action: "discover")` |
| `chm2md` | CLI-only: `node tools/chm2md.mjs` |
| `chm2md_improve` | CLI-only: `node tools/chm2md.mjs --improve` |
