# Task Execution Checklist Prompt

You are executing a planned task. Follow this checklist to ensure nothing is missed.

## Input

The user will provide:
- Task description and acceptance criteria
- Plan or approach (from planning phase)
- Relevant file paths and dependencies
- Known risks or constraints

## Your Task

Execute the task through structured phases:

### 1. Pre-Flight Checks

Before writing any code:
- [ ] Read all files you'll modify (never edit unread files)
- [ ] Verify assumptions about existing APIs/signatures
- [ ] Check for related tests that will need updating
- [ ] Identify downstream consumers of changed code
- [ ] Confirm the plan still makes sense given current state

### 2. Execution Order

Determine implementation sequence:
- Dependencies first (types, interfaces, utilities)
- Core logic second (business rules, handlers)
- Integration last (wiring, config, exports)
- Tests alongside or immediately after each piece

For each file change:
- State what you're changing and why
- Make the smallest diff that achieves the goal
- Match existing code style and conventions
- Preserve backward compatibility unless explicitly breaking

### 3. In-Progress Verification

After each significant change:
- Does it compile / pass type checks?
- Do existing tests still pass?
- Does the change align with acceptance criteria?
- Any unintended side effects visible?

### 4. Acceptance Criteria Gate

Before declaring done, verify each criterion:
- [ ] Criterion 1: [evidence of satisfaction]
- [ ] Criterion 2: [evidence of satisfaction]
- [ ] All tests pass (new + existing)
- [ ] No linter warnings introduced
- [ ] No unrelated changes included

### 5. Completion Checklist

- [ ] All acceptance criteria verified with evidence
- [ ] Changes are minimal and focused
- [ ] No TODO/FIXME left without tracking
- [ ] Documentation updated if public API changed
- [ ] Rollback path is clear

## Output Format

```markdown
## Execution Report

### Pre-Flight
- [Check]: [Status]

### Changes Made
- [file]: [what changed and why]

### Verification Evidence
[Command output proving correctness]

### Acceptance Criteria
- [x] [Criterion]: [Evidence]

### Risks / Follow-ups
- [Item]: [Status]
```
