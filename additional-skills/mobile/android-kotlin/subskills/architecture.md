---
type: subskill
title: "Architecture"
---

# Architecture

## Core Concepts

- Android architecture separates UI, domain logic, and data access into distinct layers
- Unidirectional data flow: events flow up (UI -> ViewModel), state flows down (ViewModel -> UI)
- ViewModel survives configuration changes; it holds UI state and orchestrates use cases
- Repository pattern abstracts data sources: network, local database, cache  -  ViewModel doesn't know which
- Dependency injection (Hilt/Koin) provides testability and decouples layer implementations

## Key Practices

- UI layer: composables observe state, emit user actions  -  zero business logic
- ViewModel: transforms domain data into UI state, handles user actions, exposes StateFlow
- Domain layer (optional): use cases encapsulate business rules shared across ViewModels
- Data layer: repositories coordinate remote and local sources, handle caching strategy
- Module boundaries: feature modules depend on shared/domain, never on each other

## Common Mistakes

- Putting business logic in Activities/Fragments/Composables  -  untestable and lifecycle-fragile
- ViewModels directly calling Retrofit/Room  -  couples presentation to implementation details
- Skipping the repository layer: makes it impossible to test ViewModel without network/database

## When to Apply

- Starting a new Android project or feature module
- Existing code has lifecycle bugs (crashes on rotation, state loss)
- Team needs consistent patterns across multiple developers/features
- Preparing for testability: unit testing ViewModels requires clean separation
