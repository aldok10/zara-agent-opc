---
type: fact
title: "Skill Design Patterns - Instructional Design for AI Agents"
---

# Skill Design Patterns

Patterns for designing effective AI agent skills. Covers instructional design applied to prompts, context engineering, loop patterns, and composition strategies.

## Context Engineering

Term popularized by Andrew Ng. The practice of systematically designing the context (instructions, examples, tools, memory) that an AI agent operates within.

### Core Principle

The quality of AI output is bounded by the quality of its context. Engineering context means treating prompt design with the same rigor as software engineering.

### Components of Context

1. **Instructions**: What to do, how to behave, constraints
2. **Knowledge**: Domain facts, reference material, specifications
3. **Examples**: Few-shot demonstrations of desired behavior
4. **Tools**: Available capabilities and when to use them
5. **Memory**: Prior interactions, learned preferences, accumulated facts
6. **Environment**: System info, file state, runtime context

### Design Process

1. Define the task boundary (what's in scope, what's not)
2. Identify minimum context needed (not maximum)
3. Structure for progressive loading (surface > routing > deep)
4. Test with adversarial inputs (edge cases, ambiguous requests)
5. Measure token efficiency (same quality, fewer tokens = better)

## Instructional Design for Prompts

Applying learning science to AI skill authoring.

### Gagne's Nine Events (adapted for AI)

1. **Gain attention**: Clear role/persona statement at the top
2. **Inform objectives**: State what this skill produces
3. **Stimulate recall**: Reference related skills or prior knowledge
4. **Present content**: The actual instructions and constraints
5. **Provide guidance**: Decision trees, when-to-use heuristics
6. **Elicit performance**: Trigger words that activate the skill
7. **Provide feedback**: Self-evaluation criteria
8. **Assess performance**: Quality gates and verification steps
9. **Enhance retention**: Memory/learning hooks for future sessions

### Cognitive Load Theory for Prompts

