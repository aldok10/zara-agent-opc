# Architecture

## What this repo is

An OpenCode V2 configuration repo. Not an application.

It ships:

- agent prompts, command templates, skills, shared instructions
- harness gates (scripts, Makefile, arch rules)
- one Rust MCP server, `mcp/zarust-memory`, carried as a git submodule

The model is frozen. Only the harness changes. There is no build step for the
repo itself and no package manifest at the root: `opencode.json` is the runtime
contract.

## Components

| Path | Holds | Verified count / state |
|---|---|---|
| `.opencode/agent/` | agent prompts with YAML frontmatter | 13 files, 13 keys configured in `opencode.json`. `sketch.md` is the prompt for the `plan` key and is also discovered as `sketch`. `opencode debug agents` lists 21 agents in total, including built-ins and the global `harness2`, `harness2-judge`. |
| `.opencode/commands/` | slash-command templates | 20 files. 7 registered in `opencode.json`: `code`, `review`, `swarm`, `think`, `handoff`, `resume`, `harness`. The global merge registers the rest. |
| `.opencode/skills/` | skill trees | 15 directories plus `README.md`. Registered as a skill path by `zara-merge.py`. |
| `additional-skills/` | skill trees | 12 directories. Registered as a skill path by `zara-merge.py`. |
| `.opencode/instructions/` | `system.md`, `system-extended.md` | Both listed in `opencode.json` → `instructions`. Inherited by every agent. |
| `scripts/` | harness gates | One Python CLI in `scripts/zara_cli/` (cli, context, process, result, console, features, `checks/`, `commands/`) behind `zara-cli.py` and the Windows launcher `zara-cli.cmd`. No shell script carries logic: `ARCH-014` fails the gate if a `.sh` appears outside the skill assets. |
| `.harness/` | `arch-rules.json` (15 rules, ARCH-001..ARCH-015), `traces/` | Trace jsonl is gitignored; only `.gitkeep` is tracked. |
| `harness/` | improvement loop (Propose-Probe-Compose) | Present: `run_improvement.py` (dry-run default), `tasks/`, `candidates/`, `ledger.jsonl`, `improvement.md`, `ARCHITECTURE.md`. |
| `mcp/zarust-memory/` | Rust workspace, git submodule | Pinned at `e640886c7ba749aaee92eb526066f0f8526eb818`. Crates: `zmem-api`, `zmem-code`, `zmem-core`, `zmem-mcp`, `zmem-memory`. Binary: `target/release/zmem-mcp.exe`. |
| `opencode.json` | runtime config: agents, commands, MCP, permissions, instructions | Single source of truth for repo-owned names. |
| `C:\Users\Mpie\.config\opencode\zara-merge.py` | global config generator, outside the repo | Rewrites the global `opencode.json`: absolute `{file:}` paths, instructions, agents, all commands, `Orchestrator` MCP, skill paths, default agent, model. |

## Data flow

```
OpenCode start
  -> repo opencode.json            (agents, commands, mcp, permission, instructions)
  -> global merge                  (zara-merge.py rewrites paths into ~/.config/opencode/opencode.json)
  -> agent prompt                  (.opencode/agent/<name>.md)
  -> instruction inheritance       (.opencode/instructions/system.md + system-extended.md)
  -> MCP Orchestrator              (mcp/zarust-memory/target/release/zmem-mcp.exe)
  -> ~/.zara/memory.db             (4.0 MB on this host)
```

Notes:

- `AGENTS.md` is auto-loaded by OpenCode as project instructions and is the
  router for `docs/`.
- The merge runs after `git pull`; the repo config stays portable and the
  global file owns machine paths.
- MCP host key is `Orchestrator` for compatibility. The server behind it is
  `zmem-mcp`, not the legacy Node server.

## Boundaries and dependency direction

Direction is one-way: **agent -> skill/instruction -> script -> MCP**. Never the
reverse.

| Layer | May contain | Must not contain | Enforced by |
|---|---|---|---|
| `.opencode/agent/` | prompts | scripts, secrets | review; ARCH-001/002 scan prompt text |
| `.opencode/commands/` | templates | agents that do not exist | `uv run --project scripts zara-cli config validate` |
| `.opencode/skills/`, `additional-skills/` | knowledge and procedures | runtime code | review |
| `.opencode/instructions/` | shared rules | per-agent overrides | review |
| `scripts/` | deterministic gates | model calls, except `zara-cli e2e` | review; `zara-cli check` |
| `.harness/` | rules with WHAT/WHY/FIX | ad-hoc checks | `uv run --project scripts zara-cli arch` |
| `mcp/zarust-memory/` | submodule source | unrecorded local patches | ARCH-010 pin check |

Consequences:

- Config is the single source of truth for agent, command, and MCP names. The
  global merge derives from it; do not hand-edit repo-owned names in the global
  file.
- A skill cannot call a script. A script cannot rewrite a prompt. Gates observe;
  they do not generate.
- Adding an agent means adding a prompt file and a config key. Adding a command
  means adding a template and, if it should exist outside this repo, relying on
  the merge to register it.
