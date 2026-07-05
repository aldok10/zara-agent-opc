# Keyboard Testing

## Tab Order Verification

- Tab through entire page: order should follow visual reading flow (left-to-right, top-to-bottom)
- Skip links: first Tab should reveal "Skip to main content" link
- No tabindex > 0 (breaks natural order)
- `tabindex="0"` for custom interactive elements
- `tabindex="-1"` for programmatic focus only (modals, error summaries)

```typescript
// Playwright: verify tab order
const tabOrder = ['#skip-link', '#nav-home', '#nav-about', '#search-input', '#main-content'];
for (const selector of tabOrder) {
  await page.keyboard.press('Tab');
  await expect(page.locator(selector)).toBeFocused();
}
```

## Focus Indicators

- Must be visible on all interactive elements
- Minimum 3:1 contrast ratio against adjacent colors (WCAG 2.2)
- Never `outline: none` without replacement style
- Test in both light and dark modes
- Custom focus styles: minimum 2px solid, high-contrast color

```css
/* Acceptable pattern */
:focus-visible {
  outline: 3px solid #005fcc;
  outline-offset: 2px;
}
```

## Focus Traps (Modals, Drawers)

- On open: focus moves to first focusable element or dialog title
- Tab cycles within modal (does not escape to background)
- Escape closes and returns focus to trigger element
- Background content has `inert` attribute or `aria-hidden="true"`

```typescript
// Test modal focus trap
await page.click('#open-modal');
await expect(page.locator('[role="dialog"]')).toBeFocused();
await page.keyboard.press('Tab');
// Should stay within dialog
await page.keyboard.press('Escape');
await expect(page.locator('#open-modal')).toBeFocused();
```

## Custom Widget Keyboard Patterns

| Widget | Keys |
|--------|------|
| Menu | Arrow keys navigate, Enter selects, Escape closes |
| Tabs | Left/Right switches tab, Enter/Space not needed (auto-activate) |
| Combobox | Down opens, arrows navigate, Enter selects, Escape closes |
| Tree | Up/Down siblings, Right expands, Left collapses |
| Grid | Arrow keys navigate cells, Enter activates |

## Roving Tabindex

For composite widgets (tab lists, toolbars, menus):
- Container has one Tab stop
- Arrow keys move focus between items
- Active item: `tabindex="0"`, others: `tabindex="-1"`
- Wrap around or stop at ends (be consistent)

## Keyboard Shortcuts

- Document all custom shortcuts in help dialog (`?` to open)
- Detect conflicts with browser/OS/screen reader shortcuts
- Provide way to disable or remap custom shortcuts
- Never override: Tab, Escape, Enter, Space, Arrow keys in text inputs

## Testing Methodology

Per component, document:
1. How to reach it (Tab count or landmark nav)
2. How to operate it (which keys do what)
3. How to leave it (Tab out or Escape)
4. Focus visible at all states
5. No keyboard traps (can always escape)

Automate: tab order sequence assertions. Manual: visual focus indicator check.
