---
type: fact
title: "Progressive Disclosure"
---

# Progressive Disclosure

Layer information so readers get what they need at their skill level without being overwhelmed.

## Principle

Show the minimum needed to complete the task. Provide paths to deeper detail for those who want it.

## The Layers

### Layer 1: TL;DR (everyone scans this)

- One-sentence summary of what the page covers
- The most common use case handled in 3-5 steps
- Copy-paste ready code for the "80% case"

### Layer 2: Standard (most readers stop here)

- Full step-by-step procedure
- All common options explained
- Expected results and basic troubleshooting
- Links to prerequisite concepts

### Layer 3: Advanced (power users explore)

- Edge cases and special configurations
- Performance optimization options
- Integration with other features
- Uncommon options and flags

### Layer 4: Reference (lookup when needed)

- Complete parameter/option list
- All possible values and their effects
- Schema definitions
- SDK method signatures

## Implementation Patterns

### Collapsed sections

```markdown
## Set up authentication

1. Generate an API key in the dashboard.
2. Set the `API_KEY` environment variable.

<details>
<summary>Advanced: using OAuth2 instead</summary>

If your application needs user-level authentication...
[detailed OAuth2 setup]

</details>
```

### Tabbed content

```markdown
## Install the SDK

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
  <TabItem value="quick" label="Quick Install" default>
    npm install @example/sdk
  </TabItem>
  <TabItem value="advanced" label="Custom Build">
    [detailed build-from-source instructions]
  </TabItem>
</Tabs>
```

### "Learn more" callouts

```markdown
Run `task create --title "My task"` to create a task.

> Want to understand how task creation works under the hood?
> See [Task lifecycle](/docs/concepts/task-lifecycle).
```

### Layered examples

```markdown
## Create a task

**Basic:**
```bash
task create --title "Review PR"
```

**With options:**
```bash
task create --title "Review PR" --priority high --assignee @alice --due 2026-02-15
```

**Full programmatic example:**
```javascript
const task = await client.tasks.create({
  title: "Review PR",
  priority: "high",
  assignee_id: "user_alice",
  due_at: "2026-02-15T17:00:00Z",
  labels: ["review", "urgent"],
  project_id: "proj_backend"
});
```
```

## Information Architecture

### Page-level disclosure

```
Homepage: one sentence + primary CTA
Quickstart: 5-step happy path
Tutorial: guided walkthrough with explanation
Guide: complete task coverage with options
Reference: every parameter and response
```

### Section-level disclosure

Within a single page:
1. Summary/overview (what and why -- 2 sentences)
2. Quick version (most common path)
3. Detailed version (all options)
4. Edge cases (collapsed or linked separately)

## Anti-Patterns

### Information dump

Bad: every option, flag, and edge case in one flat page. Reader must scan 3000 words to find the one parameter they need.

### Hidden essentials

Bad: critical information (like rate limits or auth requirements) buried in an "Advanced" section that 90% of users need.

### Progressive confusion

Bad: the "simple" version omits essential context, so users follow it, hit an error, and have to start over with the "advanced" version.

## Rules for Placement

| Information type | Layer | Justification |
|-----------------|-------|---------------|
| Authentication setup | Layer 1-2 | Everyone needs it first |
| Error handling | Layer 2 | Most users encounter errors |
| Rate limit details | Layer 2 | Affects everyone in production |
| Webhook signatures | Layer 2-3 | Only for webhook consumers |
| Performance tuning | Layer 3 | Only for high-traffic users |
| Schema internals | Layer 4 | Only for edge cases |
| Deprecated options | Layer 3-4 | Only for migration |

## Navigation Cues

Help readers find their layer:

- "New to the API? Start with [Quickstart](/docs/quickstart)"
- "Looking for a specific parameter? Jump to [Reference](/docs/reference)"
- "Running into issues? See [Troubleshooting](/docs/troubleshooting)"

## Measuring Effectiveness

Signals that disclosure levels are wrong:
- Users search for basic info that is hidden in advanced sections
- Support tickets for things documented only at Layer 3-4
- Analytics showing users bounce from reference pages (needed a tutorial)
- Feedback: "I wish the docs were simpler" (too flat) or "I could not find X" (too hidden)
