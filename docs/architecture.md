# Architecture

## Overview

Zara is a **persistent AI engineering partner** — warm, direct, committed to growth. Hub-and-spoke architecture: Zara orchestrates 7 sub-agents, 8 plugin modules, 31 MCP tools, and 100+ on-demand skills.

## System Layers

```
┌─────────────────────────────────────────────────────┐
│ User (Developer)                                     │
├─────────────────────────────────────────────────────┤
│ OpenCode Runtime                                     │
│  ├── Agent Prompts (.opencode/agent/)               │
│  ├── Instructions (.opencode/instructions/)          │
│  ├── Plugins (.opencode/plugin/) × 8 modules         │
│  └── Skills (.opencode/skills/ + ~/.agents/skills/) │
├─────────────────────────────────────────────────────┤
│ MCP Server (tools/mcp/)                              │
│  ├── Memory (SQLite FTS5 + trigram)                 │
│  ├── Reflection & Patterns                          │
│  ├── Metrics & Session                              │
│  ├── Knowledge (254 DevIQ articles)                 │
│  └── Music Player                                   │
├─────────────────────────────────────────────────────┤
│ Persistence (~/.zara/)                               │
│  ├── memory.db (SQLite — authoritative)             │
│  ├── memory/ (JSON — legacy/backup)                 │
│  ├── reflections/ (patterns, log)                   │
│  ├── metrics/ (daily tool usage)                    │
│  └── state/ (session handoff)                       │
└─────────────────────────────────────────────────────┘
```

## Sub-Agent System

| Agent | Mode | Purpose | Writes? |
|-------|------|---------|---------|
| zara (build) | primary | Full engineering partner | yes |
| plan (Sketch) | primary | Analysis without changes | no |
| architect (Atlas) | subagent | System design, tradeoffs | no |
| code-reviewer (Lens) | subagent | Quality, smells, patterns | no |
| testing-lead (Probe) | subagent | Strategy, coverage, design | no |
| security-reviewer (Shield) | subagent | Threat modeling, auth | no |
| delivery-lead (Pulse) | subagent | Shipping, velocity, debt | yes |
| swarm (Hive) | subagent | Parallel task coordination | yes |

## Memory System

```
┌────────────────────────────────────────┐
│ SQLite (memory.db) — Single Source     │
├────────────────────────────────────────┤
│ Semantic Layer                         │
│  - Key/value with type classification  │
│  - 7 types: policy > architecture >    │
│    preference > decision > pitfall >   │
│    workflow > fact                      │
│  - FTS5 full-text + trigram fallback   │
│  - Decay scoring (half-life 90 days)   │
│  - Scoped retrieval (by file path)     │
├────────────────────────────────────────┤
│ Episodic Layer                         │
│  - Events with outcomes + tags         │
│  - Auto-populated by chat.response hook│
├────────────────────────────────────────┤
│ Procedural Layer                       │
│  - Named workflows with steps          │
│  - Usage-ranked retrieval              │
├────────────────────────────────────────┤
│ Maintenance                            │
│  - Weekly decay (cron-like)            │
│  - Dreamer consolidation (dedup,       │
│    archive stale, promote recurring)   │
│  - Corruption recovery (auto-reset)    │
└────────────────────────────────────────┘
```

### Injection Pipeline (per turn)

1. Plugin `zara-memory` system.transform fires
2. Reads SQLite directly (falls back to JSON)
3. Layer A: Baseline (policy/architecture/preference, max 8)
4. Layer B: Contextual (reinforced ≥2, max 6)
5. Layer C: Procedures (top 3 by usage)
6. Token budget: 800 max

## Plugin Architecture

8 domain modules (observe, memory, flow, dev, social, evolve, empathy, relationship) under `.opencode/plugin/zara/`, composed by `zara.mjs`. Several use system.transform (inject tokens per turn). The rest are tools-only (zero cost until invoked).

See [plugins.md](plugins.md) for full breakdown.

## Skill System

100+ skills at `~/.agents/skills/`, 27 project skills at `.opencode/skills/`.

**Loading:** On-demand only via `skill` tool call. Routing via:
- `skill-gate` SKILL.md — master routing table (37 entries)
- `AGENTS.md` decision table — quick reference

**Types:**
- Rigid (tdd, debugging, verification) — follow exactly
- Flexible (brainstorming, writing-plans) — adapt to scale

## Development Workflow

```
brainstorming → writing-plans → subagent-driven-dev → finishing-branch
                                      ↓ (per task)
                                     tdd
                                      ↓ (if bug)
                             systematic-debugging
                                      ↓ (before done)
                         verification-before-completion
```

## Token Budget

System prompt composition:
- Agent prompt (zara.md): ~390 lines (static)
- Instructions (system.md): ~95 lines (static)
- Plugin injections: ~300-500 tokens/turn (conditional)
- Skills: 0 until loaded (on-demand)

Total per-turn overhead: ~1000-1500 tokens typical.

## External Integrations

| Integration | How | Purpose |
|-------------|-----|---------|
| Context7 MCP | Remote MCP | Live library documentation |
| GitHub (gh CLI) | Shell | PRs, issues, Actions |
| Git | Shell | Version control |

## Configuration

Entry point: `opencode.json`
- Models: anthropic/claude-sonnet-4-20250514
- MCP servers: Context7 (remote), Orchestrator (local)
- Permissions: bash allowed
- Plugins: 21 (symlinked from ~/.config/opencode/zara/plugin/)
