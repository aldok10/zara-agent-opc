---
type: fact
title: "WCAG 2.2 AA Compliance Checklist"
---

# WCAG 2.2 AA Compliance Checklist

## New Success Criteria in 2.2

### 2.4.11 Focus Not Obscured (Minimum) - AA
- Focused element is not entirely hidden by author-created content
- Sticky headers/footers must not fully cover focused items
- Test: tab through page, verify focus target is always partially visible

### 2.4.12 Focus Not Obscured (Enhanced) - AAA
- Focused element is fully visible (no partial coverage)

### 2.4.13 Focus Appearance - AAA
- Focus indicator has minimum area (2px perimeter outline or equivalent)
- Contrast ratio of 3:1 between focused/unfocused states

### 2.5.7 Dragging Movements - AA
- Any dragging operation has a single-pointer alternative
- Drag-and-drop sortable lists need up/down buttons or similar
- Test: disable mouse, verify all drag operations work via click/tap

### 2.5.8 Target Size (Minimum) - AA
- Interactive targets are at least 24x24 CSS pixels
- Exceptions: inline text links, user-agent controls, essential sizing
- Spacing can count: 24px including margin between targets

### 3.2.6 Consistent Help - A
- Help mechanisms appear in the same relative order across pages
- Includes: contact info, chat, FAQ links, self-help options

### 3.3.7 Redundant Entry - A
- Don't ask for the same info twice in a process
- Auto-populate or allow selection from previously entered data
- Exceptions: security re-confirmation, expired data

### 3.3.8 Accessible Authentication (Minimum) - AA
- No cognitive function test for login (memory, transcription, puzzle)
- Allowed: password managers, copy-paste, OAuth, biometrics
- CAPTCHAs must have an alternative that doesn't require cognition

### 3.3.9 Accessible Authentication (Enhanced) - AAA
- No object/image recognition tests for auth either

## Core AA Criteria (Carried from 2.1)

### Perceivable
- 1.1.1: Non-text content has text alternatives
- 1.2.1-5: Time-based media has captions, audio descriptions
- 1.3.1-5: Info, relationships, sequence conveyed programmatically
- 1.4.1: Color is not sole means of conveying info
- 1.4.3: Text contrast 4.5:1 (large text 3:1)
- 1.4.4: Text resizable to 200% without loss
- 1.4.5: Images of text avoided
- 1.4.10: Content reflows at 320px width
- 1.4.11: Non-text contrast 3:1 (UI components, graphics)
- 1.4.12: Text spacing adjustable without loss
- 1.4.13: Hover/focus content dismissible, hoverable, persistent

### Operable
- 2.1.1-2: All functionality keyboard accessible, no traps
- 2.2.1-2: Timing adjustable, pause/stop moving content
- 2.3.1: No flashing >3 times/second
- 2.4.1-7: Skip links, page titles, focus order, link purpose
- 2.5.1-4: Pointer gestures have alternatives, motion not required

### Understandable
- 3.1.1-2: Page language declared, parts identified
- 3.2.1-4: Predictable navigation, consistent identification
- 3.3.1-4: Error identification, labels, suggestions, prevention

### Robust
- 4.1.2: Name, role, value for all UI components
- 4.1.3: Status messages announced without focus change

## Testing Priority Order

1. Keyboard navigation (catches ~40% of issues)
2. Screen reader compatibility (NVDA/VoiceOver)
3. Color contrast (automated tools catch most)
4. Focus management (SPA route changes, modals)
5. Form error handling and labels
6. Responsive/reflow behavior
7. Motion and animation preferences
8. Touch target sizing

## Common Failures

| Criterion | Failure Pattern |
|-----------|----------------|
| 1.4.3 | Placeholder-only labels with low contrast |
| 2.4.7 | Custom focus styles removed, :focus-visible missing |
| 4.1.2 | Custom components without ARIA roles |
| 1.3.1 | Heading hierarchy skipped (h1 -> h3) |
| 2.5.8 | Icon buttons under 24px without spacing |
| 3.3.8 | CAPTCHA without alternative path |

## Automated vs Manual Split

**Automated (30-40% of issues):**
- Color contrast
- Missing alt text
- Missing form labels
- Duplicate IDs
- Language declaration

**Manual required (60-70%):**
- Meaningful alt text quality
- Keyboard interaction patterns
- Screen reader announcement order
- Focus management in dynamic content
- Cognitive load assessment
