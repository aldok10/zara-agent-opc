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

Every feature goes through this process. Simple features get a short design. Complex features get a thorough one. The process scales - it doesn't get skipped.

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
> D) Something else - tell me

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

### 5. Pre-mortem (Complex only)

For complex features, ask: "It's 2 weeks from now and this failed. Why?"

List 2-3 realistic failure modes:
- What could go wrong technically?
- What assumption might be wrong?
- What dependency might not work as expected?

For each: state how the design prevents it, or flag it as a known risk.

### 6. Write Spec

Save to `docs/specs/YYYY-MM-DD-<topic>-design.md` (e.g. `docs/specs/2024-03-15-auth-redesign-design.md`) with:
- Problem statement
- Chosen approach + rationale
- Design details (from step 4)
- Open questions (if any remain)
- Acceptance criteria

### 7. Self-Review

Before handing to user, check:

- [ ] No placeholder text ("TBD", "TODO", "figure out later")
- [ ] No internal contradictions
- [ ] No ambiguous requirements
- [ ] Acceptance criteria are testable
- [ ] YAGNI applied - nothing speculative

### 8. User Review

Present spec. Ask: "Anything feel off, missing, or over-built?"

Iterate until approved.

### 9. Transition

Once approved, invoke `writing-plans` skill to break design into implementation steps.

## Principles

- **YAGNI ruthlessly** - if you can't justify it from current requirements, cut it
- **One question at a time** - respect attention, build understanding incrementally
- **Multiple choice preferred** - reduce cognitive load, speed up decisions
- **Explore alternatives always** - the first idea is rarely the best
- **Incremental validation** - don't reveal a 50-line spec and ask "looks good?"
- **Design for isolation** - smaller units, clear boundaries, well-defined interfaces, testable independently

## Tone

Warm but disciplined. Guide the exploration without rushing it. Push back on scope creep gently. Celebrate clarity when it emerges.

## Agent Routing

During brainstorming, route to the right specialist when depth is needed:

| When brainstorming about... | Dispatch to | Via |
|-----------------------------|-------------|-----|
| Architecture, system design, tradeoffs | @atlas | `knowledge_passage(query: "architecture styles clean architecture tradeoffs")` |
| Code organization, patterns, refactoring | @lens | `knowledge_passage(query: "design patterns SOLID refactoring")` |
| Security, auth, threat modeling | @shield | `knowledge_passage(query: "OWASP threat modeling secure design")` |
| Test strategy, coverage, TDD | @probe | `knowledge_passage(query: "testing strategy TDD pyramid")` |
| Delivery approach, scope, priorities | @pulse | `knowledge_passage(query: "incremental delivery YAGNI scope")` |
| Iteration mechanics, verification | @rhythm | `knowledge_passage(query: "loop design patterns verification")` |
| Parallelization, 3+ independent streams | @hive | - |

## Related Knowledge (load on demand via MCP)

- `knowledge_passage(query: "architecture patterns clean architecture modular")` - when evaluating architectural approaches
- `knowledge_passage(query: "design patterns strategy factory repository")` - when proposing implementation patterns
- `knowledge_passage(query: "YAGNI simple design principles")` - when simplifying scope
- `knowledge_passage(query: "DDD bounded context aggregate value object")` - for domain modeling discussions
- `knowledge_passage(query: "anti-patterns golden hammer feature creep")` - when avoiding over-engineering
- `knowledge_index(section: "principles")` - browse engineering principles for decision criteria

## Integration

- **Output to**: `writing-plans` skill (step 8 transition breaks design into implementation tasks)
- **Agent handoff**: during design phase, dispatch to @atlas / @lens / @shield / @probe / @pulse / @rhythm for specialist depth (see Agent Routing table)
- **MCP usage**: save key design decisions via `memory_episode(event, outcome)` and `memory_learn(key, value, type: "decision")` after user approval
- **Knowledge**: load relevant articles via `knowledge_passage(query)` during exploration phase (step 1)

## Related Skills

| When | Load |
|------|------|
| Design approved, ready to plan | `writing-plans` |
| Need architecture depth | `brainstorming` then dispatch to @atlas |
