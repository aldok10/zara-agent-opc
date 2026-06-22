---
description: Architecture decision - think through a design choice with tradeoffs, grounded in knowledge
agent: architect
subtask: true
---

I need to think through an architecture decision with full context.

**Decision**: $ARGUMENTS

## Pre-flight

Before analyzing, ground the decision in existing knowledge:
1. `reflect_suggest(situation: "architecture decision about $ARGUMENTS")` - what worked before
2. `knowledge_passage(query: "$ARGUMENTS architecture pattern")` - relevant design patterns
3. `memory_recall(query: "$ARGUMENTS")` - past decisions, context, preferences
4. `skill("brainstorming")` - structured exploration before architect dispatch

## Analysis

Analyze with structured depth:
1. **Problem** - What are we solving, and for whom? What's the impact of getting this wrong?
2. **Options** - At least 3 distinct approaches. Include the boring/simple option.
3. **Tradeoffs** - Per option: complexity, performance, maintainability, operational burden, team impact, migration cost
4. **Data** - What data would settle this? Can we measure before deciding?
5. **Recommendation** - What's the simplest option that works? Why?
6. **Failure modes** - How does each option fail? How would we know? How would we recover?

Apply the 8 principles: delete-first, readability, solve-the-problem, data-beats-debate, ship-to-learn, consistency, good-enough, future-self.

## Post-Decision

After the analysis is returned:
1. `memory_learn(type: "decision", key: "arch_$ARGUMENTS", value: recommendation + rationale)`
2. If significant enough: write ADR to `docs/adr/YYYY-MM-DD-$ARGUMENTS.md`
3. `reflect(task: "architecture decision: $ARGUMENTS", pattern: tradeoff approach used)`
