# MCP Tools Reference

## Architecture

| Component | Path | Role |
|-----------|------|------|
| Entry | `tools/mcp/index.mjs` | Bootstrap and stdio transport |
| Server | `tools/mcp/server.mjs` | McpServer class, JSON-RPC over stdio |
| Infrastructure | `tools/mcp/infra.mjs` | Platform utils (paths, file I/O) |
| Domain modules | `tools/mcp/domain/` | Tool implementations by domain |

## Memory Domain (`tools/mcp/domain/memory.mjs`)

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `memory_recall` | Search memory with scope/type filters + token budget | `query`, `layer` (all/episodic/semantic/procedural) |
| `memory_learn` | Store fact with type classification | `key`, `value`, `source` (user_explicit/observed/inferred) |
| `memory_episode` | Record event with outcome and tags | `event`, `outcome`, `tags[]` |
| `memory_procedure` | Save reusable workflow | `name`, `steps[]`, `context` |
| `memory_consolidate` | Dreamer pass: merge dupes, archive stale, promote recurring + flag contradictions | - |
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

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `knowledge_load_init` | Scan knowledge/ markdown, store summaries + chunk bodies for passage retrieval | `path`, `force`, `dry_run` |
| `knowledge_index` | Fast section/keyword lookup over titles + summaries | `section`, `query`, `list_sections` |
| `knowledge_passage` | Semantic passage search over full article bodies | `query`, `section`, `k` |
| `team_knowledge` | Search shared team knowledge | `query` |

## Audit Domain (`tools/mcp/domain/audit.mjs`)

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `zara_self_audit` | Validate config integrity: agents vs prompt files, plugin modules, MCP domains | `map` |

## Tool Count Summary

| Domain | Tools |
|--------|-------|
| Memory | 7 |
| Reflection | 3 |
| Metrics | 1 |
| Session | 5 |
| Music | 1 |
| Knowledge | 4 |
| Audit | 1 |
| **Total** | **22** |

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
