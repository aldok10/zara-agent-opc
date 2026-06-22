# Verification Strategies for Loops

Verify at the fastest reliable level. Don't run E2E to catch a typo.

## The Verification Pyramid

```
        /  E2E tests  \        (minutes, catches user flows)
       / Integration    \      (seconds-minutes, catches wiring)
      /   Unit tests     \     (seconds, catches logic)
     /    Linter/format   \    (seconds, catches style/bugs)
    /   Type checker/build \   (milliseconds-seconds, catches structure)
```

Run from bottom up. Fast, cheap checks first. Expensive checks only when cheap ones pass.

## Automated Verification

| Tool | Catches | Speed |
|------|---------|-------|
| Type checker | Structural errors, wrong types, missing fields | ms-s |
| Linter | Common bugs, style violations, security patterns | s |
| Unit tests | Logic errors, edge cases, regressions | s |
| Integration tests | Wiring issues, API contracts, data flow | s-min |
| E2E tests | User flow failures, system-level issues | min |
| Build | Compilation errors, missing dependencies | s-min |

## Semi-Automated Verification

- Screenshot comparison (visual regression)
- API response validation (schema check + status codes)
- Log analysis (error patterns, unexpected warnings)
- Performance benchmarks (latency regression detection)

## Human-in-the-Loop Verification

Reserve for what automation can't catch:
- Is this the right solution to the right problem?
- Does this match product intent?
- Is this architecture sustainable long-term?
- Are there organizational/political constraints?

## Layered Verification in Practice

```
After code change:
1. Type check (instant feedback, catches 60% of issues)
2. Run affected unit tests (seconds, catches logic bugs)
3. Run linter (seconds, catches patterns)
4. If all pass: run integration tests (minutes)
5. If all pass and change is significant: E2E
6. If uncertainty remains: human review
```

## When to Escalate

- Automated passes but you're not confident: add a targeted test
- Tests pass but behavior seems wrong: manual verification
- All checks pass but change is risky: human review

## Anti-Patterns

- Claiming "done" without running any verification
- Running only one level (e.g., only unit tests, missing integration failures)
- Skipping fast checks and going straight to slow ones
- Treating passing tests as proof of correctness (tests can be wrong too)
- Not re-running tests after addressing review feedback
