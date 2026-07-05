# Component API Design

## Activation

Triggered when: designing component props, building compound components, implementing variants with CVA, or deciding polymorphic patterns.

## Core Principles

- Minimal API surface. Every prop must earn its place.
- Variants > boolean props for mutually exclusive states.
- Compound components for complex multi-part UIs.
- Polymorphic `as` prop for element flexibility.
- Forward refs and spread remaining props to root element.
- Type safety is non-negotiable.

## CVA (class-variance-authority)

```tsx
import { cva, type VariantProps } from 'class-variance-authority';

const button = cva(
  // Base styles
  'inline-flex items-center justify-center rounded font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-white hover:bg-primary-dark',
        secondary: 'bg-transparent border border-primary text-primary hover:bg-primary/10',
        ghost: 'bg-transparent text-primary hover:bg-primary/5',
        destructive: 'bg-red-600 text-white hover:bg-red-700',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-base',
        lg: 'h-12 px-6 text-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

type ButtonProps = React.ComponentProps<'button'> &
  VariantProps<typeof button> & {
    loading?: boolean;
  };

function Button({ variant, size, loading, className, children, ...props }: ButtonProps) {
  return (
    <button className={button({ variant, size, className })} disabled={loading} {...props}>
      {loading && <Spinner aria-hidden="true" />}
      {children}
    </button>
  );
}
```

## Compound Components

For complex widgets where sub-components need shared state:

```tsx
import { createContext, useContext, useState } from 'react';

// Context
type AccordionContextValue = {
  openItems: Set<string>;
  toggle: (id: string) => void;
};

const AccordionContext = createContext<AccordionContextValue | null>(null);

function useAccordion() {
  const ctx = useContext(AccordionContext);
  if (!ctx) throw new Error('Accordion.* must be used within <Accordion>');
  return ctx;
}

// Root
function Accordion({ children, defaultOpen = [] }: { children: React.ReactNode; defaultOpen?: string[] }) {
  const [openItems, setOpenItems] = useState(new Set(defaultOpen));
  const toggle = (id: string) => {
    setOpenItems(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  return (
    <AccordionContext.Provider value={{ openItems, toggle }}>
      <div>{children}</div>
    </AccordionContext.Provider>
  );
}

// Sub-components
function Item({ id, children }: { id: string; children: React.ReactNode }) {
  return <div data-accordion-item={id}>{children}</div>;
}

function Trigger({ id, children }: { id: string; children: React.ReactNode }) {
  const { openItems, toggle } = useAccordion();
  return (
    <button
      aria-expanded={openItems.has(id)}
      aria-controls={`panel-${id}`}
      onClick={() => toggle(id)}
    >
      {children}
    </button>
  );
}

function Content({ id, children }: { id: string; children: React.ReactNode }) {
  const { openItems } = useAccordion();
  return (
    <div id={`panel-${id}`} role="region" hidden={!openItems.has(id)}>
      {children}
    </div>
  );
}

// Attach sub-components
Accordion.Item = Item;
Accordion.Trigger = Trigger;
Accordion.Content = Content;

// Usage:
// <Accordion defaultOpen={["faq-1"]}>
//   <Accordion.Item id="faq-1">
//     <Accordion.Trigger id="faq-1">Question 1</Accordion.Trigger>
//     <Accordion.Content id="faq-1">Answer 1</Accordion.Content>
//   </Accordion.Item>
// </Accordion>
```

## Polymorphic Components (as prop)

```tsx
type PolymorphicProps<E extends React.ElementType, P = object> = P &
  Omit<React.ComponentProps<E>, keyof P | 'as'> & {
    as?: E;
  };

function Text<E extends React.ElementType = 'p'>({
  as,
  variant = 'body',
  className,
  ...props
}: PolymorphicProps<E, { variant?: 'body' | 'heading' | 'caption' }>) {
  const Component = as || 'p';
  return <Component className={textStyles({ variant, className })} {...props} />;
}

// Usage:
// <Text as="h1" variant="heading">Title</Text>
// <Text variant="caption">Small text</Text>
```

## Slots Pattern

```tsx
type CardProps = {
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
};

function Card({ header, footer, children }: CardProps) {
  return (
    <div className="card">
      {header && <div className="card-header">{header}</div>}
      <div className="card-body">{children}</div>
      {footer && <div className="card-footer">{footer}</div>}
    </div>
  );
}
```

## Props Design Rules

| Rule | Example |
|------|---------|
| Variant enum over booleans | `variant="primary"` not `primary={true}` |
| Render props for custom rendering | `renderItem={(item) => ...}` |
| Children for composition | `<Card><CardBody>...</CardBody></Card>` |
| Callback naming: on + Event | `onSelect`, `onChange`, `onDismiss` |
| Controlled + uncontrolled | `value`/`onChange` OR `defaultValue` |
| Forward className | Always merge with internal classes |
| Spread rest props | `{...props}` on root element |

## Decision Table

| Complexity | Pattern |
|-----------|---------|
| Simple with variants | CVA + flat props |
| Multi-section layout | Slots (header/footer/children) |
| Complex multi-part widget | Compound components with context |
| Element flexibility needed | Polymorphic `as` prop |
| Headless reuse | Hook + unstyled wrapper |
| External state control | Controlled/uncontrolled with `default*` |
