---
type: fact
title: "10 Design System Mistakes"
---

# 10 Design System Mistakes with Fixes

## 1. Hardcoded values instead of tokens

**Mistake:**
```css
.card { border-radius: 8px; padding: 16px; color: #333; }
```

**Fix:**
```css
.card { border-radius: var(--radius-md); padding: var(--space-4); color: var(--color-text); }
```

Why: Tokens enable theme switching, consistency, and single-source updates.

## 2. Boolean prop soup

**Mistake:**
```tsx
<Button primary large rounded disabled loading>Submit</Button>
```

**Fix:**
```tsx
<Button variant="primary" size="lg" loading disabled>Submit</Button>
```

Why: Variants are mutually exclusive and self-documenting. `primary` + `secondary` makes no sense but booleans allow it.

## 3. Skipping component documentation

**Mistake:** Component exists in Storybook with one "Default" story and no docs.

**Fix:**
- Props table with descriptions and defaults
- All variant combinations shown
- Do/Don't usage examples
- Accessibility notes (keyboard, screen reader)
- Play function for interaction test

## 4. No semantic token layer

**Mistake:**
```css
.button { background: var(--blue-500); }
/* Now "dark mode" breaks because blue-500 is too dark on dark backgrounds */
```

**Fix:**
```css
.button { background: var(--color-action-primary); }
/* color-action-primary maps to blue-500 in light, blue-300 in dark */
```

Why: Semantic tokens decouple intent from value. Theme changes only need to remap semantic tokens.

## 5. Breaking changes without version bump

**Mistake:** Renaming a prop, changing default behavior, or removing a variant in a patch release.

**Fix:**
- Deprecation warning first (minor version)
- Migration guide
- Remove in next major version
- Codemod if possible: `npx @your-lib/codemods rename-prop`

## 6. Coupling components to app state

**Mistake:**
```tsx
function UserCard() {
  const user = useStore(state => state.currentUser); // Coupled to app store
  return <Card><Avatar src={user.photo} />{user.name}</Card>;
}
```

**Fix:**
```tsx
function UserCard({ name, photo }: { name: string; photo: string }) {
  return <Card><Avatar src={photo} />{name}</Card>;
}
```

Why: Design system components should be data-agnostic. Pass data in via props.

## 7. Inconsistent spacing and sizing

**Mistake:** Mix of 12px, 15px, 17px, 20px, 22px across components.

**Fix:** Define a spacing scale and stick to it:
```json
{ "space-1": "0.25rem", "space-2": "0.5rem", "space-3": "0.75rem", "space-4": "1rem", "space-6": "1.5rem", "space-8": "2rem" }
```

## 8. Not forwarding refs and rest props

**Mistake:**
```tsx
function Input({ label, error }: InputProps) {
  return <input className="input" />;
  // Consumer can't add onFocus, name, aria-*, data-testid, etc.
}
```

**Fix:**
```tsx
const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => (
    <div>
      <label>{label}</label>
      <input ref={ref} className={cn('input', className)} {...props} />
      {error && <span role="alert">{error}</span>}
    </div>
  )
);
```

## 9. Over-abstracting too early

**Mistake:** Building a "universal layout engine" component before having 3 real use cases.

**Fix:** Build specific components first. Abstract only when you see the same pattern 3+ times. Extraction is easier than prediction.

Rule: 1 use = concrete, 2 uses = notice, 3 uses = abstract.

## 10. Ignoring accessibility in the design system layer

**Mistake:** "We'll add accessibility later" or "the consumer handles it."

**Fix:** Bake accessibility into components:
- Focus management in dialogs, menus, tabs
- ARIA attributes set by default
- Keyboard navigation built-in
- Color contrast validated in token definition
- Required props for accessible names (aria-label or visible label)

If the design system doesn't handle it, every consumer team will get it wrong differently.

## Bonus: Warning Signs

| Signal | Problem |
|--------|---------|
| Lots of `!important` in app CSS | Components not flexible enough |
| Teams copy-paste components instead of importing | API too rigid or install too complex |
| Designers diverge from token values | Tokens don't match design needs |
| "Just override it" is common advice | Component doesn't support the variant |
| New hires struggle to build features | Docs inadequate or API inconsistent |
