---
type: tool
title: "TypeScript Strict Mode Migration"
---

# TypeScript Strict Mode Migration

## Purpose

Plan incremental adoption of TypeScript strict mode (strict: true) in existing codebases. Covers error resolution strategies, per-file migration with project references, and type narrowing patterns.

## When to Use

- Enabling strict: true on a project with existing loose types
- Fixing strictNullChecks errors across a codebase
- Enabling noUncheckedIndexedAccess or exactOptionalPropertyTypes
- Setting up incremental strictness adoption per-directory
- Converting any-heavy code to properly typed patterns

## Prompt Template

```
CONTEXT:
- TypeScript version: [5.x]
- Current strict flags: [which are enabled/disabled]
- Target: [full strict: true | specific flags]
- Codebase size: [file count, approximate LOC]
- Current any count: [approximate, from type-coverage tool]
- Test coverage: [percentage, types of tests]
- Build system: [tsc | esbuild | swc | Vite | webpack]

MIGRATION STRATEGY:
1. Strict flag order (recommended sequence)
   - strictNullChecks: highest value, most errors
   - noImplicitAny: second highest value
   - strictFunctionTypes: usually few errors
   - strictBindCallApply: usually few errors
   - strictPropertyInitialization: class-heavy codebases
   - noUncheckedIndexedAccess: array/object safety
   - exactOptionalPropertyTypes: distinguishes undefined vs missing
   - useUnknownInCatchVariables: safer error handling

2. Incremental adoption
   - @ts-strict-mode per-file plugin approach
   - tsconfig paths: strict project references for new code
   - Separate tsconfig.strict.json including migrated files
   - CI: strict check on modified files only (ratchet)
   - Type coverage tracking (type-coverage tool)

3. Common error patterns and fixes
   - Object is possibly undefined: add null checks, optional chaining
   - Implicit any on parameters: add type annotations
   - Argument not assignable: narrow union types
   - Property does not exist: type guards, discriminated unions
   - Index signature issues: Record<> or Map<>

4. Automated tooling
   - ts-migrate: automated coercion addition
   - @ts-expect-error: mark and track (not suppress forever)
   - Type assertion audit: find and replace as casts
   - ESLint rules: @typescript-eslint/no-explicit-any, no-unsafe-*

5. Safe type patterns
   - Type guards (is, asserts)
   - Discriminated unions over type assertions
   - Branded types for runtime-validated values
   - NonNullable<T> utility type
   - Satisfies operator for validated literals
   - Unknown over any for external data

6. Tracking progress
   - Metric: percentage of files in strict mode
   - Dashboard: any-count over time
   - CI gate: no new any without eslint-disable justification
   - Goal: full strict in [timeframe]

COMMON MIGRATION PATTERNS:
- API responses: unknown -> validated type (Zod, io-ts, Valibot)
- Event handlers: proper Event subtypes
- Dynamic access: Record<string, T | undefined>
- Legacy libraries: declare module for missing types
- JSON parse: unknown with runtime validation
```

## Output Format

```
## Strict Migration: [project name]

### Current State
- Flags enabled: [list]
- Estimated errors on strict:true: [count from tsc --strict --noEmit]
- Any usage: [count/percentage]

### Adoption Order
| Flag | Errors | Effort | Value |
|------|--------|--------|-------|
| strictNullChecks | ... | ... | high |
| noImplicitAny | ... | ... | high |
| ... | ... | ... | ... |

### Top Error Categories
| Error | Count | Fix Pattern |
|-------|-------|-------------|
| Object possibly undefined | ... | optional chaining + null checks |
| Implicit any | ... | annotation or inference |
| ... | ... | ... |

### Incremental Setup
[tsconfig structure for gradual adoption]

### Automation Plan
- [Tools to run for batch fixes]
- [ESLint rules to enforce going forward]

### Timeline
| Phase | Scope | Duration |
|-------|-------|----------|
| ... | ... | ... |

### Success Criteria
- [ ] strict: true enabled in root tsconfig
- [ ] Zero @ts-ignore remaining
- [ ] Type coverage > 95%
- [ ] CI enforces strict on all files
```
