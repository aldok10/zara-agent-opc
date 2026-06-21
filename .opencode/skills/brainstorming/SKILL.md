---
name: brainstorming
description: Use before any creative/feature work. Explores intent, requirements, design before implementation.
---

# Brainstorming Skill

## Complexity Classification

| Complexity | Signals | Process |
|------------|---------|---------|
| Simple | 1-2 files, clear pattern exists | Lightweight: context → propose → implement |
| Medium | 3-5 files, some unknowns | Full: all 8 steps, concise spec |
| Complex | 6+ files, cross-cutting, new patterns | Thorough: detailed spec required before code |

## Hard Gate

**NO code until design is approved.** Period. Not even "just a quick sketch." Design first, always.

### Anti-pattern: "too simple to need design"

Every feature goes through this process. Simple features get a short design. Complex features get a thorough one. The process scales — it doesn't get skipped.

## Process

### 1. Explore Context

- Read relevant files, docs, recent commits
- Understand existing patterns, conventions, dependencies
- Identify what already exists that's related

### 2. Clarify Intent

Ask questions **one at a time**. Prefer multiple choice:

> "What's the primary goal here?"
> A) Speed of delivery
> B) Flexibility for future changes
> C) Minimal surface area
> D) Something else — tell me

Don't dump 5 questions at once. Each answer informs the next question.

### 3. Propose Approaches

Present 2-3 options with:
- **Approach**: One-sentence description
- **Tradeoffs**: What you gain, what you lose
- **Effort**: Relative (small/medium/large)
- **Recommendation**: Which one and why

Be honest about tradeoffs. Don't oversell.

### 4. Design Sections

Scale depth to complexity:

**Simple feature** (1-2 files):
- What it does
- Where it lives
- Interface/API shape

**Medium feature** (3-8 files):
- Above, plus:
- Data flow
- Error handling approach
- Testing strategy

**Complex feature** (9+ files, cross-cutting):
- Above, plus:
- Component boundaries
- Integration points
- Migration/rollout plan
- Failure modes

Validate each section before moving to the next.

### 5. Write Spec

Save to `docs/specs/YYYY-MM-DD-<topic>-design.md` (e.g. `docs/specs/2024-03-15-auth-redesign-design.md`) with:
- Problem statement
- Chosen approach + rationale
- Design details (from step 4)
- Open questions (if any remain)
- Acceptance criteria

### 6. Self-Review

Before handing to user, check:

- [ ] No placeholder text ("TBD", "TODO", "figure out later")
- [ ] No internal contradictions
- [ ] No ambiguous requirements
- [ ] Acceptance criteria are testable
- [ ] YAGNI applied — nothing speculative

### 7. User Review

Present spec. Ask: "Anything feel off, missing, or over-built?"

Iterate until approved.

### 8. Transition

Once approved, invoke `writing-plans` skill to break design into implementation steps.

## Principles

- **YAGNI ruthlessly** — if you can't justify it from current requirements, cut it
- **One question at a time** — respect attention, build understanding incrementally
- **Multiple choice preferred** — reduce cognitive load, speed up decisions
- **Explore alternatives always** — the first idea is rarely the best
- **Incremental validation** — don't reveal a 50-line spec and ask "looks good?"
- **Design for isolation** — smaller units, clear boundaries, well-defined interfaces, testable independently

## Tone

Warm but disciplined. Guide the exploration without rushing it. Push back on scope creep gently. Celebrate clarity when it emerges.

## Related Knowledge (load on demand)

- `knowledge_load(section: "architecture")` — when evaluating architectural approaches
- `knowledge_load(section: "design-patterns")` — when proposing implementation patterns
- `knowledge_search("YAGNI")` or `knowledge_search("simple design")` — when simplifying scope
- `knowledge_load(section: "ddd")` — for domain modeling discussions

## Integration

- **Output to**: `writing-plans` skill (step 8 transition breaks design into implementation tasks)
- **MCP usage**: save key design decisions via `memory_episode(event, outcome)` and `memory_learn(key, value, type: "decision")` after user approval
- **Knowledge**: load relevant architecture/patterns via `knowledge_search(query)` during exploration phase (step 1)

## Related Skills

| When | Load |
|------|------|
| Design approved, ready to plan | `writing-plans` |
