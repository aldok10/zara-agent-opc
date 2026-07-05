# ARIA Patterns

## Activation

Triggered when implementing: dialogs, tabs, comboboxes, accordions, menus, tooltips, tree views, or any custom widget needing ARIA.

## Core Principles

- ARIA adds semantics, not behavior. You still need JS for keyboard/focus.
- First rule of ARIA: don't use ARIA if a native HTML element works.
- Roles are a contract: adding `role="tab"` means you must implement tab keyboard pattern.
- States must be kept in sync with visual state (JS responsibility).

## Roles Reference

| Role | Required context | Required owned | Key states |
|------|-----------------|---------------|------------|
| `dialog` | none | content | `aria-modal`, `aria-labelledby` |
| `tab` | `tablist` | none | `aria-selected`, `aria-controls` |
| `tabpanel` | none | none | `aria-labelledby` |
| `combobox` | none | `listbox` | `aria-expanded`, `aria-activedescendant` |
| `option` | `listbox` | none | `aria-selected` |
| `accordion` (heading+region) | none | none | `aria-expanded`, `aria-controls` |
| `alertdialog` | none | content | `aria-modal`, `aria-labelledby`, `aria-describedby` |
| `menu` | none | `menuitem` | `aria-activedescendant` |
| `tooltip` | none | none | described via `aria-describedby` |
| `tree` | none | `treeitem` | `aria-expanded`, `aria-selected` |

## Live Regions

```html
<!-- Status updates (non-urgent) -->
<div aria-live="polite" aria-atomic="true">3 results found</div>

<!-- Error/urgent (interrupts) -->
<div aria-live="assertive" role="alert">Session expired. Please log in.</div>

<!-- Log-style (additions only) -->
<div aria-live="polite" aria-relevant="additions">
  <p>Message from Alice</p>
</div>
```

Rules:
- Region must exist in DOM before content changes
- `aria-atomic="true"` = announce entire region; `false` = announce only changed nodes
- `aria-relevant`: additions | removals | text | all (default: additions text)
- Use `role="status"` for implicit `aria-live="polite"`
- Use `role="alert"` for implicit `aria-live="assertive"`

## Dialog Pattern

```html
<dialog aria-labelledby="dialog-title" aria-modal="true">
  <h2 id="dialog-title">Confirm action</h2>
  <p>Are you sure?</p>
  <button autofocus>Confirm</button>
  <button>Cancel</button>
</dialog>
<script>
  // On open: set inert on background, move focus to first focusable or autofocus
  // On close: remove inert, restore focus to trigger element
</script>
```

## Tabs Pattern

```html
<div role="tablist" aria-label="Settings">
  <button role="tab" id="tab-1" aria-selected="true" aria-controls="panel-1">General</button>
  <button role="tab" id="tab-2" aria-selected="false" aria-controls="panel-2" tabindex="-1">Privacy</button>
</div>
<div role="tabpanel" id="panel-1" aria-labelledby="tab-1">...</div>
<div role="tabpanel" id="panel-2" aria-labelledby="tab-2" hidden>...</div>
```

Keyboard: Arrow Left/Right moves between tabs. Home/End for first/last. Tab moves into panel.

## Combobox Pattern

```html
<label for="city-input">City</label>
<div>
  <input id="city-input" role="combobox" aria-expanded="false"
         aria-controls="city-listbox" aria-autocomplete="list"
         aria-activedescendant="">
  <ul id="city-listbox" role="listbox" hidden>
    <li role="option" id="opt-1">Amsterdam</li>
    <li role="option" id="opt-2">Berlin</li>
  </ul>
</div>
```

States to manage: `aria-expanded`, `aria-activedescendant` (points to highlighted option), `aria-selected` on chosen option.

## Accordion Pattern

```html
<h3>
  <button aria-expanded="true" aria-controls="sect1-content">Section 1</button>
</h3>
<div id="sect1-content" role="region" aria-labelledby="sect1-header">
  Content here.
</div>
```

## Decision Table

| Scenario | Pattern |
|----------|---------|
| Overlay blocks page interaction | dialog + `aria-modal` + `inert` on body |
| Switching views in same area | tablist/tab/tabpanel |
| Searchable dropdown | combobox + listbox |
| Expandable sections | heading button + `aria-expanded` + region |
| Toast notifications | `role="status"` + `aria-live="polite"` |
| Critical alerts | `role="alert"` or `aria-live="assertive"` |
| Hierarchical list | tree/treeitem + `aria-expanded` |
| Action menu | menu/menuitem + `aria-activedescendant` |
