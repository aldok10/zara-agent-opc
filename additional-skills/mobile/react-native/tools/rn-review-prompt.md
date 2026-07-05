# React Native Code Review Prompt

You are reviewing React Native (TypeScript) code. Evaluate against these criteria:

## Architecture (New Architecture)
- Is the project using Fabric/TurboModules (New Architecture) where applicable?
- Are native modules defined with proper TypeScript specs for Codegen?
- Is `setNativeProps` avoided (deprecated in Fabric)?
- Are platform-specific files using `.ios.ts`/`.android.ts` extensions where needed?

## Performance
- Are expensive computations memoized with `useMemo`/`useCallback`?
- Are list items using `React.memo` with proper comparison?
- Is `FlatList` used over `ScrollView` + `map` for dynamic lists?
- Are inline object/array literals avoided in JSX props (cause unnecessary re-renders)?
- Are images optimized (`expo-image` or `FastImage` with proper sizing)?
- Are Reanimated animations running on UI thread (no `runOnJS` in hot paths)?

## Navigation (Expo Router)
- Are routes properly typed with `useLocalSearchParams<T>()`?
- Are deep links handled with proper route structure?
- Is navigation state persisted for development (but not production)?
- Are screens lazy-loaded where appropriate?

## State Management
- Is global state minimal (only what needs to be shared)?
- Are side effects isolated from render (no fetch in render, use useEffect)?
- Is form state local (not in global store)?
- Are subscriptions cleaned up in useEffect return?

## Animations (Reanimated)
- Are shared values used instead of Animated.Value (old API)?
- Is `useAnimatedStyle` not reading non-shared values (causes re-render)?
- Are gesture handlers using Gesture API (v2) not old `onGestureEvent`?
- Is `cancelAnimation` called before starting conflicting animations?

## Platform Safety
- Are platform-specific behaviors handled (keyboard avoidance, safe area, status bar)?
- Is `SafeAreaView` or `useSafeAreaInsets` used for notch/island devices?
- Are touch targets at least 44x44 points?
- Is the app testable with screen readers (accessibilityLabel, role)?

## TypeScript
- Are component props typed (no `any`)?
- Are event handlers properly typed?
- Are API responses validated (zod/io-ts) at boundary?
- Are navigation params type-safe?

## Security
- Are secrets NOT in JS bundle (use environment variables via EAS or config)?
- Is sensitive data stored in `expo-secure-store` (not AsyncStorage)?
- Are API calls using HTTPS?
- Is user input sanitized before display (XSS in WebView)?

## Output Format

For each issue found:
```
[SEVERITY] file:line - description
  Suggestion: how to fix
```

Severity: CRITICAL (crash/security), HIGH (performance/correctness), MEDIUM (maintainability), LOW (style).

End with a summary: total issues by severity, overall assessment (APPROVE/REQUEST_CHANGES/COMMENT).
