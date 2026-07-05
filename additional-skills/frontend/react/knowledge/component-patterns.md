---
type: fact
title: "React component patterns: 8 patterns with guidance"
---

# React Component Patterns

## 1. Compound Components

Parent manages shared state; children implicitly consume it via context.
Gives users full control over rendering order and composition.

```tsx
function Select({ children, value, onChange }) {
  return (
    <SelectContext value={{ value, onChange }}>
      <div role="listbox">{children}</div>
    </SelectContext>
  )
}
Select.Option = function Option({ value, children }) {
  const ctx = use(SelectContext)
  return <div role="option" onClick={() => ctx.onChange(value)}>{children}</div>
}
// Usage: <Select value={v} onChange={setV}><Select.Option value="a">A</Select.Option></Select>
```
**Use when**: building UI kits (Select, Tabs, Accordion, Menu). Users need layout flexibility.
**Not when**: simple one-off components, no composition needed.

## 2. Render Props

Pass a function as prop (or child) that receives data and returns JSX.
Still useful for libraries exposing behavior without dictating UI.

```tsx
function MouseTracker({ render }: { render: (pos: {x:number,y:number}) => ReactNode }) {
  const [pos, setPos] = useState({x:0, y:0})
  return <div onMouseMove={e => setPos({x:e.clientX, y:e.clientY})}>{render(pos)}</div>
}
// Usage: <MouseTracker render={({x,y}) => <span>{x},{y}</span>} />
```
**Use when**: sharing behavior where UI varies completely between consumers.
**Not when**: a custom hook would suffice (most cases today). Prefer hooks over render props.

## 3. Higher-Order Components (HOC)

Function that wraps a component to inject props/behavior. Legacy pattern.

```tsx
function withAuth<P>(Component: ComponentType<P>) {
  return function Wrapped(props: P) {
    const user = use(AuthContext)
    if (!user) return <Redirect to="/login" />
    return <Component {...props} user={user} />
  }
}
```
**Use when**: cross-cutting concerns in class-heavy codebases, wrapping third-party components.
**Not when**: you can use hooks (almost always). HOCs obscure component tree and types.

## 4. Controlled vs Uncontrolled

Controlled: parent owns state, passes value + onChange. Uncontrolled: component owns state internally, exposes via ref/callback.

```tsx
// Controlled
<Input value={name} onChange={setName} />
// Uncontrolled
<Input defaultValue="hello" ref={inputRef} />
```
**Use controlled**: forms requiring validation, dependent fields, undo/redo.
**Use uncontrolled**: simple forms, file inputs, integration with non-React code.

## 5. Polymorphic Component (`as` prop)

Render as any HTML element or component while preserving type safety.

```tsx
type BoxProps<C extends ElementType = 'div'> = {
  as?: C
} & ComponentPropsWithoutRef<C>

function Box<C extends ElementType = 'div'>({ as, ...props }: BoxProps<C>) {
  const Component = as || 'div'
  return <Component {...props} />
}
// Usage: <Box as="section" className="card" /> or <Box as={Link} href="/home" />
```
**Use when**: design system primitives (Box, Text, Stack) that need semantic flexibility.
**Not when**: component has fixed semantic meaning. Adds type complexity.

## 6. Slot Pattern (Children Composition)

Named slots via specific child components or props. Avoids prop drilling.

```tsx
function Card({ children }: { children: ReactNode }) {
  return <div className="card">{children}</div>
}
Card.Header = ({ children }: { children: ReactNode }) => <div className="card-header">{children}</div>
Card.Body = ({ children }: { children: ReactNode }) => <div className="card-body">{children}</div>

// Usage:
<Card>
  <Card.Header>Title</Card.Header>
  <Card.Body>Content</Card.Body>
</Card>
```
**Use when**: layout components with named regions (Card, Dialog, Page).
**Not when**: single-content components. Overkill for simple wrappers.

## 7. Provider Pattern

Context provider at top of tree supplies data/actions to deep descendants.

```tsx
function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'light'|'dark'>('light')
  return <ThemeContext value={{ theme, setTheme }}>{children}</ThemeContext>
}
// Consume anywhere: const { theme } = use(ThemeContext)
```
**Use when**: app-wide state (theme, auth, locale, feature flags).
**Not when**: data only needed 1-2 levels down (just pass props). Avoid for frequently-changing values (causes wide re-renders).

## 8. Headless Components

Provide behavior + accessibility via hooks/render props, zero styling.

```tsx
function useToggle(initial = false) {
  const [on, setOn] = useState(initial)
  const toggle = useCallback(() => setOn(v => !v), [])
  const buttonProps = { 'aria-pressed': on, onClick: toggle }
  return { on, toggle, buttonProps }
}
// Usage: const { on, buttonProps } = useToggle(); <button {...buttonProps}>{on?'ON':'OFF'}</button>
```
**Use when**: reusable logic across different visual designs (Radix, Headless UI approach).
**Not when**: you control the design system end-to-end and won't reskin.

## Pattern Selection Guide

| Need | Pattern |
|------|---------|
| Composable UI kit | Compound Components |
| Share behavior, vary UI completely | Render Props or Headless |
| Semantic HTML flexibility | Polymorphic |
| Named layout regions | Slot |
| Global state/config | Provider |
| Form state ownership | Controlled/Uncontrolled |
| Cross-cutting wrapper (legacy) | HOC |
