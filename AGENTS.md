# Zara Agent - Project Instructions

Source of truth: `opencode.json`. Discover structure via filesystem.

## Commands

```bash
# No build step - this is a config/prompt project
# MCP server: node tools/mcp/index.mjs
# Validate JSON: cat opencode.json | jq .
```

## Code Standards

- Shell: Bash 4+ with `set -euo pipefail`
- JavaScript: ESM (`export const`), no CommonJS
- Go: load `golang-expert` skill (Uber style + 100 Go Mistakes)
- PHP: load `php-expert` skill (PSR + strict_types)
- Prompts/instructions: markdown, under 500 lines per file

## Available Commands (21)

| Command | Function | Agent Dispatch |
|---------|----------|---------------|
| `/audit` | System health - self-audit, memory, config cross-ref | - |
| `/auto` | Autonomous work mode - pre-flight, loop, anti-doom-loop | auto (via task) |
| `/code` | Structured coding workflow - explore → plan → code → verify → ship | Zara orchestrates, dispatches @forge mid-workflow |
| `/decide` | Architecture decision - grounded in knowledge + tradeoffs | → @atlas |
| `/distill` | Failure pattern extraction - reflects → policies/pitfalls | - |
| `/debate` | Multi-agent debate for complex decisions requiring diverse perspectives | deliberate tool |
| `/focus` | Focus mode - session tracking, skills, check-in loops | `/focus loop` → @rhythm |
| `/goal` | Goal management - persist, reflect, memory recovery | - |
| `/handoff` | Session capture - git state, memory, files, threads | - |
| `/install` | Global install to ~/.config/opencode | - |
| `/loop` | Multi-mode cycles - timer, patterns, verify, design, study | `/loop design` → @rhythm |
| `/music` | Music player - play, stop, radio, taste | - |
| `/resume` | Full context restoration - memory, git, metrics | - |
| `/review` | Code review - staged/last commit, auto @shield for security | → @lens |
| `/shutdown` | Wind-down - auto-handoff, music, bedtime | - |
| `/standup` | Activity snapshot - git + metrics + patterns | `/standup deep` → @pulse |
| `/swarm` | Parallel decomposition - independent workstreams | → @hive |
| `/think` | Structured planning - brainstorming + writing-plans | - |
| `/zara` | General engineering - orchestration, swarm, session mgmt | `/zara swarm` → @hive |
| `/version` | Version info + update check against remote | - |
| `/update` | Self-update from remote (pull + re-install) | - |

## Skill Gate (Non-Negotiable)

Before ANY task, check for relevant skills. If one applies, LOAD IT. No exceptions.
Load `skill-gate` if unsure which skill matches - it has the full routing table.

## Agent Dispatch Map

| Agent | Key | Trigger | How |
|-------|-----|---------|-----|
| Atlas | architect | Architecture decision, tradeoff analysis | `task(architect)` or `/decide` |
| Lens | code-reviewer | Code review, >50 lines change | `task(code-reviewer)` or `/review` |
| Shield | security-reviewer | Auth/crypto/security concern | `task(security-reviewer)` (auto in `/review`) |
| Probe | testing-lead | Test strategy, coverage gaps | `task(testing-lead)` (auto in `/auto`) |
| Pulse | delivery-lead | Shipping blockers, debt | `task(delivery-lead)` via `/standup deep` |
| Hive | swarm | 3+ independent parallel tasks | `task(swarm)` or `/swarm` |
| Rhythm | loop-engineer | Loop design, verification, failure | `task(loop-engineer)` via `/loop` or `/focus` |
| Sketch | plan | Read-only planning | `/think` command or switch mode |
| Forge | implementation | Plan → code → verify → ship | `task(implementation)` |

## Development Workflow

The standard chain produces file artifacts at each step:

```
brainstorming        → docs/specs/YYYY-MM-DD-<topic>-design.md
writing-plans        → docs/plans/YYYY-MM-DD-<feature>.md
subagent-driven-dev  → .tasks/progress.md, .tasks/task-{id}.md, .tasks/report-{id}.md
finishing-branch     → merge/PR/keep/discard decision
```

After context compaction: re-read `.tasks/progress.md` + `git log` to determine state.

## Per-Agent Context Requirements

| Agent | Minimum context | Do NOT send |
|-------|----------------|-------------|
| @atlas | Problem boundary, constraints, tradeoff framing | Implementation details, file contents, test output |
| @forge | Spec + acceptance criteria, file paths, patterns to match | Architecture alternatives, market research |
| @lens | Diff/snippet, review focus (security? perf? style?) | Full conversation, business requirements |
| @shield | Code/design to assess, threat model, deploy environment | Code quality, feature requests, test coverage |
| @probe | Feature description, risk areas, existing test patterns | Production data, security specifics |
| @pulse | Current state, blockers, timeline, capacity | Code details, architecture alternatives |
| @rhythm | Task type, failure mode, loop pattern to consider | Full codebase, business requirements |
| @hive | Task description, sub-tasks, file boundaries per worker | Full project history, every agent's prompt |
| @sketch | Problem statement, constraints, available options | Raw code, test output, session history |
