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

## Skill Routing (Auto + Manual)

Skills are auto-suggested by the dev plugin (keyword match on user message, injected at system level).
If auto-routing doesn't match, load `skill-gate` manually for the full routing table.
For new/unknown topics: the plugin will suggest creating a skill via web research.

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
| Forge | implementation | Plan -> code -> verify -> ship | `task(implementation)` |

## Development Workflow

```
brainstorming        -> docs/specs/YYYY-MM-DD-<topic>-design.md
writing-plans        -> docs/plans/YYYY-MM-DD-<feature>.md
subagent-driven-dev  -> .tasks/progress.md, .tasks/task-{id}.md, .tasks/report-{id}.md
finishing-branch     -> merge/PR/keep/discard decision
```

After context compaction: re-read `.tasks/progress.md` + `git log` to determine state.

## Why Multi-Agent Works (Context Isolation)

Sub-agents work because they get a CLEAN context window, not because they embody a different role. Dispatch for context isolation as much as for expertise. Quality test: if swapping in a stronger model doesn't improve output, the harness is the bottleneck.

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

## Agent Output Contracts

Each agent must include these fields. If missing, Zara re-prompts before presenting to user.

| Agent | Required Output Fields | Completeness Signal |
|-------|----------------------|---------------------|
| @atlas | tradeoffs[], recommendation, confidence(0-1), open_questions[] | "Analysis complete" or "Needs more context: ..." |
| @forge | files_changed[], tests_run(bool), verification_evidence, diff_summary | "Implementation complete" or "Blocked: ..." |
| @lens | findings[] with {severity, location, description}, root_cause | "Review complete" or "Need more context for: ..." |
| @shield | vulnerabilities[] with {severity, impact, fix}, threat_summary | "Assessment complete" or "Scope unclear: ..." |
| @probe | strategy, risk_areas[], coverage_gaps[], skip_justification | "Strategy ready" or "Need clarification: ..." |
| @pulse | ship_blockers[], quick_wins[], debt_items[], timeline | "Plan ready" or "Missing info: ..." |
| @rhythm | loop_pattern, verification_gates[], stop_conditions[] | "Design ready" or "Ambiguous failure mode: ..." |
| @hive | workers[] with {scope, acceptance_criteria}, synthesis | "Coordination complete" or "Overlap detected: ..." |
