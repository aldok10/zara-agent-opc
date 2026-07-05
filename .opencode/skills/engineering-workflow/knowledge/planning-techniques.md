---
type: fact
title: "Planning Techniques"
---
# Planning Techniques

## Story Mapping

Organize work by user experience flow rather than technical components.

**Structure:**
```
User Activities (top row):     Browse -> Search -> Purchase -> Track
  User Tasks (second row):     View catalog, Filter, Sort | Enter query...
    User Stories (below):      As a user I can see product images...
```

**Process:**
1. Identify user activities (big horizontal flow)
2. Break each activity into tasks (steps within the activity)
3. Under each task, write stories (smallest deliverable value)
4. Draw a horizontal line: above = MVP, below = later releases

**Benefits:**
- Shows the whole user journey at once
- Makes it obvious when you're building features nobody walks through
- Natural prioritization: left-to-right = user flow, top-to-bottom = priority
- Reveals gaps in thinking

**Tips:**
- Do this on a wall/whiteboard with the whole team
- Use physical sticky notes (digital tools lose the spatial benefit)
- The backbone (top row) should be stable; stories below shift constantly
- If a column has 20+ stories, the activity needs splitting

## Event Storming

Discover domain complexity by mapping events in a collaborative workshop.

**Colors/types:**
- Orange: Domain Events (past tense: "Order Placed")
- Blue: Commands (what triggers the event: "Place Order")
- Yellow: Actors (who issues the command: "Customer")
- Pink: External Systems ("Payment Gateway")
- Lilac: Policies/Rules ("If order > $100, require approval")
- Green: Read Models (what info the actor needs to issue the command)

**Process:**
1. **Chaotic exploration** -- Everyone writes events on stickies, no order
2. **Timeline** -- Arrange events left to right chronologically
3. **Pivotal events** -- Mark events that change the system's state significantly
4. **Commands and actors** -- What triggers each event? Who does it?
5. **Aggregates** -- Group related events into bounded contexts
6. **Problems and opportunities** -- Mark hotspots with red stickies

**Output:**
- Bounded context map (where to draw service boundaries)
- List of aggregates and their events
- Identified hotspots needing deeper design
- Shared understanding across the team

## RFC Process

**Lifecycle:** Draft -> Review -> Accepted/Rejected -> Implemented

**When to write an RFC:**
- Change affects multiple teams or services
- Decision is hard to reverse
- Multiple valid approaches exist
- The team disagrees on direction

**When NOT to write an RFC:**
- Single-team, easily reversible change
- Well-established pattern being applied again
- Bug fix or minor refactor
- Everyone already agrees

**Review process:**
1. Author shares draft with 2-3 reviewers
2. Reviewers have 5 business days to comment
3. Author addresses comments, marks resolved
4. Decision meeting (30 min) if disagreements remain
5. Decision-maker (tech lead/architect) makes final call
6. Status updated, implementation begins

**Tips:**
- Set a review deadline. RFCs without deadlines die in limbo.
- Name a single decision-maker upfront
- "No comments" after the deadline = implicit approval
- Keep a registry (list of all RFCs with status)

## Spike vs Implementation

**Spike:** Timeboxed exploration to reduce uncertainty.
- Fixed duration (1-3 days max)
- Output is knowledge, not production code
- Answer a specific question: "Can we integrate with X?"
- Demo findings to the team, then throw away the code

**When to spike:**
- New technology or API you've never used
- Unclear performance characteristics
- Multiple approaches and you can't evaluate without trying
- "We don't know what we don't know"

**Implementation:** Building the actual solution.
- Follows from spike findings
- Production-quality code with tests
- Code review, CI/CD, monitoring
- Incremental delivery

**Anti-patterns:**
- Spike that never ends (set hard deadline)
- Spike code shipped to production
- Skipping the spike when uncertainty is high (leads to rewrites)
- Implementation without a plan (just start coding)

## Decomposition Rules

Break complex work into manageable pieces without losing coherence.

**Max 3-4 sub-problems per level.** If you have more, add a level of hierarchy.
Go deeper, not wider.

**Good decomposition:**
- Each piece is self-contained and independently testable
- Pieces have clear interfaces between them
- Order of implementation is obvious
- Each piece delivers value or enables the next piece

**Bad decomposition:**
- Pieces that can't work without all other pieces
- Artificial splits (frontend/backend for a tiny feature)
- Too granular (50 tasks for a 2-day project)
- Circular dependencies between pieces

**Decomposition strategies:**
1. **By user capability** -- Each piece unlocks something the user can do
2. **By data flow** -- Follow the data: ingest, transform, store, query, display
3. **By risk** -- Tackle the hardest/riskiest piece first
4. **By dependency** -- Build the foundation, then the layers

**Size heuristics:**
- A task should take 1-3 days max
- If you can't describe it in one sentence, it's too big
- If it has no meaningful test, it's too small or too vague
- If it requires more than 2 people, split it
