---
name: executing-plans
description: Use when you have a written implementation plan to execute without subagents - batch execution with review checkpoints
trigger: plan execution inline, batch implementation, no subagent execution
---

# Executing Plans

Execute a plan directly in the current session, task by task.

Use this when subagents are unavailable or user prefers inline execution. If subagents ARE available, prefer `subagent-driven-dev` - it produces higher quality through isolated contexts and review gates.

## Process

### Step 1: Load and Review Plan

1. Read the plan file
2. Review critically - identify gaps, ambiguities, or concerns
3. If concerns: raise them BEFORE starting
4. If clean: create todo items and proceed

### Step 2: Execute Tasks

For each task in order:

1. Mark as in_progress
2. Follow TDD discipline (load `tdd` skill):
   - Write failing test
   - Watch it fail
   - Implement minimal code
   - Watch it pass
   - Commit
3. Run verification as specified in the plan
4. Mark as completed

**Do NOT pause between tasks.** Execute continuously. Only stop when:
- Hit a blocker (missing dep, unclear instruction, repeated test failure)
- Plan has a critical gap
- All tasks complete

### Step 3: Review Checkpoints

After every 3-5 tasks (or natural milestone), run verification:
- Are all tests still passing? (`go test ./...`, `npm test`, etc.)
- Any drift from the plan?
- Any cross-task integration issues?

Fix before continuing. For quality review of larger diffs, dispatch `task(code-reviewer)`.

### Step 4: Complete

After all tasks pass:
- Run full test suite
- Load `finishing-branch` skill
- Follow branch integration decision

## When to Stop and Ask

**STOP immediately when:**
- Verification fails repeatedly (>2 attempts)
- Plan step is ambiguous - can't determine what to build
- Missing dependency blocks progress
- Architecture question arises that plan doesn't address

Ask for clarification. Don't guess through blockers.

## Anti-Patterns (NEVER Do These)

- NEVER skip test steps ("I'll test after")
- NEVER proceed past failing verification
- NEVER modify the plan silently - discuss first
- NEVER mix refactoring with feature implementation
- NEVER start implementation on main/master without explicit consent
- NEVER pause between tasks without a blocker
- NEVER claim "done" without running verification commands
- NEVER re-dispatch a task already marked complete

## Integration

**Required skills:**
- `tdd` - enforced during each task
- `verification-before-completion` - before claiming any task done
- `finishing-branch` - after all tasks complete

**Input from:**
- `writing-plans` - creates the plan this skill executes
- `brainstorming` → `writing-plans` → **this skill**

## Related Skills

| When | Load |
|------|------|
| Implementing each task | `tdd` |
| Before claiming task done | `verification-before-completion` |
| All tasks complete | `finishing-branch` |
