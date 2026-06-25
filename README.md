# Zara - Empathetic AI Engineering Partner

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![CI](https://github.com/aldok10/zara-agent-opc/actions/workflows/ci.yml/badge.svg)](https://github.com/aldok10/zara-agent-opc/actions/workflows/ci.yml)
[![GitHub stars](https://img.shields.io/github/stars/aldok10/zara-agent-opc?style=social)](https://github.com/aldok10/zara-agent-opc)
[![MCP Compatible](https://img.shields.io/badge/MCP-compatible-blue)](https://modelcontextprotocol.io)
[![Node.js 22+](https://img.shields.io/badge/node-22%2B-green)](https://nodejs.org)

> **The AI agent that remembers, learns, and grows with you.** Not an assistant. A persistent engineering partner with cognitive memory, multi-agent orchestration, and empathetic leadership DNA.

Created by **[Aldo Karendra](https://github.com/aldok10)** | Built on [Model Context Protocol](https://modelcontextprotocol.io) + [OpenCode](https://opencode.ai)

---

## Why Zara?

Most AI coding tools are stateless. Every session starts from zero. Zara is different:

| Problem | Zara's Solution |
|---------|----------------|
| AI forgets everything between sessions | 3-layer cognitive memory (episodic/semantic/procedural) with temporal decay |
| One-size-fits-all responses | Learns your preferences, stack, patterns. Adapts over time. |
| Single-agent bottleneck | 10 coordinated agents with domain expertise and debate capability |
| No methodology enforcement | Skill-gated workflow: brainstorm → plan → TDD → verify → ship |
| Generic assistant tone | Empathetic orchestration with Radical Candor. Pushes back when needed. |
| No learning from mistakes | Outcome-weighted reflection. Same mistake twice triggers systemic fix. |

## Key Features

- **Multi-Agent Orchestration** - 10 agents (Zara + 9 specialists) with servant leadership coordination
- **Cognitive Memory** - 3-layer persistent memory with semantic embeddings (MiniLM-L6-v2, 384-dim)
- **132-Signal Skill Routing** - 27 project skills + 100+ global skills, weight-adaptive from usage
- **Self-Improving** - Outcome-weighted reflection, micro-tool crystallization, blindspot detection
- **Knowledge-Grounded** - 254 indexed articles for architecture, patterns, and design decisions
- **Trust-Calibrated** - Source-gated ceilings, evidence-required success claims, temporal decay
- **MCP Server** - 24+ tools across 9 domains, stdio transport, zero external dependencies
- **Privacy-Aware** - Automatic secrets detection, data masking, bulk-delete protection
- **Multi-Agent Debate** - Agents argue positions before consensus on complex decisions
- **Doom-Loop Detection** - Automatically detects retry patterns and forces strategy pivots

## Quick Start

```bash
git clone https://github.com/aldok10/zara-agent-opc.git
cd zara-agent-opc
npm install
opencode --project .
```

**Requirements:**
- **Node.js 22+** with FTS5 support (required by the MCP memory server)
- Run `node --experimental-sqlite` to verify FTS5 is available
- See [docs/installation.md](docs/installation.md) for detailed setup

## Agents

| Agent | Role | Trigger |
|-------|------|---------|
| `@atlas` | Architecture & system design | `/decide`, tradeoff analysis |
| `@lens` | Code review & quality | `/review`, >50 line changes |
| `@shield` | Security & threat modeling | Auth/crypto concerns |
| `@probe` | Testing strategy | Coverage gaps, test design |
| `@pulse` | Delivery & shipping | Blockers, tech debt |
| `@rhythm` | Loop engineering | Iterative workflows, failure modes |
| `@hive` | Swarm coordination | 3+ parallel tasks |
| `@forge` | Implementation | Plan → code → verify → ship |
| `@sketch` | Planning (read-only) | `/think`, design exploration |

## Development Methodology

Skill-gated workflow enforced automatically:

```
skill-gate → brainstorming → writing-plans → subagent-driven-dev → finishing-branch
                                                    │
                                                   tdd → verification-before-completion
```

**Iron laws:** No code without a failing test. No fixes without root cause. No completion claims without verification. No implementation without design.

## Project Structure

```
zara-agent-opc/
├── opencode.json              # Project config (agents, MCP, plugins)
├── AGENTS.md                  # AI agent instructions + decision table
├── tools/
│   ├── mcp/                   # MCP server (24+ tools, DDD-lite)
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

## Commands (22)

| Command | Function |
|---------|----------|
| `/audit` | System health check |
| `/auto` | Autonomous work mode |
| `/code` | Structured coding workflow |
| `/debate` | Multi-agent debate for complex decisions |
| `/decide` | Architecture decision via @atlas |
| `/distill` | Failure pattern extraction |
| `/focus` | Focus mode with session tracking |
| `/goal` | Goal management |
| `/handoff` | Session capture |
| `/install` | Global install to ~/.config/opencode |
| `/learn` | Extract project-specific knowledge |
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
| `observe` | Tracing, guardrails, cache, repetition detector, skill suggester, proactive nudges |
| `memory` | 3-layer memory, auto-capture, reflection, knowledge search |
| `flow` | Session handoff, goals, loops, bedtime ritual, auto-resume |
| `dev` | Engineering principles, sandbox exec, HITL confidence |
| `social` | Leadership coaching, team knowledge, music player |
| `evolve` | Micro-tools, swarm coordination, workflow rules |
| `empathy` | Emotional tracking, sentiment, burnout detection |
| `relationship` | Open threads, milestones, shared references, identity anchor |
| `voice` | Anti-AI enforcement, drift checks, length inflation detection, compaction recovery, 3-strike escalation |
| `workspace` | Shared agent memory, cross-agent context |
| `debate` | Multi-agent deliberation with position sanitization |

## Skills (27)

| Category | Skills |
|----------|--------|
| Workflow | skill-gate, brainstorming, writing-plans, executing-plans, subagent-driven-dev, dispatching-parallel-agents, finishing-branch |
| Quality | tdd, systematic-debugging, verification-before-completion, code-review |
| Workspace | git-worktrees, git-expert, conventional-commits, zara-ctx, auto-resume, session-handoff, codebase-onboarding |
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
- Trust escalation: source-gated ceilings (inferred≤0.7, observed≤0.85), session budget, evidence-required
- Semantic embeddings: MiniLM-L6-v2 (384-dim) for real conceptual matching
- Skill routes: 132 signals across 32 skills, weight-adaptive from usage

## MCP Server (24+ Tools)

```bash
node tools/mcp/index.mjs  # stdio transport
```

Domains: memory (7), reflection (4), metrics (1), session (5), music (1), knowledge (4), identity (2), project (1), audit (1)

## Continuous Learning

Zara improves from real usage. Statistical, not ML, by design (zero infra for a single-user agent). Cycle: Observe → Orient → Act → Reflect → Consolidate.

- `reflect_suggest` recalls best-scoring past approaches
- `reflect` with outcome trains success-weighted pattern scores
- Repeated sequences crystallize into micro-tools
- Session-end consolidation merges duplicates, flags contradictions

Corrections persist permanently. Same mistake twice triggers a systemic fix.

## Constitution

Safety rules enforced at code level (not just prompt):
- Memory gating: policy/architecture/decision/preference/pitfall require user_explicit source
- Secrets detection: regex blocks storing GitHub/AWS/Slack tokens and JWTs
- Bulk delete protection: >10 entries requires explicit confirmation
- Trust budget: max 5 positive trust adjustments per session
- Reflection evidence: success claims without evidence auto-downgrade to partial

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Zara (Orchestrator)                  │
│         Empathetic Leadership + Servant Coordination     │
├─────────────────────────────────────────────────────────┤
│  @atlas  @lens  @shield  @probe  @pulse  @rhythm  ...   │
│              Specialist Agent Layer                      │
├─────────────────────────────────────────────────────────┤
│  Plugin System (11 modules)                             │
│  observe│memory│flow│dev│social│evolve│empathy│voice│...│
├─────────────────────────────────────────────────────────┤
│  MCP Server (24+ tools, 9 domains)                     │
│  memory│reflection│metrics│session│music│knowledge│...   │
├─────────────────────────────────────────────────────────┤
│  SQLite + FTS5 + Semantic Embeddings (MiniLM-L6-v2)    │
└─────────────────────────────────────────────────────────┘
```

## Documentation

See `docs/` for: [installation](docs/installation.md), [architecture](docs/architecture.md), [configuration](docs/configuration.md), [skills reference](docs/skills.md), [plugins](docs/plugins.md), [tools reference](docs/tools-reference.md), [memory system](docs/memory.md), [workflows](docs/workflows.md), [FAQ](docs/faq.md).

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

- Report bugs via [GitHub Issues](https://github.com/aldok10/zara-agent-opc/issues)
- Suggest features via [Discussions](https://github.com/aldok10/zara-agent-opc/discussions)
- Submit skills, knowledge articles, or agent improvements via PR

## Citation

If you use Zara in your research or project, please cite:

```bibtex
@software{karendra2026zara,
  author = {Karendra, Aldo},
  title = {Zara: Empathetic AI Engineering Partner with Cognitive Memory},
  year = {2026},
  url = {https://github.com/aldok10/zara-agent-opc},
  license = {MIT}
}
```

## Author

**Aldo Karendra** ([@aldok10](https://github.com/aldok10))

Building AI systems that grow with their users. Zara is the result of years of thinking about what AI companionship in engineering should look like: persistent, opinionated, caring, and self-improving.

## License

MIT
