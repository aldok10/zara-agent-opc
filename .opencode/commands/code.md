---
description: Code - Structured coding workflow. Explore → Plan → Code → Verify → Ship. Dispatches to @forge for implementation.
---

# /code

$ARGUMENTS

## What This Does

Orchestrates a complete coding workflow. For any implementation task (feature, bugfix, refactor), this command:

1. **Loads skill-gate** - checks which coding skills apply
2. **Explores codebase** - reads relevant files before touching anything
3. **Plans approach** - states what will change and why
4. **Dispatches @forge** - for implementation with TDD discipline
5. **Verifies** - runs tests, lint, type checks
6. **Reports** - structured output with evidence

## Workflow

### Step 1: Skill Gate

Load relevant skills BEFORE any action:

| Task Type | Skills to Load |
|-----------|---------------|
| Feature implementation | `tdd`, `verification-before-completion` |
| Bug fix | `systematic-debugging`, `tdd`, `verification-before-completion` |
| Refactoring | `code-review`, `verification-before-completion` |
| Code review needed | `code-review` |

### Step 2: Explore Codebase

Before writing any code:

1. Read the relevant files (don't guess contents)
2. Search for existing patterns (`grep`, `glob`)
3. Check dependencies and imports
4. Understand current state

**NEVER skip this step.** Context blindness is the #1 cause of AI code rejection.

### Step 3: Plan Approach

State your plan BEFORE implementing:

```
## Plan
1. [file]: [what changes] - [why]
2. [file]: [what changes] - [why]

## What could break
- [risk 1]
- [risk 2]
```

For complex tasks: return plan for approval before proceeding.

### Step 4: Dispatch @forge

For implementation tasks, dispatch @forge:

```
task(subagent_type: "implementation", prompt: "Implement [task] based on this plan: [plan]. Follow TDD discipline. Use existing patterns in the codebase. Return structured output with verification evidence.")
```

### Step 5: Verify

After implementation:

1. Run tests: `npm test` / `go test ./...` / `pytest` / etc.
2. Run linter: `eslint` / `golangci-lint` / `ruff` / etc.
3. Run type checker: `tsc --noEmit` / `go vet` / etc.
4. Show actual command output as evidence

**NEVER claim "done" without verification output.**

### Step 6: Report

Return structured output:

```
## Changes Made
- [file]: [what changed]

## Verification Evidence
[actual command output]

## What Changed and Why
[1-2 sentences per change]

## Out of Scope
- [items for other agents]

## Confidence
[high/medium/low]
```

## Anti-Patterns (NEVER Do These)

- NEVER skip codebase exploration
- NEVER implement without a stated plan (dispatch @forge after plan approval)
- NEVER claim "done" without running verification commands
- NEVER modify files you haven't read first
- NEVER add dependencies without checking existing ones
- NEVER refactor unrelated code while implementing
- NEVER self-correct more than 2 times without escalating

## Sub-Commands

- `/code fix <bug>` - Bug fix workflow (systematic-debugging → TDD → verify)
- `/code feature <spec>` - Feature implementation (plan → TDD → verify)
- `/code refactor <target>` - Refactoring (review → minimal changes → verify)
- `/code review` - Code review (dispatch @lens)

## Error Recovery

| Situation | Recovery |
|-----------|----------|
| Spec is ambiguous | STOP. Ask for clarification. |
| Tests fail after changes | Read error. Understand. Fix. Max 2 attempts. |
| Can't determine root cause | STOP. Report findings. |
| Verification passes but uncertain | Say so explicitly with reason. |

## Integration

**Required skills:** `skill-gate`, `tdd`, `verification-before-completion`
**Agent dispatch:** `task(subagent_type: "implementation")` for @forge
**After completion:** Load `finishing-branch` if ready to integrate

## Voice

No AI-isms. No em dash (the - character, not double-hyphen). Banned words: robust, leverage, seamless, comprehensive, navigate, facilitate, etc. Be direct. Show your work.
