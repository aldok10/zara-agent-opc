# Maker-Checker Pattern

The single highest-leverage pattern in loop engineering. External feedback, not self-grading. An agent reviewing its own work reinforces its own flawed reasoning.

## Structure

```
Maker produces → Checker verifies → Agreement: proceed / Disagreement: revise or escalate
```

## Why Self-Review Fails

When an agent reviews its own output, it:
- Has the same blind spots that created the error
- Rationalizes its choices rather than questioning them
- Confirms what it expects to see rather than what's actually there
- Cannot catch errors it doesn't know to look for

External verification breaks this cycle.

## Checker Sources (ordered by reliability)

1. **Compiler/type checker**: structural correctness, zero ambiguity
2. **Test suite**: behavioral correctness, automated, fast
3. **Linter/static analysis**: style, common bugs, security patterns
4. **Second agent**: different perspective, catches reasoning errors
5. **Human reviewer**: judgment, product fit, architecture decisions

## Implementation Pattern

```
1. Maker generates output (code, plan, analysis)
2. Objective tools verify (build, test, lint)
3. If tools pass: critic agent reviews for logic/design
4. If critic passes: route to human for final approval (if needed)
5. If any checker fails: send back with specific feedback
6. Maker revises based on feedback
7. Re-verify from step 2
```

## Agreement Protocol

| Maker + Checker agree | Action |
|---|---|
| Both say correct | Auto-proceed |
| Maker says done, checker finds issues | Revise with specific feedback |
| Checker uncertain | Escalate to human |
| Repeated disagreement (3+ rounds) | Escalate, likely fundamental misunderstanding |

## Practical Application

For code changes:
- Maker: write the code
- Checker 1: run tests (automated)
- Checker 2: run linter (automated)
- Checker 3: review agent or human (judgment)

For architecture decisions:
- Maker: propose design
- Checker: evaluate against requirements, constraints, failure modes
- Both: present to human decision-maker

## Key Principles

- Never trust self-assessment alone
- Automate checking wherever possible (fast, cheap, reliable)
- Reserve human checking for judgment calls
- Checker feedback must be specific and actionable ("line 42 doesn't handle null" not "looks wrong")
- If maker and checker are both agents, they must have different system prompts or perspectives
