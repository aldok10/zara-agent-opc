# Subskill: Accessibility Testing

> Activate when: accessibility, a11y, WCAG, axe-core, screen reader, VoiceOver, NVDA, TalkBack, keyboard navigation, focus, ARIA, contrast, PDF a11y, cognitive
>
> Automated catches 30-40%. Manual covers the rest. axe-core in CI. Keyboard + screen reader for critical flows. Design tokens validated before render.

## Golden Rules

1. axe-core in CI for every page/component (zero critical/serious violations)
2. WCAG 2.2 AA minimum (AAA for government/healthcare)
3. Keyboard navigation tested for all interactive elements
4. Screen reader testing for critical flows (VoiceOver macOS/iOS, NVDA Windows, TalkBack Android)
5. Color contrast: 4.5:1 text, 3:1 large text/UI components
6. Focus management on route changes and modals
7. ARIA only when native HTML semantics insufficient
8. Form errors programmatically associated (aria-describedby)
9. Motion/animation respects prefers-reduced-motion
10. Design token contrast validated at token definition level

## axe-core CI Integration

```typescript
// Playwright + axe-core
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('homepage accessibility', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
    .exclude('.third-party-widget')
    .analyze();

  expect(results.violations).toEqual([]);
});
```

## WCAG 2.2 Key Criteria (AA)

| Criterion | Requirement | Test Method |
|-----------|-------------|-------------|
| 2.4.11 Focus Not Obscured | Focused element not fully hidden | Keyboard + visual check |
| 2.5.7 Dragging Movements | Single-pointer alternative exists | Manual interaction test |
| 2.5.8 Target Size (24x24px) | Touch targets minimum size | Automated measurement |
| 3.2.6 Consistent Help | Help in same position across pages | Visual audit |
| 3.3.7 Redundant Entry | Don't ask same info twice in same session | Form flow test |
| 3.3.8 Accessible Auth | No cognitive tests for login (CAPTCHA alternatives) | Manual verification |

## Cognitive Accessibility (WCAG 2.2)

- **3.3.7 Redundant Entry**: auto-populate previously entered data; never require re-entry of name/email/address within same process
- **3.3.8 Accessible Authentication**: no memorization (passwords OK with paste/managers), no transcription, no puzzle-solving; allow copy-paste, passkeys, OAuth
- Test pattern: complete multi-step flow, verify no data re-entry; attempt login with password manager, verify no CAPTCHA blocks
- Cognitive load: one task per screen, clear progress indicators, plain language

## Motion & Animation Testing

```css
/* Required: honor OS-level preference */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- WCAG 2.3.3 (AAA): no motion triggered by device/head movement without alternative
- Validate: toggle `prefers-reduced-motion` in DevTools > Rendering > Emulate CSS media
- Parallax, auto-play video, carousel auto-advance must all pause/stop
- Test: no content only accessible via animation (progress only shown animated)

## Design Token Contrast Audit

```javascript
// Validate contrast at token level (before components render)
import Color from 'colorjs.io';

function checkContrast(fg, bg, level = 'AA') {
  const ratio = Color.contrastAPCA(new Color(fg), new Color(bg));
  const threshold = level === 'AAA' ? 7 : 4.5;
  return Math.abs(ratio) >= threshold;
}

// Run against token pairs in CI
tokens.surfaces.forEach(bg => {
  tokens.text.forEach(fg => {
    assert(checkContrast(fg, bg), `${fg} on ${bg} fails contrast`);
  });
});
```

- Audit token pairs (text-on-surface) not just individual colors
- Catch issues before they propagate to components
- Include dark mode, high contrast mode token sets

## Native Mobile Accessibility

**VoiceOver (iOS)**:
- Validate `accessibilityLabel`, `accessibilityHint`, `accessibilityTraits`
- Rotor navigation: headings, links, form controls discoverable
- Swipe gestures have non-gesture alternatives

**TalkBack (Android)**:
- Validate `contentDescription`, `importantForAccessibility`
- Explore-by-touch: all interactive elements focusable
- Accessibility Scanner app for automated checks

**Auditing pattern**:
```bash
# iOS: Accessibility Inspector (Xcode > Open Developer Tool)
# Android: Accessibility Scanner + adb shell settings
adb shell settings put secure enabled_accessibility_services \
  com.google.android.marvin.talkback/.TalkBackService
```

## PDF Accessibility

- **PAC (PDF Accessibility Checker)**: validate tagged structure, reading order, alt text
- Required: document title set, language specified, tagged PDF with logical structure
- Tables: proper TH/TD markup in tags. Forms: labeled fields
- Test: read with screen reader, verify heading navigation works
- Tools: PAC 2024, Adobe Acrobat Pro checker, axe-pdf

## AI-Assisted Accessibility Testing

| Tool | Scope | Limitation |
|------|-------|-----------|
| axe-core | DOM rules, ~40% issues | No UX quality, no reading order |
| AccessLint | PR-level checks, GitHub integration | HTML only, no runtime state |
| arc-toolkit | Chrome extension, WCAG mapping | Manual trigger required |
| axe DevTools Pro | Intelligent Guided Testing | Paid, still needs human judgment |

- AccessLint in CI: catches regressions on every PR (missing labels, contrast, ARIA)
- Beyond axe-core: use Playwright assertions for focus order, aria-live announcements
- No tool catches: meaning of alt text, logical reading order, cognitive load

## WCAG 3.0 Awareness (Future Direction)

- New conformance model: Bronze / Silver / Gold (replaces A/AA/AAA)
- APCA contrast algorithm replaces current 4.5:1 ratio model
- Scoring-based: partial credit possible (not pass/fail per criterion)
- Status: Working Draft, not yet normative. Design for 2.2 AA now, track 3.0 evolution

## Keyboard Testing Checklist

- [ ] All interactive elements reachable via Tab
- [ ] Tab order matches visual order (logical flow)
- [ ] Focus indicator visible (min 2px, 3:1 contrast)
- [ ] Skip links present ("Skip to main content")
- [ ] Modal traps focus (Escape closes)
- [ ] Custom widgets: arrow keys, Enter, Space, Escape
- [ ] No keyboard traps (can always Tab away)

## Common ARIA Patterns

```html
<!-- Live region for dynamic updates -->
<div aria-live="polite" aria-atomic="true">3 items added to cart</div>

<!-- Dialog/modal -->
<div role="dialog" aria-labelledby="title" aria-modal="true">
  <h2 id="title">Confirm Delete</h2>
</div>

<!-- Error association -->
<input aria-describedby="email-error" aria-invalid="true" />
<span id="email-error" role="alert">Invalid email format</span>
```

## Anti-Patterns

- Relying solely on automated tools (miss 60% of issues)
- `div[role=button]` when `button` element works
- Removing focus indicators for aesthetics
- Testing only with mouse interactions
- ARIA overuse (native HTML always better when available)
- Ignoring prefers-reduced-motion
- Contrast checking individual colors instead of token pairs

## Delegates To

- **mobile-testing** for native TalkBack/VoiceOver device testing
- **playwright** for axe-core integration patterns
- **visual-testing** for contrast verification
- **code-review** for ARIA usage review
