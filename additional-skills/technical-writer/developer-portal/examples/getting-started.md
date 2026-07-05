# Getting Started with the Task API

Build a simple task tracker in under 5 minutes.

## Prerequisites

- A programming language runtime (Node.js 18+, Python 3.10+, or Go 1.21+)
- An API key (get one free at the [developer dashboard](https://dashboard.example.com/api-keys))

## Step 1: Install the SDK

Choose your language:

```bash
# JavaScript / TypeScript
npm install @example/task-sdk

# Python
pip install example-task-sdk

# Go
go get github.com/example/task-sdk-go
```

## Step 2: Create your first task

```javascript
import { TaskClient } from '@example/task-sdk';

const client = new TaskClient({
  apiKey: 'your-api-key-here'
});

const task = await client.tasks.create({
  title: 'My first task',
  priority: 'medium'
});

console.log(`Created task: ${task.id}`);
```

```python
from example_task_sdk import TaskClient

client = TaskClient(api_key="your-api-key-here")

task = client.tasks.create(
    title="My first task",
    priority="medium"
)

print(f"Created task: {task.id}")
```

```go
package main

import (
    "fmt"
    task "github.com/example/task-sdk-go"
)

func main() {
    client := task.NewClient("your-api-key-here")

    t, err := client.Tasks.Create(task.CreateParams{
        Title:    "My first task",
        Priority: "medium",
    })
    if err != nil {
        panic(err)
    }

    fmt.Printf("Created task: %s\n", t.ID)
}
```

**Expected result:** A new task is created and its unique ID is printed.

## Step 3: List your tasks

```javascript
const tasks = await client.tasks.list({ status: 'open' });

for (const task of tasks.data) {
  console.log(`${task.id}: ${task.title} [${task.priority}]`);
}
```

**Expected result:** You see the task you created in the previous step.

## Step 4: Complete the task

```javascript
await client.tasks.update(task.id, { status: 'done' });
console.log('Task completed!');
```

**Expected result:** The task status changes to "done".

## What you just did

1. Installed the SDK
2. Created a task via the API
3. Listed tasks with a filter
4. Updated a task's status

## What's next?

- [Add due dates and assignees](/docs/guides/task-management) -- organize your tasks
- [Set up webhooks](/docs/guides/webhooks) -- get notified when tasks change
- [Handle errors](/docs/guides/error-handling) -- build production-ready code
- [API Reference](/docs/api/tasks) -- see all available endpoints

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| 401 Unauthorized | Invalid or missing API key | Check your key at the [dashboard](https://dashboard.example.com/api-keys) |
| Connection timeout | Network or firewall issue | Verify you can reach `api.example.com` on port 443 |
| Module not found | SDK not installed | Re-run the install command from Step 1 |
