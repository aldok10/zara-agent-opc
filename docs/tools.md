# Tools Reference

## Overview

Zara integrates with several tools and systems to provide engineering guidance grounded in the DevIQ knowledge base. Her philosophy: prefer the simplest tool that works, reach for stdlib first, and question whether you need a tool at all.

## Core Tools

### CLI Tool (zara.sh)

The Zara CLI provides knowledge navigation and system management:

```bash
zara status              # Show system status
zara search <query>      # Search knowledge base
zara knowledge <section> # List articles in section
zara read <path>         # Read specific article
zara agents              # List sub-agents
zara agent <name>        # Show agent details
zara skills              # List all skills
zara skill <name>        # Show skill details
zara learn <file>        # Import skill
zara journal             # View journal
zara session <name>      # Start session
```

### Sub-Agents

| Agent | Tool | Purpose |
|-------|------|---------|
| Architect | `architect-agent` | System design, patterns |
| Code Reviewer | `code-reviewer-agent` | Code quality, smells |
| Testing Lead | `testing-lead-agent` | Testing strategy |
| Practices Lead | `practices-lead-agent` | Engineering practices |
| DDD Specialist | `ddd-specialist-agent` | Domain modeling |
| Security Reviewer | `security-reviewer-agent` | Security patterns |
| Delivery Lead | `delivery-lead-agent` | Shipping, velocity |

## Swarm Tools

### Coordination

| Tool | Purpose |
|------|---------|
| `swarm_init` | Initialize swarm session |
| `swarm_decompose` | Break task into subtasks |
| `swarm_plan_prompt` | Generate strategy-specific plan |
| `swarm_spawn_subtask` | Prepare subtask for worker |
| `swarm_status` | Monitor swarm progress |
| `swarm_review` | Generate review prompt |
| `swarm_review_feedback` | Send approval/rejection |
| `swarm_progress` | Report subtask progress |
| `swarm_complete` | Mark subtask complete |
| `swarm_complete_subtask` | Handle completion |
| `swarm_adversarial_review` | VDD-style critical review |
| `swarm_record_outcome` | Record task outcome |
| `swarm_select_strategy` | Analyze & recommend strategy |
| `swarm_validate_decomposition` | Validate decomposition |
| `swarm_get_file_insights` | Get file-specific gotchas |
| `swarm_get_pattern_insights` | Get failure patterns |
| `swarm_get_strategy_insights` | Get strategy success rates |

### Worktree Management

| Tool | Purpose |
|------|---------|
| `swarm_worktree_create` | Create git worktree |
| `swarm_worktree_merge` | Cherry-pick to main |
| `swarm_worktree_cleanup` | Remove worktree |
| `swarm_worktree_list` | List active worktrees |

### Swarm Mail

| Tool | Purpose |
|------|---------|
| `swarmmail_init` | Initialize mail session |
| `swarmmail_inbox` | Check messages |
| `swarmmail_send` | Send message |
| `swarmmail_read_message` | Read specific message |
| `swarmmail_ack` | Acknowledge message |
| `swarmmail_reserve` | Reserve file paths |
| `swarmmail_release` | Release reservations |
| `swarmmail_release_agent` | Release agent's reservations |
| `swarmmail_release_all` | Release all reservations |
| `swarmmail_health` | Check mail health |

## Memory Tools (Hivemind)

| Tool | Purpose |
|------|---------|
| `hivemind_store` | Store memory |
| `hivemind_find` | Search memories |
| `hivemind_get` | Get memory by ID |
| `hivemind_remove` | Delete memory |
| `hivemind_validate` | Confirm accuracy |
| `hivemind_stats` | Memory statistics |
| `hivemind_index` | Index AI sessions |
| `hivemind_sync` | Sync to git |

## External Integrations

### Context7 MCP

Live documentation fetching for libraries and frameworks.

```bash
# Resolve library
npx ctx7@latest library <name> "<query>"

# Fetch docs
npx ctx7@latest docs <libraryId> "<query>"
```

**Configuration:**
- URL: `https://mcp.context7.com/mcp`
- Requires: `CONTEXT7_API_KEY` env variable

### Hivemind

Unified memory across AI agents (Claude, Cursor, Gemini, etc.).

**Indexed agents:** Claude Code, Codex, Cursor, Gemini, Aider, ChatGPT, Cline, OpenCode, Amp, Pi-Agent

## Skills System

| Tool | Purpose |
|------|---------|
| `skills_list` | List available skills |
| `skills_use` | Load a skill |
| `skills_create` | Create new skill |
| `skills_update` | Update existing skill |
| `skills_delete` | Delete a skill |
| `skills_read` | Read skill content |
| `skills_init` | Init skills directory |
| `skills_add_script` | Add executable script |
| `skills_execute` | Execute skill script |

## Issue Tracking (Hive)

| Tool | Purpose |
|------|---------|
| `hive_create` | Create bead/issue |
| `hive_create_epic` | Create epic with subtasks |
| `hive_start` | Mark as in-progress |
| `hive_close` | Mark as complete |
| `hive_update` | Update bead status |
| `hive_cells` | List cells |
| `hive_query` | Query beads |
| `hive_ready` | Get next ready bead |
| `hive_session_start` | Start session |
| `hive_session_end` | End session |
| `hive_sync` | Sync to git |

## Other Tools

| Tool | Purpose |
|------|---------|
| `task` | Launch sub-agent for complex tasks |
| `bash` | Execute shell commands |
| `read` | Read files |
| `write` | Write files |
| `edit` | Edit files |
| `glob` | Find files by pattern |
| `grep` | Search file contents |
| `webfetch` | Fetch URL content |
| `websearch` | Web search |
| `todowrite` | Create task list |
| `task_complete` | Signal work complete |
