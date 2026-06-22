# Memory System

## Overview

3-layer cognitive memory: episodic (events), semantic (facts), procedural (workflows).
Stored in SQLite with FTS5 full-text search. Zero external dependencies.

## Memory Types

| Type | Priority | What to Store | Example |
|------|----------|---------------|---------|
| policy | critical | Rules, constraints, non-negotiables | "Never commit secrets" |
| workflow | high | Proven step-by-step processes | Deploy pipeline steps |
| pitfall | high | Mistakes to avoid, failure patterns | "Don't use ORM for bulk inserts" |
| architecture | high | System design decisions, boundaries | "Auth is separate service" |
| decision | medium | Choices made with context | "Chose SQLite over Postgres for X" |
| preference | medium | User likes/dislikes, style choices | "Prefers stdlib over deps" |
| fact | normal | General knowledge, references | "API rate limit is 100/min" |

## 4-Layer Activation

Every conversation injects relevant memories before the LLM sees the prompt:

**Layer A — Baseline** (always injected)
- All `policy`, `architecture`, and `preference` memories with priority >= high
- Sorted by priority descending

**Layer B — Contextual** (scored and ranked)
- Score = `type_weight × decay_factor × reinforcement_count`
- Decay: exponential with 90-day half-life
- Only memories above threshold score inject

**Layer C — Procedures** (top 3 workflows)
- Matched by current task context
- Proven workflows (success_count > 0) ranked first

**Token Budget: 800 tokens max**
- Prevents memory from consuming context window
- Layers compete for budget: A gets priority, then B fills remaining, then C

## Auto-Capture

Plugin silently extracts from user messages (zero LLM cost):

| Pattern | Captured As | Examples |
|---------|-------------|----------|
| Preferences | `preference` | "I prefer X", "always use X", "never X" |
| Corrections | `fact` (high priority) | "actually X", "no, X", "not X but Y" |
| Constraints | `policy` | "must X", "required X", "don't ever X" |

Regex-based extraction — no API calls, no token cost.

## Tools

| Tool | Purpose |
|------|---------|
| `memory_learn` | Store fact with type, scope, and priority |
| `memory_recall` | Search with type/scope filters + token budget |
| `memory_episode` | Record event with outcome and tags |
| `memory_procedure` | Save named workflow with steps |
| `memory_stats` | View counts by type, total tokens stored |
| `memory_consolidate` | Dedup, archive stale, promote recurring |

## Decay & Consolidation

- **Exponential decay**: half-life 90 days, score halves every 90d without access
- **Access boost**: each recall increases reinforcement_count
- **Reinforcement**: explicit "remember this" resets decay timer
- **Weekly consolidation**: archives memories with score < 0.1 (effectively dead)
- Archived memories still searchable but never auto-inject

## Scoped Retrieval

- `scope` param matches file paths (glob patterns supported)
- `semanticScoped(filepath)` returns memories relevant to current file context
- Baseline injection reads from SQLite ordered by `priority DESC, score DESC`
- Scoped queries use FTS5 `MATCH` against content + tags + scope columns
