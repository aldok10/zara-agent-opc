# Skill Routing

Match the task signal to a skill and load it BEFORE any response, context gathering, or exploration. Never respond without the relevant skill loaded.

## The Gate

- Even a 1% chance a skill applies = load it.
- Skill check comes FIRST - before exploring, before "just doing one thing", before gathering context.
- If dispatched as a subagent for a specific task, skip the gate entirely and do the task.

## Rigid vs Flexible

- Rigid (tdd, systematic-debugging, verification-before-completion): follow exactly, no shortcuts, even under "just do it".
- Flexible (brainstorming, writing-plans): adapt to scale, but don't skip steps.
- "Just do it" → skip brainstorming/planning for trivial changes, but NEVER skip the rigid three.

## Routing Table

| Signal | Load → Dispatch |
|--------|-----------------|
| Building feature, creative work | `brainstorming` → `writing-plans` |
| Architecture decision, tradeoffs | `brainstorming` → `task(architect)` via `/decide` |
| Security, auth, crypto, threats | `privacy` (subskill) → `task(security-reviewer)` |
| Test strategy, coverage gaps | `tdd` → `task(testing-lead)` |
| Delivery/shipping blockers, debt | `finishing-branch` → `task(delivery-lead)` |
| Have spec, ready to plan | `writing-plans` |
| Plan ready, subagents | `subagent-driven-dev` or `task(implementation)` |
| Plan ready, inline | `executing-plans` |
| 3+ independent concurrent tasks | `dispatching-parallel-agents` via `/swarm` |
| Bug, test failure, odd behavior | `systematic-debugging` |
| Implementing code | `tdd` or `task(implementation)` via `/code` |
| Claiming done/fixed/passing | `verification-before-completion` |
| Code review | `code-review` or `/review` |
| Git ops / commits / PRs | `git-expert` / `conventional-commits` / `github` |
| New/unfamiliar codebase | `onboarding` (subskill) |
| Language-specific work | `golang/php/typescript/python/rust-expert` |
| DB / API / infra | `postgres/sqlite/redis-expert`, `openapi-expert`, `docker`, `ci-cd` |
| Voice robotic | `voice` (subskill, hot-path auto-injects) |
| Session ending / start | `session` (subskill) |
| Heavy data, sandbox | `zara-ctx` |
| Risky action, confirmation | `privacy` (subskill, HITL) |
| Build external integration | `connection` (subskill) |

## DO NOT

- "Too simple for a skill" - simple things grow complex. Check.
- "I need context first" - the skill check comes first.
- "I know what it says" - skills evolve, load the current version.
- "I'll just do this one thing first" - check before doing anything.

## Verification

- Confirm the matching skill was loaded before responding.
- For rigid skills, confirm every step was followed (no shortcuts).
