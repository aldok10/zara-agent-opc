---
type: fact
title: "Skill Quality & Evaluation - Behavioral Evals, LLM-as-Judge"
---

# Skill Quality & Evaluation

Measuring whether AI agent skills actually work. Covers evaluation frameworks, regression testing, LLM-as-Judge patterns, and metrics that matter.

## Why Evaluate Skills

Prompt changes are deceptively fragile. A small wording change can:
- Fix one behavior while breaking three others
- Improve average quality while creating catastrophic edge cases
- Work with one model version but fail on the next

Without evaluation, you're shipping untested code. Skills deserve the same rigor as production software.

## Behavioral Evaluation Frameworks

Testing skills by observing agent behavior on known inputs.

### Structure

```
Test Case:
  id: "handles-ambiguous-request"
  input: "fix the thing"
  expected_behavior:
    - asks clarifying question (does NOT guess)
    - references at least one specific file
    - does not modify code without confirmation
  model: [target model]
  skill: [skill under test]
```

### Evaluation Dimensions

| Dimension | What It Measures | How to Test |
|-----------|-----------------|-------------|
| Instruction following | Does the agent obey constraints? | Give task that tempts constraint violation |
| Output format | Does output match spec? | Parse output, check structure |
| Tool usage | Does it use tools appropriately? | Track tool calls for correctness |
| Boundary respect | Does it stay in scope? | Give out-of-scope requests |
| Quality floor | Minimum acceptable output? | Grade on rubric, check threshold |
| Consistency | Same input = similar output? | Run same case 5x, measure variance |

### Test Case Categories

1. **Happy path**: Clear input, well-defined task, expected to succeed
2. **Edge cases**: Ambiguous input, conflicting instructions, missing context
3. **Adversarial**: Inputs designed to break the skill (injection, misdirection)
4. **Regression**: Previously-broken cases that must stay fixed
5. **Boundary**: Inputs at the exact edge of skill scope

## Regression Testing for Prompt Changes

Preventing regressions when modifying skills.

### Workflow

```
1. Define golden test set (10-20 cases per skill)
2. Run baseline evaluation -> record scores
3. Make prompt change
4. Run same evaluation -> compare scores
5. If any regression > threshold: investigate before shipping
```

### What to Track

- Pass/fail rate per test case
- Score distribution (mean, p50, p10)
- Token usage (efficiency regression is real)
- Latency changes
- Tool call patterns (more calls = possible confusion)

### Regression Triggers

Run full eval suite when:
- Any constraint added or removed
- Workflow steps reordered
- Examples modified
- Model version changes
- New tool added to skill's toolkit

### Snapshot Testing

Store complete outputs for golden cases. Diff new outputs against snapshots. Not for exact match (LLM outputs vary), but for structural consistency and key content presence.

## LLM-as-Judge Patterns

Using a language model to evaluate another model's output.

### Basic Pattern

```
System: You are evaluating AI agent output quality.

Score the following output on a scale of 1-5 for each criterion:
- Correctness: Does it solve the stated problem?
- Completeness: Are all requirements addressed?
- Style: Does it match project conventions?
- Safety: Are there security or safety concerns?

Task: {original_task}
Agent Output: {agent_output}
Reference Solution: {optional_reference}

Return JSON: {"correctness": N, "completeness": N, "style": N, "safety": N, "reasoning": "..."}
```

### Judge Design Principles

- Use a stronger model as judge (or same model with more context)
- Provide the original task AND acceptance criteria to the judge
- Include reference solutions when available (anchors scoring)
- Ask for reasoning before scores (improves reliability)
- Calibrate with human-scored examples first

### Multi-Judge Pattern

Run 3 judges independently, take majority or average. Reduces variance from single-judge bias.

### Judge Failure Modes

| Failure | Cause | Mitigation |
|---------|-------|-----------|
| Leniency bias | Judge defaults to high scores | Include negative examples in calibration |
| Position bias | Judge favors first option in comparisons | Randomize order |
| Verbosity bias | Longer = better (false) | Score on criteria, not length |
| Self-preference | Same model judges itself favorably | Use different model as judge |
| Anchoring | Reference solution dominates scoring | Test with and without reference |

## A/B Testing Skills

Comparing two skill versions on live tasks.

### Setup

```
traffic_split:
  version_a: 50%  # current skill
  version_b: 50%  # candidate skill
  
metrics:
  - task_completion_rate
  - user_satisfaction (if measurable)
  - error_rate
  - token_efficiency
  - time_to_completion
  
duration: 50-100 tasks minimum for statistical significance
```

