---
type: tool
title: "Python Code Review Prompt"
---

# Python Code Review Prompt

You are reviewing Python code for production readiness. Focus on correctness, type safety, and maintainability.

## Input

**Code to review:** {{code_or_file_path}}
**Context:** {{what_this_code_does}}
**Python version:** {{version, default 3.12+}}

## Review Checklist

### Type Safety
- Are all function signatures fully typed (params + return)?
- Are generic types used correctly (Sequence vs list, Mapping vs dict)?
- Is `Any` avoided or justified?
- Are Optional/Union types handled with proper narrowing?
- Are Protocol classes used for structural typing where appropriate?

### Error Handling
- Are exceptions specific (not bare `except:`)?
- Do custom exceptions inherit from appropriate base classes?
- Are error messages actionable and include relevant context?
- Is cleanup handled with context managers or try/finally?

### Async Patterns (if applicable)
- Are blocking calls avoided in async code?
- Are tasks properly gathered/awaited?
- Are async context managers used for resource cleanup?
- Is there proper cancellation handling?

### Data Validation
- Is external input validated at system boundaries?
- Are Pydantic models used for structured validation?
- Are constraints enforced (Field validators, model validators)?

### Testing Concerns
- Is the code testable? (Dependencies injectable, side effects isolated)
- Are there obvious edge cases unhandled?

### Performance
- Are N+1 queries present?
- Are large collections processed lazily where possible?
- Are database queries indexed/optimized?

## Output Format

For each issue found:
```
[SEVERITY] file:line -- description
  Suggestion: [how to fix]
```

Severity: CRITICAL (bug/security) | WARNING (correctness risk) | INFO (style/improvement)

End with a summary: total issues by severity, overall assessment (ship/fix-then-ship/redesign).
