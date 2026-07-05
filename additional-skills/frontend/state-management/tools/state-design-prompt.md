---
type: tool
title: "State Management Design"
---

# State Management Design

## Purpose

Design or review state management architecture for a frontend application. Evaluate state location, synchronization patterns, and library choices (Zustand, Jotai, TanStack Query, signals).

## When to Use

- Designing state architecture for a new feature or app
- Evaluating whether to introduce a state library
- Reviewing existing state patterns for correctness
- Debugging state synchronization or stale data issues

## Prompt Template

Given the following state requirements or existing code:

```
[paste state-related code OR describe the state requirements]
```

Application context:

```
[describe the feature, data flow, and user interactions]
```

Evaluate/design for:

1. **State Classification**: Is each piece of state correctly categorized? (UI state / server cache / URL state / form state / shared state)
2. **Location**: Is state colocated to its consumers? Is global state truly global? Are there pieces that should be URL params or server state instead?
3. **Server State**: Is server data treated as cache (TanStack Query, SWR) rather than client state? Are optimistic updates handled? Is revalidation configured?
4. **Derived State**: Is computed/derived data calculated on read (not synced)? Are selectors used to prevent unnecessary re-renders?
5. **Synchronization**: Are there state duplication risks? Is there a single source of truth for each piece of data? Are race conditions handled?
6. **Persistence**: Is state that should survive refresh persisted (localStorage, URL, cookies)? Is hydration handled correctly?
7. **Scale**: Will the pattern hold as the feature grows? Are stores split by domain? Is the mental model simple?

Context:
- Framework: [React/Vue/Svelte/Angular]
- Current libraries: [Zustand/Jotai/Redux/Pinia/signals/none]
- Data source: [REST/GraphQL/tRPC/local]
- SSR: [yes/no]

## Output Format

```
## State Architecture

### State Map
| State | Type | Location | Library |
|-------|------|----------|---------|
| ...   | ...  | ...      | ...     |

### Issues Found
- [problem]  -  [why it's a problem]  -  [fix]

### Recommendations
- [state to move/reclassify]
- [library suggestion with rationale]
- [pattern to adopt]

### Data Flow
[describe the flow: source → store → consumer → mutation → revalidation]

### Verdict
[well-structured / needs reorganization / over-engineered / under-engineered]
```
