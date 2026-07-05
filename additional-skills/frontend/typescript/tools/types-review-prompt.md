---
type: tool
title: "TypeScript Types Review"
---

# TypeScript Types Review

## Purpose

Review TypeScript type definitions, generics usage, inference patterns, and strictness configuration. Ensure types provide real safety without unnecessary complexity.

## When to Use

- Reviewing type definitions or generic utilities
- Evaluating type safety of a module or API surface
- Checking tsconfig strictness settings
- Debugging complex type inference issues
- Designing typed APIs or library interfaces

## Prompt Template

Given the following TypeScript code:

```
[paste type definitions, interfaces, generics, or typed code]
```

tsconfig relevant settings (if applicable):

```
[paste strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes, etc.]
```

Review for:

1. **Type Safety**: Are types narrow enough to catch real bugs? Are `any` and type assertions (`as`) avoided? Is `unknown` used for untrusted input? Are return types explicit on public APIs?
2. **Generics**: Are generic constraints meaningful? Is inference working (users don't need to specify types manually)? Are generic names descriptive (`TItem` not just `T`)?
3. **Inference**: Is TypeScript inferring correctly without explicit annotations? Are `satisfies` and `const` assertions used where helpful? Is control flow narrowing leveraged?
4. **Utility Types**: Are built-in utility types used (`Pick`, `Omit`, `Partial`, `Required`, `Record`)? Are custom utilities necessary or over-engineered?
5. **Discriminated Unions**: Are union types discriminated properly? Is exhaustive checking enforced (`never`)? Are tagged unions preferred over optional fields for variants?
6. **Strictness**: Is `strict: true` enabled? Are `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` considered? Are null checks present?
7. **API Design**: Are overloads cleaner than unions? Is the public type surface minimal? Are implementation details hidden from consumers?

Context:
- TypeScript version: [5.x]
- Framework: [React/Vue/Angular/Node/library]
- Strict mode: [yes/partial/no]
- Target consumers: [internal/public API/library]

## Output Format

```
## Types Review

### Issues
- [severity] [file:line]  -  [type problem]  -  [fix]

### Type Safety Gaps
- [where bugs could slip through]

### Over-engineering
- [types that add complexity without safety]

### Improvements
- [specific type changes with rationale]

### Strictness Recommendations
- [tsconfig settings to enable/adjust]

### Verdict
[well-typed / needs tightening / over-typed / under-typed]
```
