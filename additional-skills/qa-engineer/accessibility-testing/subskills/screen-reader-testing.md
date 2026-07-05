---
type: subskill
title: "Screen Reader Testing"
---

# Screen Reader Testing

## VoiceOver (macOS)

- Toggle: `Cmd + F5`
- Navigate: `VO + Right/Left` (VO = Ctrl + Option)
- Headings: `VO + Cmd + H`
- Links: `VO + Cmd + L`
- Form controls: `VO + Cmd + J`
- Rotor: `VO + U` (list headings, links, landmarks)
- Web rotor: `VO + Shift + Down` to interact with web content

Workflow: open page > Rotor to check headings > tab through forms > verify live regions update.

## NVDA (Windows)

- Toggle: `Insert` (NVDA key)
- Browse mode: automatic in web content
- Elements list: `NVDA + F7` (headings, links, landmarks)
- Headings: `H` / `Shift + H`
- Landmarks: `D` / `Shift + D`
- Forms mode: `Enter` on form field, `Escape` to exit

Workflow: elements list for structure > single-letter nav > form interaction > aria-live verification.

## TalkBack (Android)

- Swipe right/left: next/previous element
- Double-tap: activate
- Swipe up then down: local context menu
- Read from top: three-finger tap
- Test with both gesture and switch access

## What to Verify

- **Heading hierarchy**: h1-h6 logical, no skipped levels
- **Link text**: descriptive out of context (no "click here")
- **Form labels**: every input announced with label
- **Live regions**: status messages, errors announced without focus
- **Images**: alt text meaningful or decorative marked empty
- **Tables**: headers associated with data cells
- **Modal focus**: announced on open, return focus on close

## Issues Only Found by Screen Reader

- Content read in wrong order (visual vs DOM order mismatch)
- Unlabeled icons announced as "image" or filename
- Dynamic content updates not announced (missing aria-live)
- Custom widgets with no role/state announcements
- Off-screen content read unexpectedly
- Focus moves to invisible elements

## Testing Checklist

Per screen reader, document:
1. Can user identify page purpose (h1, page title)?
2. Can user navigate by landmarks?
3. Are all interactive elements reachable and operable?
4. Do error messages announce on form submission?
5. Do dynamic updates (toasts, loaders) announce?

## Documenting Issues

Record: screen reader + version, OS, browser, steps, expected announcement vs actual.
Use screen recording with audio for evidence. Tag severity: blocker (content inaccessible), major (confusing), minor (suboptimal).
