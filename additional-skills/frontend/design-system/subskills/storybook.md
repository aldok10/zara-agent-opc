---
type: subskill
title: "Storybook"
---

# Storybook

## Activation

Triggered when: writing stories, configuring Storybook 8, setting up visual testing, adding addons, or documenting components.

## Core Principles

- CSF3 (Component Story Format 3) is the standard.
- Every component has at least: Default, All Variants, Interactive (play function).
- Autodocs generate documentation from stories + JSDoc/TSDoc.
- Visual testing via Chromatic or similar tools.
- Stories are the development environment, not just documentation.

## CSF3 Story Structure

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
  },
  args: {
    children: 'Button',
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: { variant: 'primary' },
};

export const Secondary: Story = {
  args: { variant: 'secondary' },
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
    </div>
  ),
};
```

## Play Functions (Interaction Testing)

```tsx
import { within, userEvent, expect } from '@storybook/test';

export const Interactive: Story = {
  args: { variant: 'primary' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button');

    await expect(button).toBeVisible();
    await userEvent.click(button);
    await expect(button).toHaveFocus();
  },
};
```

## Storybook 8 Configuration

```ts
// .storybook/main.ts
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-a11y',
    '@storybook/addon-interactions',
  ],
  framework: '@storybook/react-vite',
  docs: { autodocs: 'tag' },
};

export default config;
```

```ts
// .storybook/preview.ts
import type { Preview } from '@storybook/react';
import '../src/styles/tokens.css';

const preview: Preview = {
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    a11y: { config: { rules: [{ id: 'color-contrast', enabled: true }] } },
  },
  decorators: [
    (Story) => (
      <div className="storybook-wrapper">
        <Story />
      </div>
    ),
  ],
};

export default preview;
```

## Visual Testing (Chromatic)

```yaml
# CI integration
- name: Visual regression
  run: npx chromatic --project-token=$CHROMATIC_TOKEN --exit-zero-on-changes
```

Local visual testing with test-runner:
```bash
npx @storybook/test-runner --url http://localhost:6006
```

## Autodocs Enhancement

```tsx
/**
 * Primary action button for forms and CTAs.
 *
 * ## Usage
 * ```tsx
 * <Button variant="primary" onClick={handleSubmit}>Submit</Button>
 * ```
 *
 * ## Accessibility
 * - Uses native `<button>` element
 * - Includes focus-visible ring
 * - Disabled state uses `aria-disabled` for screen readers
 */
export function Button({ variant, size, children, ...props }: ButtonProps) {
  // ...
}
```

## Story Organization

```
src/
  components/
    Button/
      Button.tsx
      Button.stories.tsx      <- Component stories
      Button.test.tsx         <- Unit tests
    Card/
      Card.tsx
      Card.stories.tsx

stories/
  Introduction.mdx            <- Docs-only page
  Tokens.mdx                  <- Token documentation
```

## Decision Table

| Need | Approach |
|------|----------|
| Component documentation | `tags: ['autodocs']` + JSDoc on component |
| Interaction test | Play function with `@storybook/test` |
| Visual regression | Chromatic or BackstopJS |
| Theme switching in stories | Toolbar addon with decorator |
| Responsive preview | Viewport addon with breakpoints |
| Accessibility check | `@storybook/addon-a11y` (axe-core) |
| Custom docs page | MDX file with `<Canvas>` blocks |

## Storybook 9 & 10

### Storybook 9: CSF Factories

CSF Factories replace manual `Meta`/`StoryObj` typing with factory functions that provide full type safety and less boilerplate. Successor to CSF3.

```tsx
import { config } from '#.storybook/preview';
import { Button } from './Button';

const { meta, story } = config.meta({ component: Button });
export default meta;

export const Primary = story({ args: { variant: 'primary', children: 'Click' } });
export const Secondary = story({ args: { variant: 'secondary', children: 'Submit' } });
```

- `config.meta()` infers args from component props automatically.
- `story()` returns a fully typed story  -  no `StoryObj<typeof meta>` needed.
- Play functions, decorators, and parameters work the same way.

### Storybook 10: ESM-Only + Lighter Install

- **ESM-only**: drops CJS support, 29% smaller install size.
- **CSF Factories is the primary pattern**  -  all docs and generators use it by default.
- Performance improvements to dev server startup and HMR.
- Addon API simplified with new lifecycle hooks.

> **Backward compatibility**: CSF3 (`Meta` + `StoryObj` objects) still works in Storybook 9 and 10. Use CSF Factories for new code.