- **Intrinsic load**: Task complexity (can't reduce, but can scaffold)
- **Extraneous load**: Irrelevant instructions (eliminate ruthlessly)
- **Germane load**: Patterns that aid understanding (examples, analogies)

Rule: reduce extraneous, scaffold intrinsic, maximize germane.

### Bloom's Taxonomy for Skill Levels

| Level | Skill Behavior | Example |
|-------|---------------|---------|
| Remember | Recall facts | "List all React hooks" |
| Understand | Explain concepts | "Explain why useEffect needs deps" |
| Apply | Use in context | "Add error handling to this function" |
| Analyze | Break down problems | "Find the performance bottleneck" |
| Evaluate | Judge quality | "Review this PR for security issues" |
| Create | Generate novel solutions | "Design a caching strategy for this API" |

Design skills at the appropriate level. Most coding skills need Apply+Analyze.

## Loop Engineering

Patterns for iterative, self-correcting agent behavior.

### Basic Loop Pattern

```
GATHER -> ACT -> VERIFY -> REPEAT (until done or budget exhausted)
```

### Loop Types

**Convergent Loop**: Each iteration narrows toward a solution.
```
while not_verified:
  attempt = generate_solution(context + previous_failures)
  result = verify(attempt)
  if result.passed: break
  context.add(result.failure_reason)
```

**Exploratory Loop**: Each iteration expands understanding.
```
while questions_remain:
  read_next_relevant_file()
  update_mental_model()
  check_if_sufficient_to_act()
```

**Refinement Loop**: Each iteration improves quality.
```
draft = generate()
for i in range(max_iterations):
  issues = evaluate(draft)
  if not issues: break
  draft = revise(draft, issues)
```

### Loop Guards

- **Budget limit**: Max N iterations, then wrap up with partial result
- **Stuck detection**: Same error 2x = switch approach, don't retry
- **Drift detection**: Every 8+ steps, re-read original goal
- **Exit conditions**: Explicit "done when" criteria defined upfront

## Prompt Chaining Patterns

Decomposing complex tasks into sequential prompt stages.

### Sequential Chain

```
[Input] -> [Stage 1: Plan] -> [Stage 2: Execute] -> [Stage 3: Verify] -> [Output]
```

Each stage has focused instructions and passes structured output to the next.

### Router Chain

```
[Input] -> [Classifier] -> Route A (simple) -> [Output]
                        -> Route B (complex) -> [Sub-chain] -> [Output]
                        -> Route C (unknown) -> [Escalate]
```

### MapReduce Chain

```
[Large Input] -> [Split into chunks]
              -> [Process chunk 1] \
              -> [Process chunk 2]  -> [Combine results] -> [Output]
              -> [Process chunk 3] /
```

### Critique Chain

```
[Input] -> [Generate] -> [Critique] -> [Revise] -> [Output]
                              ^              |
                              |______________|  (loop until quality threshold)
```

## Few-Shot Template Design

Structuring examples that teach by demonstration.

### Effective Few-Shot Structure

```markdown
## Examples

### Example 1: [Simple case - establishes baseline]
Input: [clear, unambiguous input]
Output: [desired output with annotations]
Why: [brief explanation of key decisions]

### Example 2: [Edge case - shows boundary handling]
Input: [tricky or ambiguous input]
Output: [correct handling]
Why: [what makes this different from Example 1]

### Example 3: [Complex case - shows full capability]
Input: [multi-part or nuanced input]
Output: [complete, well-structured output]
Why: [key reasoning steps]
```

### Few-Shot Guidelines

- 3-5 examples is the sweet spot (fewer = underspecified, more = token waste)
- Order: simple -> edge case -> complex (scaffolded learning)
- Include at least one "what NOT to do" example
- Keep examples realistic (synthetic examples teach synthetic behavior)
- Match the actual token length you expect in outputs

## Constraint-Based Design

Defining skills by what they must NOT do, alongside what they should.

### Why Constraints Work

LLMs tend toward verbose, accommodating behavior by default. Constraints create boundaries that focus output quality.

### Constraint Categories

1. **Scope constraints**: "Only modify files in src/. Never touch config."
2. **Behavior constraints**: "Never claim done without running tests."
3. **Output constraints**: "Response under 200 lines. No markdown headers for simple answers."
4. **Quality constraints**: "No placeholders. No TODO comments. Working code only."
5. **Safety constraints**: "Never commit secrets. Never force-push shared branches."

### Priority Ordering

When constraints conflict, explicit priority ordering resolves ambiguity:

```
Priority: Correctness > Simplicity > Maintainability > Performance
```

This tells the agent: "If you must choose between simple and fast, choose simple."

### Anti-pattern: Over-constraining

Too many constraints cause the agent to freeze or produce overly cautious output. Target 5-10 core constraints, not 50 micro-rules.

## ReAct Pattern for Skills

Reasoning + Acting interleaved. The agent thinks, acts, observes, then thinks again.

### Structure

```
Thought: I need to understand the current test setup before adding tests.
Action: Read package.json to find test framework
Observation: Jest is configured with ts-jest preset
Thought: I should look at existing test patterns in this project.
Action: Read src/__tests__/example.test.ts
Observation: Tests use describe/it pattern with fixtures in __fixtures__/
Thought: Now I can write tests matching this pattern.
Action: Write new test file following observed conventions
```

### Embedding ReAct in Skills

```markdown
## Workflow

Before acting, reason about:
1. What do I know? (from context and memory)
2. What do I need to know? (gaps to fill)
3. What's the simplest path? (avoid over-engineering)

After each action, verify:
1. Did it work? (check output/exit codes)
2. Does it match intent? (re-read original request)
3. What's next? (or am I done?)
```

## Skill Versioning Strategies

Managing skill evolution without breaking dependent workflows.

### Versioning Approaches

| Approach | When to Use | Trade-off |
|----------|-------------|-----------|
| Inline version comment | Single-author, low churn | No rollback |
| Git tags | Team skills, release cadence | Overhead |
| Filename versioning | Breaking changes | File proliferation |
| Feature flags in skill | Gradual rollout | Complexity |

### Breaking vs Non-breaking Changes

**Non-breaking** (safe to deploy):
- Adding new optional sections
- Clarifying existing instructions
- Adding examples
- Fixing typos or improving wording

**Breaking** (test before deploy):
- Changing output format
- Removing constraints
- Altering workflow steps
- Changing tool invocation patterns

### Migration Pattern

1. Create new version alongside old
2. Run behavioral eval on both
3. Compare outputs on golden test set
4. Switch routing to new version
5. Keep old version for 1-2 weeks as rollback

## Skill Composition

Combining multiple skills for complex tasks.

### Composition Patterns

**Layered**: Base skill + specialization overlay
```
base: typescript-expert
overlay: react-specific-patterns
result: typescript + react combined context
```

**Sequential**: Skills activated in order
```
step 1: activate planning-skill
step 2: activate implementation-skill
step 3: activate verification-skill
```

**Parallel**: Multiple skills active simultaneously
```
active: [security-skill, performance-skill]
result: code that satisfies both security and performance constraints
```

**Conditional**: Skill activated based on context
```
if file.endsWith('.test.ts'): activate testing-skill
if file.includes('auth'): activate security-skill
else: activate general-coding-skill
```

### Composition Conflicts

When composed skills have contradicting instructions:
1. Explicit priority ordering wins
2. More specific skill overrides general
3. Safety constraints always take precedence
4. If unresolvable: flag to user, don't guess

## Skill Inheritance

Child skills that extend parent behavior.

### Pattern

```markdown
# Child Skill

Inherits: parent-skill-name

## Overrides
[Sections that replace parent behavior]

## Extensions
[Additional sections added to parent behavior]

## Preserved
[Explicitly noting what carries over unchanged]
```

### Use Cases

- Language-specific skills inheriting from general coding skill
- Project-specific skills inheriting from language skill
- Team conventions inheriting from org-wide standards

### Rules

- Child cannot weaken parent safety constraints
- Child can narrow scope but not expand it
- Override must be explicit (implicit override = bugs)
- Test child skill independently AND in combination with parent
