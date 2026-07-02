# Zara Agent - Project Instructions

Source of truth: `opencode.json`. Discover structure via filesystem.

## Commands

```bash
# No build step - config/prompt project
# MCP server: node tools/mcp/index.mjs
# Validate JSON: cat opencode.json | jq .
```

## Code Standards

- Shell: Bash 4+ with `set -euo pipefail`
- JavaScript: ESM (`export const`), no CommonJS
- Go: load `golang-expert` skill
- PHP: load `php-expert` skill
- Prompts/instructions: markdown, under 500 lines per file

## Agent Dispatch

| Agent | Key | Trigger |
|-------|-----|---------|
| Atlas | architect | Architecture, tradeoffs |
| Lens | code-reviewer | Code review, >50 lines |
| Shield | security-reviewer | Auth/crypto/security |
| Probe | testing-lead | Test strategy, coverage |
| Pulse | delivery-lead | Shipping blockers, debt |
| Hive | swarm | 3+ parallel tasks |
| Rhythm | loop-engineer | Loop design, verification |
| Forge | implementation | Plan > code > verify > ship |

## Workflow

```
brainstorming        -> docs/specs/YYYY-MM-DD-<topic>-design.md   (Discuss: decisions before planning)
writing-plans        -> docs/plans/YYYY-MM-DD-<feature>.md         (Plan: bounded, dependency-ordered)
subagent-driven-dev  -> .tasks/progress.md, .tasks/task-{id}.md    (Execute: fresh ctx per task)
verification         -> tests+lint pass before "done"              (Verify: built == planned)
```

Phase scope = one testable sentence. When in doubt, split. Trivial fix: skip the loop.

After context compaction: re-read `.tasks/progress.md` + `git log`.

## Multi-Agent

Sub-agents work via CLEAN context window (isolation), not persona. Dispatch for isolation as much as expertise.
