---
type: subskill
title: "Performance"
---

# Performance

## Core Concepts

- React Native performance bottlenecks occur at: bridge serialization, JS thread, UI thread, or re-renders
- The JS thread runs business logic; the UI thread renders native views  -  blocking either causes jank
- New Architecture (Fabric + TurboModules) eliminates async bridge overhead with synchronous JSI calls
- Re-renders cascade: a parent re-rendering causes all children to re-render unless memoized
- 60fps = 16ms per frame budget  -  any operation exceeding this on the UI thread drops frames

## Key Practices

- Use React.memo and useMemo to prevent unnecessary re-renders of expensive components
- Move heavy computations off the JS thread: use native modules or web workers (via JSI)
- FlatList over ScrollView for long lists: virtualization renders only visible items
- Use useCallback for event handlers passed as props  -  prevents child re-renders from new references
- Profile with Flipper/React DevTools: measure before optimizing, don't guess the bottleneck

## Common Mistakes

- Inline object/array creation in render: `style={{flex: 1}}` creates new reference every render
- Not using keyExtractor in FlatList: causes full list re-render on data changes
- Running animations on the JS thread: use Reanimated or native driver for 60fps animations

## When to Apply

- UI feels sluggish: dropped frames visible during scrolling or transitions
- FlatList with 100+ items shows scroll jank
- App startup time exceeds acceptable threshold (> 2-3 seconds to interactive)
- Profiling reveals excessive re-renders or long JS thread blocking
