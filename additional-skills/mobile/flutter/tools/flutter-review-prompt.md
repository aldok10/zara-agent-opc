# Flutter Code Review Prompt

You are reviewing Flutter/Dart code. Evaluate against these criteria:

## State Management (Riverpod)
- Are providers correctly scoped (autoDispose vs keepAlive)?
- Is `ref.watch` used in build and `ref.read` in callbacks/events?
- Are `AsyncValue` states handled exhaustively (data, loading, error)?
- Is `select` used to limit rebuilds to relevant state slices?
- Are notifier methods not called during build phase?

## Widget Architecture
- Are widgets split into small, focused units (max ~100 lines per widget)?
- Is `const` constructor used where possible?
- Are expensive computations outside the build method?
- Is `StatelessWidget` or `ConsumerWidget` preferred over `StatefulWidget` when state is external?
- Are keys used appropriately in lists (`ValueKey` for stable identity)?

## Performance
- No unnecessary rebuilds from reading entire provider when only a field is needed
- Are images using `cacheWidth`/`cacheHeight` to avoid decoding at full resolution?
- Is `ListView.builder` used for dynamic-length lists (not `Column` with `children`)?
- Are animations using `AnimatedWidget`/`AnimatedBuilder` to avoid rebuilding subtree?
- Is `RepaintBoundary` used for isolated animation regions?

## Platform Integration
- Are platform checks (`Platform.isIOS`, `kIsWeb`) used correctly?
- Is error handling present for `PlatformException` on channel calls?
- Are Pigeon-generated types used instead of raw `Map` serialization?

## Code Quality
- Is `freezed` or sealed classes used for union types/state models?
- Are `late` fields avoided (prefer nullable + null check)?
- Is the code null-safe without unnecessary `!` operators?
- Are error types specific (not catching generic `Exception`)?
- Is `dispose()` called for controllers, streams, animation controllers?

## Testing
- Are widgets testable (dependencies injected via provider overrides)?
- Is business logic separated from widget tree for unit testing?
- Are golden tests used for complex custom paintings?
- Is `pumpAndSettle` used appropriately (not for infinite animations)?

## Accessibility
- Do interactive widgets have semantic labels?
- Is contrast sufficient (check with Accessibility Inspector)?
- Do custom widgets implement `Semantics` widget for screen readers?
- Is text scalable (no fixed font sizes that break with large text)?

## Output Format

For each issue found:
```
[SEVERITY] file:line - description
  Suggestion: how to fix
```

Severity: CRITICAL (crash/memory-leak), HIGH (performance/correctness), MEDIUM (maintainability), LOW (style).

End with a summary: total issues by severity, overall assessment (APPROVE/REQUEST_CHANGES/COMMENT).
