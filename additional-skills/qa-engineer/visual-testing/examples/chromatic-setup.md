---
type: example
title: "Chromatic Visual Testing with Storybook"
---

# Chromatic Visual Testing with Storybook

## Context
When UI changes need pixel-level review to catch unintended visual regressions. Chromatic captures snapshots of every Storybook story across browsers and viewports, then diffs against the baseline. Use for design system components, marketing pages, and any UI where visual fidelity matters.

## Code/Template

```typescript
// .storybook/main.ts
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: [
    '@storybook/addon-essentials',
    '@chromatic-com/storybook',
  ],
  framework: '@storybook/react-vite',
};

export default config;
```

```typescript
// src/components/PricingCard/PricingCard.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { PricingCard } from './PricingCard';

const meta: Meta<typeof PricingCard> = {
  title: 'Components/PricingCard',
  component: PricingCard,
  parameters: {
    // Chromatic-specific: capture at multiple viewports
    chromatic: {
      viewports: [375, 768, 1280],
      diffThreshold: 0.2, // Allow minor anti-aliasing diffs
    },
  },
};

export default meta;
type Story = StoryObj<typeof PricingCard>;

// Each story becomes a visual test snapshot
export const Free: Story = {
  args: {
    plan: 'Free',
    price: 0,
    features: ['5 projects', '1 GB storage', 'Community support'],
    highlighted: false,
  },
};

export const Pro: Story = {
  args: {
    plan: 'Pro',
    price: 29,
    features: ['Unlimited projects', '100 GB storage', 'Priority support', 'API access'],
    highlighted: true,
  },
};

export const Enterprise: Story = {
  args: {
    plan: 'Enterprise',
    price: null, // "Contact us"
    features: ['Everything in Pro', 'SSO/SAML', 'Dedicated support', 'SLA guarantee'],
    highlighted: false,
  },
};

// Test interactive states
export const HoverState: Story = {
  args: { ...Pro.args },
  parameters: {
    pseudo: { hover: true },
  },
};

// Test loading skeleton
export const Loading: Story = {
  args: {
    plan: 'Pro',
    price: 29,
    features: [],
    loading: true,
  },
};

// Test with long content (overflow edge case)
export const LongFeatureList: Story = {
  args: {
    plan: 'Custom',
    price: 99,
    features: Array.from({ length: 15 }, (_, i) => `Feature ${i + 1} with extended description text`),
    highlighted: false,
  },
};

// Dark mode variant
export const DarkMode: Story = {
  args: { ...Pro.args },
  parameters: {
    backgrounds: { default: 'dark' },
    chromatic: { theme: 'dark' },
  },
  decorators: [
    (Story) => (
      <div data-theme="dark" className="dark bg-gray-900 p-8">
        <Story />
      </div>
    ),
  ],
};
```

```yaml
# .github/workflows/chromatic.yml
name: Visual Regression Tests

on:
  pull_request:
    paths:
      - 'src/components/**'
      - 'src/styles/**'
      - '.storybook/**'

jobs:
  chromatic:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0 # Required for Chromatic baseline detection

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - run: npm ci

      - name: Run Chromatic
        uses: chromaui/action@latest
        with:
          projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
          exitZeroOnChanges: true # Don't fail CI, require manual review
          onlyChanged: true # Only snapshot stories affected by changes
          externals: 'src/styles/**' # Re-test all if global styles change
          skip: ${{ github.event.pull_request.draft }}
```

```jsonc
// package.json (relevant scripts)
{
  "scripts": {
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build",
    "chromatic": "chromatic --exit-zero-on-changes",
    "chromatic:ci": "chromatic --auto-accept-changes main"
  }
}
```

## Key Points
- Use `onlyChanged: true` in CI to avoid snapshotting 500 stories on every PR—only test what the diff touches
- Set `diffThreshold` per-story for components with animations or anti-aliasing; 0.2 avoids false positives
- Auto-accept changes on `main` merges (`--auto-accept-changes main`) so baselines stay current without manual approval loops
