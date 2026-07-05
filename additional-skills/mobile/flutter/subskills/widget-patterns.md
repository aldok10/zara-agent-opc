---
type: subskill
title: "Widget Patterns"
---

# Widget Patterns

## Core Concepts

- Everything in Flutter is a widget: layout, styling, gestures, animation  -  composed via nesting
- StatelessWidget for pure UI derived from inputs; StatefulWidget when local mutable state is needed
- Composition over inheritance: combine small widgets rather than creating deep class hierarchies
- The widget tree is a description; Flutter's framework diffs and renders efficiently
- Keys control widget identity: use them when reordering or conditionally including widgets in lists

## Key Practices

- Extract widgets into named classes when they have distinct responsibility  -  not just for line count
- Use `const` constructors to enable compile-time constant widgets that skip rebuilds
- Prefer composition: wrap widgets with Padding, Center, Expanded rather than adding params to custom widgets
- Use Builder widgets (LayoutBuilder, AnimatedBuilder) to scope rebuilds to only what changed
- Keep build methods short and focused  -  extract helper methods or child widgets when complexity grows

## Common Mistakes

- Putting heavy logic in build(): it runs on every frame during animations
- Deep nesting without extraction: 10+ indent levels make code unreadable and hard to maintain
- Overusing StatefulWidget when state belongs in a state management solution above

## When to Apply

- Building any Flutter UI  -  widget composition is the fundamental pattern
- Refactoring large build methods into maintainable, reusable components
- Performance optimization: reducing unnecessary rebuilds in widget subtrees
- Designing a shared component library for a multi-team Flutter project
