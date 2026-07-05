# Execution Planning Prompt

You are creating a detailed execution plan from requirements. The plan should be specific enough that any engineer on the team could pick it up and start working.

## Input

**Goal:** {{what_we_are_building}}
**Requirements:** {{list_of_requirements}}
**Constraints:** {{timeline_tech_team_constraints}}
**Context:** {{relevant_architecture_or_prior_decisions}}

## Instructions

### 1. Decompose Into Tasks

Break the goal into tasks that are:
- **Independent** -- can be worked on without blocking on other tasks (where possible)
- **Testable** -- have a clear "done" state you can verify
- **Small** -- completable in 1-3 days by one person
- **Ordered** -- critical path tasks identified and sequenced

For each task:
```
- ID: T-[N]
- Description: [What to do, specifically]
- Acceptance criteria: [How to verify it's done]
- Dependencies: [T-X, T-Y or "none"]
- Estimated effort: [hours or days]
- Risk: [low/medium/high -- and why if high]
```

### 2. Identify the Critical Path

Which tasks form the longest dependency chain? This determines the minimum timeline.

### 3. Parallelization Opportunities

Which tasks can be worked on simultaneously? Group them into swim lanes.

### 4. Risk Register

| Risk | Likelihood | Impact | Mitigation | Owner |
|------|-----------|--------|------------|-------|

### 5. Milestones

Define 2-4 checkpoints where we can demo progress or make go/no-go decisions.

| Milestone | Tasks Included | Target Date | Demo/Deliverable |
|-----------|---------------|-------------|-----------------|

## Output Format

Structured plan with all 5 sections. Tasks in dependency order. Call out assumptions explicitly.
