# Tutorial: Build a Task Dashboard

Learn how to fetch, display, and update tasks by building a real-time dashboard.

## What you will build

A web dashboard that:
- Displays all open tasks in a list
- Shows task details when selected
- Allows marking tasks as complete
- Updates in real-time via webhooks

## Prerequisites

- Node.js 18 or later installed
- An API key ([get one here](https://dashboard.example.com/api-keys))
- Basic familiarity with JavaScript and HTML

## Time estimate

30-45 minutes

---

## Part 1: Fetch and display tasks

### Step 1: Set up the project

Create a new directory and initialize it:

```bash
mkdir task-dashboard && cd task-dashboard
npm init -y
npm install @example/task-sdk express
```

**Expected result:** `package.json` and `node_modules/` directory created.

### Step 2: Create the server

Create `server.js`:

```javascript
import express from 'express';
import { TaskClient } from '@example/task-sdk';

const app = express();
const client = new TaskClient({ apiKey: process.env.API_KEY });

app.get('/api/tasks', async (req, res) => {
  const tasks = await client.tasks.list({ status: 'open' });
  res.json(tasks.data);
});

app.listen(3000, () => {
  console.log('Dashboard running at http://localhost:3000');
});
```

### Step 3: Start the server

```bash
API_KEY=your-api-key-here node server.js
```

**Expected result:** "Dashboard running at http://localhost:3000" prints to the terminal.

### Step 4: Verify the endpoint

```bash
curl http://localhost:3000/api/tasks
```

**Expected result:** JSON array of your open tasks.

---

## Part 2: Mark tasks as complete

### Step 5: Add the update endpoint

Add this route to `server.js` before `app.listen`:

```javascript
app.patch('/api/tasks/:id/complete', async (req, res) => {
  const task = await client.tasks.update(req.params.id, {
    status: 'done'
  });
  res.json(task);
});
```

### Step 6: Test the endpoint

Replace `TASK_ID` with an ID from Step 4:

```bash
curl -X PATCH http://localhost:3000/api/tasks/TASK_ID/complete
```

**Expected result:** JSON response with `"status": "done"`.

---

## Part 3: Add real-time updates

### Step 7: Register a webhook

```javascript
app.post('/api/webhooks/setup', async (req, res) => {
  const webhook = await client.webhooks.create({
    url: 'https://your-domain.com/webhooks/tasks',
    events: ['task.created', 'task.completed']
  });
  res.json(webhook);
});
```

### Step 8: Handle incoming events

```javascript
app.post('/webhooks/tasks', express.json(), (req, res) => {
  const { event, task } = req.body;
  console.log(`Event: ${event} - Task: ${task.title}`);
  // In production: broadcast to connected WebSocket clients
  res.sendStatus(200);
});
```

**Expected result:** When tasks change, events log to the console.

---

## Summary

You built a dashboard that:
1. Fetches open tasks from the API
2. Updates task status via PATCH
3. Receives real-time notifications via webhooks

## What's next?

- [Add authentication to your dashboard](/docs/guides/auth-integration)
- [Handle API errors gracefully](/docs/guides/error-handling)
- [Deploy to production](/docs/guides/deployment)
- [API reference: Tasks](/docs/api/tasks)

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| 401 on API calls | Invalid or missing API key | Check `API_KEY` environment variable |
| Empty task list | No open tasks in your account | Create a task via the dashboard first |
| Webhook not receiving events | URL not publicly accessible | Use ngrok for local development |
| ECONNREFUSED | Server not running | Check terminal for error messages |
