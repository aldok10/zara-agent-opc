---
type: tool
title: "Compose Code Review Prompt"
---

# Compose Code Review Prompt

You are reviewing Jetpack Compose (Kotlin) code. Evaluate against these criteria:

## State Management
- Is state hoisted appropriately? (stateless composables for testability)
- Are side effects using the correct Effect handler (LaunchedEffect vs rememberCoroutineScope)?
- Is StateFlow collected with `collectAsStateWithLifecycle()`?
- Are derived values using `derivedStateOf` instead of recomputing on every recomposition?

## Performance
- Are lambda parameters stable (no inline lambda allocations in hot paths)?
- Does the code read state as late as possible to minimize recomposition scope?
- Are lazy list items using stable keys?
- Is `Modifier.offset { }` (lambda variant) used for animated offsets instead of recomposing?
- Are large lists using `LazyColumn`/`LazyRow` instead of `Column`/`Row`?

## Architecture
- Is UI logic separated from business logic (ViewModel handles business, composable handles UI)?
- Are navigation arguments type-safe (serializable route classes)?
- Is the unidirectional data flow pattern maintained (events up, state down)?

## Compose-Specific
- No `@Composable` functions with side effects outside Effect handlers
- No mutable state read from multiple threads without synchronization
- `remember` used for expensive calculations; not overused for trivial values
- Previews provided for reusable components with sample data

## Testing
- Are stateless composables unit-testable without ViewModel?
- Are semantic properties (testTag, contentDescription) applied for test/accessibility?

## Output Format

For each issue found:
```
[SEVERITY] file:line - description
  Suggestion: how to fix
```

Severity: CRITICAL (crash/bug), HIGH (performance/correctness), MEDIUM (maintainability), LOW (style).

End with a summary: total issues by severity, overall assessment (APPROVE/REQUEST_CHANGES/COMMENT).
