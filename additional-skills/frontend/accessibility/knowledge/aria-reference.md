---
type: fact
title: "ARIA Quick Reference"
---

# ARIA Roles, States, and Properties Reference

## Landmark Roles

| Role | HTML equivalent | Purpose |
|------|----------------|---------|
| `banner` | `<header>` (top-level) | Site header |
| `navigation` | `<nav>` | Navigation links |
| `main` | `<main>` | Primary content |
| `complementary` | `<aside>` | Supporting content |
| `contentinfo` | `<footer>` (top-level) | Site footer |
| `region` | `<section>` (with label) | Named section |
| `search` | `<search>` | Search functionality |
| `form` | `<form>` (with label) | Form landmark |

## Widget Roles

| Role | Use case | Required properties |
|------|----------|-------------------|
| `button` | Clickable action | (prefer `<button>`) |
| `link` | Navigation | `href` or keyboard handler |
| `tab` | Tab in tablist | `aria-selected`, `aria-controls` |
| `tabpanel` | Tab content | `aria-labelledby` |
| `tablist` | Tab container | (contains tabs) |
| `dialog` | Modal window | `aria-labelledby`, `aria-modal` |
| `alertdialog` | Urgent modal | `aria-labelledby`, `aria-describedby` |
| `menu` | Action menu | (contains menuitems) |
| `menuitem` | Menu option | within menu |
| `menuitemcheckbox` | Toggle menu item | `aria-checked` |
| `menuitemradio` | Radio menu item | `aria-checked` |
| `combobox` | Searchable select | `aria-expanded`, `aria-controls` |
| `listbox` | Option list | (contains options) |
| `option` | List option | `aria-selected` |
| `tree` | Hierarchical list | (contains treeitems) |
| `treeitem` | Tree node | `aria-expanded` (if branch) |
| `tooltip` | Descriptive popup | described via `aria-describedby` |
| `switch` | On/off toggle | `aria-checked` |
| `slider` | Range input | `aria-valuemin/max/now` |
| `progressbar` | Progress | `aria-valuemin/max/now` |
| `spinbutton` | Numeric stepper | `aria-valuemin/max/now` |

## States and Properties

### Global (any element)

| Attribute | Values | Purpose |
|-----------|--------|---------|
| `aria-label` | string | Accessible name (no visible label) |
| `aria-labelledby` | ID ref(s) | Name from another element |
| `aria-describedby` | ID ref(s) | Additional description |
| `aria-hidden` | true/false | Remove from a11y tree |
| `aria-disabled` | true/false | Disabled (still focusable) |
| `aria-live` | off/polite/assertive | Dynamic region announcement |
| `aria-atomic` | true/false | Announce whole region or changes only |
| `aria-relevant` | additions/removals/text/all | What changes to announce |
| `aria-busy` | true/false | Region still loading |
| `aria-current` | page/step/location/date/time/true | Current item in set |
| `aria-keyshortcuts` | string | Keyboard shortcut |
| `aria-roledescription` | string | Custom role description |

### Widget States

| Attribute | Values | Used on |
|-----------|--------|---------|
| `aria-expanded` | true/false | Disclosure, accordion, combobox |
| `aria-pressed` | true/false/mixed | Toggle button |
| `aria-checked` | true/false/mixed | Checkbox, switch, radio |
| `aria-selected` | true/false | Tab, option, row |
| `aria-invalid` | true/false/grammar/spelling | Form input |
| `aria-required` | true/false | Required input |
| `aria-readonly` | true/false | Non-editable input |
| `aria-haspopup` | true/menu/listbox/tree/grid/dialog | Has popup |
| `aria-modal` | true/false | Modal dialog |

### Relationship

| Attribute | Values | Purpose |
|-----------|--------|---------|
| `aria-controls` | ID ref | Element this controls |
| `aria-owns` | ID ref(s) | Logical children not DOM children |
| `aria-activedescendant` | ID ref | Active child (virtual focus) |
| `aria-flowto` | ID ref(s) | Alternative reading order |
| `aria-details` | ID ref | Extended description element |
| `aria-errormessage` | ID ref | Error message element |

### Collection

| Attribute | Used on |
|-----------|---------|
| `aria-setsize` | Item in partial set (virtual list) |
| `aria-posinset` | Item position in set |
| `aria-level` | Heading level, tree depth |
| `aria-colcount/rowcount` | Table/grid with hidden cols/rows |
| `aria-colindex/rowindex` | Cell position in sparse grid |

## Rules of ARIA

1. Don't use ARIA if native HTML works (`<button>` not `<div role="button">`)
2. Don't change native semantics (`<h2 role="tab">` is wrong)
3. All interactive ARIA elements must be keyboard operable
4. Don't use `aria-hidden="true"` on focusable elements
5. All interactive elements must have accessible name
