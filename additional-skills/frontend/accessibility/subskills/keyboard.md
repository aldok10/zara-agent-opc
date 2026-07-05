# Keyboard Navigation & Focus Management

## Activation

Triggered when: implementing focus traps, skip links, custom keyboard interactions, roving tabindex, or debugging keyboard flow.

## Core Principles

- Every interactive element must be reachable via Tab (or arrow keys in composite widgets).
- Focus order matches visual/logical reading order.
- Focus must be visible at all times. Never `outline: none` without replacement.
- `tabindex="0"` adds to tab order. `tabindex="-1"` makes focusable via JS only. Never use `tabindex` > 0.
- `inert` attribute removes element subtree from tab order and accessibility tree.

## Skip Links

```html
<body>
  <a href="#main-content" class="skip-link">Skip to main content</a>
  <nav>...</nav>
  <main id="main-content" tabindex="-1">...</main>
</body>

<style>
.skip-link {
  position: absolute;
  top: -100%;
  left: 0;
  z-index: 100;
  padding: 0.5rem 1rem;
  background: var(--color-surface);
  color: var(--color-primary);
}
.skip-link:focus {
  top: 0;
}
</style>
```

## Roving Tabindex

For composite widgets (tabs, toolbars, radio groups, menus): one item has `tabindex="0"`, others `tabindex="-1"`. Arrow keys move the `0`.

```js
function rovingTabindex(container, selector, { orientation = 'horizontal' } = {}) {
  const items = [...container.querySelectorAll(selector)];
  const keys = orientation === 'horizontal'
    ? { next: 'ArrowRight', prev: 'ArrowLeft' }
    : { next: 'ArrowDown', prev: 'ArrowUp' };

  container.addEventListener('keydown', (e) => {
    const idx = items.indexOf(document.activeElement);
    if (idx === -1) return;

    let next;
    if (e.key === keys.next) next = (idx + 1) % items.length;
    else if (e.key === keys.prev) next = (idx - 1 + items.length) % items.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = items.length - 1;
    else return;

    e.preventDefault();
    items[idx].setAttribute('tabindex', '-1');
    items[next].setAttribute('tabindex', '0');
    items[next].focus();
  });
}
```

## Focus Trap (Modal)

Modern approach using `inert`:

```js
function openModal(dialog, trigger) {
  // Disable everything behind modal
  document.querySelectorAll('body > *:not([aria-modal])').forEach(el => {
    el.inert = true;
  });
  dialog.showModal(); // or set hidden=false + focus
  dialog.querySelector('[autofocus], button, [href], input')?.focus();

  // Store trigger for focus restore
  dialog._trigger = trigger;
}

function closeModal(dialog) {
  document.querySelectorAll('[inert]').forEach(el => {
    el.inert = false;
  });
  dialog.close();
  dialog._trigger?.focus();
}
```

Legacy focus trap (when `inert` not available):

```js
function trapFocus(container) {
  const focusable = container.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  container.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });
}
```

## Focus Restoration

Always restore focus to the triggering element when closing overlays:

```js
// Pattern: save trigger before opening, restore on close
const trigger = document.activeElement;
openOverlay();
// ... on close:
trigger.focus();
```

## Focus Visible

```css
/* Only show focus ring for keyboard users */
:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

/* Remove default for mouse users */
:focus:not(:focus-visible) {
  outline: none;
}
```

## Keyboard Patterns by Widget

| Widget | Keys |
|--------|------|
| Tabs | Arrow L/R (or U/D vertical), Home, End, Tab into panel |
| Menu | Arrow U/D, Home, End, Enter/Space activate, Escape close |
| Dialog | Tab/Shift+Tab within, Escape close |
| Combobox | Arrow D open, Arrow U/D navigate, Enter select, Escape close |
| Accordion | Enter/Space toggle, Arrow U/D between headers |
| Tree | Arrow U/D siblings, Arrow R expand/enter, Arrow L collapse/parent |
| Toolbar | Arrow L/R between tools, Tab exits |

## Decision Table

| Scenario | Approach |
|----------|----------|
| Modal/dialog open | `inert` on background + autofocus first element |
| Dropdown menu | roving tabindex + Escape to close + restore focus |
| Tab interface | roving tabindex horizontal + arrow keys |
| Dynamic content added | move focus to new content or announce via live region |
| Page navigation (SPA) | focus `<main>` or `<h1>` after route change |
| Disclosure widget | Enter/Space toggle, manage `aria-expanded` |
