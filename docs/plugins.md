# Plugins

## Overview

Zara ships as a single OpenCode plugin (`.opencode/plugin/zara.mjs`), a composition root that loads 12 domain modules from `.opencode/plugin/zara/`. Each module hooks into the conversation lifecycle via OpenCode's experimental hooks API. Shared file I/O lives in `infra/store.mjs`.

This replaced the old layout of 21 individual plugins. Same behavior, fewer files, one entry point.

## Domain Modules

| Module | Hooks | What it does | Absorbed |
|--------|-------|-------------|----------|
| `observe` | tool.execute.before/after, chat.response | Tracing, evaluation scoring, guardrails (injection/PII/tool-input), semantic cache | metrics, observability, evaluation, guardrails, cost-optimizer |
| `memory` | system.transform, chat.message, chat.response | Auto-capture (preferences/corrections/constraints to SQLite), knowledge graph context injection, error detection | memory, reflection, knowledge |
| `flow` | system.transform (conditional), event, chat.message | Session handoff, goals, loops, bedtime ritual, auto-resume | flow, compaction, scratchpad, auto-resume |
| `dev` | tools only | Engineering principles, sandbox exec, HITL confidence | senior-dev, codebase, hitl |
| `social` | system.transform | Leadership coaching, team knowledge, music player | leadership, team, music |
| `evolve` | system.transform (conditional) | Micro-tools, swarm coordination, workflow rules | evolve, swarm, compaction, scratchpad |
| `empathy` | onEvent, onMessage, inject | Longitudinal emotional tracking, sentiment, burnout detection, growth tracking | (new) |
| `relationship` | onEvent, inject | Open threads, milestones, shared references, emotional bookmarks, persistent stances, identity anchor, temporal awareness | (new) |
| `voice` | system.transform | Anti-AI writing enforcement, banned word/phrase injection, rotating drift checks | (new) |
| `workspace` | system.transform, tools | Shared agent memory, cross-agent context propagation | (new) |
| `debate` | tools | Multi-agent deliberation, position sanitization, context compression | (new) |
| `harness` | onEvent, inject | Automated self-improvement (failure mining, diagnosis, fix proposal) + security audit on session start | (new) |
| `infra` | (shared) | File I/O utilities, path resolution, store.mjs - used by all modules | (shared library) |

## Hook Types

| Hook | When it fires | Token cost |
|------|--------------|------------|
| `system.transform` (inject) | Every turn (before LLM call) | Adds to system prompt |
| `chat.message` | On user/assistant message | Zero (processing only) |
| `chat.response` | On assistant response | Zero (processing only) |
| `event` | On session events (created/ended/compacting) | Zero |
| `tool.execute.before/after` | Around every tool call | Zero (processing only) |
| tools only | When user/LLM calls a tool | Zero until invoked |

## Token Budget

Active inject() injections per turn (worst case):
- `memory`: ~50-200 tokens (knowledge graph context only; main memory inject via MCP)
- `social`: ~15 tokens (one-liner user context + now-playing if active)
- `flow`: ~50-200 tokens (only if active session state)
- `evolve`: ~100-300 tokens (only if micro-tools/rules exist)
- `empathy`: ~15 tokens (only on burnout alert)
- `relationship`: ~60-120 tokens (identity anchor + stage + due threads + temporal signals)
- `voice`: ~50-80 tokens (hot-path crib + rotating drift check)
- `harness`: ~0-100 tokens (only on critical security findings)

**Typical total: ~400-600 tokens/turn** (most conditionals won't fire).

## Adding a Module

1. Create `.opencode/plugin/zara/<name>/index.mjs` exporting a `create<Name>(config)` factory.
2. Return `{ onEvent?, inject?, onMessage?, onResponse?, beforeTool?, afterTool?, onCompact?, tools, dispose? }`.
3. Import and register it in `zara.mjs` (add to the `each()` dispatch list and `tool` spread).
4. Verify: `node --check .opencode/plugin/zara/<name>/index.mjs` and `node --check .opencode/plugin/zara.mjs`.
