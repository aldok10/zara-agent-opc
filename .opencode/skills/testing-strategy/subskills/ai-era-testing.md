# AI-Era Testing

Testing when AI generates both the code AND the tests. This is the defining testing challenge of 2026.

## The Problem

AI-generated tests systematically fail in predictable ways:

- **Test implementation, not behavior**: they assert HOW the code works, so they break on refactor and pass on bugs.
- **Miss edge cases**: null, empty, max, boundary, concurrent, unicode, negative -- AI covers the happy path.
- **Tautological**: they assert exactly what the code was generated to do. If the code is wrong, the test is wrong the same way. Green means nothing.
- **False confidence effect**: a large green test suite feels safe. AI produces large green suites cheaply. Volume is not verification.

## Verification Framework

For every AI-generated test, run the four checks:

1. **Read the test** -- does it test the RIGHT thing? What behavior does it actually assert? If you can't state the behavior in one sentence, the test is noise.
2. **Mutation test** -- change the source code (flip a comparison, drop a return). Does the test fail? If mutated code still passes, the test is weak.
3. **Boundary cases** -- does it cover null / empty / max / concurrent / error paths? AI rarely does. Add them manually.
4. **Security** -- does it validate auth, input sanitization, injection resistance? AI almost never tests the abuse case.

## Strategy: AI Scaffolds, Human Verifies

Use AI for what it's good at, verify what it's bad at:

- Let AI generate test scaffolding, table structure, and boilerplate.
- Manually verify every assertion actually checks meaningful behavior.
- Manually add edge cases, error paths, and adversarial inputs.
- Run mutation testing on AI-generated code specifically -- it's the fastest way to expose tautological tests.

## Harness Engineering

"Harness engineering" = designing environments that make AI agents reliable, not just prompting them better. The harness is the real product:

- Deterministic test environments (testcontainers, seeded data, frozen clocks).
- Fast, honest feedback loops so AI iterations converge on correct behavior.
- Contract tests at boundaries to catch AI schema drift between services -- when one AI-edited service renames a field, the contract breaks the build before integration.
- Guardrails (linters, type checks, property tests) that reject bad AI output automatically.

The engineer's leverage is in the harness. Better harness > better prompts.

## Anti-Patterns

- Trusting green AI tests without reading assertions.
- Measuring AI test suites by coverage (they inflate coverage while asserting nothing).
- Letting AI test its own generated code without an independent verification pass.
