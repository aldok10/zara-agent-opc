---
type: tool
title: "ARIA Pattern Design"
---

# ARIA Pattern Design

## Purpose

Design accessible custom widget patterns using ARIA roles, states, properties, live regions, and focus management. Ensures interactive components work correctly with assistive technologies.

## When to Use

- Building custom interactive widgets (combobox, dialog, tabs, menu)
- Adding live region announcements for dynamic content
- Designing focus management for modals, drawers, or multi-step flows
- Fixing screen reader compatibility issues
- Implementing keyboard navigation patterns

## Prompt Template

```
CONTEXT:
- Component type: [combobox | dialog | tabs | menu | tree | grid | carousel | custom]
- Framework: [React | Vue | Svelte | Angular | vanilla]
- Assistive tech targets: [NVDA | JAWS | VoiceOver | TalkBack]
- Existing implementation: [native elements used vs fully custom]
- User interaction: [keyboard | mouse | touch | voice]

ARIA PATTERN DESIGN:
1. Role assignment
   - Appropriate role for the widget (WAI-ARIA Authoring Practices)
   - Container vs item roles (e.g., tablist/tab, menu/menuitem)
   - Implicit roles from native elements (prefer native)
   - Composite roles and ownership (aria-owns)

2. States and properties
   - aria-expanded, aria-selected, aria-checked (state tracking)
   - aria-controls, aria-describedby, aria-labelledby (relationships)
   - aria-activedescendant vs roving tabindex (focus model)
   - aria-hidden for decorative/duplicate content
   - aria-disabled vs HTML disabled attribute

3. Live regions
   - aria-live: polite (non-urgent) vs assertive (immediate)
   - aria-atomic: announce whole region vs just changes
   - aria-relevant: additions, removals, text, all
   - Status messages: role="status" or role="alert"
   - Debouncing announcements (avoid spam)

4. Focus management
   - Focus trap for modal/dialog (first focusable, last, loop)
   - Return focus on dismiss (restore to trigger element)
   - Skip links for repeated navigation
   - Focus visible indicator (:focus-visible)
   - Tab order: tabindex 0 (natural) vs -1 (programmatic)

5. Keyboard interaction
   - Arrow keys for composite widgets (tabs, menus, grids)
   - Enter/Space for activation
   - Escape for dismiss
   - Home/End for first/last
   - Type-ahead for lists

TESTING:
- Screen reader testing matrix (browser + AT combinations)
- Keyboard-only navigation verification
- axe-core / Lighthouse automated checks
- Manual flow testing with AT
```

## Output Format

```
## ARIA Design: [component name]

### Role Structure
[HTML outline with ARIA roles and relationships]

### State Management
| State | Trigger | Attribute | Announced As |
|-------|---------|-----------|-------------|
| ... | ... | ... | ... |

### Keyboard Map
| Key | Action | Context |
|-----|--------|---------|
| ... | ... | ... |

### Focus Strategy
- Initial focus: [where focus goes on open/mount]
- Tab order: [how focus moves within component]
- Restore: [where focus returns on close]

### Live Region Strategy
- Region: [what gets announced dynamically]
- Politeness: [polite/assertive with justification]
- Debounce: [timing if applicable]

### Implementation Notes
[Key code patterns for the chosen framework]

### Testing Checklist
- [ ] [Specific AT + browser combination to verify]
```
