---
type: tool
title: "Design Pattern Selection"
---

# Design Pattern Selection

## Purpose

Match a software design problem to appropriate patterns with trade-off analysis. Guides selection based on constraints rather than pattern familiarity, preventing over-engineering and misapplication.

## When to Use

- Facing a recurring design problem with no clear solution
- Choosing between multiple patterns that seem applicable
- Evaluating whether a pattern is appropriate for the scale
- Refactoring code that has grown organically without structure
- Reviewing pattern usage for correctness

## Prompt Template

```
CONTEXT:
- Problem description: [specific pain point or requirement]
- Language/runtime: [language, version, paradigm constraints]
- Scale: [single process | multi-service | distributed]
- Team size: [solo | small team | large org]
- Codebase maturity: [greenfield | growing | legacy]
- Performance constraints: [latency budget | throughput | memory]

PROBLEM CLASSIFICATION:
1. Creational: object construction complexity
   - Factory Method, Abstract Factory, Builder, Prototype, Singleton
2. Structural: composition and interface adaptation
   - Adapter, Bridge, Composite, Decorator, Facade, Proxy
3. Behavioral: communication and responsibility
   - Strategy, Observer, Command, Chain of Responsibility, State, Template Method
4. Concurrency: parallel execution coordination
   - Actor, Pipeline, Fan-out/Fan-in, Semaphore, Circuit Breaker
5. Architectural: system-level organization
   - Repository, Unit of Work, CQRS, Event Sourcing, Saga

EVALUATE EACH CANDIDATE:
- Does it solve the actual problem (not a similar one)?
- Complexity added vs complexity removed
- Testing implications (mockability, isolation)
- Team familiarity and onboarding cost
- Future flexibility vs current simplicity (YAGNI check)
- Language idiom alignment (pattern may be unnecessary in some languages)

ANTI-PATTERNS TO FLAG:
- Pattern for pattern's sake (no real problem being solved)
- Singleton masking global state
- Observer creating hidden coupling
- Strategy with only one implementation
- Factory when constructor suffices
```

## Output Format

```
## Pattern Analysis: [problem summary]

### Problem Classification
[Category and why]

### Candidate Patterns
| Pattern | Fit Score | Complexity Cost | Solves Core Problem |
|---------|-----------|-----------------|---------------------|
| ... | high/med/low | low/med/high | yes/partial/no |

### Recommended Pattern
[Name and rationale]

### Implementation Sketch
[Key interfaces/classes, 10-15 lines pseudocode]

### What NOT to Use
- [Pattern]: [why it's tempting but wrong here]

### Simplest Alternative
[Could this be solved without a formal pattern? How?]
```
