---
type: fact
title: "Task-Based Writing"
---

# Task-Based Writing

Write documentation structured around user tasks, not product features.

## Core Principle

Every documentation page answers: "How do I [accomplish goal]?"

Not: "What is [feature]?" or "About [component]"

## Task Analysis

Before writing, identify:

1. **Who** is performing the task (persona, skill level)
2. **What** they want to accomplish (goal, not feature)
3. **When** they perform this task (trigger, context)
4. **What** they need before starting (prerequisites)
5. **What** success looks like (expected outcome)

## Page Structure

```markdown
# [Verb] [object] -- e.g., "Export tasks to CSV"

Brief context (1-2 sentences): why someone would do this.

## Prerequisites

- [What they need before starting]
- [Access, tools, prior steps]

## Steps

1. [Imperative verb] [object]

   **Expected result:** [What they should see]

2. [Next action]

   **Expected result:** [Confirmation of progress]

3. [Final action]

   **Expected result:** [Task complete indicator]

## What's next?

- [Logical follow-up task with link]
- [Related task with link]

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| [What goes wrong] | [Why] | [How to fix] |
```

## Writing Steps

### Rule 1: One action per step

Bad: "Open the settings page and navigate to the API section, then click Generate Key."

Good:
1. Open **Settings**.
2. Select **API**.
3. Click **Generate Key**.

### Rule 2: Start with imperative verb

Good starters: Click, Select, Enter, Open, Navigate, Run, Copy, Paste, Drag, Choose, Type, Press, Scroll, Expand, Collapse

Bad starters: "You should...", "The next step is to...", "Now you need to..."

### Rule 3: Include expected result

After each significant step, tell the reader what to expect:

```markdown
3. Click **Deploy**.

   **Expected result:** The status indicator changes from "Draft" to "Deploying". Deployment takes 1-2 minutes.
```

This serves two purposes:
- Confirms the step worked
- Sets timing expectations

### Rule 4: State prerequisites before steps

Never surprise the reader mid-procedure with requirements:

Bad:
```markdown
1. Open the terminal.
2. Run `kubectl apply -f deployment.yaml`.
   Note: You need kubectl installed and configured first.
```

Good:
```markdown
## Prerequisites
- kubectl installed and configured for your cluster
- `deployment.yaml` file created (see [Create a deployment file](/docs/guides/deployments))

## Steps
1. Open the terminal.
2. Run `kubectl apply -f deployment.yaml`.
```

### Rule 5: Provide context without lecturing

One to two sentences of "why" before steps. Not a paragraph of background.

Bad: "CSV export is a feature that allows you to download your data in a comma-separated values format, which is compatible with spreadsheet applications like Microsoft Excel and Google Sheets. This can be useful for reporting, data analysis, or sharing information with team members who do not have access to the platform."

Good: "Export your tasks to CSV for use in spreadsheets or external reporting tools."

## Procedural vs Conceptual

| Document type | Structure | Example title |
|--------------|-----------|---------------|
| Procedural (how-to) | Steps to accomplish a task | "Set up webhook notifications" |
| Conceptual (explanation) | Background knowledge | "How webhook delivery works" |
| Reference | Complete details | "Webhook event types" |

Procedural docs link TO conceptual docs for background. They do not embed the explanation inline.

## Complex Procedures

For procedures with branches or conditions:

```markdown
3. Select your authentication method:

   **OAuth2 (recommended for production):**
   a. Click **Configure OAuth2**.
   b. Enter your Client ID and Client Secret.
   c. Click **Authorize**.

   **API Key (for development):**
   a. Click **Generate API Key**.
   b. Copy the key and store it securely.
```

## Multi-Path Documentation

When a procedure differs by platform:

```markdown
3. Install the CLI:

   **macOS:**
   ```bash
   brew install taskapi
   ```

   **Linux:**
   ```bash
   curl -sSL https://get.example.com | sh
   ```

   **Windows:**
   ```powershell
   winget install example.taskapi
   ```
```

## Testing Procedures

Before publishing any procedural documentation:
1. Follow every step exactly as written on a clean environment
2. Verify expected results match actual results
3. Test error paths (what happens if a step fails?)
4. Have someone unfamiliar with the product follow the steps
5. Retest after every product update that affects the documented flow
