---
type: subskill
title: "Form Accessibility"
---

# Form Accessibility

## Activation

Triggered when: building forms, implementing validation, handling error messages, or designing input patterns.

## Core Principles

- Every input must have a programmatically associated visible label.
- Error messages must be linked to their input via `aria-describedby`.
- Validation should be inline and announced to screen readers.
- Group related inputs with `fieldset`/`legend`.
- Use native HTML validation attributes where possible before custom JS.

## Labels

```html
<!-- Explicit association (preferred) -->
<label for="email">Email address</label>
<input type="email" id="email" name="email" autocomplete="email">

<!-- Wrapping (valid but less flexible for styling) -->
<label>
  Email address
  <input type="email" name="email" autocomplete="email">
</label>

<!-- NEVER: placeholder as label -->
<!-- BAD: <input placeholder="Email"> -->

<!-- Visually hidden label (last resort - e.g., search with visible button) -->
<label for="search" class="sr-only">Search</label>
<input type="search" id="search">
<button type="submit">Search</button>
```

Visually hidden utility:
```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

## Error Handling

```html
<div>
  <label for="password">Password</label>
  <input type="password" id="password"
         aria-describedby="password-help password-error"
         aria-invalid="true"
         autocomplete="new-password">
  <p id="password-help">Must be at least 8 characters.</p>
  <p id="password-error" role="alert">Password is too short.</p>
</div>
```

Rules:
- Set `aria-invalid="true"` on invalid fields
- Error message referenced by `aria-describedby`
- Use `role="alert"` or `aria-live="assertive"` to announce new errors
- Place error adjacent to input (visually and in DOM)
- Don't clear the field on error

## Error Summary

```html
<div role="alert" aria-labelledby="error-heading">
  <h2 id="error-heading">There are 2 errors in this form</h2>
  <ul>
    <li><a href="#email">Email is required</a></li>
    <li><a href="#password">Password must be at least 8 characters</a></li>
  </ul>
</div>
```

On submit with errors: focus the error summary or first invalid field.

## Fieldset and Legend

```html
<fieldset>
  <legend>Shipping address</legend>
  <label for="street">Street</label>
  <input type="text" id="street" autocomplete="street-address">
  <!-- more fields -->
</fieldset>

<!-- Radio/checkbox groups always need fieldset -->
<fieldset>
  <legend>Notification preference</legend>
  <label><input type="radio" name="notify" value="email"> Email</label>
  <label><input type="radio" name="notify" value="sms"> SMS</label>
  <label><input type="radio" name="notify" value="none"> None</label>
</fieldset>
```

## Autocomplete

Always provide `autocomplete` for personal data fields:

| Field | Value |
|-------|-------|
| Full name | `name` |
| Email | `email` |
| Phone | `tel` |
| Street | `street-address` |
| City | `address-level2` |
| Zip | `postal-code` |
| Country | `country` |
| Credit card | `cc-number` |
| CC expiry | `cc-exp` |
| New password | `new-password` |
| Current password | `current-password` |
| OTP | `one-time-code` |

## Required Fields

```html
<label for="name">Name <span aria-hidden="true">*</span></label>
<input type="text" id="name" required aria-required="true">
<!-- Explain convention at form top -->
<p>Fields marked with <span aria-hidden="true">*</span><span class="sr-only">asterisk</span> are required.</p>
```

## Validation Patterns

### Client-side (progressive)

```js
const form = document.querySelector('form');
form.addEventListener('submit', (e) => {
  const errors = [];
  form.querySelectorAll('[required]').forEach(input => {
    const error = input.nextElementSibling; // error container
    if (!input.validity.valid) {
      input.setAttribute('aria-invalid', 'true');
      error.textContent = input.validationMessage;
      errors.push(input);
    } else {
      input.removeAttribute('aria-invalid');
      error.textContent = '';
    }
  });
  if (errors.length) {
    e.preventDefault();
    errors[0].focus();
  }
});
```

### React pattern

```tsx
function FormField({ label, error, id, ...props }) {
  const errorId = `${id}-error`;
  const descId = error ? errorId : undefined;
  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        aria-invalid={!!error}
        aria-describedby={descId}
        {...props}
      />
      {error && <p id={errorId} role="alert">{error}</p>}
    </div>
  );
}
```

## Decision Table

| Scenario | Pattern |
|----------|---------|
| Simple text input | `<label>` + `<input>` + `aria-describedby` for help text |
| Radio/checkbox group | `<fieldset>` + `<legend>` |
| Search box (no visible label) | Visually hidden `<label>` |
| Form submission error | Error summary at top + inline errors + focus first error |
| Real-time validation | `aria-live="polite"` on error container |
| Multi-step form | Progress indicator + step labels + preserve previous answers |
| Personal data | Appropriate `autocomplete` values |
