---
type: tool
title: "Vue Composition API Migration"
---

# Vue Composition API Migration

## Purpose

Guide migration from Vue Options API to Composition API with composables. Covers lifecycle mapping, reactive state conversion, and extraction of reusable logic into composable functions.

## When to Use

- Converting Options API components to Composition API
- Extracting shared logic into composables (replacing mixins)
- Adopting script setup syntax
- Migrating from Vue 2 Options API to Vue 3 Composition API
- Designing composable architecture for a project

## Prompt Template

```
CONTEXT:
- Vue version: [2.7 | 3.3 | 3.4 | 3.5]
- Current API: [Options API | mixed | partial Composition]
- Component count: [approximate]
- Mixins in use: [count and complexity]
- State management: [Vuex | Pinia | custom]
- TypeScript: [yes | no | migrating]
- Build tool: [Vite | webpack | Nuxt]

MIGRATION PATH:
1. Script setup adoption
   - <script setup> vs defineComponent + setup()
   - defineProps, defineEmits, defineExpose
   - Compiler macros: defineModel (3.4+), defineSlots
   - Top-level await in async components

2. Reactivity conversion
   - data() -> ref() or reactive()
   - computed: {} -> computed()
   - watch: {} -> watch() or watchEffect()
   - ref for primitives, reactive for objects
   - toRefs for destructuring reactive objects
   - shallowRef/shallowReactive for performance

3. Lifecycle mapping
   - created -> script setup body (runs immediately)
   - mounted -> onMounted()
   - updated -> onUpdated()
   - beforeUnmount -> onBeforeUnmount()
   - No beforeCreate/created needed (setup IS creation)

4. Methods and logic
   - methods: {} -> plain functions in setup scope
   - Helpers and utilities: import directly
   - Template refs: const el = ref<HTMLElement>()
   - nextTick: import { nextTick } from 'vue'

5. Composable extraction
   - Replace mixins with composables (useXxx pattern)
   - Single responsibility per composable
   - Return reactive state + methods
   - Accept refs as arguments for reactivity
   - Lifecycle hooks work inside composables
   - VueUse as reference for conventions

6. Composable patterns
   - State composable: useCounter(), useToggle()
   - Side effect: useFetch(), useEventListener()
   - Integration: useLocalStorage(), useMediaQuery()
   - Convention: return object with state + actions
   - Cleanup: onScopeDispose for effect cleanup

MIXIN -> COMPOSABLE CONVERSION:
- Mixin data -> composable refs (returned)
- Mixin methods -> composable functions (returned)
- Mixin computed -> composable computed (returned)
- Mixin lifecycle hooks -> composable onMounted/etc (internal)
- Name conflicts: impossible with composables (explicit destructuring)

ANTI-PATTERNS:
- Putting everything in one composable (god composable)
- Mutating returned refs from outside the composable
- Over-using reactive() when ref() is clearer
- Not cleaning up side effects (event listeners, timers)
- Composable that requires specific component structure
```

## Output Format

```
## Composition Migration: [project/component]

### Options -> Composition Mapping
| Options API | Composition API | Notes |
|-------------|-----------------|-------|
| data() | ref()/reactive() | ... |
| computed | computed() | ... |
| watch | watch()/watchEffect() | ... |
| methods | functions | ... |
| mounted | onMounted() | ... |

### Composables to Extract
| Composable | Source (mixin/component) | Shared By |
|-----------|--------------------------|-----------|
| useAuth() | auth mixin | 12 components |
| ... | ... | ... |

### Example Conversion
[Before: Options API component]
[After: script setup with composables]

### Composable Architecture
[Diagram: which composables exist and their relationships]

### Migration Order
1. [Convert leaf components with no mixins]
2. [Extract mixins to composables]
3. [Convert components that used mixins]
4. [Convert remaining complex components]

### TypeScript Benefits
- [Type inference improvements with Composition API]
- [Generic composables for type-safe reuse]

### Testing Changes
- [How to test composables in isolation]
- [Component test adjustments]
```
