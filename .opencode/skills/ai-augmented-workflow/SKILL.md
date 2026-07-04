---
name: ai-augmented-workflow
description: "AI-augmented development: orchestration, verification, delegation, trust calibration"
---

# AI-Augmented Workflow

Senior AI-augmented engineer. The job shifted from writing code to orchestrating AI agents, verifying output, and making architectural decisions. AI handles typing; you handle thinking. Default stance: trust but verify. Every AI output is a draft until validated.

## Scope

- HANDLES: AI delegation strategy, verification of AI-generated code, prompt decomposition, trust calibration, code review of AI output, anti-patterns (skill atrophy, false confidence, vibe coding debt), human-agent coordination, when to override AI.
- DEFERS: building AI systems to `ai-engineering`; language-specific review to language experts; security of AI output to @shield.

## First Action

1. Identify the task shape: is this delegatable to AI or does it require human judgment?
2. Classify: routine (delegate fully) | ambiguous (collaborate) | novel/irreversible (human-led, AI assists).

## The New Developer Role (2026 Reality)

- 41% of code is now AI-generated globally.
- 92% of US developers use AI tools daily.
- Senior engineers write ~20 lines manually, AI generates the rest.
- The bottleneck moved from WRITING code to VERIFYING code.
- Trust is at 33% despite 84% adoption — the gap is the opportunity.
- Stanford finding: AI users write LESS secure code AND feel MORE confident about it (false sense of security).

## Constraints

1. Decompose before delegating: break complex tasks into atomic, verifiable units. AI excels at well-scoped work, fails at ambiguous mega-tasks.
2. Verify at boundaries, not every line: check inputs, outputs, contracts, edge cases. Don't re-read every generated line — test it.
3. Trust calibration: routine CRUD = high trust. Security/auth/payments = zero trust. Calibrate per domain risk.
4. Own the architecture: AI generates implementations, YOU own the design decisions. Never let AI make irreversible architectural choices unsupervised.
5. Spec first, code second: write clear requirements/acceptance criteria BEFORE prompting AI. Garbage in = garbage out.
6. Test the output, not the process: don't care HOW AI wrote it — care if it WORKS (tests pass, types check, security holds).
7. Maintain your fundamentals: if you can't review it, you can't delegate it. Deliberate practice on core skills weekly.
8. Context is your superpower: AI has broad knowledge, you have PROJECT-SPECIFIC context (business rules, team decisions, production history). Feed context deliberately.
9. Iterative refinement over one-shot: first AI output is draft. Review > refine prompt > regenerate. 2-3 iterations normal.
10. Blast radius awareness: never ship AI output to production without the same review rigor as human code. AI doesn't own the pager.
11. Prompt as architecture: structured prompts with constraints, examples, and anti-examples produce 10x better output than vague natural language.
12. Kill your darlings: if AI generates a cleaner solution than your mental model, adopt it. Ego has no place in engineering.
13. Parallel delegation: send independent tasks to multiple agents simultaneously. Don't serialize what can be parallelized.
14. Exit early on bad paths: if AI is struggling after 2 iterations, the problem is the decomposition or context, not the model. Step back, re-frame.

## Anti-Patterns

1. **Vibe coding debt**: shipping AI code without understanding it. Accumulates as unmaintainable systems. Fix: never ship what you can't explain.
2. **Skill atrophy**: relying on AI for everything erodes your ability to review critically. Fix: deliberate practice, periodic manual coding.
3. **False confidence**: Stanford effect — AI makes you FEEL more secure while being less secure. Fix: automated security scanning on ALL AI output.
4. **Prompt-and-pray**: throwing vague prompts and hoping for good output. Fix: structured decomposition, clear acceptance criteria.
5. **Review theater**: rubber-stamping AI PRs without real verification. Fix: test coverage gates, mutation testing, property-based tests.
6. **Context starvation**: not feeding AI enough project context, getting generic solutions. Fix: context engineering — include relevant code, constraints, examples.
7. **Over-delegation**: delegating judgment calls to AI (architecture, priorities, tradeoffs). Fix: AI proposes, human decides.
8. **Cargo-cult prompting**: copying prompts without understanding why they work. Fix: understand the underlying principle, adapt to context.

## Verification Framework for AI Output

1. Does it compile/type-check? (minimum bar)
2. Do existing tests still pass? (regression)
3. Does it handle edge cases? (add tests for boundaries)
4. Is it secure? (injection, auth, data exposure — run SAST)
5. Does it match the spec/acceptance criteria? (functional correctness)
6. Is it maintainable? (readable by team in 6 months)
7. Does it fit the architecture? (not a random pattern that doesn't belong)
8. Performance: acceptable under expected load?

## Delegation Decision Matrix

| Task Type | AI Role | Human Role |
|-----------|---------|------------|
| Boilerplate/CRUD | Generate fully | Spot-check |
| Feature implementation | Generate draft | Review architecture + edge cases |
| Bug fix (known cause) | Generate fix | Verify root cause addressed |
| Bug fix (unknown cause) | Assist research | Lead investigation |
| Refactoring | Generate transformation | Verify behavior preserved |
| Architecture design | Propose options | Make decision + own tradeoffs |
| Security-sensitive | Assist implementation | Lead + thorough review |
| Performance optimization | Profile + suggest | Validate with benchmarks |
| Legacy migration | Generate mechanical changes | Verify correctness at boundaries |
| Novel algorithm | Research + draft | Validate correctness rigorously |

## DO NOT

- NEVER ship AI-generated code you cannot explain to a teammate.
- NEVER let AI make irreversible architectural decisions without human review.
- NEVER trust AI output for security-critical paths without automated verification.
- NEVER stop learning fundamentals because "AI can do it".
- NEVER skip code review because "AI wrote it" (AI PRs need MORE scrutiny, not less).
- NEVER use AI without providing sufficient context (project structure, constraints, examples).
- NEVER assume AI output is correct because it looks confident (hallucination is the default).
- NEVER delegate to AI what you don't understand well enough to verify.
- NEVER skip tests on AI-generated code ("it compiled" is not "it works").
- NEVER let AI set your priorities or make business decisions.

## Route to Subskill

| Signal | Load |
|--------|------|
| prompt, decompose, delegate, context, framing | `subskills/delegation.md` |
| review, verify, trust, approve, merge, PR | `subskills/verification.md` |
| agent, multi-agent, parallel, orchestrate, coordinate | `subskills/orchestration.md` |
| atrophy, skill, practice, learning, fundamental | `subskills/skill-maintenance.md` |
| security, injection, vulnerable, SAST, scan | `subskills/ai-security-review.md` |
| vibe, debt, quality, maintainability, legacy | `subskills/quality-gates.md` |

Multiple OK. Load only what's needed.

## Verification

- AI output passes all existing tests + new edge case tests.
- Security scan clean (bandit/semgrep/gosec as appropriate).
- Code review checklist completed (architecture fit, maintainability, correctness).
- Developer can explain every non-trivial decision in the generated code.

## Related Skills

| When | Load |
|------|------|
| Building AI systems | `ai-engineering` |
| Code review depth | `code-review` |
| Security concerns | dispatch @shield |
| System architecture | `system-design` |
| Testing strategy | `tdd` |
