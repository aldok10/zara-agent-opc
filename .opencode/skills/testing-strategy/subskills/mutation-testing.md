---
type: subskill
title: "Mutation Testing"
---

# Mutation Testing

Coverage tells you what code ran. Mutation testing tells you whether your tests actually VERIFY behavior. It tests your tests.

## How It Works

1. The tool makes a small change (mutant) to your source code:
   - Change `+` to `-`, `*` to `/`.
   - Swap `==` to `!=`, `<` to `<=`.
   - Remove a `return` statement.
   - Replace a boolean with `true`/`false`.
2. It runs your test suite against the mutated code.
3. If a test fails, the mutant is **killed** (good -- your tests caught the change).
4. If all tests still pass, the mutant **survived** (bad -- your tests don't verify that behavior).

## Mutation Score

`mutation score = killed mutants / total mutants`

Target: **> 80%**, which is a far stronger signal than line coverage. You can have 100% coverage and a 20% mutation score -- code executed but nothing asserted. This is exactly the failure mode of AI-generated tests.

## Tools

- **Stryker** (TS/JS -- excellent, also .NET and Scala variants).
- **mutmut** (Python).
- **go-mutesting** (Go).
- **Infection** (PHP).

## When to Use

- Critical business logic (billing, pricing, auth decisions).
- AI-generated code -- the fastest way to prove the AI's tests actually catch bugs rather than restating the code.
- Safety-critical paths.

## Cost & Mitigation

Mutation testing is slow -- it runs the full test suite once per mutant, so N mutants = N suite runs.

- Run on **changed files only** in CI (mutate the diff).
- Run a **full pass nightly** or weekly.
- Parallelize across workers; use incremental/cached runs where the tool supports it.

## Anti-Patterns

- **Optimizing coverage instead of mutation score**: coverage is a floor; mutation score is the real quality signal.
- **Running on trivial code**: getters, DTOs, generated code -- waste of compute.
- **Ignoring equivalent mutants**: some mutations produce logically identical code that no test can kill. Suppress them rather than chasing 100%.
- **Blocking every PR on a full run**: too slow; gate on diff-scoped runs, keep full runs scheduled.
