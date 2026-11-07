# Zara — OpenCode agent config + memory MCP

Config repo for Zara on OpenCode V2. It ships agents, commands, skills, instructions
and a Rust MCP server (`zmem-mcp`) that provides persistent memory and a searchable
engineering knowledge base.

No Node runtime, no OpenCode v1 plugin. Memory is a single SQLite database at
`~/.zara/memory.db` (shared by every session).

## Layout

```
zara-agent-opc/
├── opencode.json                  # project config (agents, commands, mcp, permissions)
├── AGENTS.md                      # auto-loaded project instructions
├── .opencode/
│   ├── agent/                     # 13 agent prompts
│   ├── commands/                  # slash commands
│   ├── instructions/              # system.md, system-extended.md
│   └── skills/                    # core skills (zara-core holds the knowledge tree)
├── additional-skills/             # 12 domain-expert skills
├── scripts/                       # everything Python lives here
│   ├── pyproject.toml             # zara-cli project (uv, hatchling)
│   ├── uv.lock                    # resolver lock, committed
│   ├── .python-version            # interpreter pin (3.12)
│   ├── .venv/                     # created by uv sync, gitignored
│   └── zara_cli/                  # the harness CLI (Python only)
├── harness/                       # Harness2 improvement loop
├── feature_list.json              # feature state, written only by the gate
├── PROGRESS.md                    # session state
├── .harness/arch-rules.json       # 14 machine-checked rules
└── mcp/zarust-memory/             # git submodule: zmem-mcp (Rust)
```

## Apply the global config

The global CLI lives in `C:\Users\Mpie\.config\opencode`. After editing this repo:

```bash
python C:\Users\Mpie\.config\opencode\zara-merge.py
```

That script rewrites the global `opencode.json` (agents, commands, instructions,
skills paths, `Orchestrator` MCP) and keeps the project config V2-safe. Restart
OpenCode afterwards if MCP or agent changes do not show up.

## Harness CLI

Every gate is one command. All logic is Python in `scripts/zara_cli/`; there is
no shell script in the repo, and `ARCH-014` keeps it that way; `ARCH-015` keeps `scripts/uv.lock` honest.

```bash
uv sync --project scripts                      # create scripts/.venv (once)
uv run --project scripts zara-cli init         # clock in: setup, tests, next feature
uv run --project scripts zara-cli test         # L1 deterministic
uv run --project scripts zara-cli check        # L2 consistency (23 checks)
uv run --project scripts zara-cli e2e          # L3, one real model call
uv run --project scripts zara-cli verify H01   # layered feature gate, writes evidence
uv run --project scripts zara-cli clean-check  # clock out
uv run --project scripts zara-cli audit        # course harness audit
```

`make <target>` forwards to the same commands. Never set a feature state by hand:
`zara-cli feature pass` refuses on purpose.

## Memory MCP

Host key stays `Orchestrator`; the server is `zmem-mcp` from
`mcp/zarust-memory` (https://github.com/aldok10/zarust-memory).

```bash
cd mcp/zarust-memory
cargo +stable-x86_64-pc-windows-gnu build --release -p zmem-mcp
```

Nine tools: `memory` (recall/learn/procedure/delete/consolidate/contradictions),
`episode`, `reflect`, `session`, `knowledge`, `ctx`, `dashboard`, `code_index`,
`code_search`.

Knowledge is seeded into the database, not read from disk at query time:

```
Orchestrator_knowledge(action:"index", path:"E:/Apps/personal/zara-agent-opc/.opencode/skills/zara-core")
```

## Agents

Primary: `zara`. Subagents: `atlas` (architecture), `forge` (implementation),
`lens` (review), `probe` (testing), `shield` (security), `pulse` (delivery),
`rhythm` (loops), `hive` (parallel), `scout` (requirements), `refiner` (quality),
`plan`, `compaction`.

## Skills

Loaded from `.opencode/skills` and `additional-skills` (paths registered in the
global config by `zara-merge.py`): backend, frontend, mobile, sre, security,
data-engineer, mlops, pm, business-analyst, engineering-manager, qa-engineer,
technical-writer, plus the core engineering skills.

## Notes

- OpenCode V2 ignores agent `temperature`; values in `opencode.json` are inert.
- `.opencode/skills/zara-core/knowledge` holds the markdown source for the
  knowledge base. Images were removed; markdown links to them are dead.
- History for the removed v1 Node stack (plugin, `tools/`, `tests/`, npm
  packaging, CI) is still in git.
