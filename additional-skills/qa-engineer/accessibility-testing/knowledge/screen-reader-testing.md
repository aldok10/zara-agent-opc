---
type: fact
title: "Screen Reader Testing Patterns"
---

# Screen Reader Testing Patterns

## Primary Screen Readers

| Screen Reader | OS | Browser | Market Share |
|---|---|---|---|
| VoiceOver | macOS/iOS | Safari | ~30% mobile |
| NVDA | Windows | Firefox/Chrome | ~40% desktop |
| JAWS | Windows | Chrome/Edge | ~30% desktop |
| TalkBack | Android | Chrome | ~25% mobile |

## Testing Priority Order

1. NVDA + Firefox (free, most used desktop combo)
2. VoiceOver + Safari (iOS/macOS mandatory)
3. JAWS + Chrome (enterprise, paid)
4. TalkBack + Chrome (Android coverage)

## Focus Management Patterns

### Modal Dialogs
- Trap focus inside modal when open
- Return focus to trigger element on close
- Announce modal title on open via `aria-labelledby`
- Escape key must close and restore focus

### Route Changes (SPA)
- Move focus to main content heading on navigation
- Announce new page title via `aria-live` or focus shift
- Skip link must work after route change

### Dynamic Content
- Use `aria-live="polite"` for non-urgent updates
- Use `aria-live="assertive"` only for errors/alerts
- Avoid `aria-live` on containers with frequent updates (causes verbosity)

## Live Region Rules

```html
<!-- Status messages -->
<div role="status" aria-live="polite">3 results found</div>

<!-- Error alerts -->
<div role="alert" aria-live="assertive">Payment failed</div>

<!-- Progress -->
<div aria-live="polite" aria-atomic="true">Loading: 45%</div>
```

### Common Mistakes
- Adding `aria-live` dynamically (must exist in DOM before content changes)
- Using `aria-live="assertive"` for non-critical info (interrupts user)
- Nesting live regions (unpredictable behavior)
- Updating live regions too frequently (<100ms intervals ignored)

## VoiceOver-Specific Gotchas

- `role="application"` disables most VO keyboard shortcuts — avoid unless building custom widgets
- CSS `display:none` and `visibility:hidden` both remove from accessibility tree
- `aria-hidden="true"` on parent hides all descendants — no override possible
- VO announces `<table>` differently than `role="table"` in some contexts
- VO requires `<label>` or `aria-label` on `<input>` — placeholder alone insufficient

## NVDA-Specific Patterns

- Browse mode vs Focus mode switching is automatic for form fields
- `aria-describedby` read after a pause (users may miss it)
- Virtual buffer may cache content — dynamic updates need live regions
- NVDA+Space toggles focus mode for custom widgets

## Testing Checklist

1. **Landmark navigation**: Can user jump between `<nav>`, `<main>`, `<aside>`?
2. **Heading structure**: Does `h1`→`h6` hierarchy make sense when read linearly?
3. **Form labeling**: Every input announced with its purpose?
4. **Error association**: Errors linked to fields via `aria-describedby`?
5. **State changes**: Are expanded/collapsed/selected states announced?
6. **Image alternatives**: Decorative images hidden, informative images described?
7. **Link purpose**: Links make sense out of context? (no "click here")
8. **Keyboard traps**: Can user always escape any component?

## Automation Limitations

Screen reader testing cannot be fully automated because:
- Announcement text varies by reader/version
- Reading order depends on user navigation strategy
- Timing of live region announcements varies
- User mental model can't be simulated

Manual testing with actual screen readers remains essential for:
- Custom widget interactions
- Complex form flows
- Single-page app navigation
- Video/audio player controls

## CI Integration Strategy

- Use `axe-core` for automated WCAG rule checks (catches ~30-40% of issues)
- Use `aria-at` test harness for specific AT behavior validation
- Reserve manual screen reader testing for:
  - New component types
  - Complex interaction patterns
  - Pre-release accessibility audits
