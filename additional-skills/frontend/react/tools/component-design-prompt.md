---
type: tool
title: "React Component API Design"
---

# React Component API Design

## Purpose

Design React component APIs (props, composition patterns, render strategies) that are flexible, type-safe, and consistent. Guides decisions on prop design, children patterns, and component composition.

## When to Use

- Designing a reusable component for a design system or shared library
- Choosing between render props, compound components, and HOCs
- Defining prop interfaces for complex components
- Refactoring a component that has grown too many props
- Deciding on controlled vs uncontrolled patterns

## Prompt Template

```
CONTEXT:
- Component purpose: [what it renders and what interactions it supports]
- Consumers: [internal team | design system users | open source]
- Flexibility needed: [fixed design | customizable | fully headless]
- State ownership: [controlled | uncontrolled | hybrid]
- Framework: [React 18 | React 19 | React Native]
- Styling approach: [CSS modules | Tailwind | styled | unstyled/headless]

DESIGN DECISIONS:
1. Props interface
   - Required vs optional (minimize required)
   - Discriminated unions for variant-driven behavior
   - Callback naming: onAction pattern (onClick, onChange)
   - Ref forwarding: forwardRef for DOM-wrapping components
   - Polymorphic "as" prop for element type flexibility
   - Rest props spreading (...rest) for DOM passthrough

2. Composition patterns
   - Compound components: Parent + Child with shared context
   - Render props: function-as-child for render control
   - Slots pattern: named children via props (header, footer)
   - Hooks extraction: useComponent for headless logic
   - Provider pattern: context for deep prop sharing

3. Controlled vs uncontrolled
   - Uncontrolled with defaultValue for simple cases
   - Controlled with value + onChange for form integration
   - Hybrid: support both, detect via undefined check
   - useControllableState hook for dual-mode components

4. Render optimization
   - Memo boundaries: where to React.memo
   - Callback stability: useCallback for passed handlers
   - Context splitting: separate state from dispatch
   - Children as props vs children (re-render implications)
   - Lazy/Suspense boundaries for heavy components

5. Accessibility
   - ARIA props passthrough or built-in
   - Keyboard handlers included by default
   - Focus management for interactive components
   - Label association (id, htmlFor, aria-labelledby)

6. Type safety
   - Generic components for flexible data types
   - Discriminated unions over boolean flags
   - Strict event handler typing
   - Overloaded signatures for polymorphic components

ANTI-PATTERNS:
- Boolean prop explosion (isLoading, isDisabled, isActive, isOpen...)
- String unions where children/composition works better
- Prop drilling more than 2 levels (use composition or context)
- className + style + sx + theme prop all on same component
- Internal state that can't be controlled externally when needed
```

## Output Format

```
## Component Design: [ComponentName]

### API Surface
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| ... | ... | ... | ... |

### Composition Pattern
[Which pattern and why: compound/render prop/hooks/slots]

### Usage Examples
[2-3 usage examples showing simple, medium, and advanced cases]

### Type Definition
[TypeScript interface/type for the component props]

### Render Strategy
- Memo: [where and why]
- Context: [what's shared, splitting strategy]
- Performance: [key optimizations]

### Accessibility
- Role: [ARIA role if custom widget]
- Keyboard: [interaction model]
- Labels: [association strategy]

### Migration Notes (if redesigning existing)
- [Breaking changes from current API]
- [Codemod or adapter approach]
```
