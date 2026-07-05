---
type: subskill
title: "Stryker Configuration Reference"
---

# Stryker Configuration Reference

## stryker.config.json Structure

```json
{
  "$schema": "./node_modules/@stryker-mutator/core/schema/stryker-schema.json",
  "mutate": ["src/**/*.ts", "!src/**/*.spec.ts", "!src/**/*.d.ts"],
  "testRunner": "vitest",
  "reporters": ["html", "progress", "dashboard"],
  "coverageAnalysis": "perTest",
  "timeoutMS": 60000,
  "timeoutFactor": 1.5,
  "concurrency": 4,
  "tempDirName": ".stryker-tmp"
}
```

## Mutator Selection

Enable/disable specific mutation operators:

```json
{
  "mutators": {
    "excludedMutations": [
      "StringLiteral",
      "ObjectLiteral"
    ]
  }
}
```

Key operators: ArithmeticOperator, ConditionalExpression, EqualityOperator, LogicalOperator, BlockStatement, BooleanLiteral, ArrayDeclaration, UnaryOperator.

Disable noisy operators (StringLiteral, ObjectLiteral) if they produce many equivalent mutants. Keep ConditionalExpression and EqualityOperator always enabled - they catch real bugs.

## Test Runner Configuration

- **vitest**: zero config if vitest.config exists. Set `"testRunner": "vitest"`.
- **jest**: `"testRunner": "jest"`, auto-detects jest.config.
- **karma**: `"testRunner": "karma"`, requires `@stryker-mutator/karma-runner`.
- **mocha**: `"testRunner": "mocha"`, set `"mochaOptions": { "spec": ["test/**/*.spec.js"] }`.

## Reporters

| Reporter | Purpose | When to use |
|----------|---------|-------------|
| `html` | Visual mutation report | Local analysis, triage sessions |
| `progress` | Console progress bar | CI output, quick feedback |
| `dashboard` | Stryker dashboard upload | Team visibility, trending |
| `json` | Machine-readable output | Custom tooling, PR comments |
| `clear-text` | Plain text summary | Minimal CI environments |

## Coverage Analysis Modes

- **off**: Run all tests against every mutant. Slowest, most thorough.
- **all**: Track which files are covered. Medium speed, skips untested mutants.
- **perTest**: Track which tests cover which mutant. Fastest. Only runs relevant tests per mutant.

Use `perTest` for CI gates. Use `off` only when `perTest` produces inconsistent results (rare, usually test isolation issues).

## Timeout Configuration

```json
{
  "timeoutMS": 5000,
  "timeoutFactor": 1.5
}
```

Effective timeout = `timeoutFactor * normalRunTime + timeoutMS`. Increase `timeoutMS` for I/O-heavy tests. Increase `timeoutFactor` for tests with variable duration.

## Ignore Patterns

File-level exclusion:
```json
{ "mutate": ["src/**/*.ts", "!src/generated/**", "!src/migrations/**"] }
```

Inline disable (single line):
```ts
const MAX_RETRIES = 3; // Stryker disable next-line all
```

Inline disable (block):
```ts
// Stryker disable all
const CONFIG = { timeout: 5000, retries: 3 };
// Stryker restore all
```

Disable specific mutator:
```ts
// Stryker disable next-line ConditionalExpression,EqualityOperator
```

Use sparingly. Every disable is a coverage gap - document why in a comment.
