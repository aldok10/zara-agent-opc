---
type: fact
title: "8 Component API Patterns"
---

# 8 Component API Patterns

## 1. Flat Props (Simple Components)

```tsx
<Button variant="primary" size="md" disabled>Submit</Button>
```

**Pros:** Easy to understand, great TypeScript IntelliSense, simple to document.
**Cons:** Doesn't scale for complex components, prop explosion risk.
**Use when:** Component has <8 props, single visual element, clear variants.

## 2. Compound Components (Complex Widgets)

```tsx
<Select>
  <Select.Trigger>Choose option</Select.Trigger>
  <Select.Content>
    <Select.Item value="a">Option A</Select.Item>
    <Select.Item value="b">Option B</Select.Item>
  </Select.Content>
</Select>
```

**Pros:** Flexible composition, clear hierarchy, each part independently stylable.
**Cons:** More boilerplate, requires context, harder to use for simple cases.
**Use when:** Multiple sub-elements, flexible layout needed, widget has distinct parts.

## 3. Render Props / Children as Function

```tsx
<Combobox items={items}>
  {({ isOpen, inputProps, getItemProps }) => (
    <div>
      <input {...inputProps} />
      {isOpen && items.map(item => <li {...getItemProps(item)} />)}
    </div>
  )}
</Combobox>
```

**Pros:** Maximum rendering control, consumer decides the DOM.
**Cons:** Verbose, harder to read, no static analysis of output structure.
**Use when:** Consumer needs full control over rendered output.

## 4. Headless Hook

```tsx
const { isOpen, toggle, triggerProps, contentProps } = useDisclosure();
return (
  <>
    <button {...triggerProps}>Toggle</button>
    {isOpen && <div {...contentProps}>Content</div>}
  </>
);
```

**Pros:** Zero opinions on styling, fully composable, testable logic.
**Cons:** More work for consumer, no default rendering, requires understanding.
**Use when:** Library code, multiple design systems consume same logic.

## 5. Slots / Named Sections

```tsx
<Card
  header={<h3>Title</h3>}
  footer={<Button>Action</Button>}
>
  Body content
</Card>
```

**Pros:** Clear structure, typed slots, easy to understand layout.
**Cons:** Limited flexibility within each slot, can't reorder.
**Use when:** Fixed layout with customizable sections.

## 6. Polymorphic (as prop)

```tsx
<Text as="h1" variant="heading">Page Title</Text>
<Text as="label" variant="body">Field Label</Text>
<Box as="section" padding="lg">Content</Box>
```

**Pros:** Semantic flexibility, reuse styles across elements, type-safe.
**Cons:** Complex types, confusing when overused, a11y responsibility shifts to consumer.
**Use when:** Same visual treatment, different semantic elements.

## 7. Configuration Object

```tsx
<DataTable
  columns={[
    { key: 'name', header: 'Name', sortable: true },
    { key: 'email', header: 'Email', render: (val) => <a href={`mailto:${val}`}>{val}</a> },
  ]}
  data={users}
  pagination={{ pageSize: 20 }}
/>
```

**Pros:** All config in one place, serializable, good for complex widgets.
**Cons:** Less composable, harder to type deeply, IDE support varies.
**Use when:** Data-driven components (tables, forms, charts).

## 8. Builder / Fluent Pattern

```tsx
const form = createForm()
  .field('name', { required: true })
  .field('email', { type: 'email' })
  .onSubmit(handleSubmit)
  .build();

return <Form schema={form} />;
```

**Pros:** Chainable, discoverable API, great for complex configuration.
**Cons:** Non-standard in React ecosystem, harder to make reactive.
**Use when:** Complex config that benefits from progressive disclosure.

## Pattern Selection Guide

| Need | Pattern |
|------|---------|
| Button, Badge, Avatar | Flat props |
| Dialog, Select, Tabs | Compound components |
| Full render control needed | Render props or headless hook |
| Reusable logic, BYO styling | Headless hook |
| Card, Page layout | Slots |
| Typography, Box primitives | Polymorphic |
| Table, Form builder | Configuration object |
| Complex config (form schema) | Builder |

## Combining Patterns

Real-world components often combine patterns:

```tsx
// Compound + Flat props + Slots
<Dialog>
  <Dialog.Trigger asChild>
    <Button variant="primary">Open</Button>
  </Dialog.Trigger>
  <Dialog.Content title="Confirm" footer={<Dialog.Actions />}>
    Are you sure?
  </Dialog.Content>
</Dialog>
```
