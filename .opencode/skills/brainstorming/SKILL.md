---
name: brainstorming
description: Explore intent and requirements before implementation
---

# Brainstorming

Explore intent, requirements, and design before any code. Design first, always.

## Scope

- HANDLES: context exploration, intent clarification, approach options, design spec, pre-mortem.
- DEFERS: implementation plan to `writing-plans`; specialist depth to @atlas/@lens/@shield/@probe/@pulse/@rhythm.

## First Action

Classify complexity, then explore existing context (files, docs, recent commits).

| Complexity | Signals | Process |
|------------|---------|---------|
| Simple | 1-2 files, clear pattern | Lightweight: context → propose → implement |
| Medium | 3-5 files, some unknowns | Full: all steps, concise spec |
| Complex | 6+ files, cross-cutting, new patterns | Thorough: detailed spec before code |

## Constraints

1. NO code until design is approved. Every feature goes through this; simple gets short design, complex gets thorough. Process scales, never skips.
2. Ask questions one at a time, prefer multiple choice. Each answer informs the next.
3. Present 2-3 options with tradeoffs, effort, and a recommendation. Be honest.
4. YAGNI ruthlessly: can't justify from current requirements = cut it.
5. Incremental validation: validate each design section before the next. Don't dump a 50-line spec and ask "looks good?".

## DO NOT

- Skip design because "too simple".
- Dump 5 questions at once.
- Oversell an approach or hide tradeoffs.
- Add speculative scope.
- Reveal a full spec then ask for blanket approval.

## Workflow

1. Explore context - existing patterns, conventions, dependencies, related code.
2. Clarify intent - one question at a time, multiple choice.
3. Propose approaches - 2-3 options: description, tradeoffs, effort, recommendation.
4. Design sections (scale to complexity):
   - Simple: what it does, where it lives, interface shape.
   - Medium: + data flow, error handling, testing strategy.
   - Complex: + component boundaries, integration points, rollout plan, failure modes.
5. Pre-mortem (complex only) - "2 weeks out, this failed. Why?" List 2-3 failure modes, state prevention or flag as risk.
6. Write spec to `docs/specs/YYYY-MM-DD-<topic>-design.md`: problem, chosen approach + rationale, design details, open questions, acceptance criteria.
7. Self-review - no placeholders, no contradictions, no ambiguity, testable criteria, YAGNI applied.
8. User review - "Anything feel off, missing, or over-built?" Iterate until approved.
9. Transition - invoke `writing-plans`.

## Agent Routing (when depth needed)

| Topic | Dispatch | Knowledge query |
|-------|----------|-----------------|
| Architecture, system design | @atlas | "architecture styles clean architecture tradeoffs" |
| Code organization, patterns | @lens | "design patterns SOLID refactoring" |
| Security, auth, threats | @shield | "OWASP threat modeling secure design" |
| Test strategy, coverage | @probe | "testing strategy TDD pyramid" |
| Delivery, scope, priorities | @pulse | "incremental delivery YAGNI scope" |
| Iteration, verification | @rhythm | "loop design patterns verification" |
| Parallelization 3+ streams | @hive | - |

## Verification

- Spec exists at `docs/specs/` path with testable acceptance criteria.
- No placeholder text, no internal contradictions.
- User approved before transition to `writing-plans`.
- Save decisions via `memory_episode` and `memory_learn(type: "decision")` after approval.

## Knowledge (load on demand via `Orchestrator_memory(action:"recall", layer:"knowledge")`)

- "architecture patterns clean architecture modular" · "design patterns strategy factory repository"
- "YAGNI simple design principles" · "DDD bounded context aggregate value object" · "anti-patterns golden hammer feature creep"
- `knowledge_index(section: "principles")` - engineering principles
