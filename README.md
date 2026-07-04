<!--
SPDX-License-Identifier: MIT
Author: Aldo Karendra (https://linkedin.com/in/aldok10, https://github.com/aldok10)
Project: Zara Agent OPC - Empathetic AI Engineering Partner

Keywords: AI agent, multi-agent orchestration, cognitive memory, semantic embeddings,
MCP server, Model Context Protocol, OpenCode, self-improving AI, AI pair programming,
agent memory system, retrieval augmented generation, RAG, ChromaDB, vector database,
hybrid retrieval, reciprocal rank fusion, prompt engineering, developer tools,
persistent AI companion, empathetic AI, leadership DNA, skill routing, TDD workflow,
Aldo Karendra, aldok10, backend developer, system architect, Jakarta Indonesia,
PHP Swoole, Golang, C++, FIX API, MT4 MT5, AI engineering, LLM tools, agentic AI,
autonomous coding agent, code review agent, security review agent, testing agent.
-->

# Zara — The AI Engineering Partner That Remembers, Learns, and Grows With You

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![CI](https://github.com/aldok10/zara-agent-opc/actions/workflows/ci.yml/badge.svg)](https://github.com/aldok10/zara-agent-opc/actions/workflows/ci.yml)
[![GitHub stars](https://img.shields.io/github/stars/aldok10/zara-agent-opc?style=social)](https://github.com/aldok10/zara-agent-opc)
[![MCP Compatible](https://img.shields.io/badge/MCP-compatible-blue)](https://modelcontextprotocol.io)
[![Node.js 22+](https://img.shields.io/badge/node-22%2B-green)](https://nodejs.org)
[![ChromaDB](https://img.shields.io/badge/vector-ChromaDB-orange)](https://www.trychroma.com)

> **Not an assistant. A persistent engineering partner.** Zara has cognitive memory across sessions, orchestrates 11 specialist sub-agents (including a dedicated answer quality evaluator), grounds decisions in 300+ curated engineering articles, and gets sharper every time you use her. A single unified MCP tool handles all memory operations — minimizing token overhead while preserving full functionality. Built on the [Model Context Protocol](https://modelcontextprotocol.io) for [OpenCode](https://opencode.ai).

Created and maintained by **[Aldo Karendra](https://github.com/aldok10)** — Lead Backend Engineer & AI Systems Architect ([LinkedIn](https://www.linkedin.com/in/aldok10/) · [GitHub](https://github.com/aldok10))

---

## The Problem With Every Other AI Coding Tool

They forget. Every session starts from zero. You re-explain your stack, your preferences, your architecture, every single time. They give generic answers, never push back, and never learn from the mistake they made yesterday.

Zara is a different category of tool.

| Most AI Tools | Zara |
|---------------|------|
| Forget everything between sessions | 3-layer cognitive memory with hybrid retrieval and temporal decay |
| One-size-fits-all answers | Learns your stack, preferences, and patterns over time |
| Single agent doing everything | 11 coordinated specialists (architecture, security, testing, review, quality validation) |
| No methodology | Skill-gated workflow: discuss → plan → execute → verify → ship |
| Neutral, agreeable, forgettable | Opinionated. Pushes back. Cares about your growth. |
| Repeat the same mistakes | Outcome-weighted reflection — same mistake twice triggers a systemic fix |

## Why This Matters

The more you use Zara, the sharper she gets. Not through fine-tuning, but through **persistent memory + outcome-weighted learning**:

- **Session 1** — Zara learns your name, stack, and coding style.
- **Session 2** — Memory recall activates. She remembers your open threads.
- **Session 5+** — Skill routing adapts to your patterns. Her recommendations improve as reflection scores accumulate.

She remembers that auth refactor you left half-finished. She knows you prefer Go stdlib over frameworks. She'll tell you to take a break at 3am — once — then respects the adult.

## Quick Start

```bash
git clone https://github.com/aldok10/zara-agent-opc.git
cd zara-agent-opc
./scripts/install.sh
```

**For AI-driven installs:**
```bash
AI_MODE=1 ./scripts/install.sh
```

**Requirements:**
- **Node.js 22.14+** with FTS5 support (`node:sqlite`) — the installer verifies this
- **OpenCode** — install from [opencode.ai](https://opencode.ai)
- macOS, Linux, or Windows (PowerShell installer: `scripts/install.ps1`)

After installing, copy `.env.example` to `.env` and set your `ANTHROPIC_API_KEY`. Then run `opencode` in any project directory.

## See It In Action

```
You: review this handler for me

Zara: [recalls your preference for parameterized queries]
      [dispatches @lens for code review]
      [dispatches @shield for security check]

      Three issues. The SQL concatenation on line 12 is injectable.
      Here's the fix...

[next day]

You: hey

Zara: Morning! Yesterday you were working on that auth refactor.
      The SQL injection fix — did you ship it? Want to pick up
      where we left off?
```

## Key Features

- **Multi-Agent Orchestration** — Zara plus 10 domain specialists, each with a clean context window and final say in their domain
- **Cognitive Memory** — 3-layer persistent memory (episodic, semantic, procedural) backed by SQLite FTS5 and MiniLM-L6-v2 embeddings
- **Hybrid Retrieval with RRF** — full-text search fused with vector similarity via Reciprocal Rank Fusion, so recall works on both exact terms and meaning
- **Pluggable Vector Backend** — SQLite by default, or scale out to **ChromaDB** for large-corpus semantic search (details below)
- **Self-Improving** — outcome-weighted reflection grounded in real test results, autonomous self-audit, micro-tool crystallization
- **Knowledge-Grounded** — 239 indexed articles covering architecture, patterns, antipatterns, laws, DDD, security, and testing
- **Skill-Gated Methodology** — 32 on-demand skills enforcing TDD, systematic debugging, and verification before completion
- **Empathetic Leadership DNA** — situational leadership (D1-D4), Radical Candor, reads your emotional signal and calibrates tone
- **Privacy-Aware** — secrets and PII detection, destructive-op guards, protected-branch enforcement, a ratified safety constitution
- **Zero Required Dependencies** — the MCP server runs on Node.js stdlib alone; embeddings and Chroma are optional add-ons

## Agents

Zara orchestrates 10 specialized sub-agents, each an expert in their domain:

| Agent | Alias | Role | Can Write? |
|-------|-------|------|-----------|
| **Zara** | — | Main orchestrator. Warm, sharp, opinionated engineering partner. | Yes |
| **Sketch** | plan | Planning mode — analysis and design without making changes | No |
| **Scout** | requirements-clarifier | Turns vague requests into clear specs | No |
| **Atlas** | architect | System design, architecture tradeoffs, patterns | No |
| **Lens** | code-reviewer | Code review, quality smells, refactoring | No |
| **Shield** | security-reviewer | Threat modeling, secure design, auth patterns | No |
| **Probe** | testing-lead | Test strategy, coverage analysis, test design | No |
| **Pulse** | delivery-lead | Shipping velocity, tech debt, blockers | No |
| **Rhythm** | loop-engineer | Iterative workflows, verification, failure modes | No |
| **Hive** | swarm | Parallel task decomposition and coordination | No |
| **Forge** | implementation | Plan → code → verify → ship, TDD execution | Yes |

**Dispatch rules:** Zara handles simple tasks directly. For depth, she dispatches to the right specialist. Trivial fixes skip the queue entirely. Each sub-agent works in isolation — clean context, no session noise.

## Memory System

Three persistent layers stored in SQLite with FTS5:

| Layer | What It Stores | Example |
|-------|---------------|---------|
| Episodic | Events and outcomes | "Deployed v2, latency dropped 40%" |
| Semantic | Typed facts about the world | "User prefers Go stdlib over frameworks" |
| Procedural | Reusable workflows | "Deploy: test → build → stage → prod" |

7 memory types ranked by priority (policy > architecture > preference > decision > pitfall > workflow > fact), scope-based retrieval, temporal decay for stale entries, contradiction detection, and automatic consolidation on session end.

### Hybrid Retrieval (RRF)

Recall isn't just keyword matching. Zara runs **full-text search (FTS5) and vector similarity in parallel**, then merges the two ranked lists using **Reciprocal Rank Fusion** (RRF, K=60 — the standard from the original paper). Items that rank high in *both* lists float to the top. You get exact-term precision and semantic recall at the same time.

## ChromaDB Integration — Scaling Memory to Production

Zara ships with a **pluggable vector backend**. By default everything runs in embedded SQLite — zero setup, zero external services. When your memory corpus grows large or you want a dedicated, horizontally scalable vector store, flip one environment variable and Zara routes all vector search through **[ChromaDB](https://www.trychroma.com)**.

```bash
# Default — everything in SQLite, no external services
ZARA_VECTOR=sqlite

# Scale out — vectors and metadata in ChromaDB
ZARA_VECTOR=chroma
ZARA_CHROMA_URL=http://localhost:8000
ZARA_CHROMA_AUTH_TOKEN=your-token   # optional
```

**How it works:**
- `chromadb` is an **optional peer dependency**, dynamically imported. It costs nothing — not a byte of memory, not a millisecond of startup — unless you turn it on.
- When active, Chroma stores everything: vectors, keys, and metadata, across four cosine-space HNSW collections:
  - `zara_semantic` — facts, decisions, preferences
  - `zara_episodic` — events and outcomes
  - `zara_procedural` — workflows and steps
  - `zara_knowledge` — knowledge passage chunks for RAG
- Migrate existing SQLite memory into Chroma with a single command: `node scripts/backfill-chroma.mjs`
- The same MiniLM-L6-v2 embeddings power both backends, so switching is seamless — no re-training, no data loss.

This is the difference between a demo and a system you can actually grow into: **start local, scale to a real vector database when you need it, without rewriting a line of your workflow.**

## Plugin System

13 plugin modules running inside OpenCode's runtime:

```
observe  memory  flow  dev  social  evolve  empathy
relationship  voice  workspace  debate  harness  proactive
```

Each module hooks into the session lifecycle (start, end, tool call) and contributes tools, event handlers, and proactive behaviors — from flow-state detection to multi-agent debate.

## MCP Server

A standalone Node.js server (`tools/mcp/index.mjs`) providing a single unified `memory` tool over JSON-RPC 2.0 stdio transport. All memory operations are routed via the `action` parameter:

| Action | Sub-operations (op) | Purpose |
|--------|---------------------|---------|
| `recall` | — | Search memory (semantic, episodic, procedural, knowledge passages via RRF) |
| `learn` | project | Store facts, preferences, architecture decisions; extract project knowledge |
| `episode` | reflect, blindspot, suggest, patterns | Record events, reflections, blindspot tracking |
| `procedure` | — | Save or recall reusable workflows |
| `manage` | consolidate, delete, contradictions, seed, index | Memory maintenance, knowledge seeding |
| `session` | start, end, check, profile, discover, model, goal_* | Session lifecycle, user identity, goals |
| `system` | audit, improve, evolve, patterns, suggest, integrity, dashboard | Self-audit, self-improvement, diagnostics |

**Design rationale:** 26 tools across 10 domain files were consolidated into 1 tool with action-based routing, reducing system-prompt token overhead by ~4.8K tokens per message (~85% reduction in MCP tool description cost).

## Commands

22 built-in slash commands accessible in OpenCode:

```
/audit  /auto  /decide  /distill  /focus  /goal  /handoff
/install  /loop  /music  /resume  /review  /shutdown  /standup
/swarm  /think  /code  /zara  /version  /update  /debate  /learn
```

## Development Methodology

Workflow enforced automatically through OpenCode's skill system:

```
skill-gate → brainstorming → writing-plans → subagent-driven-dev → finishing-branch
                                                   │
                                              tdd + verification-before-completion
```

**Iron laws:** No code without a failing test. No fixes without root cause. No completion claims without verification. No implementation without design.

## Architecture

Zara is a layered system. Each layer has one job and a clean boundary to the next.

```
┌─────────────────────────────────────────────────────────────┐
│  User (developer in OpenCode)                                 │
├─────────────────────────────────────────────────────────────┤
│  Zara — Primary Agent                                         │
│  Empathetic orchestration · reads signal · dispatches depth   │
├─────────────────────────────────────────────────────────────┤
│  Plugin Layer (13 modules, composed by zara.mjs)              │
│  observe memory flow dev social evolve empathy relationship   │
│  voice workspace debate harness proactive                     │
├─────────────────────────────────────────────────────────────┤
│  Sub-Agent Layer (isolated context each)                      │
│  scout atlas lens shield probe pulse rhythm hive forge sketch │
├─────────────────────────────────────────────────────────────┤
│  MCP Server (1 unified tool · action-based routing · JSON-RPC 2.0 over stdio) │
│  memory: recall|learn|episode|procedure|manage|session|system                 │
├─────────────────────────────────────────────────────────────┤
│  Memory Layer                                                 │
│   SQLite + FTS5  (default)  │  ChromaDB  (ZARA_VECTOR=chroma) │
│   MiniLM-L6-v2 embeddings   │  Reciprocal Rank Fusion         │
└─────────────────────────────────────────────────────────────┘
```

### How the layers talk

**Zara lives inside OpenCode as a primary agent.** She never does specialist work herself when depth matters — she reads your intent, then dispatches to the right sub-agent. Simple things she handles directly.

**The plugin layer hooks into OpenCode's lifecycle.** All 13 modules are composed by a single root (`zara.mjs`) and dispatched in a consistent order on every event. They hook into:
- `system.transform` — inject relevant memory into the prompt each turn
- `chat.message` / `chat.response` — auto-capture facts and episodes as you talk
- `tool.execute.before` / `after` — tracing, guard validation, and result caching
- `session.compacting` — preserve critical state when the context window fills

Modules that inject cost ~300-500 tokens per turn. The rest are tools-only — **zero cost until invoked.**

**Sub-agents run in isolation.** Each gets a clean context window with only its task brief — no session history, no noise. This is deliberate: isolation is as valuable as expertise. A reviewer that hasn't seen you write the code reviews it more honestly.

**The MCP server is a sidecar process.** It speaks JSON-RPC 2.0 over stdio, exposes a single unified `memory` tool with action-based routing, rate-limits to 120 calls/minute, and owns all persistence. It runs on Node.js stdlib alone — no framework, no required dependencies. The unified design cuts ~4.8K tokens from every system prompt compared to the old 26-tool layout.

**The memory layer is pluggable.** This is the piece that makes Zara grow with you instead of outgrowing you. By default, everything lives in embedded SQLite with FTS5 — one file, zero services, works offline. Flip `ZARA_VECTOR=chroma` and the exact same memory API routes vector search through **ChromaDB** instead, across four cosine-space HNSW collections (semantic, episodic, procedural, knowledge). The `chromadb` client is a dynamically-imported optional dependency, so it costs nothing until you switch it on. Either way, the same MiniLM-L6-v2 embeddings feed a **Reciprocal Rank Fusion** step (RRF, K=60) that merges full-text and vector rankings into one result list. You start local for free, and scale to a dedicated vector database when your corpus demands it — without touching a line of your workflow. See [ChromaDB Integration](#chromadb-integration--scaling-memory-to-production) for the full setup.

### Memory injection pipeline (every turn)

The `memory` plugin reads SQLite directly and assembles a token-budgeted context:

1. **Layer A — Baseline:** top policies, architecture, and preferences (max 8)
2. **Layer B — Contextual:** facts reinforced 2+ times, scoped to your current file (max 6)
3. **Layer C — Procedures:** top 3 workflows ranked by usage
4. **Budget cap:** 800 tokens max, so memory never crowds out the actual task

### Maintenance (autonomous)

- **Temporal decay** — relevance scores fade on a 90-day half-life, so stale facts sink
- **Dreamer consolidation** — dedupes, archives the stale, and promotes recurring patterns into higher-priority memory
- **Contradiction detection** — flags conflicting facts ("prefers X" vs "prefers Y") for review instead of silently overwriting
- **Corruption recovery** — auto-resets a damaged store rather than crashing the session

The result: a memory that stays sharp on its own, without you curating it.

## Project Structure

```
zara-agent-opc/
├── opencode.json                 # Main config: agents, MCP, plugins, permissions
├── AGENTS.md                     # Agent dispatch rules
├── ZARA_CONSTITUTION.md          # Safety rules (highest authority)
├── tools/
│   ├── mcp/                      # MCP server (1 unified tool, stdio transport)
│   │   ├── index.mjs             # Entry point + tool registration
│   │   ├── server.mjs            # JSON-RPC 2.0 over stdio
│   │   └── domain/memory.mjs     # Unified memory tool (action-based routing)
│   ├── memory-db.mjs             # SQLite + FTS5 memory backend (hybrid recall + RRF)
│   ├── vector-store.mjs          # ChromaDB backend (optional, pluggable)
│   ├── embedder.mjs              # Semantic embeddings (MiniLM-L6-v2)
│   └── memory/                   # Per-layer stores (semantic/episodic/procedural/knowledge)
├── .opencode/
│   ├── agent/                    # 12 agent prompt files
│   ├── plugin/zara/              # 13 plugin modules
│   ├── skills/                   # 32 skill definitions
│   └── instructions/             # System instructions
├── knowledge/                    # 239 indexed articles (architecture, patterns, DDD, security)
├── docs/                         # 11 documentation files
├── tests/                        # 30 test files (node:test)
├── scripts/                      # Installers, Chroma backfill, CI helpers
└── package.json                  # v1.2.0, ESM, Node >=22.14
```

## Documentation

See `docs/` for: [installation](docs/installation.md), [architecture](docs/architecture.md), [configuration](docs/configuration.md), [skills reference](docs/skills.md), [plugins](docs/plugins.md), [tools reference](docs/tools-reference.md), [memory system](docs/memory.md), [workflows](docs/workflows.md), and [FAQ](docs/faq.md).

## Contributing

Contributions welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

- Report bugs via [GitHub Issues](https://github.com/aldok10/zara-agent-opc/issues)
- Suggest features via [Discussions](https://github.com/aldok10/zara-agent-opc/discussions)
- Submit skills, knowledge articles, or agent improvements via PR

## Support

If Zara saves you time, consider supporting the project:

[![Donate](https://img.shields.io/badge/Donate-SociaBuzz-orange)](https://sociabuzz.com/aldok10)

## Citation

If you use Zara in your research or project, please cite:

```bibtex
@software{karendra2026zara,
  author  = {Karendra, Aldo},
  title   = {Zara: Empathetic AI Engineering Partner with Cognitive Memory},
  year    = {2026},
  url     = {https://github.com/aldok10/zara-agent-opc},
  license = {MIT}
}
```

## Author

**[Aldo Karendra](https://www.linkedin.com/in/aldok10/)** — Lead Backend Engineer & AI Systems Architect, based in Jakarta, Indonesia.

- GitHub: [@aldok10](https://github.com/aldok10)
- LinkedIn: [linkedin.com/in/aldok10](https://www.linkedin.com/in/aldok10/)

6+ years building high-performance backend systems in PHP (Laravel, Swoole, Hyperf), Go, C++, and Node.js. Currently leading backend engineering for fintech trading systems, designing low-latency infrastructure with MT4/MT5 and FIX API integration at scale. Zara is his exploration of AI agent architecture, cognitive memory systems, and empathetic AI design — an open-source proving ground for the patterns he uses in production.

**Specialties:** system architecture · multi-language integration (CGO, FFI, SWIG) · low-latency performance engineering · AI agent orchestration · Model Context Protocol · engineering leadership.

Open to tech discussions, collaborations, and consulting on backend architecture, AI agent systems, and high-performance trading infrastructure.

## License

MIT — see [LICENSE](LICENSE). Free to use, modify, and build on.
