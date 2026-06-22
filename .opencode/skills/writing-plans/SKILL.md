---
name: writing-plans
description: Write comprehensive implementation plans before touching code. Use when you have a spec/requirements for a multi-step task.
trigger: After brainstorming approval, or when user has clear requirements for implementation
---

# Writing Plans

Write implementation plans assuming the engineer has zero codebase context. Document everything: which files, exact code, testing, how to verify.

## Principles

- Bite-sized tasks (2-5 minutes each)
- DRY — never repeat logic across tasks
- YAGNI — only what the spec requires
- TDD — test first, implement second
- Frequent commits — one per task

## Process

### 1. Analyze Requirements

Read the spec/requirements. Identify:
- Inputs, outputs, constraints
- Dependencies between features
- Existing code that will be touched

### 2. Map File Structure

Before defining tasks, list ALL files:

```
## Files

### Create
- path/to/new-file.ts — purpose

### Modify
- path/to/existing.ts — what changes

### Test
- path/to/file.test.ts — covers what
```

### 3. Write Plan Document

Save to: `docs/plans/YYYY-MM-DD-<feature>.md`

#### Header Template

```markdown
# Plan: <Feature Name>

**Goal**: One sentence outcome.
**Architecture**: How it fits into the system.
**Tech Stack**: Languages, frameworks, libraries used.
**Global Constraints**: Performance targets, compatibility, security rules.
**Estimated Tasks**: N tasks, ~X minutes total.
```

#### Task Structure Template

```markdown
## Task N: <Verb> <Thing>

**Files**:
- Create: `path/file.ts`
- Modify: `path/other.ts`
- Test: `path/file.test.ts`

**Interfaces**:
- Consumes: `FunctionA(input: Type): ReturnType`
- Produces: `FunctionB(input: Type): ReturnType`

**Steps**:
- [ ] Write test in `path/file.test.ts`:
\```ts
// exact test code here
\```
- [ ] Implement in `path/file.ts`:
\```ts
// exact implementation code here
\```
- [ ] Run and verify:
\```bash
npm test -- path/file.test.ts
# Expected: 2 passed, 0 failed
\```
- [ ] Commit:
\```bash
git add path/file.ts path/file.test.ts
git commit -m "feat: <what this task delivers>"
\```
```

### 4. Right-Size Tasks

Each task must:
- Be completable in 2-5 minutes
- Carry its own test cycle (write test → implement → verify)
- Have a single commit at the end
- Be independently verifiable

Split if: task touches >3 files, has >5 steps, or mixes concerns.

### 5. NO PLACEHOLDERS Rule

Every step has actual content. These are plan failures:
- "TBD"
- "TODO"
- "implement later"
- "add appropriate error handling"
- "similar to Task N"
- "follow the same pattern"
- "update as needed"

If you can't write the exact code, you don't understand the task yet. Research more.

### 6. Self-Review Checklist

Before presenting the plan:
- [ ] Every spec requirement maps to at least one task
- [ ] No placeholders or vague steps (grep for TBD, TODO, similar to, as needed)
- [ ] Types/interfaces are consistent across all tasks
- [ ] File paths are consistent (no typos between tasks)
- [ ] Each task's test actually tests what the task implements
- [ ] Run commands include expected output
- [ ] Commit messages are meaningful

### 7. Execution Handoff

After plan approval, offer:

1. **Subagent-driven** (recommended): Fresh subagent per task with two-stage review. Higher quality.
2. **Inline execution**: Batch execution in current session with checkpoints.

Ask: "Plan ready. Execute with subagents (recommended) or inline?"

Then load:
- Option 1 → `subagent-driven-dev` skill
- Option 2 → `executing-plans` skill

## Anti-Patterns

- Writing code before the plan is approved
- Tasks that depend on unwritten tasks without explicit interface contracts
- Mixing refactoring with feature work in same task
- Plans without test steps
- Optimizing before the feature works
- Using placeholders or "similar to Task N" references

## Integration

**Input from:** `brainstorming` (produces the spec this skill consumes)
**Output to:** `subagent-driven-dev` or `executing-plans`
**Full chain:** brainstorming → **writing-plans** → execution → finishing-branch

## Related Knowledge (load on demand)

- `knowledge_index(section: "architecture")` — when planning architectural changes
- `knowledge_index(section: "practices")` — for workflow/process decisions
- `knowledge_passage(query: "vertical slice incremental development")` — when decomposing features into tasks

## Related Skills

| When | Load |
|------|------|
| Execute with subagents | `subagent-driven-dev` |
| Execute inline | `executing-plans` |
| 3+ independent parallel tasks | `dispatching-parallel-agents` |
