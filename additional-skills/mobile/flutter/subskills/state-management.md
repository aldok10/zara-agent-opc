---
type: subskill
title: "State Management"
---

# State Management

## Core Concepts

- Flutter state management controls how data flows through the widget tree and triggers rebuilds
- Local state (StatefulWidget) for ephemeral UI state: form inputs, animation controllers, scroll position
- App state (Provider, Riverpod, Bloc) for shared state: authentication, cart, user preferences
- Unidirectional flow: widgets read state and dispatch actions; state updates trigger rebuilds
- Lifting state up: move shared state to the lowest common ancestor of widgets that need it

## Key Practices

- Use Provider/Riverpod for dependency injection and state that multiple widgets share
- Keep state as close to where it's used as possible  -  don't over-centralize
- Separate UI state (loading, error, success) from domain state (the actual data)
- Use selectors/select to rebuild only widgets that depend on the specific piece of state that changed
- For complex flows: Bloc pattern separates events, state, and transition logic explicitly

## Common Mistakes

- Storing everything in global state: causes unnecessary rebuilds across unrelated widgets
- Rebuilding entire screens when only one field changes  -  missing granular subscriptions
- Mixing state management approaches inconsistently across the same app

## When to Apply

- Multiple widgets need access to the same changing data
- setState causes rebuilds that affect performance
- App complexity requires predictable, testable state transitions
- Team needs a consistent pattern for handling async operations (loading/error/success)
