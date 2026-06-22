---
name: dispatching-parallel-agents
description: Use when facing 3+ independent tasks that can run concurrently without shared state
trigger: multiple independent failures, parallel investigation, concurrent tasks
---

# Dispatching Parallel Agents

Delegate independent problems to concurrent subagents. Each gets isolated context, focused scope, and clear deliverables.

## When to Use

- 3+ test files failing with different root causes
- Multiple subsystems broken independently
- Tasks with no shared state or sequential dependencies
- Parallel investigations (each problem domain is isolated)

## When NOT to Use

- Failures are likely related (fix one might fix others)
- Need full system understanding first
- Agents would edit the same files (merge conflicts)
- Exploratory debugging (don't know what's broken yet)

## The Pattern

### 1. Identify Independent Domains

Group by what's broken:
- Domain A: Auth flow tests
- Domain B: Payment processing
- Domain C: Email notifications

Each domain is independent — fixing auth doesn't affect email.

### 2. Craft Focused Prompts

Each agent gets:
- **Specific scope** — one test file or subsystem
- **Clear goal** — "make these tests pass" or "investigate and report"
- **Constraints** — "don't change files outside X/"
- **Context** — error messages, relevant file paths
- **Expected output** — "summary of root cause and fix"

### 3. Dispatch in Parallel

Issue ALL subagent dispatches in the same response — they run concurrently:

```
Subagent A: "Fix auth-flow.test.ts failures. [context]"
Subagent B: "Fix payment-processing.test.ts failures. [context]"
Subagent C: "Fix email-notifications.test.ts failures. [context]"
```

Multiple dispatches in one message = parallel. One per message = sequential.

### 4. Review and Integrate

When agents return:
1. Read each summary
2. Check for conflicts (did agents edit the same code?)
3. Run full test suite
4. Resolve any integration issues

## Prompt Structure

Good prompts are focused, self-contained, and specific about output:

```markdown
Fix the 3 failing tests in src/auth/auth-flow.test.ts:

1. "should reject expired tokens" — expects 401, gets 200
2. "should refresh token before expiry" — timeout after 5s
3. "should invalidate on password change" — old token still works

Context: Auth middleware is in src/middleware/auth.ts.
Token logic in src/services/token.ts.

Constraints: Do NOT change test expectations unless tests are wrong.

Task:
1. Read test file, understand expected behavior
2. Trace root cause in implementation
3. Fix implementation (not tests, unless tests are incorrect)
4. Run tests, confirm pass

Return: Root cause summary + what you changed.
```

## Common Mistakes

| Bad | Good |
|-----|------|
| "Fix all the tests" (too broad) | "Fix auth-flow.test.ts" (focused) |
| "Fix the race condition" (no context) | Paste error messages + test names |
| No constraints (agent refactors everything) | "Only modify files in src/auth/" |
| "Fix it" (vague output) | "Return root cause + changes summary" |

## Verification

After all agents return:

1. **Review summaries** — understand what each changed
2. **Check conflicts** — same file edited by multiple agents?
3. **Run full suite** — all fixes work together?
4. **Spot-check** — agents can make systematic errors

If conflicts exist: resolve manually or dispatch a single integration agent.

## Topology Patterns

Choose the right coordination structure for your task:

### Fan-Out (default)
```
Coordinator → Worker 1, Worker 2, Worker 3 → Review → Synthesize
```
Use when: workstreams are truly independent with no ordering.

### Pipeline (sequential dependencies)
```
Worker 1 (design) → Worker 2 (implement) → Worker 3 (test)
```
Use when: each step depends on the previous output.

### Nested (complex/hierarchical)
```
Coordinator → Sub-Coordinator 1 → Workers...
            → Sub-Coordinator 2 → Workers...
```
Use when: mega-task with multiple coordination layers. See plugin `swarm_nest_epic`.

## Key Benefits

- **Speed** — N problems in time of 1
- **Focus** — narrow scope = fewer mistakes
- **Independence** — no agent-to-agent interference
- **Context preservation** — coordinator keeps main context clean

## Quality Checklist

Before marking parallel work as complete:
- [ ] All subtasks done or explicitly blocked
- [ ] No file conflicts between workers
- [ ] Combined output is coherent
- [ ] Tests pass (if applicable)
- [ ] Learnings recorded via `reflect` + `memory_learn`

## Related Skills

| When | Load |
|------|------|
| Need isolated workspaces per agent | `git-worktrees` |
| Coordinating task execution | `subagent-driven-dev` |
| Swarm plugin coordination | Use `swarm_*` tools (epic, status, outcomes) |
