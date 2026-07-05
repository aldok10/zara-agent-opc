---
type: fact
title: "12 Common Accessibility Mistakes"
---

# 12 Common Accessibility Mistakes with Fixes

## 1. Missing alt text on images

**Wrong:**
```html
<img src="chart.png">
```

**Fix:**
```html
<img src="chart.png" alt="Sales increased 40% from Q1 to Q3 2024">
<!-- OR decorative: -->
<img src="decorative-swirl.png" alt="">
```

## 2. Click handlers on non-interactive elements

**Wrong:**
```html
<div class="btn" onclick="submit()">Submit</div>
```

**Fix:**
```html
<button type="submit">Submit</button>
```
If you must use `<div>`: add `role="button"`, `tabindex="0"`, handle Enter and Space keys.

## 3. Removing focus outline without replacement

**Wrong:**
```css
*:focus { outline: none; }
```

**Fix:**
```css
:focus-visible {
  outline: 2px solid #005fcc;
  outline-offset: 2px;
}
```

## 4. Placeholder as label

**Wrong:**
```html
<input placeholder="Email address">
```

**Fix:**
```html
<label for="email">Email address</label>
<input id="email" type="email" placeholder="you@example.com">
```

## 5. Low color contrast

**Wrong:** Light gray text (#999) on white background = 2.8:1 ratio.

**Fix:** Use contrast checker. Minimum 4.5:1 for normal text, 3:1 for large text (18px+ bold or 24px+). Tools: Chrome DevTools, WebAIM contrast checker.

## 6. Missing form error association

**Wrong:**
```html
<input type="email">
<span class="error">Invalid email</span>
```

**Fix:**
```html
<input type="email" id="email" aria-invalid="true" aria-describedby="email-error">
<span id="email-error" role="alert">Invalid email format</span>
```

## 7. Auto-playing media without controls

**Wrong:**
```html
<video autoplay src="promo.mp4"></video>
```

**Fix:**
```html
<video src="promo.mp4" controls>
  <track kind="captions" src="promo.vtt" srclang="en" label="English">
</video>
```

## 8. Keyboard trap in modals

**Wrong:** Opening a modal without focus management; Tab escapes to background content.

**Fix:**
```js
// Use inert on background
document.querySelector('main').inert = true;
dialog.showModal();
// On close:
document.querySelector('main').inert = false;
triggerButton.focus();
```

## 9. Using color alone to convey state

**Wrong:** Red border = error, green border = success (no other indicator).

**Fix:** Add icon + text alongside color:
```html
<span class="error">
  <svg aria-hidden="true"><!-- error icon --></svg>
  Invalid email format
</span>
```

## 10. Missing page language

**Wrong:**
```html
<html>
```

**Fix:**
```html
<html lang="en">
```

For multilingual content: `<span lang="fr">Bonjour</span>`

## 11. Inaccessible custom select/dropdown

**Wrong:** Custom `<div>` dropdown with no ARIA, no keyboard support.

**Fix:**
```html
<!-- Option A: Use native -->
<select>...</select>

<!-- Option B: ARIA combobox pattern -->
<input role="combobox" aria-expanded="true" aria-controls="listbox-1"
       aria-activedescendant="opt-2">
<ul role="listbox" id="listbox-1">
  <li role="option" id="opt-1">Option 1</li>
  <li role="option" id="opt-2" aria-selected="true">Option 2</li>
</ul>
```
Plus full keyboard support: arrows, enter, escape, type-ahead.

## 12. Missing skip link

**Wrong:** Keyboard users must tab through entire navigation on every page.

**Fix:**
```html
<body>
  <a href="#main" class="skip-link">Skip to main content</a>
  <nav><!-- 20+ links --></nav>
  <main id="main" tabindex="-1">...</main>
</body>
```

## Bonus: Common ARIA Misuses

| Mistake | Why it's wrong | Fix |
|---------|---------------|-----|
| `<button role="button">` | Redundant, native already has role | Remove the role |
| `<a role="button">` | Changes semantics, breaks expectations | Use `<button>` or keep as link |
| `aria-hidden="true"` on focusable | Screen reader skips it but focus lands on it | Also add `tabindex="-1"` or remove from tab order |
| `aria-label` on `<div>` | Only works on interactive/landmark elements | Use on proper element or add a role |
| `aria-live` added dynamically | Region must exist before content changes | Add region to DOM on page load |
