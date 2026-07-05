---
type: tool
title: "Skill Evaluation Prompt"
---

# Skill Evaluation Prompt

You are evaluating a skill definition for quality, coverage, and effectiveness.

## Input

The user will provide:
- Skill file(s) to evaluate (SKILL.md, tools, examples)
- Target use cases the skill should handle
- Expected quality bar (production, draft, experimental)

## Your Task

Evaluate the skill against these dimensions:

### 1. Coverage Analysis

Test the skill against scenarios:
- **Core scenarios**: the primary use cases (must handle well)
- **Edge scenarios**: unusual but valid inputs (should handle)
- **Out-of-scope**: things the skill should NOT try to do (should refuse/redirect)

For each scenario, assess:
- Does the skill provide clear guidance?
- Would the output be actionable without additional context?
- Are there gaps where the user would be stuck?

### 2. Instruction Clarity

- **Unambiguous**: can the instruction be interpreted multiple ways?
- **Actionable**: does each step produce a concrete output?
- **Ordered**: is the sequence logical and dependency-aware?
- **Complete**: are there missing steps between instructions?
- **Concise**: is there padding that dilutes the signal?

### 3. Token Efficiency

Measure information density:
- Instruction-to-filler ratio (aim for > 80% instruction)
- Redundancy check (same concept stated multiple ways)
- Example efficiency (do examples add value beyond the rule?)
- Could the same guidance be delivered in fewer tokens?

### 4. Output Quality Prediction

Given the skill's instructions, predict:
- Will outputs be consistent across different inputs?
- Will outputs match expected format reliably?
- Are quality criteria explicit enough to self-evaluate against?
- Could a user verify correctness without domain expertise?

### 5. Tool Integration

If the skill has tools:
- Do tool prompts align with skill-level guidance?
- Are tools non-overlapping (clear when to use which)?
- Do tools reference skill conventions consistently?
- Are tool outputs composable with each other?

### 6. Failure Mode Analysis

Identify likely failure modes:
- Where could the skill produce incorrect guidance?
- What inputs would cause confused or contradictory output?
- Are there domain assumptions that may not hold?
- What happens when the skill is used outside its scope?

## Output Format

```markdown
## Skill Evaluation: [Skill Name]

### Coverage Score: [x/10]
| Scenario Type | Count | Handled | Gaps |
|--------------|-------|---------|------|
| Core | x | x/x | [list] |
| Edge | x | x/x | [list] |
| Out-of-scope | x | x/x | [list] |

### Quality Scores
| Dimension | Score | Issues |
|-----------|-------|--------|
| Clarity | x/10 | ... |
| Token efficiency | x/10 | ... |
| Output consistency | x/10 | ... |
| Tool integration | x/10 | ... |

### Critical Issues
- [Issue]: [Fix]

### Improvement Recommendations
1. [Highest impact change]
2. [Second priority]
3. [Nice to have]
```
