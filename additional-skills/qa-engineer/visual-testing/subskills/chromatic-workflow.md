---
type: subskill
title: "Chromatic Workflow"
---

# Chromatic Workflow

## Setup with Storybook

```bash
npm install --save-dev chromatic
npx chromatic --project-token=<token>
```

Add to `package.json`:
```json
{ "scripts": { "chromatic": "chromatic --exit-zero-on-changes" } }
```

Chromatic captures a snapshot of every story on every push. Stories are your visual test cases.

## TurboSnap

Only snapshot stories affected by code changes:

```bash
npx chromatic --only-changed
```

TurboSnap traces module dependencies from changed files to affected stories. Reduces snapshot count by 60-90% on typical PRs. Requires accurate dependency graphs (no dynamic imports that bypass static analysis).

Enable in CI:
```yaml
- run: npx chromatic --only-changed --auto-accept-changes "main"
```

`--auto-accept-changes "main"` accepts baselines on main branch merges automatically.

## Review Workflow

1. PR triggers Chromatic build
2. Changed components show visual diffs in Chromatic UI
3. Reviewers approve or deny each change
4. Denied changes block merge (if CI configured to require approval)

Assign reviewers per component area. Use Chromatic's "review" status check as a required PR check.

## CI Integration

```yaml
- name: Visual Tests
  uses: chromaui/action@v11
  with:
    projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
    onlyChanged: true
    exitZeroOnChanges: false  # Fail on unapproved changes
    exitOnceUploaded: true    # Don't wait for review (async)
```

Set `exitZeroOnChanges: false` to block PRs until visual changes are approved. Use `exitOnceUploaded: true` for async review without blocking CI.

## Cross-Browser Testing

Chromatic captures in Chrome by default. Enable additional browsers:

- Chrome (default, always active)
- Firefox (project settings)
- Safari (project settings)

Cross-browser diffs show rendering differences per browser. Configure in Chromatic project settings, not in code.

## UI Test (Interaction Testing)

Chromatic runs Storybook interaction tests (`play` functions):

```ts
export const Submitted: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button'));
    await expect(canvas.getByText('Success')).toBeVisible();
  },
};
```

Interactions execute before snapshot capture. Tests both behavior and resulting visual state.

## Build Management

- **Builds page**: history of all visual test runs
- **Baselines**: auto-managed per branch, merge follows git history
- **Retention**: configurable per plan (free tier: 5000 snapshots/month)
- **Project settings**: manage collaborators, browsers, notifications
