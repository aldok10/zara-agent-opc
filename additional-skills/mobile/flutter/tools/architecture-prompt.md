---
type: tool
title: "Flutter Architecture Design Prompt"
---

# Flutter Architecture Design Prompt

Use this prompt to design or review Flutter app architecture including state management and project structure.

## Prompt

```
You are a Flutter architect designing or reviewing app architecture. Ensure clear separation of concerns, testability, and scalability.

Input:
- App type: [e-commerce, social, productivity, etc.]
- Scale: [number of screens, team size, expected growth]
- Current architecture: [existing patterns if any, or greenfield]
- State management: [BLoC/Riverpod/Provider/GetX/none decided]
- Backend: [REST/GraphQL/Firebase/Supabase]
- Requirements: [offline support, real-time, multi-platform, deep linking]

Design the architecture covering:

1. STATE MANAGEMENT SELECTION
   BLoC (recommended for large teams):
   - Events in, states out (unidirectional data flow)
   - Highly testable (test blocs without widgets)
   - Verbose but explicit
   - Best for: complex business logic, team conventions, enterprise

   Riverpod (recommended for flexibility):
   - Provider-based with compile-time safety
   - No BuildContext dependency for accessing state
   - Fine-grained rebuilds, auto-disposal
   - Best for: medium apps, rapid development, code generation

   Decision criteria:
   - Team familiarity and learning curve
   - App complexity (simple CRUD vs complex workflows)
   - Testing requirements (both are testable, BLoC more structured)
   - Code generation tolerance (Riverpod + Freezed)

2. LAYER ARCHITECTURE
   Presentation layer:
   - Widgets (UI only, no logic)
   - State holders (BLoC/Controller/Notifier)
   - Navigation (GoRouter with declarative routes)

   Domain layer:
   - Use cases / interactors (business logic)
   - Entities (domain models, immutable)
   - Repository interfaces (abstract contracts)

   Data layer:
   - Repository implementations
   - Data sources (remote API, local DB, cache)
   - DTOs (data transfer objects, mapping to/from domain)

   Dependency direction: Presentation -> Domain <- Data

3. PROJECT STRUCTURE
   Feature-first (recommended for medium-large apps):
   - lib/features/[feature]/presentation/
   - lib/features/[feature]/domain/
   - lib/features/[feature]/data/
   - lib/core/ (shared utilities, theme, constants)
   - lib/shared/ (shared widgets, shared domain)

   Layer-first (for small apps):
   - lib/presentation/
   - lib/domain/
   - lib/data/

4. REPOSITORY PATTERN
   - Interface in domain layer, implementation in data layer
   - Single source of truth: repository decides cache vs network
   - Error handling: return Either<Failure, Success> or Result type
   - Offline support: cache-first with background sync
   - Pagination: cursor-based with repository managing state

5. NAVIGATION
   - GoRouter for declarative, deep-link-friendly routing
   - Route guards for authentication
   - Nested navigation for tabbed interfaces
   - Path parameters for entity detail screens
   - Navigation state restoration

6. TESTING STRATEGY
   - Unit tests: blocs/notifiers with mock repositories
   - Widget tests: individual widgets with mock state
   - Integration tests: full user flows with mock backend
   - Golden tests: visual regression for shared components
   - Test coverage target: 80%+ for domain and state layers

Output format:
- Architecture diagram (text): layers and dependency arrows
- State management: choice + rationale
- Folder structure: tree view
- Key patterns: repository, error handling, DI setup
- Navigation design: route table
- Testing plan: what's tested at each layer
- Migration path (if refactoring existing app)
```
