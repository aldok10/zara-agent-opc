# Journey Mapping

## What Is a User Journey Map?

A visual representation of the steps a user takes to accomplish a goal, including their actions, thoughts, emotions, and pain points at each stage.

## Journey Map Components

### Stages

High-level phases the user passes through. Typically 4-7 stages.

Example (e-commerce): Awareness > Research > Comparison > Purchase > Delivery > Post-Purchase

### User Actions

What the user physically does at each stage. Observable behavior.

### Touchpoints

Where the user interacts with the system. Channels, screens, communications.

### Thoughts

What the user is thinking or wondering. Internal questions and expectations.

### Emotions

How the user feels (frustrated, confident, anxious, delighted). Map as a curve across stages.

### Pain Points

Moments of friction, confusion, or dissatisfaction. Where users abandon or complain.

### Opportunities

Ideas for improvement tied to specific pain points.

## Swimlane Structure

```
| Stage      | Awareness | Research | Purchase | Delivery |
|------------|-----------|----------|----------|----------|
| Actions    |           |          |          |          |
| Touchpoints|           |          |          |          |
| Thoughts   |           |          |          |          |
| Emotions   |  (curve)  |          |          |          |
| Pain Points|           |          |          |          |
```

## Types of Journey Maps

### Current State

Documents the experience as it exists today. Based on research, analytics, and user interviews. Identifies what's broken.

### Future State

Envisions the improved experience. Based on current state pain points. Shows the target state after improvements.

### Service Blueprint

Extends the journey map below the line of visibility. Shows:
- Frontstage actions (user-visible)
- Backstage actions (employee/system actions user doesn't see)
- Support processes (systems enabling backstage)
- Evidence (physical/digital artifacts user receives)

## Bottleneck Identification

### Quantitative Signals

- Drop-off rates between stages (funnel analysis)
- Time spent at each stage (longer = friction or engagement?)
- Error rates per touchpoint
- Support ticket clusters by journey stage
- Retry/abandonment patterns

### Qualitative Signals

- User interviews: "I got confused when..."
- Usability testing: hesitation, backtracking
- Support transcripts: common questions per stage
- App store reviews: recurring complaints

### Common Bottleneck Patterns

| Pattern | Signal | Root Cause |
|---------|--------|------------|
| High drop-off | Funnel narrowing | Too much friction |
| Long dwell time | Time-on-step spike | Confusion or missing info |
| Repeated visits | Same stage revisited | Uncertainty, need reassurance |
| Channel switching | Call center spike | Digital flow insufficient |
| Rage clicks | Rapid repeated actions | Broken or unclear UI |

## Building a Journey Map

### Step 1: Define Scope

- Who is the persona?
- What goal are they trying to achieve?
- Where does the journey start and end?

### Step 2: Research

- Interview 5-8 users who recently completed the journey
- Analyze funnel data and analytics
- Review support tickets and feedback
- Shadow users if possible

### Step 3: Map Stages

Identify the major phases. Keep to 4-7.

### Step 4: Fill Swimlanes

For each stage, document actions, touchpoints, thoughts, emotions, pain points.

### Step 5: Identify Patterns

- Where do emotions dip?
- Where are pain points clustered?
- Which stages have the most drop-off?

### Step 6: Prioritize Opportunities

Focus on:
- High-frequency pain points (many users affected)
- High-severity pain points (causes abandonment or anger)
- Pain points at critical conversion moments

## Anti-Patterns

- Mapping without user research (just guessing)
- Making it too detailed (50+ micro-steps)
- One journey for all personas (different users have different paths)
- Never updating the map (journeys change as product evolves)
- No link to action (map created, then ignored)
