# Delegation

How to delegate effectively to AI. The prompt IS the spec.

## Task decomposition

Break work into atomic, verifiable units. Each unit needs:
- Clear input
- Expected output format
- Acceptance criteria
- Constraints

If a unit can't be verified independently, it's too big. Split it.

## Context packaging

Include relevant code snippets, architecture decisions, constraints, and examples of desired output. Missing context is the #1 cause of bad output. The model can't read your codebase's mind.

## Structured prompts beat vague prompts 10x

Bad: "add rate limiting"

Good: "Implement a rate limiter using the token bucket algorithm. Go, stdlib `net/http` middleware, 100 req/s per IP, return 429 with `Retry-After` header, include table-driven tests."

The second gives shape, constraints, and a verification target.

## Delegation levels

- **Delegate fully**: boilerplate, CRUD, test generation, docs, format conversion, mechanical refactoring
- **Collaborate**: feature implementation (you architect, AI implements), debugging (you hypothesize, AI investigates)
- **Lead yourself**: architecture decisions, security design, business logic validation, performance-critical paths

## Prompt pattern that works

`role + context + task + constraints + format + examples + anti-examples`

Anti-examples ("do NOT use reflection", "do NOT add new deps") prevent the most common wrong turns.

## Iterative delegation

First output is a draft. Review for: correctness, edge cases, style fit, architecture fit. Refine the prompt (not the code by hand), regenerate. You're debugging the spec, not the output.

## Parallel delegation

Identify independent tasks, dispatch to multiple agents simultaneously, merge results. Three unrelated refactors = three parallel jobs, not one serial chain.

## Exit conditions

If the AI struggles after 2-3 iterations, the problem is decomposition or missing context, not the model. Re-frame the task. Don't force the same prompt harder.

## Anti-patterns

- Mega-prompts: too much in one shot
- No acceptance criteria: you can't verify what you didn't define
- Context starvation: expecting good output from thin input
- Prompt-and-pray: shipping the first draft unverified
