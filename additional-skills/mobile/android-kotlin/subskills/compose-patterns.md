---
type: subskill
title: "Compose Patterns"
---

# Compose Patterns

## Core Concepts

- Jetpack Compose uses a declarative model: UI is a function of state, not a mutation sequence
- Recomposition happens when state changes — only affected composables re-execute
- Composition over inheritance: combine small composables rather than extending base components
- State hoisting: move state up to the caller, pass it down as parameters
- Side effects (LaunchedEffect, DisposableEffect) bridge the gap between composition and imperative code

## Key Practices

- Keep composables stateless by default: accept state as parameters, emit events as lambdas
- Use `remember` for local UI state; use ViewModel for business state that survives configuration changes
- Extract reusable composables at the right granularity: too small = boilerplate, too large = rigid
- Use Modifier chains for layout/styling — don't bake dimensions into composable internals
- Preview composables with `@Preview` using different states to verify appearance

## Common Mistakes

- Performing heavy computation inside composables without `remember` or `derivedStateOf`
- Passing mutable state downward instead of hoisting it — breaks unidirectional data flow
- Creating composables that directly access ViewModels — kills reusability and testability

## When to Apply

- Building new Android UI screens or components
- Migrating from XML-based layouts to Compose
- UI performance issues caused by unnecessary recompositions
- Designing a component library for a multi-module Android app
