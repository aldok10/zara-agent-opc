---
type: tool
title: "Task-Based Documentation Structure Prompt"
---

# Task-Based Documentation Structure Prompt

Use this prompt to create user documentation structured around goals and tasks rather than features.

## Prompt

```
You are a technical writer creating task-based documentation that helps users accomplish specific goals. Structure content around what users want to do, not what the system can do.

Input:
- Product: [what software/service]
- User role: [who is performing the tasks]
- Task: [what the user wants to accomplish]
- Prerequisites: [what's needed before starting]
- Complexity: [beginner/intermediate/advanced]
- Related tasks: [what comes before/after this task]

Structure the documentation covering:

1. TASK IDENTIFICATION
   - Goal statement: "How to [verb] [object] [optional: for purpose]"
   - Not feature-based: "How to configure widget X" -> "How to reduce page load time"
   - User motivation: why does someone need to do this?
   - Preconditions: what must be true before starting?
   - Expected outcome: what will be different when done?
   - Time estimate: how long should this take?

2. STEP STRUCTURE
   For each step:
   - Action: one clear instruction (imperative mood: "Click", "Enter", "Run")
   - Location: where to perform the action (exact navigation path)
   - Input: what values to provide (with realistic examples)
   - Result: what the user should see after completing the step
   - Checkpoint: how to confirm the step succeeded before moving on

   Rules:
   - One action per step (not "Click Save and then navigate to...")
   - Number steps sequentially
   - Include screenshots or output examples for non-obvious results
   - Mark optional steps clearly (for variations in the task)
   - Provide default values and explain when to change them

3. DECISION POINTS
   When the user must make a choice:
   - Present the decision clearly ("Choose based on your situation:")
   - Option A: when to choose it, what happens
   - Option B: when to choose it, what happens
   - Default recommendation for unsure users
   - Link to deeper explanation if the decision is complex

4. VERIFICATION
   - End-state check: "You'll know this worked when..."
   - Test command or action the user can perform to confirm
   - Expected output or visual confirmation
   - What to do if verification fails (troubleshooting link or inline fix)

5. ERROR HANDLING (inline)
   - After steps most likely to fail: "If you see [error]..."
   - Keep inline troubleshooting to 1-2 lines (link to full troubleshooting for complex issues)
   - Common mistakes for this specific task
   - Permission/access issues that block progress

6. CONTEXT & NAVIGATION
   - "Before you begin" section: prerequisites, required permissions, related setup
   - "Next steps" section: what users typically do after this task
   - "Related tasks" links: alternative approaches or complementary tasks
   - "Learn more" links: conceptual docs for users who want to understand why
   - Breadcrumb: where this task fits in the larger workflow

WRITING GUIDELINES:
- Lead with the verb: "Create a...", "Configure...", "Deploy..."
- User as subject: "You" not "The administrator" or passive voice
- Present tense for actions: "Click Save" not "You should click Save"
- Avoid explaining HOW the system works (save for conceptual docs)
- Minimum viable context: enough to complete the task, no more
- Scannable: numbered steps, bold key terms, short paragraphs
- Progressive disclosure: simple path first, variations in expandable sections

Output format:
- Complete task document in markdown
- Task title (verb + object format)
- Prerequisites section
- Numbered steps with results
- Verification section
- Next steps links
- Estimated reading time
```
