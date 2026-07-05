---
type: fact
title: "Component-Level Visual Testing"
---

# Component-Level Visual Testing

## Why Component-Level

Testing visuals at the component level (not full page) provides:
- Faster feedback (render one component vs full app)
- Isolation from unrelated changes (no false positives from other components)
- Better coverage of states (easily render all variants)
- Simpler debugging (smaller diff scope)

## Storybook + Chromatic Workflow

### Architecture
```
Storybook stories → Chromatic captures → Baseline comparison → PR review
```

### Writing Visual-Testable Stories
```tsx
// Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  component: Button,
  // Consistent rendering for visual tests
  parameters: {
    chromatic: { disableSnapshot: false },
  },
};
export default meta;

type Story = StoryObj<typeof Button>;

// Each story = one visual snapshot
export const Primary: Story = {
  args: { variant: 'primary', children: 'Click me' },
};

export const Disabled: Story = {
  args: { variant: 'primary', disabled: true, children: 'Disabled' },
};

export const Loading: Story = {
  args: { variant: 'primary', loading: true, children: 'Loading' },
};

// Responsive test
export const Mobile: Story = {
  args: { variant: 'primary', children: 'Click me' },
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
    chromatic: { viewports: [320] },
  },
};
```

### Chromatic Configuration
```javascript
// .storybook/main.ts
export default {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-viewport'],
};

// chromatic.config.json
{
  "projectToken": "...",
  "onlyChanged": true,
  "externals": ["**/*.css", "**/*.scss"],
  "viewports": [320, 768, 1200]
}
```

### CI Integration
```yaml
- name: Publish to Chromatic
  uses: chromaui/action@v11
  with:
    projectToken: ${{ secrets.CHROMATIC_TOKEN }}
    onlyChanged: true
    exitZeroOnChanges: true  # don't fail CI, require approval
```

## Isolated Rendering

### Decorators for Consistency
```tsx
// .storybook/preview.tsx
const preview: Preview = {
  decorators: [
    (Story) => (
      <div style={{ padding: '1rem', fontFamily: 'Inter, sans-serif' }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    // Disable animations for deterministic snapshots
    chromatic: { pauseAnimationAtEnd: true },
    // Consistent backgrounds
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#ffffff' },
        { name: 'dark', value: '#1a1a1a' },
      ],
    },
  },
};
```

### Handling Dynamic Content
```tsx
// Mock dates for consistency
export const WithTimestamp: Story = {
  decorators: [
    (Story) => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-15T10:00:00Z'));
      return <Story />;
    },
  ],
};

// Mock images to avoid network flakiness
export const WithAvatar: Story = {
  args: {
    avatarUrl: '/placeholder-avatar.png',  // local static asset
  },
};
```

### State Coverage Matrix

For each component, cover:
- Default/empty state
- Populated/filled state
- Loading state
- Error state
- Disabled state
- Hover/focus (use `play` function)
- Edge cases: long text, missing data, maximum content

```tsx
export const LongContent: Story = {
  args: {
    title: 'A'.repeat(200),  // test truncation
    items: Array.from({ length: 50 }, (_, i) => ({ id: i, name: `Item ${i}` })),
  },
};
```

## Responsive Snapshots

### Viewport Strategy
```tsx
// Component-level responsive testing
export const ResponsiveCard: Story = {
  parameters: {
    chromatic: {
      viewports: [320, 768, 1024, 1440],
    },
  },
};
```

### Breakpoint Coverage
| Viewport | Represents | Priority |
|---|---|---|
| 320px | Small mobile | High |
| 375px | Standard mobile | Medium |
| 768px | Tablet portrait | High |
| 1024px | Tablet landscape / small desktop | Medium |
| 1200px | Desktop | High |
| 1440px | Large desktop | Low |

### Container Query Testing
```tsx
// Test component at different container sizes (not viewport)
export const NarrowContainer: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: '300px' }}>
        <Story />
      </div>
    ),
  ],
};

export const WideContainer: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: '800px' }}>
        <Story />
      </div>
    ),
  ],
};
```

## Alternatives to Chromatic

| Tool | Hosting | Pricing | Differentiator |
|---|---|---|---|
| Chromatic | Cloud | Per-snapshot | Storybook-native, AI diffing |
| Percy (BrowserStack) | Cloud | Per-snapshot | Multi-framework, cross-browser |
| Playwright visual | Self-hosted | Free | Full control, no cloud dependency |
| Loki | Self-hosted | Free | Storybook-focused, Docker-based |
| Storycap + reg-suit | Self-hosted | Free | Lightweight, GitHub integration |

### Self-Hosted Alternative (Playwright)
```typescript
// visual.spec.ts
import { test, expect } from '@playwright/test';

test('Button variants', async ({ page }) => {
  await page.goto('http://localhost:6006/iframe.html?id=button--primary');
  await expect(page.locator('#storybook-root')).toHaveScreenshot('button-primary.png');
});
```

## Anti-Patterns

- Snapshotting full pages instead of components (too many false positives)
- Not mocking dynamic content (dates, avatars, random IDs)
- Missing animation disabling (non-deterministic captures)
- Too few viewports (miss responsive breakpoint bugs)
- No baseline approval process (snapshots go stale)
- Testing implementation details (DOM structure) instead of visual output
- Ignoring dark mode (ship it broken, catch in production)

## Maintenance Strategy

- Review snapshot changes on every PR (part of review process)
- Regenerate baselines after intentional design changes
- Archive unused stories (they slow down CI)
- Monitor snapshot count growth (budget: <500 per project)
- Prune redundant states (if two stories look identical, remove one)
