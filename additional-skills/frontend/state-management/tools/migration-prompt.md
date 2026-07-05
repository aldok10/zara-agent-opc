---
type: tool
title: "State Management Migration"
---

# State Management Migration

## Purpose

Plan migration between state management libraries (Redux to Zustand, MobX to signals, etc.) with incremental adoption strategy. Covers coexistence patterns, data model mapping, and testing through transition.

## When to Use

- Migrating from Redux/Redux Toolkit to Zustand or Jotai
- Moving from MobX to framework signals (Solid, Angular, Svelte 5)
- Replacing context-heavy state with dedicated libraries
- Simplifying over-engineered state management
- Evaluating whether migration is worth the effort

## Prompt Template

```
CONTEXT:
- Current library: [Redux | Redux Toolkit | MobX | Vuex | Pinia | Recoil | XState]
- Target library: [Zustand | Jotai | Valtio | Pinia | signals | TanStack Store]
- Framework: [React | Vue | Svelte | Angular | Solid]
- Store count: [number of stores/slices/modules]
- Middleware/effects: [thunks | sagas | epics | custom middleware]
- Selectors: [memoized selectors count/complexity]
- Test coverage: [current state management test coverage]

MIGRATION STRATEGY:
1. Motivation assessment
   - What's wrong with current approach (boilerplate, performance, DX)
   - What the target solves specifically
   - Risk of migration vs risk of staying
   - Team learning curve for new library

2. Architecture mapping
   - Global store -> multiple small stores
   - Reducers -> store actions/mutations
   - Selectors -> derived state / computed
   - Middleware -> effects / subscriptions
   - DevTools integration equivalent

3. Coexistence strategy
   - Run both libraries in parallel during migration
   - Bridge adapter: sync state between old and new
   - Feature flag: toggle between implementations
   - Strangler pattern: new features use new library

4. Migration order
   - Start with leaf stores (fewest consumers)
   - Migrate one slice/store at a time
   - Update tests alongside implementation
   - Keep both passing until migration complete
   - Remove old code only after new is stable

5. Pattern translation
   - Redux action -> Zustand action method
   - Redux selector -> Zustand selector or useMemo
   - Redux thunk -> async action in store
   - Redux middleware -> subscription or custom hook
   - MobX observable -> signal/atom
   - MobX computed -> derived/computed signal
   - MobX reaction -> effect/watch

6. Testing migration
   - Test behavior, not implementation
   - Integration tests should be unchanged
   - Unit tests for store logic need rewriting
   - Snapshot tests may need updates

DECISION FRAMEWORK:
- Migrate if: boilerplate > 50% of state code, DX is blocking, team consensus
- Don't migrate if: working fine, team unfamiliar, deadline pressure
- Partial: adopt new for new features, leave stable old code alone
```

## Output Format

```
## State Migration: [current] -> [target]

### Motivation
[Why migrating, what improves, what stays same]

### Pattern Mapping
| Current Pattern | Target Equivalent | Notes |
|----------------|-------------------|-------|
| ... | ... | ... |

### Migration Phases
| Phase | Scope | Duration | Risk |
|-------|-------|----------|------|
| ... | ... | ... | ... |

### Coexistence Setup
[How both libraries run during transition]

### Example Conversion
[Before (old library) and After (new library) for one store]

### Testing Strategy
- [What tests change and what stays stable]
- [New testing patterns for target library]

### Rollback Plan
- [How to revert if issues arise mid-migration]

### Success Criteria
- [ ] All stores migrated
- [ ] Tests green
- [ ] Bundle size change: [expected]
- [ ] DevTools functioning
- [ ] Old library removed from dependencies
```
