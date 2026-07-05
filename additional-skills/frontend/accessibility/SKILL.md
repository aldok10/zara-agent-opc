---
name: accessibility
description: "Web accessibility: WCAG 2.2, ARIA patterns, keyboard, screen readers, automated testing"
---

# Accessibility

Build inclusive interfaces that work for everyone. WCAG 2.2 AA minimum.

## Scope

- Semantic HTML and ARIA patterns
- Keyboard navigation and focus management
- Screen reader compatibility
- Automated and manual accessibility testing
- Form accessibility and error handling
- Dynamic content announcements

## First Action

Audit the component/page: run axe-core, check keyboard flow, verify semantic structure. Fix issues by severity (critical > serious > moderate).

## Constraints

1. Semantic HTML first. ARIA only when no native element provides the semantics.
2. WCAG 2.2 AA minimum. All interactive elements keyboard-operable.
3. Focus management: trap focus in modals, restore on close, visible focus indicator.
4. Images: meaningful = alt text; decorative = `alt=""` or `aria-hidden="true"`.
5. Forms: every input has visible label. Errors linked with `aria-describedby`.
6. Color is never the only indicator.
7. axe-core catches 30-40%. Manual testing with screen reader + keyboard required.
8. `aria-live` regions for dynamic content (polite for updates, assertive for errors).
9. Respect `prefers-reduced-motion` for animations.
10. WCAG 2.2 new: Target size >=24px, focus not obscured, dragging alternatives, no cognitive auth tests.
11. Use `inert` attribute for modal background (replaces focus-trap libraries).

## DO NOT

- Use `div` or `span` for interactive elements
- Add ARIA that duplicates native semantics (`role="button"` on `<button>`)
- Disable focus outlines without providing a visible alternative
- Use `tabindex` > 0
- Rely solely on automated testing for compliance claims
- Use placeholder as label
- Hide content with `display:none` that screen readers need

## Route to Subskill

| Trigger | Subskill |
|---------|----------|
| ARIA roles, widgets, live regions | `subskills/aria-patterns.md` |
| Keyboard nav, focus, skip links | `subskills/keyboard.md` |
| Testing, CI, auditing | `subskills/testing-a11y.md` |
| Form inputs, validation, errors | `subskills/forms.md` |

## Verification

1. axe-core returns 0 violations (critical + serious)
2. All interactive elements reachable and operable via keyboard
3. Screen reader announces content in logical order
4. Focus visible at all times during keyboard navigation
5. No ARIA misuse (validator passes)

## Knowledge

- `knowledge/wcag22-checklist.md` - Full AA criteria with implementation notes
- `knowledge/aria-reference.md` - Roles, states, properties quick reference
- `knowledge/common-mistakes.md` - Top 12 mistakes with fixes

## AI-Era Context (2026)

- AI-generated UI frequently fails WCAG -- divs with onClick instead of buttons, missing labels, no focus management
- Automated axe-core catches only 30-40% of accessibility issues; manual keyboard + screen reader testing is required
- AI adds redundant ARIA (role="button" on button, aria-label duplicating visible text) -- strip it
- WCAG 2.2 additions (target size, focus-not-obscured, dragging alternatives) are often missed by AI
- The `inert` attribute is widely supported now -- AI still generates complex focus-trap JS libraries

## Related Skills

- `frontend/design-system` - Component-level accessibility patterns
- `testing-strategy` - Integration of a11y into test pipeline
