---
type: subskill
title: "Tutorials"
---

# Tutorials

Learning-oriented documentation -- step-by-step guides that teach through building a working example.

## When to Load

- Writing documentation that teaches a concept through practice
- Designing learning paths for new users
- Converting internal knowledge into structured learning material
- Evaluating tutorial quality and completeness

## Key Concepts

**Learning-oriented** -- Tutorials exist to teach. The user learns by doing, not by reading. Every step produces a visible result. The destination matters less than the journey.

**Working Example** -- The tutorial builds something real (small but complete). At the end, the user has a functioning artifact they can extend. Not a toy that only works in the tutorial.

**Minimum Viable Scope** -- Teach one concept per tutorial. If you need to explain auth AND database AND deployment, split into three tutorials with a clear sequence.

**Progressive Complexity** -- Start with the simplest possible version. Each step adds one layer. The user always has a working state between steps. Never introduce two new concepts simultaneously.

**Reproducibility** -- Every step must work exactly as described on a clean environment. Pin dependency versions. Specify OS assumptions. Include expected output after each command.

## Patterns

```markdown
# Build a REST API with Express

In this tutorial, you will build a working REST API that stores
and retrieves items. By the end, you will have a running server
with CRUD endpoints.

## What you will learn
- Setting up an Express server
- Creating route handlers
- Connecting to a database
- Testing endpoints with curl

## Prerequisites
- Node.js 20+ installed
- A terminal

## Step 1: Create the project

```bash
mkdir todo-api && cd todo-api
npm init -y
npm install express@4.18.2
```

You should see a `node_modules/` directory and `package.json`.

## Step 2: Create the server

Create `index.js`:
```javascript
const express = require('express');
const app = express();
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(3000, () => console.log('Running on port 3000'));
```

Run it:
```bash
node index.js
```

Test it:
```bash
curl http://localhost:3000/health
```

Expected output:
```json
{"status":"ok"}
```
```

## Gotchas

- Explaining "why" too early breaks flow -- teach the mechanic first, explain the reason in a callout or later section
- Skipping steps that seem obvious (installing tools, creating directories) trips up beginners
- Using "simply" or "just" implies things are easy when they might not be for the reader
- Tutorials that require external services (databases, cloud accounts) need explicit setup steps or alternatives
- Not showing expected output leaves users unsure if they succeeded

## Verification

- Follow the tutorial yourself from scratch on a clean machine
- Every code block is complete and copy-pasteable (no implicit context)
- Each step ends with a visible success signal (output, screenshot, test passing)
- A beginner can complete the tutorial without external research
- Time estimate is accurate (test with someone unfamiliar with the content)
