---
name: skill-gate
description: Auto-activation enforcement - ensures relevant skills are invoked BEFORE any response. Load this at session start or after compaction.
trigger: session start, context compaction, new task
---

# Skill Gate

<SUBAGENT-STOP>
If you were dispatched as a subagent to execute a specific task, skip this skill entirely.
</SUBAGENT-STOP>

## The Rule

**Check for relevant skills BEFORE any response or action.** Even 1% chance a skill applies = invoke it.

IF A SKILL APPLIES TO YOUR TASK, YOU MUST USE IT. This is not optional.

## Instruction Priority

1. **User's explicit instructions** (AGENTS.md, CLAUDE.md, direct requests) - highest
2. **Skills** - override default behavior where they conflict
3. **Default system prompt** - lowest

User always wins. If user says "skip brainstorming", skip it.

## Skill Matching Table

| Signal | Skill to Load → Agent Dispatch |
|--------|---------------------------------|
| Building a feature, creative work, "let's build X" | `brainstorming` → then `writing-plans` |
| Architecture decision, tradeoffs | `brainstorming` → dispatch `task(architect)` via `/decide` |
| Security concern, auth, crypto, threats | `zara-privacy-mcp` → dispatch `task(security-reviewer)` |
| Test strategy needed, coverage gaps | `tdd` → dispatch `task(testing-lead)` |
| Loop/iteration design, verification gates | dispatch `task(loop-engineer)` via `/loop design` (no skill pre-load needed) |
| Delivery/shipping blockers, tech debt | `finishing-branch` → dispatch `task(delivery-lead)` via `/standup deep` |
| Have spec/requirements, ready to plan | `writing-plans` |
| Plan ready, need to execute (subagent available) | `subagent-driven-dev` → or `task(implementation)` for single focused task |
| Plan ready, no subagents or user prefers inline | `executing-plans` |
| 3+ independent tasks that can run concurrently | `dispatching-parallel-agents` → use `/swarm` for structured dispatch |
| Bug, test failure, unexpected behavior | `systematic-debugging` |
| Implementing code (feature or fix) | `tdd` → or `task(implementation)` via `/code` |
| Claiming work is done, fixed, passing | `verification-before-completion` |
| Code review needed or received | `code-review` → or use `/review` |
| Work complete, need to integrate | `finishing-branch` |
| Need isolated workspace | `git-worktrees` |
| Git operations, branching, rebase, recovery | `git-expert` |
| Writing commit messages, commit conventions | `conventional-commits` |
| GitHub PRs, issues, Actions, gh CLI | `github` |
| Go project detected | `golang-expert` |
| Go code quality comparison/demo | `golang-compare` |
| PHP project detected | `php-expert` |
| TypeScript/Node.js project | `typescript-expert` |
| Python project | `python-expert` |
| Rust project | `rust-expert` |
| C/C++ wrapping for other languages (SWIG) | `swig-expert` |
| Docker/containers | `docker` |
| CI/CD pipelines | `ci-cd` |
| Database queries, optimization | `postgres-expert` / `sqlite-expert` / `redis-expert` |
| API design, OpenAPI specs | `openapi-expert` |
| New/unfamiliar codebase, "what is this", onboarding | `codebase-onboarding` |
| Shell scripting, bash automation | `shell-scripting` |
| Team/leadership/decision topic | `leadership-expert` |
| Voice feels robotic, need deep humanizing mechanics | `natural-voice` (hot-path auto-injects every turn via voice plugin; load for depth) |
| Session ending, preserving context | `session-handoff` → or use `/handoff` |
| Session start, checking for incomplete work | `auto-resume` → or use `/resume` |
| Need heavy data processing outside context | `zara-ctx` |
| Context budget low, need sandbox execution | `zara-ctx` |
| Risky action, need confirmation workflow | `zara-hitl` |
| MCP security, secrets in tool calls | `zara-privacy-mcp` |
| Library/framework docs needed | `find-docs` |
| Learn from external GitHub projects via GitReverse for Zara improvement | `gitreverse-learn` → or use `/learn from <owner/repo>` |

## Red Flags - You're Rationalizing

| Thought | Reality |
|---------|---------|
| "This is too simple for a skill" | Simple things grow complex. Check. |
| "I need context first" | Skill check comes BEFORE gathering context. |
| "Let me explore the codebase first" | Skills tell you HOW to explore. |
| "I can do this quickly without a skill" | Undisciplined action wastes time. |
| "The skill is overkill" | If it exists for this situation, use it. |
| "I'll just do this one thing first" | Check BEFORE doing anything. |
| "I know what the skill says" | Skills evolve. Load the current version. |

## Skill Types

**Rigid** (tdd, systematic-debugging, verification-before-completion): Follow exactly. No shortcuts.
**Flexible** (brainstorming, writing-plans): Adapt to scale of task, but don't skip steps.

## Workflow Chain

The standard development flow:

```
brainstorming → writing-plans → /code (or subagent-driven-dev) → finishing-branch
                          ↓ (per task)
                        tdd
                          ↓ (if bug found)
                   systematic-debugging
                          ↓ (if loop fails 3x)
                   task(loop-engineer) for failure diagnosis
                          ↓ (before claiming done)
               verification-before-completion
```

**For complex tasks, add agent dispatch at entry point:**
```
Architecture decision → task(architect) → brainstorming → writing-plans → ...
Security review       → task(security-reviewer) → zara-privacy-mcp → findings → ...
Test strategy         → task(testing-lead) → tdd → test plan → ...
Loop design           → task(loop-engineer) → verification gates → execute → ...
Parallel work (3+)    → /swarm → task(swarm) → decompose → dispatch → synthesize
Coding workflow       → /code → explore → plan → task(implementation) → verify → ship
```

## When User Says "Just Do It"

Respect it. Skip brainstorming/planning for trivial changes. But NEVER skip:
- `tdd` (always test first)
- `verification-before-completion` (always verify before claiming done)
- `systematic-debugging` (always investigate before fixing)

## MCP Tool Integration

Use these tools at the right moments during development:

| When | Tool | Purpose |
|------|------|---------|
| Session start | `memory_recall` | Retrieve project context, user prefs, past decisions |
| Discover user preference or project fact | `memory_learn` | Persist for future sessions |
| Architecture/policy decision made | `memory_learn` (source: user_explicit) | High-priority memory |
| Design approved, plan completed, bug fixed | `memory_episode` | Record significant event + outcome |
| Discussing patterns, principles, architecture | `knowledge_passage` / `knowledge_index` | Pull DevIQ reference material |
| Workflow works well, want to reuse | `memory_procedure` | Save named procedure with steps |
| After non-trivial work | `reflect` | Extract patterns for future use |

## File-Based Tracking

All tracking lives in version control for visibility and continuity across sessions.

| Type | Path | Format |
|------|------|--------|
| Design specs | `docs/specs/YYYY-MM-DD-<topic>-design.md` | Problem, options, decision, tradeoffs |
| Implementation plans | `docs/plans/YYYY-MM-DD-<feature>.md` | Tasks, acceptance criteria, file targets |
| SDD progress ledger | `.tasks/progress.md` | Running log of task status |
| Task briefs (SDD) | `.tasks/task-{id}.md` | Scope, context, acceptance criteria for subagent |
| Task reports (SDD) | `.tasks/report-{id}.md` | Subagent output, verification results |

Create these files as work progresses. The `docs/specs/` and `docs/plans/` directories are for human-reviewed documents. The `.tasks/` directory is operational tracking for subagent-driven-dev workflows.
