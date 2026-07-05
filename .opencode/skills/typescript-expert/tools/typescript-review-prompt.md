# TypeScript Code Review Prompt

You are reviewing TypeScript code for production readiness. Focus on type safety, correctness, and idiomatic patterns.

## Input

**Code to review:** {{code_or_file_path}}
**Context:** {{what_this_code_does}}
**TypeScript version:** {{version, default 5.5+}}
**Runtime:** {{Node.js | Deno | Bun | Browser}}

## Review Checklist

### Type Safety
- Are `any` types avoided or explicitly justified?
- Are generics used where they add value (not overengineered)?
- Are union types properly narrowed before access?
- Are branded/opaque types used for domain IDs?
- Are function overloads needed for polymorphic APIs?
- Is `as` casting avoided (prefer type guards or satisfies)?
- Are return types explicit on exported functions?

### Error Handling
- Is `unknown` used for catch clause variables (not `any`)?
- Are errors narrowed before accessing properties?
- Is Result pattern or Effect used for expected failures?
- Are async errors properly caught (no unhandled rejections)?

### Runtime Safety
- Is external input validated at boundaries (zod/valibot)?
- Are nullish values handled (optional chaining, nullish coalescing)?
- Are array indices checked before access?
- Are JSON.parse calls wrapped in try/catch?

### Patterns
- Is dependency injection used (not hard-coded imports)?
- Are side effects isolated from pure logic?
- Is immutability preferred (readonly, as const)?
- Are magic strings/numbers extracted as constants or enums?

### Performance
- Are large arrays processed with proper iteration (not creating intermediate copies)?
- Are Maps used instead of object lookups for dynamic keys?
- Are async operations parallelized where independent (Promise.all)?

### Node.js Specific
- Are streams used for large data (not loading all in memory)?
- Is AbortSignal used for cancellation?
- Are environment variables validated at startup?

## Output Format

For each issue:
```
[SEVERITY] file:line -- description
  Suggestion: [fix]
```

Severity: CRITICAL | WARNING | INFO

End with: total issues by severity, overall verdict (ship/fix-then-ship/redesign).
