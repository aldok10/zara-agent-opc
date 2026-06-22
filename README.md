# Zara - Personal Engineering Partner

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Zara is a persistent, evolving AI engineering partner built for OpenCode. She enforces a Superpowers-style development methodology: skill-first approach, file-based progress tracking, multi-agent coordination, and continuous execution. Speaks Indonesian, English, or mixed naturally.

## What Zara Does

- Skill-enforced development methodology (brainstorming → planning → execution → verification)
- 27 project skills with auto-activation via `skill-gate`
- Multi-agent coordination: 9 specialist sub-agents (Atlas, Lens, Shield, Probe, Pulse, Rhythm, Hive, Sketch, Forge)
- File-based progress tracking: design specs, plans, task ledgers
- Persistent memory: 3-layer cognitive (episodic/semantic/procedural) with auto-capture
- Knowledge-grounded: 254 DevIQ articles, 100+ global skills
- Self-improving: outcome-weighted reflection, pattern extraction, crystallized micro-tools, blindspot detection, growth tracking via `zara_evolve_status`
- Self-aware: discovers the user's name from env/profile/memory/git/OS, audits its own config integrity via `zara_self_audit`
- Privacy-aware: MCP gateway with automatic data masking

## Quick Start

```bash
git clone <repo>
cd zara-agent-opc
opencode --project .
```

Sub-agents: `@atlas` (architect), `@lens` (code-reviewer), `@probe` (testing-lead), `@shield` (security-reviewer), `@pulse` (delivery-lead), `@rhythm` (loop-engineer), `@hive` (swarm), `@sketch` (plan), `@forge` (implementation)

## Development Methodology

Inspired by [Superpowers](https://github.com/obra/superpowers). Skills trigger automatically based on context:

```
skill-gate → brainstorming → writing-plans → subagent-driven-dev/executing-plans → finishing-branch
                                                    |
                                                   tdd → verification-before-completion
```

All work produces file artifacts:

| Artifact | Location |
|----------|----------|
| Design specs | `docs/specs/YYYY-MM-DD-<topic>-design.md` |
| Implementation plans | `docs/plans/YYYY-MM-DD-<feature>.md` |
| Progress ledger | `.tasks/progress.md` |
| Task briefs | `.tasks/task-{id}.md` |
| Task reports | `.tasks/report-{id}.md` |

Iron laws:
- No code without a failing test first
- No fixes without root cause investigation
- No completion claims without fresh verification
- No implementation without design approval

## Project Structure

```
zara-agent-opc/
├── opencode.json              # Project config (agents, MCP, plugins)
├── AGENTS.md                  # AI agent instructions + decision table
├── tools/
│   ├── mcp/                   # MCP server (31 tools, DDD-lite)
│   │   ├── index.mjs         # Entry point
│   │   ├── server.mjs        # McpServer class
│   │   ├── infra.mjs         # Platform utilities
│   │   └── domain/           # memory, reflection, metrics, session, music, knowledge, audit, identity
│   ├── chm2md.mjs            # CHM → AI skill converter
│   ├── memory-db.mjs         # SQLite memory (FTS5, decay, types, scoped recall)
│   └── dashboard.mjs         # CLI dashboard viewer
├── .opencode/
│   ├── agent/                 # 10 agent definitions (zara + 9 specialists)
│   ├── instructions/          # system.md + philosophy.md (operational + engineering priorities)
│   ├── plugin/                # zara.mjs + 10 domain modules (hooks into OpenCode lifecycle)
│   └── skills/                # 27 project skills
├── docs/
│   ├── specs/                 # Design documents (brainstorming output)
│   ├── plans/                 # Implementation plans (writing-plans output)
│   └── *.md                   # Architecture, workflows, reference docs
├── .tasks/                    # SDD progress tracking (ledger, briefs, reports)
├── knowledge/                 # 254 DevIQ articles
└── prompts/                   # Engineering philosophy
```

## Skills (27)

| Category | Skills |
|----------|--------|
| Workflow | skill-gate, brainstorming, writing-plans, executing-plans, subagent-driven-dev, dispatching-parallel-agents, finishing-branch |
| Quality | tdd, systematic-debugging, verification-before-completion, code-review |
| Workspace | git-worktrees, git-expert, conventional-commits, context-mode, auto-resume, session-handoff |
| Language | golang-expert, golang-compare, php-expert, swig-expert |
| Voice | natural-voice |
| Leadership | leadership-expert |
| Security | zara-privacy-mcp, zara-hitl |
| Infrastructure | swarm, zara-ctx |

## Memory System

- 3 layers: episodic (events), semantic (facts with types), procedural (workflows)
- 7 memory types: policy, architecture, preference, decision, pitfall, workflow, fact
- 4-layer activation: baseline → contextual → procedures → token budget
- Auto-capture: silently persists preferences and constraints
- Decay: unused memories fade over 90 days, frequently accessed ones persist

## MCP Server (31 Tools)

```bash
node tools/mcp/index.mjs  # stdio transport
```

Domains: memory (7), reflection (6), metrics (4), session (5), music (1), knowledge (6), audit (1), identity (1)

## Continuous Learning

Zara improves from real usage - statistical, not ML, by design (zero infra for a single-user agent). One loop:

```
Observe → Orient → Act → Reflect → Consolidate
```

- **Observe/Orient** - `reflect_suggest` recalls the best-scoring past approach; `evolve_check_rules` + `blindspot_check` avoid known traps.
- **Reflect** - `reflect` with an outcome (success/partial/failure) trains success-weighted pattern scores; repeated sequences crystallize into micro-tools.
- **Consolidate** - session end auto-merges duplicate memories and scans for contradictions (same subject, divergent claims) - flagged for review, never auto-resolved.
- **Watch growth** - `zara_evolve_status` shows whether success rates are actually rising.

Corrections are persisted permanently; the same mistake twice triggers a systemic fix, not another patch. See `knowledge/continuous-learning.md`.

## Documentation

See `docs/` for: installation, architecture, configuration, skills reference, plugins, tools reference, memory system, workflows, prompts, FAQ.

## License

MIT
