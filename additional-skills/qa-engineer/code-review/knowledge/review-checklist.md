---
type: fact
title: "Code Review Checklist"
---

# Code Review Checklist

## Review Dimensions

### 1. Correctness
- Does the code do what the PR description claims?
- Are edge cases handled (null, empty, boundary values)?
- Are error paths covered (network failure, invalid input, timeout)?
- Does the logic match the requirements/spec?
- Are race conditions possible in concurrent code?

### 2. Design
- Is the change at the right abstraction level?
- Does it follow existing patterns in the codebase?
- Is the coupling between components appropriate?
- Would a simpler approach achieve the same goal?
- Is there unnecessary generalization for single use cases?

### 3. Readability
- Can you understand the intent without asking the author?
- Are names descriptive and consistent with project conventions?
- Are complex sections commented with "why" (not "what")?
- Is the function/method length reasonable (<30 lines guideline)?
- Is nesting depth manageable (<3 levels)?

### 4. Testing
- Are new behaviors covered by tests?
- Do tests verify behavior, not implementation?
- Are error/edge cases tested?
- Would the tests catch a regression if this code broke?
- Are tests readable without needing the implementation?

### 5. Security
- Is user input validated before use?
- Are queries parameterized (no string concatenation)?
- Are secrets/keys absent from the code?
- Is authentication/authorization checked?
- Are outputs sanitized (XSS prevention)?
- Is data encrypted in transit and at rest where needed?

### 6. Performance
- Are there N+1 queries or unnecessary loops?
- Is pagination used for unbounded result sets?
- Are large operations batched?
- Is caching appropriate and invalidation correct?
- Could this block the event loop (in async runtimes)?

### 7. Maintainability
- Will the next developer understand this in 6 months?
- Are magic numbers extracted to named constants?
- Is dead code removed?
- Are TODOs tracked with issue links?
- Is the change backward-compatible (or migration provided)?

## Cognitive Biases in Code Review

### Anchoring
- First impression of a PR colors all subsequent review
- Mitigation: read the full diff before commenting

### Authority Bias
- Accepting code from senior devs without scrutiny
- Mitigation: apply same checklist regardless of author

### Bikeshedding
- Spending time on naming/formatting, ignoring logic
- Mitigation: let linters handle style, focus on behavior

### Bandwagon Effect
- Approving because others already approved
- Mitigation: do your own independent review first

### Confirmation Bias
- Looking for reasons code is correct, not reasons it might fail
- Mitigation: actively look for "what could go wrong?"

### Dunning-Kruger
- Not flagging things you don't understand
- Mitigation: "I don't understand this" is valid feedback

## Review Communication

### Good Comment Patterns
```
# Question (non-blocking)
"Curious: what's the reason for X over Y here?"

# Suggestion (non-blocking)
"Nit: consider renaming to [name] for clarity"

# Concern (blocking)
"This might fail when [scenario]. Can we add handling for X?"

# Praise
"Nice pattern here - much cleaner than the old approach"
```

### Avoid
- "Why didn't you..." (accusatory)
- "You should have..." (condescending)
- Rewriting the code in comments (do a pair session instead)
- Vague "this is wrong" without explanation

## Review Workflow

### Before Reviewing
1. Read the PR description and linked issue
2. Understand the expected behavior change
3. Check if tests are included
4. Check CI status

### During Review
1. High-level: does the approach make sense?
2. File-by-file: correctness and clarity
3. Cross-cutting: consistency, security, performance
4. Tests: adequate coverage?

### After Review
- Summarize overall assessment
- Distinguish blocking vs non-blocking feedback
- Approve with suggestions if only nits remain
- Request changes only for real concerns
