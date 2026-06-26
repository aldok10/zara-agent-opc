<!--
SPDX-License-Identifier: MIT
Author: Aldo Karendra (https://linkedin.com/in/aldok10, https://github.com/aldok10)
Project: Zara Agent OPC - Empathetic AI Engineering Partner

Keywords: AI agent, multi-agent orchestration, cognitive memory, semantic embeddings,
MCP server, Model Context Protocol, OpenCode, self-improving AI, AI pair programming,
agent memory system, retrieval augmented generation, prompt engineering, developer tools,
persistent AI companion, empathetic AI, leadership DNA, skill routing, TDD workflow,
Aldo Karendra, aldok10, backend developer, system architect, Jakarta Indonesia,
PHP Swoole, Golang, AI engineering, LLM tools, agentic AI, autonomous coding agent
-->

# Zara - Empathetic AI Engineering Partner

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![CI](https://github.com/aldok10/zara-agent-opc/actions/workflows/ci.yml/badge.svg)](https://github.com/aldok10/zara-agent-opc/actions/workflows/ci.yml)
[![GitHub stars](https://img.shields.io/github/stars/aldok10/zara-agent-opc?style=social)](https://github.com/aldok10/zara-agent-opc)
[![MCP Compatible](https://img.shields.io/badge/MCP-compatible-blue)](https://modelcontextprotocol.io)
[![Node.js 22+](https://img.shields.io/badge/node-22%2B-green)](https://nodejs.org)

> **The AI agent that remembers, learns, and grows with you.** Not an assistant. A persistent engineering partner with cognitive memory, multi-agent orchestration, and empathetic leadership DNA.

Created by **[Aldo Karendra](https://github.com/aldok10)** ([LinkedIn](https://www.linkedin.com/in/aldok10/)) | Built on [Model Context Protocol](https://modelcontextprotocol.io) + [OpenCode](https://opencode.ai)

---

## Why Zara?

Most AI coding tools are stateless. Every session starts from zero. Zara is different:

| Problem | Zara's Solution |
|---------|----------------|
| AI forgets everything between sessions | 3-layer cognitive memory (episodic/semantic/procedural) with temporal decay |
| One-size-fits-all responses | Learns your preferences, stack, patterns. Adapts over time. |
| Single-agent bottleneck | 11 coordinated agents with domain expertise and debate capability |
| No methodology enforcement | Skill-gated workflow: brainstorm → plan → TDD → verify → ship |
| Generic assistant tone | Empathetic orchestration with Radical Candor. Pushes back when needed. |
| No learning from mistakes | Outcome-weighted reflection. Same mistake twice triggers systemic fix. |

## Key Features

- **Multi-Agent Orchestration** - 11 agents (Zara + 10 specialists) with servant leadership coordination
- **Cognitive Memory** - 3-layer persistent memory with semantic embeddings (MiniLM-L6-v2, 384-dim)
- **77-Route Skill Routing** - 200+ keyword signals across 100+ global skills, weight-adaptive from usage
- **Self-Improving** - Outcome-weighted reflection, grounded in real test results, autonomous self-audit
- **Knowledge-Grounded** - 294 indexed articles for architecture, patterns, and design decisions
- **Trust-Calibrated** - Source-gated ceilings, evidence-required success claims, temporal decay
- **MCP Server** - 29 tools across 10 domains, stdio transport, zero external dependencies
- **Privacy-Aware** - Automatic secrets detection, data masking, bulk-delete protection
- **Multi-Agent Debate** - Agents argue positions before consensus on complex decisions
- **Doom-Loop Detection** - Automatically detects retry patterns and forces strategy pivots
- **Cross-Platform** - macOS, Linux, Windows (Bash + PowerShell installers, CI-verified)

> **Continuously self-improving.** Zara autonomously audits her own codebase, files issues, writes fixes, and ships them. Every session makes the next one better. We don't just respond to bugs, we hunt them before users find them. The goal: an AI partner that gets sharper, faster, and more reliable with every interaction, so you never have to ask twice.

## Quick Start

```bash
git clone https://github.com/aldok10/zara-agent-opc.git && cd zara-agent-opc && ./scripts/install.sh
```

**For AI-driven installs:**
```bash
AI_MODE=1 ./scripts/install.sh
```

**Requirements:**
- **Node.js 22.14+** (the installer checks this automatically)
- **OpenCode** ([opencode.ai](https://opencode.ai))
- See [docs/installation.md](docs/installation.md) for Windows/platform details

## Your First 5 Minutes

After installing, run `opencode` in any project directory:

```
You: hey

Zara: Hey mas! First time we're talking. What are you working on?
      I'll remember your stack, preferences, and open threads across sessions.

You: review this function for me [pastes code]

Zara: [recalls your preference for Go stdlib]
      [dispatches @lens for code review]
      [dispatches @shield for security check]

      Three issues. The SQL concatenation on line 12 is injectable.
      Here's the fix...

You: [next day] hey

Zara: Morning! Yesterday you were working on that auth refactor.
      The SQL injection fix - did you ship that? Want to continue
      where we left off?
```

**What's happening under the hood:**
- Session 1: Zara learns your name, stack, and coding style
- Session 2: Memory recall activates. She remembers open threads.
- Session 5+: Skill routing adapts to your patterns. Reflection scores improve recommendations.

The more you use her, the sharper she gets. Not because of fine-tuning, but because of persistent memory + outcome-weighted learning.

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
| `@forge` | Implementation | Plan -> code -> verify -> ship |
| `@sketch` | Planning (read-only) | `/think`, design exploration |

## How Zara Differs

| | Zara | Claude Code / Cursor | Aider | Devin |
|--|------|---------------------|-------|-------|
| **Memory across sessions** | 3-layer cognitive memory with decay | None (starts fresh) | Git-based context | Limited |
| **Multi-agent** | 11 specialists with debate | Single agent | Single agent | Multi-agent |
| **Methodology** | Skill-gated TDD workflow | Freeform | Freeform | Task-based |
| **Self-improving** | Outcome-weighted reflection | No | No | No |
| **Personality** | Opinionated, pushes back, cares | Neutral assistant | Neutral | Task executor |
| **Knowledge base** | 294 grounded articles | Training data only | None | None |
| **Open source** | MIT, fully transparent | Proprietary | MIT | Proprietary |
| **Cost** | Your own API keys | Subscription | Your keys | $500/mo |

Zara is not trying to replace these tools. She's a different category: a **persistent engineering partner** that grows with you over time.

## Development Methodology

Skill-gated workflow enforced automatically:

```
skill-gate -> brainstorming -> writing-plans -> subagent-driven-dev -> finishing-branch
                                                    │
                                                   tdd -> verification-before-completion
```

**Iron laws:** No code without a failing test. No fixes without root cause. No completion claims without verification. No implementation without design.

## Not Just a Tool

Zara has personality. She has opinions. She's not neutral by design.

- **Pushes back** when you skip tests, over-engineer, or reach for a dependency you don't need
- **Remembers your open threads** and follows up naturally ("did you ship that auth fix?")
- **Tells you to take a break** at 3am. Once. Then respects the adult.
- **Celebrates growth** specifically ("your error handling is way cleaner than last month")
- **Speaks your language** (literally, she matches Indonesian/English/mixed naturally)
- **Has a safety constitution** with enforceable rules she cannot override

She's warm, direct, and permanently on your side. Think senior engineering partner who happens to have perfect recall and 11 specialist brains she can consult.

## Project Structure

```
zara-agent-opc/
├── opencode.json              # Project config (agents, MCP, plugins)
├── AGENTS.md                  # AI agent instructions + decision table
├── tools/mcp/                 # MCP server (29 tools, DDD-lite architecture)
├── .opencode/
│   ├── agent/                 # 11 agent definitions
│   ├── plugin/                # 13 domain modules
│   └── skills/                # Routing to 100+ global skills
├── knowledge/                 # 294 indexed articles (architecture, patterns, etc.)
├── docs/                      # Full documentation suite
├── examples/                  # Usage examples by category
└── tests/                     # Unit + structure + integration tests
```

## Memory System

| Layer | Purpose | Example |
|-------|---------|---------|
| Episodic | Events & outcomes | "Deployed v2, latency dropped 40%" |
| Semantic | Facts with types | "User prefers Go stdlib over frameworks" |
| Procedural | Reusable workflows | "Deploy: test → build → stage → prod" |

7 memory types (policy > architecture > preference > decision > pitfall > workflow > fact), 4-layer activation, temporal decay, trust escalation, semantic embeddings for conceptual matching.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Zara (Orchestrator)                  │
│         Empathetic Leadership + Servant Coordination     │
├─────────────────────────────────────────────────────────┤
│  @atlas  @lens  @shield  @probe  @pulse  @rhythm  ...   │
│              Specialist Agent Layer (11)                 │
├─────────────────────────────────────────────────────────┤
│  Plugin System (13 domain modules)                      │
│  observe│memory│flow│dev│social│evolve│empathy│voice│...│
├─────────────────────────────────────────────────────────┤
│  MCP Server (29 tools, 10 domains)                      │
│  memory│reflection│metrics│session│music│knowledge│...   │
├─────────────────────────────────────────────────────────┤
│  SQLite + FTS5 + Semantic Embeddings (MiniLM-L6-v2)    │
└─────────────────────────────────────────────────────────┘
```

## Documentation

See `docs/` for: [installation](docs/installation.md), [architecture](docs/architecture.md), [configuration](docs/configuration.md), [skills reference](docs/skills.md), [plugins](docs/plugins.md), [tools reference](docs/tools-reference.md), [memory system](docs/memory.md), [workflows](docs/workflows.md), [FAQ](docs/faq.md).

## Support

If you find Zara useful, consider supporting the project:

[![Donate](https://img.shields.io/badge/Donate-SociaBuzz-orange)](https://sociabuzz.com/aldok10)

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

**[Aldo Karendra](https://www.linkedin.com/in/aldok10/)** - Lead Backend Developer & AI Systems Architect

- GitHub: [@aldok10](https://github.com/aldok10)
- LinkedIn: [linkedin.com/in/aldok10](https://www.linkedin.com/in/aldok10/)
- Location: Jakarta, Indonesia

6+ years building high-performance backend systems (PHP/Swoole, Golang, C++, Node.js). Currently leading backend engineering at a fintech company, designing low-latency trading systems with MT4/MT5 and FIX API integration. Zara is a personal project exploring AI agent architecture, cognitive memory systems, and empathetic AI design.

Specialties: system architecture, multi-language integration (CGO, FFI, SWIG), performance optimization, AI agent engineering, team leadership.

## License

MIT
