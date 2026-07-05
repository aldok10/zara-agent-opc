---
type: fact
title: "WCAG 2.2 AA Checklist"
---

# WCAG 2.2 AA Criteria Checklist

## Perceivable

### 1.1 Text Alternatives
- **1.1.1 Non-text Content** (A): All images, icons, charts have text alternatives. Decorative = `alt=""`.

### 1.2 Time-based Media
- **1.2.1 Audio/Video (prerecorded)** (A): Captions or transcript.
- **1.2.2 Captions** (A): Synchronized captions for video with audio.
- **1.2.3 Audio Description** (A): Description of visual content in video.
- **1.2.5 Audio Description (prerecorded)** (AA): Audio description for all prerecorded video.

### 1.3 Adaptable
- **1.3.1 Info and Relationships** (A): Structure conveyed programmatically (headings, lists, tables, form labels).
- **1.3.2 Meaningful Sequence** (A): DOM order = logical reading order.
- **1.3.3 Sensory Characteristics** (A): Instructions don't rely solely on shape, size, position, or sound.
- **1.3.4 Orientation** (AA): Content not restricted to single orientation.
- **1.3.5 Identify Input Purpose** (AA): Input fields have appropriate `autocomplete` values.

### 1.4 Distinguishable
- **1.4.1 Use of Color** (A): Color not sole means of conveying information.
- **1.4.2 Audio Control** (A): Auto-playing audio can be paused/stopped.
- **1.4.3 Contrast (Minimum)** (AA): Text 4.5:1, large text 3:1.
- **1.4.4 Resize Text** (AA): Text resizable to 200% without loss of function.
- **1.4.5 Images of Text** (AA): Use real text, not images of text.
- **1.4.10 Reflow** (AA): Content reflows at 320px width (no horizontal scroll).
- **1.4.11 Non-text Contrast** (AA): UI components and graphics 3:1 against adjacent colors.
- **1.4.12 Text Spacing** (AA): No loss of content when user adjusts line-height (1.5x), paragraph spacing (2x), letter spacing (0.12em), word spacing (0.16em).
- **1.4.13 Content on Hover/Focus** (AA): Dismissible, hoverable, persistent.

## Operable

### 2.1 Keyboard
- **2.1.1 Keyboard** (A): All functionality available via keyboard.
- **2.1.2 No Keyboard Trap** (A): Focus can always be moved away.
- **2.1.4 Character Key Shortcuts** (A): Single-char shortcuts can be turned off/remapped.

### 2.2 Enough Time
- **2.2.1 Timing Adjustable** (A): Time limits can be extended (20sec warning minimum).
- **2.2.2 Pause, Stop, Hide** (A): Moving/auto-updating content can be paused.

### 2.3 Seizures
- **2.3.1 Three Flashes** (A): Nothing flashes more than 3 times/second.

### 2.4 Navigable
- **2.4.1 Bypass Blocks** (A): Skip navigation link or landmarks.
- **2.4.2 Page Titled** (A): Descriptive page `<title>`.
- **2.4.3 Focus Order** (A): Focus order preserves meaning.
- **2.4.4 Link Purpose (in Context)** (A): Link text describes destination.
- **2.4.5 Multiple Ways** (AA): Multiple ways to find pages (nav, search, sitemap).
- **2.4.6 Headings and Labels** (AA): Descriptive headings and labels.
- **2.4.7 Focus Visible** (AA): Keyboard focus indicator always visible.
- **2.4.11 Focus Not Obscured (Minimum)** (AA) [NEW 2.2]: Focused element not entirely hidden by other content.
- **2.4.12 Focus Not Obscured (Enhanced)** (AAA) [NEW 2.2]: No part of focused element hidden.
- **2.4.13 Focus Appearance** (AAA) [NEW 2.2]: Focus indicator meets size and contrast requirements.

### 2.5 Input Modalities
- **2.5.1 Pointer Gestures** (A): Multi-point/path gestures have single-pointer alternative.
- **2.5.2 Pointer Cancellation** (A): Down-event doesn't trigger action (use click/up).
- **2.5.3 Label in Name** (A): Accessible name contains visible text.
- **2.5.4 Motion Actuation** (A): Motion-triggered actions have UI alternative.
- **2.5.7 Dragging Movements** (AA) [NEW 2.2]: Drag operations have click/tap alternative.
- **2.5.8 Target Size (Minimum)** (AA) [NEW 2.2]: Targets at least 24x24 CSS pixels (with exceptions for inline, spacing, user agent, essential).

## Understandable

### 3.1 Readable
- **3.1.1 Language of Page** (A): `<html lang="en">` declared.
- **3.1.2 Language of Parts** (AA): `lang` attribute on foreign-language passages.

### 3.2 Predictable
- **3.2.1 On Focus** (A): Focus doesn't trigger context change.
- **3.2.2 On Input** (A): Input doesn't trigger unexpected context change.
- **3.2.6 Consistent Help** (A) [NEW 2.2]: Help mechanisms in consistent relative location across pages.

### 3.3 Input Assistance
- **3.3.1 Error Identification** (A): Errors described in text, field identified.
- **3.3.2 Labels or Instructions** (A): Inputs have labels or instructions.
- **3.3.3 Error Suggestion** (AA): Provide correction suggestions when known.
- **3.3.4 Error Prevention (Legal, Financial)** (AA): Reversible, checked, or confirmed.
- **3.3.7 Redundant Entry** (A) [NEW 2.2]: Don't re-ask for previously entered info (auto-populate or select).
- **3.3.8 Accessible Authentication (Minimum)** (AA) [NEW 2.2]: No cognitive function test (memory, puzzle) for auth. Allow paste, password managers, WebAuthn.

## Implementation Notes for New 2.2 Criteria

| Criterion | Quick Implementation |
|-----------|---------------------|
| 2.4.11 Focus Not Obscured | `scroll-margin`, avoid `position:sticky` over focus, `z-index` management |
| 2.5.7 Dragging | Add click-to-place alternative for any drag-and-drop |
| 2.5.8 Target Size | `min-width: 24px; min-height: 24px` on interactive elements, or 24px spacing between smaller targets |
| 3.3.7 Redundant Entry | Pre-fill from session/previous step, offer "same as" checkboxes |
| 3.3.8 Accessible Auth | Support paste in password fields, no CAPTCHA without alternative, support WebAuthn |
| 3.2.6 Consistent Help | Place help links/chat in same location across all pages |
