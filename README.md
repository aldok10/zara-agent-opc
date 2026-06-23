# Zara - Personal Engineering Partner

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Zara is a persistent, evolving AI engineering partner built for OpenCode. She enforces a Superpowers-style development methodology: skill-first approach, file-based progress tracking, multi-agent coordination, and continuous execution. Speaks Indonesian, English, or mixed naturally.

## What Zara Does

- Skill-enforced development methodology (brainstorming → planning → execution → verification)
- 27 project skills with auto-activation via `skill-gate`
- Multi-agent coordination: 10 agents (Zara + 9 specialists)
- Multi-agent debate for complex decisions (`/debate`)
- Workspace memory: shared memory across agents
- Context compression with protected tail segments
- File-based progress tracking: design specs, plans, task ledgers
- Persistent memory: 3-layer cognitive (episodic/semantic/procedural) with auto-capture
- Knowledge-grounded: 254 DevIQ articles, 100+ global skills
- Self-improving: outcome-weighted reflection, pattern extraction, crystallized micro-tools, blindspot detection
- Privacy-aware: MCP gateway with automatic data masking

## Quick Start

```bash
git clone <repo>
cd zara-agent-opc
npm install
opencode --project .
```

**Requirements:**
- **Node.js 22.14+** with FTS5 support (required by the MCP memory server)
- Run `node --experimental-sqlite` to verify FTS5 is available
- See [docs/installation.md](docs/installation.md) for Windows setup details

Sub-agents: `@atlas` (architect), `@lens` (code-reviewer), `@probe` (testing-lead), `@shield` (security-reviewer), `@pulse` (delivery-lead), `@rhythm` (loop-engineer), `@hive` (swarm), `@sketch` (plan)

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
│   ├── mcp/                   # MCP server (22 tools, DDD-lite)
│   │   ├── index.mjs         # Entry point
│   │   ├── server.mjs        # McpServer class
│   │   ├── infra.mjs         # Platform utilities
│   │   └── domain/           # memory, reflection, metrics, session, music, knowledge, audit
│   ├── chm2md.mjs            # CHM → AI skill converter
│   ├── memory-db.mjs         # SQLite memory (FTS5, decay, types, scoped recall)
│   └── dashboard.mjs         # CLI dashboard viewer
├── .opencode/
│   ├── agent/                 # 10 agent definitions (zara + 9 specialists)
│   ├── instructions/          # system.md + philosophy.md
│   ├── plugin/                # zara.mjs + 11 domain modules + infra
│   └── skills/                # 27 project skills
├── docs/
│   ├── specs/                 # Design documents (brainstorming output)
│   ├── plans/                 # Implementation plans (writing-plans output)
│   └── *.md                   # Architecture, workflows, reference docs
├── .tasks/                    # SDD progress tracking (ledger, briefs, reports)
├── knowledge/                 # 254 DevIQ articles
└── prompts/                   # Engineering philosophy
```

## Commands (20)

| Command | Function |
|---------|----------|
| `/audit` | System health check |
| `/auto` | Autonomous work mode |
| `/code` | Structured coding workflow |
| `/debate` | Multi-agent debate for complex decisions |
| `/decide` | Architecture decision via @atlas |
| `/focus` | Focus mode with session tracking |
| `/goal` | Goal management |
| `/handoff` | Session capture |
| `/install` | Global install to ~/.config/opencode |
| `/loop` | Multi-mode cycles (timer, verify, design) |
| `/music` | Music player |
| `/resume` | Full context restoration |
| `/review` | Code review via @lens |
| `/shutdown` | Wind-down ritual |
| `/standup` | Activity snapshot |
| `/swarm` | Parallel decomposition via @hive |
| `/think` | Structured planning |
| `/update` | Self-update from remote |
| `/version` | Version info |
| `/zara` | General engineering |

## Plugin Modules (11)

Single entry point (`.opencode/plugin/zara.mjs`) loads domain modules:

| Module | What it does |
|--------|-------------|
| `observe` | Tracing, evaluation, guardrails, semantic cache |
| `memory` | 3-layer memory, auto-capture, reflection, knowledge search |
| `flow` | Session handoff, goals, loops, bedtime ritual, auto-resume |
| `dev` | Engineering principles, sandbox exec, HITL confidence |
| `social` | Leadership coaching, team knowledge, music player |
| `evolve` | Micro-tools, swarm coordination, workflow rules |
| `empathy` | Emotional tracking, sentiment, burnout detection |
| `relationship` | Open threads, milestones, shared references, identity anchor |
| `voice` | Anti-AI writing enforcement, drift checks |
| `workspace` | Shared agent memory, cross-agent context |
| `debate` | Multi-agent deliberation with position sanitization |

## Skills (27)

| Category | Skills |
|----------|--------|
| Workflow | skill-gate, brainstorming, writing-plans, executing-plans, subagent-driven-dev, dispatching-parallel-agents, finishing-branch |
| Quality | tdd, systematic-debugging, verification-before-completion, code-review |
| Workspace | git-worktrees, git-expert, conventional-commits, context-mode, auto-resume, session-handoff, codebase-onboarding |
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

## MCP Server (22 Tools)

```bash
node tools/mcp/index.mjs  # stdio transport
```

Domains: memory (7), reflection (3), metrics (1), session (5), music (1), knowledge (4), audit (1)

## Continuous Learning

Zara improves from real usage. Statistical, not ML, by design (zero infra for a single-user agent).

```
Observe → Orient → Act → Reflect → Consolidate
```

- `reflect_suggest` recalls best-scoring past approaches
- `reflect` with outcome trains success-weighted pattern scores
- Repeated sequences crystallize into micro-tools
- Session-end consolidation merges duplicates, flags contradictions
- `zara_evolve_status` shows whether success rates are rising

Corrections persist permanently. Same mistake twice triggers a systemic fix.

## Documentation

See `docs/` for: installation, architecture, configuration, skills reference, plugins, tools reference, memory system, workflows, prompts, FAQ.

## License

MIT
