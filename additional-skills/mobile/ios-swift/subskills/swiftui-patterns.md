---
type: subskill
title: "SwiftUI Patterns"
---

# SwiftUI Patterns

## Core Concepts

- SwiftUI is declarative: views are value types that describe UI as a function of state
- The view hierarchy is re-evaluated when state changes; SwiftUI diffs and applies minimal updates
- Property wrappers (@State, @Binding, @ObservedObject, @StateObject, @Environment) control data flow
- Composition: build complex views from small, focused view components
- View identity (structural vs explicit) determines what SwiftUI considers "the same view" across updates

## Key Practices

- Use @State for local, view-owned state; @Binding to share write access with child views
- Use @StateObject for reference-type models owned by the view; @ObservedObject when passed in
- Extract subviews by creating new View structs  -  prefer this over computed properties for complex UI
- Use @Environment for app-wide dependencies (color scheme, locale, custom services)
- Keep view body pure: no side effects  -  use .task or .onAppear for async work

## Common Mistakes

- Using @ObservedObject when @StateObject is needed  -  causes object recreation on parent redraw
- Putting heavy logic in body: it re-evaluates on every state change
- Over-using @EnvironmentObject: creates implicit dependencies that are hard to trace

## When to Apply

- Building any new iOS/macOS UI with SwiftUI
- Designing reusable view components for a design system
- Debugging unexpected view re-renders or state loss
- Migrating from UIKit to SwiftUI incrementally
