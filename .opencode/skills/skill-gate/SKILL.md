---
name: skill-gate
description: Ensure relevant skills are invoked before response
trigger: session start, context compaction, new task
---

# Skill Gate

Check for relevant skills BEFORE any response or action. Even 1% chance a skill applies = invoke it. If a skill applies, you MUST use it.

## Scope

- HANDLES: skill routing, instruction priority, workflow chaining, MCP tool timing.
- DEFERS: <SUBAGENT-STOP> if dispatched as a subagent for a specific task, skip this skill entirely.

## First Action

Match the task signal against the routing table below, then load the matching skill before doing anything else.

## Instruction Priority

1. User's explicit instructions (AGENTS.md, CLAUDE.md, direct requests) - highest.
2. Skills - override default behavior on conflict.
3. Default system prompt - lowest.

User always wins. "Skip brainstorming" = skip it.

## Constraints

1. Skill check comes BEFORE gathering context or exploring.
2. Rigid skills (tdd, systematic-debugging, verification-before-completion): follow exactly, no shortcuts.
3. Flexible skills (brainstorming, writing-plans): adapt to scale, don't skip steps.
4. When user says "just do it": skip brainstorming/planning for trivial changes, but NEVER skip `tdd`, `verification-before-completion`, `systematic-debugging`.

## DO NOT

- "Too simple for a skill" - simple things grow complex. Check.
- "I need context first" - skill check comes first.
- "I can do this quickly without a skill" - undisciplined action wastes time.
- "I know what the skill says" - skills evolve, load current version.
- "I'll just do this one thing first" - check before doing anything.

## Routing Table

| Signal | Load → Dispatch |
|--------|-----------------|
| Building feature, creative work | `brainstorming` → `writing-plans` |
| Architecture decision, tradeoffs | `brainstorming` → `task(architect)` via `/decide` |
| Security, auth, crypto, threats | `zara-privacy-mcp` → `task(security-reviewer)` |
| Test strategy, coverage gaps | `tdd` → `task(testing-lead)` |
| Loop/iteration design | `task(loop-engineer)` via `/loop design` |
| Delivery/shipping blockers, debt | `finishing-branch` → `task(delivery-lead)` via `/standup deep` |
| Have spec, ready to plan | `writing-plans` |
| Plan ready, subagents available | `subagent-driven-dev` or `task(implementation)` |
| Plan ready, inline | `executing-plans` |
| 3+ independent concurrent tasks | `dispatching-parallel-agents` via `/swarm` |
| Bug, test failure, unexpected behavior | `systematic-debugging` |
| Implementing code | `tdd` or `task(implementation)` via `/code` |
| Claiming done/fixed/passing | `verification-before-completion` |
| Code review | `code-review` or `/review` |
| Work complete, integrate | `finishing-branch` |
| Need isolated workspace | `git-worktrees` |
| Git operations, rebase, recovery | `git-expert` |
| Commit messages | `conventional-commits` |
| GitHub PRs, issues, Actions | `github` |
| Go / PHP / TS / Python / Rust project | `golang-expert` / `php-expert` / `typescript-expert` / `python-expert` / `rust-expert` |
| C/C++ wrapping (SWIG) | `swig-expert` |
| Docker / CI/CD | `docker` / `ci-cd` |
| DB queries | `postgres-expert` / `sqlite-expert` / `redis-expert` |
| API design, OpenAPI | `openapi-expert` |
| New/unfamiliar codebase | `codebase-onboarding` |
| Shell scripting | `shell-scripting` |
| Team/leadership/decision | `leadership-expert` |
| Voice robotic, humanizing depth | `natural-voice` (hot-path auto-injects) |
| Session ending | `session-handoff` or `/handoff` |
| Session start, incomplete work | `auto-resume` or `/resume` |
| Heavy data processing, sandbox | `zara-ctx` |
| Risky action, confirmation | `zara-hitl` |
| MCP security, secrets | `zara-privacy-mcp` |
| Library/framework docs | `find-docs` |
| Learn from GitHub project | `gitreverse-learn` via `/learn from <owner/repo>` |

## Workflow Chain

`brainstorming → writing-plans → /code (or subagent-driven-dev) → finishing-branch`. Per task: `tdd`. Bug found: `systematic-debugging`. Before done: `verification-before-completion`. Complex entry: architecture → `task(architect)`; security → `task(security-reviewer)`; parallel 3+ → `/swarm`.

## MCP Tool Timing

- Session start → `memory_recall`. Discover preference/fact → `memory_learn` (architecture/policy: source `user_explicit`).
- Design approved / plan done / bug fixed → `memory_episode`. Patterns/principles → `Orchestrator_memory(action:"recall", layer:"knowledge")`/`knowledge_index`. Reusable workflow → `memory_procedure`. After non-trivial work → `reflect`.

## File-Based Tracking

- Design specs: `docs/specs/YYYY-MM-DD-<topic>-design.md` · Plans: `docs/plans/YYYY-MM-DD-<feature>.md`
- SDD ledger: `.tasks/progress.md` · Briefs/reports: `.tasks/task-{id}.md` / `.tasks/report-{id}.md`

## Verification

- Confirm the matching skill was loaded before responding.
- For rigid skills, confirm all steps followed (no shortcuts taken).
