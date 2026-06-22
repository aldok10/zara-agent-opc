# Skills Reference

All skills listed below live in `.opencode/skills/` - project-specific, not global.

## Meta (Always Active)

| Skill | Function |
|-------|----------|
| `skill-gate` | Master routing table. Loads automatically at session start. Never skip - always check skill-gate before any action. |
| `natural-voice` | Self-regulation for natural writing style. Anti-AI detection. Hot-path subset auto-injects every turn via the `voice` plugin module; load the skill for full depth. Has its own knowledge base (11 articles). |

## Development Workflow

These skills follow the standard development flow. This is the correct order:

```
brainstorming → writing-plans → subagent-driven-dev (or executing-plans) → finishing-branch
                                    ↓
                                   tdd
                                    ↓ (if bug found)
                           systematic-debugging
                                    ↓ (before claiming done)
                           verification-before-completion
```

| Skill | Trigger | Purpose |
|-------|---------|---------|
| `brainstorming` | "let's build", feature discussion | Explore 3+ approaches before coding. Output: design brief. |
| `writing-plans` | After design approved | Convert to implementation plan. Tasks: atomic, testable, assignable. |
| `subagent-driven-dev` | Multi-step plan execution | Spawn isolated subagents per task. Each gets own context + acceptance criteria. |
| `executing-plans` | Plan ready, no subagents | Inline execution with checkpoints. Same rigor, no subagent overhead. |
| `tdd` | Start implementation | Red-green-refactor. Mandatory: test first, minimal code, refactor only when green. |
| `code-review` | Task completed | Check: correctness, edge cases, security, performance, style. |
| `verification-before-completion` | About to claim "done" | Must have evidence: tests pass, lint clean, acceptance criteria met. |
| `systematic-debugging` | Bug, test failure | 4-phase: reproduce → hypothesize → isolate → fix. No guess-and-patch. |
| `finishing-branch` | All tasks done on branch | Decision: merge, PR, keep, discard. |
| `conventional-commits` | Writing commit messages | Format: `type(scope): description`. Keeps git history clean. |
| `git-expert` | Git operations, rebase, conflict | Advanced git: cherry-pick, bisect, reflog, recovery. |
| `git-worktrees` | Starting feature work | Isolated workspace per branch. Keep main branch clean. |
| `dispatching-parallel-agents` | 3+ independent tasks | Fan-out, pipeline, or nested workers. Includes topology patterns. |
| `auto-resume` | Session start | Detect incomplete work from MCP memory. Offer to continue without being asked. |
| `session-handoff` | Session end | Persist state: git, files, threads, blockers. Enables `/resume` to work. |

## Coordination & Safety

| Skill | Purpose |
|-------|---------|
| `zara-privacy-mcp` | Privacy scanner - masks PII/secrets in db/http/ai output. Auto-triggers on security review. |
| `zara-hitl` | Human-in-the-loop. Confirmation workflow for risky operations before execution. |
| `zara-ctx` | Sandbox execution. Heavy data processing outside context window. |
| `context-mode` | Context budget management. Batch command execution, URL fetching as markdown. |

## Language & Framework

| Skill | Focus |
|-------|-------|
| `golang-expert` | Senior Go engineer DNA. Stdlib-first, Uber style guide, 100 Go Mistakes. |
| `golang-compare` | Benchmark mode - Go code quality comparison with/without golang-expert. |
| `php-expert` | PHP 8.4, PSR standards, Swoole/FrankenPHP/RoadRunner, DDD. |
| `swig-expert` | C/C++ wrapping for Go/Python/Java/C# via SWIG. |

## X-Cutting

| Skill | Purpose |
|-------|---------|
| `leadership-expert` | Coaching, decision frameworks, team dynamics, EQ. Load when a leadership or team topic arises. |

## How Skills Work

- **Loading**: Call `skill("<name>")` at the start of a task. Skill-gate is the router - if unsure, load skill-gate first.
- **Priority**: User instruction > Skill > Default behavior. User always wins.
- **Chain**: Multiple skills can be loaded sequentially. Example: brainstorming → writing-plans → tdd.
- **Knowledge**: Some skills have their own knowledge base (natural-voice: 11 articles, leadership-expert, etc.).
- **Global skills**: If you need a skill that isn't in the project, check `~/.agents/skills/` or `~/.claude/skills/`. Load on demand via `skill("<name>")`.