### When to A/B vs When to Eval

- **A/B test**: Subtle quality differences, user preference matters, production traffic available
- **Eval suite**: Breaking changes, safety-critical skills, no production traffic yet

### Decision Criteria

Ship version B when:
- Completion rate >= version A
- No new failure modes introduced
- Token efficiency same or better
- Quality scores >= version A on golden set

## Golden Test Sets

Curated inputs that represent the full range of skill usage.

### Building a Golden Set

1. Collect real user queries (anonymized)
2. Categorize by difficulty and type
3. Write expected behaviors (not exact outputs)
4. Include known failure cases from production
5. Balance: 40% happy path, 30% edge cases, 20% complex, 10% adversarial

### Golden Set Size

| Skill Complexity | Minimum Cases | Target Cases |
|-----------------|---------------|--------------|
| Simple (one task type) | 10 | 20 |
| Medium (3-5 task types) | 20 | 40 |
| Complex (many paths) | 40 | 80+ |

### Maintenance

- Add new cases when bugs are found (regression capture)
- Remove cases that test deprecated behavior
- Re-calibrate expected outputs when requirements change
- Review quarterly for relevance

## Coverage Metrics for Skills

Measuring what your skill handles vs what it should handle.

### Topic Coverage

Map all intended use cases, then verify each has at least one test:

```
Skill: code-review
Topics:
  [x] Security issues (SQL injection, XSS)
  [x] Performance problems (N+1, memory leaks)
  [x] Style violations (naming, formatting)
  [ ] Accessibility issues  <- GAP
  [x] Error handling gaps
  [ ] Test coverage gaps   <- GAP
```

### Edge Case Coverage

For each topic, identify boundary conditions:

```
Topic: file editing
  [x] Single file, simple change
  [x] Multiple files, coordinated change
  [ ] File doesn't exist         <- GAP
  [x] File is read-only
  [ ] Binary file (should refuse) <- GAP
  [x] Very large file (>1000 lines)
```

### Behavioral Coverage

Verify the skill handles all defined workflow states:

- Happy path completion
- Graceful failure (what happens when tools fail?)
- Escalation trigger (when should it ask for help?)
- Budget exhaustion (what happens at step limit?)
- Contradiction handling (conflicting instructions)

## Evaluation Rubrics

Structured scoring guides for consistent evaluation.

### Rubric Template

```markdown
## [Skill Name] Evaluation Rubric

### Criterion: Correctness (weight: 40%)
5 - Fully correct, all requirements met, verified
4 - Correct with minor issues that don't affect functionality  
3 - Mostly correct, one significant issue
2 - Partially correct, multiple issues
1 - Incorrect or harmful output

### Criterion: Style Compliance (weight: 20%)
5 - Matches project conventions exactly
4 - Minor style deviations
3 - Noticeable style drift, still readable
2 - Significant convention violations
1 - Ignores project style entirely

### Criterion: Efficiency (weight: 20%)
5 - Minimal changes, optimal approach
4 - Slightly more than needed, still good
3 - Some unnecessary work, acceptable
2 - Significant wasted effort
1 - Wildly over-engineered or wrong approach

### Criterion: Safety (weight: 20%)
5 - All safety constraints respected, no risks
4 - Minor safety consideration missed
3 - One notable safety gap
2 - Multiple safety issues
1 - Dangerous output (data loss, security hole)
```

### Using Rubrics

- Apply consistently across all test cases
- Calibrate with 5-10 examples scored by multiple reviewers
- Weight criteria by what matters most for the skill's purpose
- Track scores over time to detect drift
- Minimum acceptable total score = threshold for shipping

## Continuous Evaluation Pipeline

Automating skill quality checks in CI/CD.

### Pipeline Stages

```
1. Lint: Check skill file structure and formatting
2. Parse: Verify frontmatter, heading hierarchy, required sections
3. Size: Check token count stays within budget
4. Eval: Run golden test set against skill
5. Compare: Diff scores against baseline
6. Gate: Block merge if regression detected
7. Report: Publish score dashboard
```

### Implementation Options

- Custom scripts with LLM API calls (most flexible)
- `promptfoo` for evaluation orchestration
- `ragas` for RAG-specific evaluation
- GitHub Actions / CI triggers on skill file changes
- Scheduled runs to detect model-version drift
