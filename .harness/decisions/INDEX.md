# Decisions

Architecture decisions live in `.harness/decisions/` as numbered ADR files. This
file is the index; it is not a second registry. One decision per file, newest
number last, index updated in the same commit as the ADR.

| Id | Decision | Status | File |
|---|---|---|---|
| 0001 | Adopt harness engineering as the repo contract | accepted | [.harness/decisions/0001](.harness/decisions/0001-adopt-harness-engineering.md) |
| 0002 | Pin the MCP server by git submodule, not a package lock | accepted | [.harness/decisions/0002](.harness/decisions/0002-pin-mcp-by-submodule.md) |
| 0003 | Keep the V1 config shape for agent, command, mcp, permission | accepted | [.harness/decisions/0003](.harness/decisions/0003-keep-v1-config-shape.md) |
| 0004 | Do not register an OpenCode plugin | accepted | [.harness/decisions/0004](.harness/decisions/0004-no-opencode-plugin.md) |

## Rules

- An ADR states context, decision, consequences, and the condition that would
  reverse it. No ADR without a reversal condition.
- Superseding an ADR means a new number with `Supersedes: <id>`; the old file is
  never rewritten.
- A decision that changes a gate also changes `.harness/arch-rules.json` or
  `feature_list.json` in the same commit.
