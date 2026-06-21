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
| `memory_stats` | Show counts per layer | — |
| `memory_learn` | Store fact with type classification | `key`, `value`, `source` (user_explicit/observed/inferred) |
| `memory_episode` | Record event with outcome and tags | `event`, `outcome`, `tags[]` |
| `memory_procedure` | Save reusable workflow | `name`, `steps[]`, `context` |
| `memory_consolidate` | Dreamer pass: merge dupes, archive stale, promote recurring + flag contradictions | — |
| `memory_contradictions` | Detect same-type facts that are similar but conflicting (flags, no auto-merge) | `threshold` (0-1, default 0.85) |

## Reflection Domain (`tools/mcp/domain/reflection.mjs`)

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `reflect` | Record task reflection; `outcome` feeds success-weighted learning | `task`, `worked`, `failed`, `pattern`, `outcome` (success/partial/failure) |
| `patterns` | List learned patterns ranked by success rate × frequency | — |
| `reflect_suggest` | Recall best-scoring past approach for a situation | `situation` |
| `zara_evolve_status` | Snapshot of learning state (patterns, rules, adaptations, contradictions, blindspots) | — |
| `blindspot_log` | Record detected user blindspot | `area`, `observation`, `suggestion` |
| `blindspot_check` | Check context against known blindspots | `context` |

## Metrics Domain (`tools/mcp/domain/metrics.mjs`)

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `metrics_today` | Daily tool call stats | — |
| `micro_tools` | List crystallized micro-tools | — |
| `workflow_rules` | List active rules | — |
| `dashboard` | Full overview | `section` (all/memory/metrics/patterns/procedures/tools/rules) |

## Session Domain (`tools/mcp/domain/session.mjs`)

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `user_profile` | Get/update user profile | `update` (partial merge object) |
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
| `knowledge_load_init` | Scan knowledge/ markdown, store summaries + chunk/embed bodies for passage retrieval | `path`, `force`, `dry_run` |
| `knowledge_index` | Fast section/keyword lookup over titles + summaries | `section`, `query`, `list_sections` |
| `knowledge_passage` | Semantic passage search over full article bodies (cosine over trigram embeddings) | `query`, `section`, `k` |
| `team_knowledge` | Search shared team knowledge | `query` |
| `chm2md` | Convert CHM to AI skill (subskills + knowledge/) | `input`, `skill_name`, `output`, `mode` |
| `chm2md_improve` | Get improvement tasks for generated skills | `skill_path`, `subskill`, `action` |

## Audit Domain (`tools/mcp/domain/audit.mjs`)

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `zara_self_audit` | Validate config integrity: agents↔prompt files, plugin modules, MCP domains, orphaned refs | — |

## Identity Domain (`tools/mcp/domain/identity.mjs`)

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `user_identity` | Discover the user's name from env/profile/memory/git/OS (priority chain); optionally persist as canonical | `persist`, `name` |

## Tool Count Summary

| Domain | Tools |
|--------|-------|
| Memory | 7 |
| Reflection | 6 |
| Metrics | 4 |
| Session | 5 |
| Music | 1 |
| Knowledge | 6 |
| Audit | 1 |
| Identity | 1 |
| **Total** | **31** |
